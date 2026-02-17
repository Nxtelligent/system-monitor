import subprocess
import shutil
import sys
import time

# Hide console window when calling nvidia-smi on Windows
_CREATE_NO_WINDOW = 0x08000000 if sys.platform == 'win32' else 0

_nvidia_smi_path = None
_gpu_available = None

# TTL cache to avoid spawning subprocess every second
_gpu_cache = None
_gpu_cache_time = 0.0
_GPU_TTL = 2.0


def _safe_int(v):
    try:
        return int(v)
    except (ValueError, TypeError):
        return 0


def _safe_float(v):
    try:
        return float(v)
    except (ValueError, TypeError):
        return 0.0


def _find_nvidia_smi():
    global _nvidia_smi_path, _gpu_available
    _nvidia_smi_path = shutil.which('nvidia-smi')
    _gpu_available = _nvidia_smi_path is not None
    return _gpu_available


def _get_fallback_metrics():
    return {
        'available': False,
        'name': 'No GPU detected',
        'temperature': 0,
        'utilization': 0,
        'memory_utilization': 0,
        'memory_total': 0,
        'memory_used': 0,
        'memory_free': 0,
        'fan_speed': 0,
        'power_draw': 0.0,
        'power_limit': 0.0,
        'clock_current': 0,
        'clock_max': 0,
    }


def get_gpu_metrics():
    global _gpu_available, _nvidia_smi_path, _gpu_cache, _gpu_cache_time

    if _gpu_available is None:
        _find_nvidia_smi()

    if not _gpu_available:
        return _get_fallback_metrics()

    now = time.monotonic()
    if _gpu_cache and now - _gpu_cache_time < _GPU_TTL:
        return _gpu_cache

    try:
        result = subprocess.run(
            [
                _nvidia_smi_path,
                '--query-gpu=gpu_name,temperature.gpu,utilization.gpu,'
                'utilization.memory,memory.total,memory.used,memory.free,'
                'fan.speed,power.draw,power.limit,'
                'clocks.current.graphics,clocks.max.graphics',
                '--format=csv,noheader,nounits',
            ],
            capture_output=True,
            text=True,
            timeout=3,
            creationflags=_CREATE_NO_WINDOW,
        )
        if result.returncode != 0:
            return _get_fallback_metrics()

        values = [v.strip() for v in result.stdout.strip().split(',')]
        if len(values) < 12:
            return _get_fallback_metrics()

        _gpu_cache = {
            'available': True,
            'name': values[0],
            'temperature': _safe_int(values[1]),
            'utilization': _safe_int(values[2]),
            'memory_utilization': _safe_int(values[3]),
            'memory_total': _safe_int(values[4]),
            'memory_used': _safe_int(values[5]),
            'memory_free': _safe_int(values[6]),
            'fan_speed': _safe_int(values[7]),
            'power_draw': _safe_float(values[8]),
            'power_limit': _safe_float(values[9]),
            'clock_current': _safe_int(values[10]),
            'clock_max': _safe_int(values[11]),
        }
        _gpu_cache_time = now
        return _gpu_cache
    except (subprocess.TimeoutExpired, Exception):
        return _gpu_cache or _get_fallback_metrics()
