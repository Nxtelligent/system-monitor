import psutil
import time

_slow_cache = {}
_slow_counter = 0

# Prime cpu_percent so the first real call returns a meaningful value
psutil.cpu_percent(interval=None)


def _collect_slow_metrics():
    processes = 0
    threads = 0
    handles = 0
    for p in psutil.process_iter(['num_threads', 'num_handles']):
        try:
            info = p.info
            processes += 1
            threads += info.get('num_threads') or 0
            handles += info.get('num_handles') or 0
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return {
        'processes': processes,
        'threads': threads,
        'handles': handles,
    }


def get_cpu_metrics():
    global _slow_counter, _slow_cache

    freq = psutil.cpu_freq()
    result = {
        'utilization': psutil.cpu_percent(interval=None),
        'frequency_current': round(freq.current, 0) if freq else 0,
        'frequency_max': round(freq.max, 0) if freq else 0,
        'cores_physical': psutil.cpu_count(logical=False),
        'cores_logical': psutil.cpu_count(logical=True),
        'uptime_seconds': time.time() - psutil.boot_time(),
    }

    _slow_counter += 1
    if _slow_counter % 5 == 1 or not _slow_cache:
        _slow_cache = _collect_slow_metrics()

    result.update(_slow_cache)
    return result
