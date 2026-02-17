import time
import psutil
from flask import Flask, render_template
from flask_socketio import SocketIO

from collectors.cpu import get_cpu_metrics
from collectors.memory import get_memory_metrics
from collectors.gpu import get_gpu_metrics

app = Flask(__name__)
app.config['SECRET_KEY'] = 'system-monitor-local'
socketio = SocketIO(app, async_mode='threading')


@app.route('/')
def index():
    return render_template('index.html')


def background_metrics_emitter():
    while True:
        data = {
            'timestamp': time.time(),
            'cpu': get_cpu_metrics(),
            'memory': get_memory_metrics(),
            'gpu': get_gpu_metrics(),
        }
        socketio.emit('metrics_update', data)
        socketio.sleep(1)


@socketio.on('connect')
def handle_connect():
    cpu_name = ''
    try:
        import platform
        cpu_name = platform.processor()
    except Exception:
        pass

    total_ram = psutil.virtual_memory().total
    socketio.emit('system_info', {
        'cpu_name': cpu_name,
        'total_ram': total_ram,
    })


if __name__ == '__main__':
    print('Starting System Monitor...')
    print('Open http://127.0.0.1:5000 in your browser')
    socketio.start_background_task(background_metrics_emitter)
    socketio.run(app, host='127.0.0.1', port=5000, debug=False, allow_unsafe_werkzeug=True)
