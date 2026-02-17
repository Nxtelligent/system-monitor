const MAX_POINTS = 60;
const socket = io();

// --- Chart Factory ---
function createChart(canvasId, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.parentElement.clientHeight || 200);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '05');

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(MAX_POINTS).fill(''),
            datasets: [{
                data: Array(MAX_POINTS).fill(null),
                borderColor: color,
                backgroundColor: gradient,
                borderWidth: 1.5,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHitRadius: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { enabled: false },
            scales: {
                x: { display: false },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: '#1e252e', lineWidth: 1 },
                    ticks: {
                        color: '#484f58',
                        font: { size: 10 },
                        stepSize: 25,
                        callback: v => v + '%',
                    },
                    border: { display: false },
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

const cpuChart = createChart('cpu-chart', '#00d4ff');
const gpuChart = createChart('gpu-chart', '#76ff03');
const memChart = createChart('memory-chart', '#ff6ec7');

// --- Helpers ---
function pushData(chart, value) {
    const ds = chart.data.datasets[0];
    ds.data.push(value);
    if (ds.data.length > MAX_POINTS) ds.data.shift();
    chart.data.labels.push('');
    if (chart.data.labels.length > MAX_POINTS) chart.data.labels.shift();
    chart.update('none');
}

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

function $(id) { return document.getElementById(id); }

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
    pushData(cpuChart, util);

    $('cpu-percent').textContent = util + '%';
    $('cpu-utilization').textContent = util + '%';

    const speed = cpu.frequency_current;
    if (speed >= 1000) {
        $('cpu-speed').textContent = (speed / 1000).toFixed(2) + ' GHz';
    } else {
        $('cpu-speed').textContent = Math.round(speed) + ' MHz';
    }

    $('cpu-processes').textContent = formatNumber(cpu.processes);
    $('cpu-threads').textContent = formatNumber(cpu.threads);
    $('cpu-handles').textContent = formatNumber(cpu.handles);
    $('cpu-uptime').textContent = formatUptime(cpu.uptime_seconds);
    $('cpu-cores').textContent = cpu.cores_physical;
    $('cpu-logical').textContent = cpu.cores_logical;
}

function updateGPU(gpu) {
    if (!gpu.available) {
        if (!gpuInitialized) {
            $('gpu-metrics').style.display = 'none';
            $('gpu-unavailable').style.display = 'flex';
            $('gpu-name').textContent = 'No GPU detected';
            $('gpu-percent').textContent = '--';
            gpuInitialized = true;
        }
        return;
    }

    if (!gpuInitialized) {
        $('gpu-metrics').style.display = '';
        $('gpu-unavailable').style.display = 'none';
        $('gpu-name').textContent = gpu.name;
        gpuInitialized = true;
    }

    const util = gpu.utilization;
    pushData(gpuChart, util);

    $('gpu-percent').textContent = util + '%';
    $('gpu-utilization').textContent = util + '%';
    $('gpu-temperature').innerHTML = gpu.temperature + ' &deg;C';
    $('gpu-vram-used').textContent = formatNumber(gpu.memory_used) + ' MB';
    $('gpu-vram-total').textContent = formatNumber(gpu.memory_total) + ' MB';
    $('gpu-power').textContent = gpu.power_draw.toFixed(1) + ' W / ' + gpu.power_limit.toFixed(0) + ' W';
    $('gpu-fan').textContent = gpu.fan_speed + '%';
    $('gpu-clock').textContent = formatNumber(gpu.clock_current) + ' MHz';
    $('gpu-mem-util').textContent = gpu.memory_utilization + '%';
}

function updateMemory(mem) {
    const pct = Math.round(mem.percent);
    pushData(memChart, pct);

    $('memory-percent').textContent = pct + '%';
    $('memory-total-label').textContent = formatBytes(mem.total) + ' Total';
    $('memory-used').textContent = formatBytes(mem.used);
    $('memory-available').textContent = formatBytes(mem.available);
    $('memory-total').textContent = formatBytes(mem.total);
    $('memory-cached').textContent = formatBytes(mem.cached);
}
