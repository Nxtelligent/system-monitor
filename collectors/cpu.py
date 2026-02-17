import psutil
import time

# Prime cpu_percent so the first real call returns a meaningful value
psutil.cpu_percent(interval=None)

# Static values that never change — cache at module level
_boot_time = psutil.boot_time()
_cores_physical = psutil.cpu_count(logical=False)
_cores_logical = psutil.cpu_count(logical=True)

# Time-based TTL cache for expensive process iteration
_slow_cache = {}
_slow_cache_time = 0.0
_SLOW_TTL = 5.0


def _collect_slow_metrics():
    processes = 0
    threads = 0
    for p in psutil.process_iter(['num_threads']):
        try:
            processes += 1
            threads += p.info.get('num_threads') or 0
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return {'processes': processes, 'threads': threads}


def get_cpu_metrics():
    global _slow_cache, _slow_cache_time

    now = time.monotonic()
    if now - _slow_cache_time >= _SLOW_TTL or not _slow_cache:
        _slow_cache = _collect_slow_metrics()
        _slow_cache_time = now

    freq = psutil.cpu_freq()
    return {
        'utilization': psutil.cpu_percent(interval=None),
        'frequency_current': round(freq.current, 0) if freq else 0,
        'frequency_max': round(freq.max, 0) if freq else 0,
        'cores_physical': _cores_physical,
        'cores_logical': _cores_logical,
        'uptime_seconds': time.time() - _boot_time,
        **_slow_cache,
    }
