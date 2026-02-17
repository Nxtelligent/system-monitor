import asyncio
import json
import os
import platform
import sys

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


def _eval_js(js_code):
    """Execute JavaScript in the webview."""
    wv.evaluate(js_code.encode('utf-8'), _noop)


class SystemMonitor(webview2.Window):
    """Main application window with system metrics push."""

    @webview2.webview2_api
    def page_ready(self):
        """Called from JS when the page is loaded and ready."""
        info = json.dumps({
            'cpu_name': platform.processor() or '',
            'total_ram': psutil.virtual_memory().total,
        })
        _eval_js(f'onSystemInfo({info})')


async def _push_loop():
    """Push metrics to JS every 1 second."""
    while True:
        await asyncio.sleep(1.0)
        try:
            data = json.dumps({
                'cpu': get_cpu_metrics(),
                'memory': get_memory_metrics(),
                'gpu': get_gpu_metrics(),
            })
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
        # Start metrics push loop alongside the window event loop
        push_task = asyncio.create_task(_push_loop())
        try:
            await app.run()
        finally:
            push_task.cancel()

    asyncio.run(run())


if __name__ == '__main__':
    main()
