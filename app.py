import asyncio
import json
import os
import platform
import sys
from concurrent.futures import ThreadPoolExecutor

import psutil
import webview2
from webview2 import base as wv

from collectors.cpu import get_cpu_metrics
from collectors.memory import get_memory_metrics
from collectors.gpu import get_gpu_metrics

# Resolve asset directory: PyInstaller extracts to _MEIPASS, else use script dir
BASE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))

# No-op callback for evaluate (we don't need return values)
_noop = wv.listener(lambda _: None)

# Thread pool for blocking metric collection (prevents UI freeze)
_executor = ThreadPoolExecutor(max_workers=1)


def _eval_js(js_code):
    """Execute JavaScript in the webview."""
    wv.evaluate(js_code.encode('utf-8'), _noop)


def _collect_all_metrics():
    """Collect all metrics (runs in thread pool to avoid blocking UI)."""
    return json.dumps({
        'cpu': get_cpu_metrics(),
        'memory': get_memory_metrics(),
        'gpu': get_gpu_metrics(),
    })


class SystemMonitor(webview2.Window):
    """Main application window with custom HTML title bar controls."""

    _is_maximized = False

    @webview2.webview2_api
    def page_ready(self):
        """Called from JS when the page is loaded and ready."""
        info = json.dumps({
            'cpu_name': platform.processor() or '',
            'total_ram': psutil.virtual_memory().total,
        })
        _eval_js(f'onSystemInfo({info})')

    @webview2.webview2_api
    def drag_window(self, dx, dy):
        """Move window by delta pixels (called during title bar drag)."""
        try:
            import win32gui
            import win32con
            hwnd = wv.get_window()
            if not hwnd:
                return
            rect = win32gui.GetWindowRect(hwnd)
            x, y = rect[0] + dx, rect[1] + dy
            win32gui.SetWindowPos(
                hwnd, None, x, y, 0, 0,
                win32con.SWP_NOSIZE | win32con.SWP_NOZORDER,
            )
        except Exception:
            pass

    @webview2.webview2_api
    def toggle_maximize(self):
        """Toggle between maximized and restored state."""
        try:
            import win32gui
            import win32con
            hwnd = wv.get_window()
            if not hwnd:
                return
            if self._is_maximized:
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                self._is_maximized = False
            else:
                win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
                self._is_maximized = True
        except Exception:
            pass


async def _push_loop(loop):
    """Push metrics to JS every 1 second, collecting in a thread."""
    while True:
        await asyncio.sleep(1.0)
        try:
            # Run blocking metric collection in thread pool
            data = await loop.run_in_executor(_executor, _collect_all_metrics)
            _eval_js(f'onMetrics({data})')
        except Exception:
            pass  # Window may be closing


def main():
    html_path = os.path.abspath(
        os.path.join(BASE_DIR, 'templates', 'index.html')
    ).replace('\\', '/')
    url = f'file:///{html_path}'

    app = SystemMonitor(
        title='System Monitor',
        url=url,
        size='960x700',
    )

    async def run():
        loop = asyncio.get_event_loop()
        push_task = asyncio.create_task(_push_loop(loop))

        try:
            await app.run()
        finally:
            push_task.cancel()

    asyncio.run(run())


if __name__ == '__main__':
    main()
