const socket = io();

// --- Helper shorthand ---
function $(id) { return document.getElementById(id); }

function formatBytes(bytes) {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return gb.toFixed(1) + ' GB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(0) + ' MB';
}

function formatNumber(n) {
    return n.toLocaleString('en-US');
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return d + ':' + String(h).padStart(2, '0') + ':' +
           String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// --- Gauge Chart Factory ---
function createGaugeChart(canvasId, accentColor) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const trackColor = '#1e252e';

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: [accentColor, trackColor],
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
            animation: {
                animateRotate: false,
                duration: 400,
            },
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
    chart.data.datasets[0].data = [clamped, 100 - clamped];
    chart.update();
}

// --- Create Charts ---
const cpuChart = createGaugeChart('cpu-chart', '#00d4ff');
const gpuChart = createGaugeChart('gpu-chart', '#76ff03');

// --- Connection Status ---
socket.on('connect', () => {
    const el = $('connection-status');
    el.textContent = 'Connected';
    el.className = 'connection-status connected';
});

socket.on('disconnect', () => {
    const el = $('connection-status');
    el.textContent = 'Disconnected';
    el.className = 'connection-status disconnected';
});

// --- System Info (sent once on connect) ---
socket.on('system_info', (info) => {
    if (info.cpu_name) {
        $('cpu-name').textContent = info.cpu_name;
    }
});

// --- Metrics Update ---
let gpuInitialized = false;

socket.on('metrics_update', (data) => {
    updateCPU(data.cpu);
    updateGPU(data.gpu);
    updateMemory(data.memory);
});

function updateCPU(cpu) {
    const util = Math.round(cpu.utilization);

    updateGaugeChart(cpuChart, util);
    $('cpu-percent').textContent = util;

    const speed = cpu.frequency_current;
    if (speed >= 1000) {
        $('cpu-speed').textContent = (speed / 1000).toFixed(2) + ' GHz';
    } else {
        $('cpu-speed').textContent = Math.round(speed) + ' MHz';
    }

    $('cpu-cores').textContent = cpu.cores_physical;
    $('cpu-threads').textContent = formatNumber(cpu.cores_logical);
    $('cpu-processes').textContent = formatNumber(cpu.processes);
    $('cpu-uptime').textContent = formatUptime(cpu.uptime_seconds);
}

function updateGPU(gpu) {
    if (!gpu.available) {
        if (!gpuInitialized) {
            $('gpu-chart-wrapper').style.display = 'none';
            $('gpu-stats').style.display = 'none';
            $('gpu-unavailable').style.display = 'flex';
            $('gpu-name').textContent = 'No GPU detected';
            $('gpu-percent').textContent = '--';
            gpuInitialized = true;
        }
        return;
    }

    if (!gpuInitialized) {
        $('gpu-chart-wrapper').style.display = '';
        $('gpu-stats').style.display = '';
        $('gpu-unavailable').style.display = 'none';
        $('gpu-name').textContent = gpu.name;
        gpuInitialized = true;
    }

    const util = gpu.utilization;

    updateGaugeChart(gpuChart, util);
    $('gpu-percent').textContent = util;

    $('gpu-temperature').innerHTML = gpu.temperature + ' &deg;C';
    $('gpu-vram').textContent = formatNumber(gpu.memory_used) + ' / ' + formatNumber(gpu.memory_total) + ' MB';
    $('gpu-power').textContent = gpu.power_draw.toFixed(1) + ' W';
    $('gpu-fan').textContent = gpu.fan_speed + '%';
    $('gpu-clock').textContent = formatNumber(gpu.clock_current) + ' MHz';
}

function updateMemory(mem) {
    const pct = Math.round(mem.percent);

    $('memory-bar-fill').style.width = pct + '%';
    $('memory-percent').textContent = pct + '%';
    $('memory-usage-text').textContent = formatBytes(mem.used) + ' / ' + formatBytes(mem.total);
    $('memory-used').textContent = formatBytes(mem.used);
    $('memory-available').textContent = formatBytes(mem.available);
    $('memory-total').textContent = formatBytes(mem.total);
    $('memory-cached').textContent = formatBytes(mem.cached);
}
