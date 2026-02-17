import psutil


def get_memory_metrics():
    vm = psutil.virtual_memory()
    return {
        'total': vm.total,
        'available': vm.available,
        'used': vm.used,
        'free': vm.free,
        'percent': vm.percent,
        'cached': vm.total - vm.used - vm.free,
    }
