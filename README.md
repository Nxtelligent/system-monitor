# System Performance Monitor

Real-time system performance dashboard built with Flask and WebSockets. Monitors CPU, GPU (NVIDIA), and Memory metrics with live-updating graphs.

## Features

- Real-time CPU utilization with 60-second rolling line graph
- GPU monitoring (NVIDIA) with temperature, VRAM, power, and clock stats
- Memory usage tracking with detailed breakdown
- Dark theme interface
- Graceful fallback when no dedicated GPU is present
- WebSocket-based updates (1 second interval)

## Requirements

- Python 3.10+
- Windows 10/11
- NVIDIA GPU + drivers (optional, for GPU monitoring)

## Quick Start

```bash
pip install -r requirements.txt
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

## Tech Stack

- **Backend**: Flask, Flask-SocketIO, psutil
- **Frontend**: Chart.js, Socket.IO client
- **GPU**: nvidia-smi (subprocess)

## License

MIT
