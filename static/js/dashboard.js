// --- Cache all DOM references once at startup ---
const dom = {
    cpuPercent: document.getElementById('cpu-percent'),
    cpuSpeed: document.getElementById('cpu-speed'),
    cpuCores: document.getElementById('cpu-cores'),
    cpuThreads: document.getElementById('cpu-threads'),
    cpuProcesses: document.getElementById('cpu-processes'),
    cpuUptime: document.getElementById('cpu-uptime'),
    cpuName: document.getElementById('cpu-name'),
    gpuPercent: document.getElementById('gpu-percent'),
    gpuTemp: document.getElementById('gpu-temperature'),
    gpuVram: document.getElementById('gpu-vram'),
    gpuPower: document.getElementById('gpu-power'),
    gpuFan: document.getElementById('gpu-fan'),
    gpuClock: document.getElementById('gpu-clock'),
    gpuName: document.getElementById('gpu-name'),
    gpuChartWrap: document.getElementById('gpu-chart-wrapper'),
    gpuStats: document.getElementById('gpu-stats'),
    gpuUnavailable: document.getElementById('gpu-unavailable'),
    memBarFill: document.getElementById('memory-bar-fill'),
    memPercent: document.getElementById('memory-percent'),
    memUsageText: document.getElementById('memory-usage-text'),
    memUsed: document.getElementById('memory-used'),
    memAvailable: document.getElementById('memory-available'),
    memTotal: document.getElementById('memory-total'),
    memCached: document.getElementById('memory-cached'),
};

// --- Helpers ---
function setText(el, value) {
    if (el.textContent !== value) el.textContent = value;
}

function formatBytes(bytes) {
    const gb = bytes / 1073741824;
    if (gb >= 1) return gb.toFixed(1) + ' GB';
    return (bytes / 1048576 | 0) + ' MB';
}

function formatNumber(n) {
    return n.toLocaleString('en-US');
}

function formatUptime(seconds) {
    const d = seconds / 86400 | 0;
    const h = (seconds % 86400) / 3600 | 0;
    const m = (seconds % 3600) / 60 | 0;
    const s = seconds % 60 | 0;
    return d + ':' + String(h).padStart(2, '0') + ':' +
        String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// --- Gauge Chart Factory ---
function createGaugeChart(canvasId, accentColor) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: [accentColor, '#1e252e'],
                borderWidth: 0,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '75%',
            rotation: -90,
            circumference: 360,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
            },
            events: [],
        }
    });
}

function updateGaugeChart(chart, value) {
    const clamped = Math.max(0, Math.min(100, value));
    if (chart.data.datasets[0].data[0] === clamped) return;
    chart.data.datasets[0].data[0] = clamped;
    chart.data.datasets[0].data[1] = 100 - clamped;
    chart.update('none');
}

// --- Create Charts ---
const cpuChart = createGaugeChart('cpu-chart', '#00d4ff');
const gpuChart = createGaugeChart('gpu-chart', '#76ff03');

// --- Update Functions ---
let gpuInitialized = false;

function updateCPU(cpu) {
    const util = Math.round(cpu.utilization);
    updateGaugeChart(cpuChart, util);
    setText(dom.cpuPercent, String(util));

    const speed = cpu.frequency_current;
    const speedText = speed >= 1000
        ? (speed / 1000).toFixed(2) + ' GHz'
        : Math.round(speed) + ' MHz';
    setText(dom.cpuSpeed, speedText);

    setText(dom.cpuCores, String(cpu.cores_physical));
    setText(dom.cpuThreads, formatNumber(cpu.cores_logical));
    setText(dom.cpuProcesses, formatNumber(cpu.processes));
    setText(dom.cpuUptime, formatUptime(cpu.uptime_seconds));
}

function updateGPU(gpu) {
    if (!gpu.available) {
        if (!gpuInitialized) {
            dom.gpuChartWrap.style.display = 'none';
            dom.gpuStats.style.display = 'none';
            dom.gpuUnavailable.style.display = 'flex';
            setText(dom.gpuName, 'No GPU detected');
            setText(dom.gpuPercent, '--');
            gpuInitialized = true;
        }
        return;
    }

    if (!gpuInitialized) {
        dom.gpuChartWrap.style.display = '';
        dom.gpuStats.style.display = '';
        dom.gpuUnavailable.style.display = 'none';
        setText(dom.gpuName, gpu.name);
        gpuInitialized = true;
    }

    updateGaugeChart(gpuChart, gpu.utilization);
    setText(dom.gpuPercent, String(gpu.utilization));
    setText(dom.gpuTemp, gpu.temperature + ' \u00B0C');
    setText(dom.gpuVram, formatNumber(gpu.memory_used) + ' / ' + formatNumber(gpu.memory_total) + ' MB');
    setText(dom.gpuPower, gpu.power_draw.toFixed(1) + ' W');
    setText(dom.gpuFan, gpu.fan_speed + '%');
    setText(dom.gpuClock, formatNumber(gpu.clock_current) + ' MHz');
}

function updateMemory(mem) {
    const pct = Math.round(mem.percent);
    const widthStr = pct + '%';
    if (dom.memBarFill.style.width !== widthStr) dom.memBarFill.style.width = widthStr;
    setText(dom.memPercent, widthStr);
    setText(dom.memUsageText, formatBytes(mem.used) + ' / ' + formatBytes(mem.total));
    setText(dom.memUsed, formatBytes(mem.used));
    setText(dom.memAvailable, formatBytes(mem.available));
    setText(dom.memTotal, formatBytes(mem.total));
    setText(dom.memCached, formatBytes(mem.cached));
}

// --- QWebChannel: receive metrics directly from Python ---
new QWebChannel(qt.webChannelTransport, function (channel) {
    const backend = channel.objects.backend;

    backend.systemInfoReady.connect(function (jsonStr) {
        const info = JSON.parse(jsonStr);
        if (info.cpu_name) setText(dom.cpuName, info.cpu_name);
    });

    backend.metricsReady.connect(function (jsonStr) {
        const data = JSON.parse(jsonStr);
        requestAnimationFrame(function () {
            updateCPU(data.cpu);
            updateGPU(data.gpu);
            updateMemory(data.memory);
        });
    });

    // Tell Python the page is ready
    backend.pageReady();
});
