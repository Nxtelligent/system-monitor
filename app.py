import os
import sys
import json
import platform
import psutil

from collectors.cpu import get_cpu_metrics
from collectors.memory import get_memory_metrics
from collectors.gpu import get_gpu_metrics

# Resolve asset directory: PyInstaller extracts to _MEIPASS, else use script dir
BASE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))


def main():
    from PySide6.QtWidgets import QApplication
    from PySide6.QtWebEngineWidgets import QWebEngineView
    from PySide6.QtWebChannel import QWebChannel
    from PySide6.QtCore import QUrl, QObject, Signal, Slot, QTimer
    from PySide6.QtGui import QColor

    class Backend(QObject):
        """Bridge exposed to JS via QWebChannel."""
        metricsReady = Signal(str)
        systemInfoReady = Signal(str)

        @Slot()
        def pageReady(self):
            """Called once by JS when QWebChannel is initialised."""
            self.systemInfoReady.emit(json.dumps({
                'cpu_name': platform.processor() or '',
                'total_ram': psutil.virtual_memory().total,
            }))

    app = QApplication(sys.argv)
    app.setApplicationName('System Monitor')

    backend = Backend()

    channel = QWebChannel()
    channel.registerObject('backend', backend)

    view = QWebEngineView()
    view.setWindowTitle('System Monitor')
    view.resize(960, 700)
    view.page().setBackgroundColor(QColor('#0d1117'))
    view.page().setWebChannel(channel)

    # Load the HTML from the templates directory
    html_path = os.path.join(BASE_DIR, 'templates', 'index.html')
    view.setUrl(QUrl.fromLocalFile(html_path))
    view.show()

    # Push metrics every second via Qt signal (no network I/O)
    def push_metrics():
        backend.metricsReady.emit(json.dumps({
            'cpu': get_cpu_metrics(),
            'memory': get_memory_metrics(),
            'gpu': get_gpu_metrics(),
        }))

    timer = QTimer()
    timer.timeout.connect(push_metrics)
    timer.start(1000)

    sys.exit(app.exec())


if __name__ == '__main__':
    main()
