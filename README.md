# System Performance Monitor

A standalone Windows desktop app that displays real-time CPU, GPU, and Memory metrics in a dark-themed dashboard with circular gauges and a memory usage bar.

![Dashboard Preview](https://img.shields.io/badge/Platform-Windows%2010%2F11-blue) ![Python](https://img.shields.io/badge/Python-3.10%2B-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **CPU Gauge** — Real-time utilization with speed, cores, threads, processes, and uptime
- **GPU Gauge** — NVIDIA GPU utilization with temperature, VRAM, power draw, fan speed, and clock
- **Memory Bar** — Usage progress bar with in-use, available, total, and cached breakdown
- **Dark Mode** — Full dark theme interface
- **Portable .exe** — Runs as a standalone desktop app (no browser needed)
- **Graceful Fallback** — Works without a dedicated GPU (shows "No GPU detected")

## Quick Start

### Option 1: Run from Source

```bash
pip install -r requirements.txt
python app.py
```

### Option 2: Build Portable .exe

```bash
pip install pyinstaller
python build_exe.py
```

The built app will be at `dist\SystemMonitor\SystemMonitor.exe`. The entire `dist\SystemMonitor\` folder is portable — zip it to share.

## Requirements

- Python 3.10+
- Windows 10/11
- NVIDIA GPU + drivers (optional, for GPU monitoring)

## Project Structure

```
system-monitor/
├── app.py                     # PySide6 desktop app (QWebEngineView + QWebChannel)
├── build_exe.py               # PyInstaller build helper
├── system_monitor.spec        # PyInstaller spec file
├── requirements.txt           # psutil, PySide6-Essentials, PySide6-Addons
├── collectors/
│   ├── cpu.py                 # CPU metrics via psutil
│   ├── memory.py              # Memory metrics via psutil
│   └── gpu.py                 # GPU metrics via nvidia-smi subprocess
├── static/
│   ├── css/style.css          # Dark theme styles
│   └── js/
│       ├── dashboard.js       # Chart.js doughnut gauges + QWebChannel client
│       └── chart.umd.min.js   # Chart.js 4.4.8 (bundled for offline use)
└── templates/
    └── index.html             # Dashboard layout
```

## Tech Stack

- **Desktop**: PySide6 (Qt6 WebEngine)
- **Metrics**: psutil (CPU/Memory), nvidia-smi subprocess (GPU)
- **Frontend**: Chart.js (doughnut gauges), QWebChannel (Python-to-JS bridge)
- **Packaging**: PyInstaller

## License

MIT
