const resolutions = {
    FHD: { width: 1920, height: 1080 },
    UWFHD: { width: 2560, height: 1080 },
    QHD: { width: 2560, height: 1440 },
    '4K': { width: 3840, height: 2160 }
};
const limiters = [
    {
        timeout: false,
        waiting: false,
        sleep: 10,
    },
    {
        timeout: false,
        waiting: false,
        sleep: 3000,
    }
];
const img = document.querySelector('img');

let monitors = [];
let booster = 1;
let options = {
    color: '#ffff00',
    borderWidth: 30,
    scale: 1
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    getSavedMonitors();
    setInputs();
    showMonitors();
    await loadImg();
    addEventListeners();
    changeRects();
    showResult();
}

function getSavedMonitors() {
    const saved = localStorage.getItem('monitors');
    if (saved) { monitors = JSON.parse(saved); }
}

function addEventListeners() {
    document.querySelector('#maxw').addEventListener('input', (e) => document.querySelector('main').style.maxWidth = `${e.target.value}px`);
    document.querySelector('#addMonitor').addEventListener('submit', addMonitor);
    document.querySelector('#offsets').addEventListener('input', changePosition);
    document.querySelector('#draw').addEventListener('click', setRectangleLocation);
    document.querySelector('#inputImg').addEventListener('change', loadNewImg);
    document.querySelector('#downloadBtn').addEventListener('click', downloadImg);
}

function setInputs() {
    document.querySelector('main').style.maxWidth = '900px';
    document.querySelector('#boost').value = '1';
    document.querySelector('#color').value = options.color;
    document.querySelector('#border').value = options.borderWidth;
    document.querySelector('#maxw').value = document.querySelector('main').style['max-width'].slice(0, -2);
    document.querySelector('#resolution').innerHTML = Object.entries(resolutions).map(([k, v]) => `<option value="${k}">${k} (${v.width}x${v.height})</option>`).join('');
}

function setRectangleLocation(e) {
    const { width, height } = e.target.getBoundingClientRect();
    const x = e.offsetX * ((img.width - options.totalWidth * options.scale) / width);
    const y = e.offsetY * ((img.height - options.totalHeight * options.scale) / height);
    options.startOffsetX = x;
    options.offsetY = y;
    document.querySelector('#x').value = x;
    document.querySelector('#y').value = y;
    changeRects();
    showResult();
}

function changePosition(e) {
    const input = e.target.closest('input');
    if (input.id == 'boost') {
        booster = Number(input.value);
        return;
    }
    { input.classList.contains('offsets'); } {
        options[input.name] += (Number(input.value) - options[input.name]) * booster;
        input.value = options[input.name];
    }
    if (input.name == 'scale' || input.name == 'borderWidth') {
        options[input.name] = Number(input.value) || 1;
    }
    if (input.name == 'color') {
        options[input.name] = (input.value);
    }
    if (rateLimiter()) {
        changeRects(options);
        if (rateLimiter(1)) {
            showResult(options);
        }
    }
}

function rateLimiter(i = 0) {
    const limiter = limiters[i];
    if (limiter.waiting) { return false; }
    limiter.waiting = true;
    limiter.timeout = setTimeout(() => limiter.waiting = false, limiter.sleep);
    return true;
}

function downloadImg() {
    const link = document.createElement('a');
    link.download = `background-${Math.random().toString(36).slice(3)}.png`;
    link.href = document.querySelector('#out').toDataURL('image/png');
    link.click();
}

async function loadNewImg(e) {
    const file = e.target.files[0]; // Get the selected file
    if (file) {
        const reader = new FileReader(file); // Create a FileReader object
        reader.onload = async function (ee) {
            img.src = ee.target.result;
            await loadImg();
            changeRects();
            showResult();
        };
        reader.readAsDataURL(file);
    }
}

async function loadImg() {
    const canvasIn = document.querySelector('#in');
    const ctxIn = canvasIn.getContext('2d');
    const canvasDraw = document.querySelector('#draw');
    const ctxDraw = canvasDraw.getContext('2d');
    await new Promise(r => img.onload = r);
    const { width, height } = img;
    const { color, borderWidth, } = options;
    document.querySelector('#imgRes').innerText = `${width} x ${height}`;
    canvasIn.width = width;
    canvasIn.height = height;
    canvasDraw.width = width;
    canvasDraw.height = height;
    const totalHeight = monitors.reduce((a, b) => Math.max(a, b.scaledH), 0);
    const totalWidth = monitors.reduce((a, b) => (a + b.scaledW), 0);
    ctxIn.drawImage(img,
        0, 0, img.width, img.height);
    ctxDraw.lineWidth = borderWidth;
    ctxDraw.strokeStyle = color;
    const offsetY = Math.ceil((canvasIn.height - totalHeight) / 2);
    let startOffsetX = Math.ceil((canvasIn.width - totalWidth) / 2);
    startOffsetX = Math.max(startOffsetX, 0);
    options.scale = 1;
    document.querySelector('#x').value = startOffsetX;
    document.querySelector('#y').value = offsetY;
    document.querySelector('#scale').value = 1;
    options = ({ ...options, totalWidth, totalHeight, startOffsetX, offsetY });
}

function changeRects() {
    const canvasDraw = document.querySelector('#draw');
    const ctxDraw = canvasDraw.getContext('2d');
    let offsetX = options.startOffsetX;
    const { offsetY, scale, color, borderWidth } = options;
    let maxPpi = monitors.reduce((a, b) => Math.max(a, b.ppi), 0);
    maxPpi *= scale;
    monitors = monitors.map(monitor =>
        ({ ...monitor, scaledW: monitor.widthInch * maxPpi, scaledH: monitor.heightInch * maxPpi })
    );
    const totalHeight = monitors.reduce((a, b) => Math.max(a, b.scaledH), 0);
    ctxDraw.clearRect(0, 0, canvasDraw.width, canvasDraw.height);
    ctxDraw.strokeStyle = color;
    ctxDraw.lineWidth = borderWidth;
    monitors.forEach(monitor => {
        ctxDraw.strokeRect(offsetX, offsetY + (totalHeight - monitor.scaledH), monitor.scaledW, monitor.scaledH);
        offsetX += monitor.scaledW;
    });
    options = ({ ...options, totalHeight, });
}

function showResult() {
    let offsetX = options.startOffsetX;
    const { offsetY, totalHeight } = options;
    const canvasOut = document.querySelector('#out');
    const ctxOut = canvasOut.getContext('2d');
    const maxHeight = monitors.reduce((a, b) => Math.max(a, b.height), 0);
    const maxWidth = monitors.reduce((a, b) => (a + b.width), 0);
    let offsetXOut = 0;
    canvasOut.width = maxWidth;
    canvasOut.height = maxHeight;
    monitors.forEach(monitor => {
        const ctx = monitor.canvas.getContext('2d');
        ctx.drawImage(img, offsetX, offsetY + (totalHeight - monitor.scaledH),
            monitor.scaledW, monitor.scaledH, 0, 0, monitor.width, monitor.height
        );
        ctxOut.drawImage(img, offsetX, offsetY + (totalHeight - monitor.scaledH),
            monitor.scaledW, monitor.scaledH,
            offsetXOut, (maxHeight - monitor.height), monitor.width, monitor.height);
        offsetXOut += monitor.width;
        offsetX += monitor.scaledW;
    });
}

function addMonitor(e) {
    e.preventDefault();
    let monitor = Object.fromEntries(new FormData(e.target).entries());
    monitor['id'] = 'id' + Date.now().toString(36);
    const { width, height } = resolutions[monitor.resolution];
    const { ppi, widthInch, heightInch } = getWidthAndHeightInInch(monitor.diagonal, width, height);
    monitor = { ...monitor, width, height, ppi, widthInch, heightInch };
    monitors.push(monitor);
    localStorage.setItem('monitors', JSON.stringify(monitors));
    showMonitors();
    changeRects();
    showResult();
}

function showMonitors() {
    const monitorsElem = document.querySelector('#monitors');
    const totalWidth = monitors.reduce((a, b) => a += b.widthInch, 0);
    const totalHeight = monitors.reduce((a, b) => Math.max(a, b.heightInch), 0);
    const maxPpi = monitors.reduce((a, b) => Math.max(a, b.ppi), 0);
    monitors = monitors.map(monitor =>
        ({ ...monitor, scaledW: monitor.widthInch * maxPpi, scaledH: monitor.heightInch * maxPpi })
    );
    options.totalHeight = monitors.reduce((a, b) => Math.max(a, b.scaledH), 0);
    options.totalWidth = monitors.reduce((a, b) => (a + b.scaledW), 0);
    document.querySelector('#minRes').textContent = `${Math.ceil(totalWidth * maxPpi)} x ${Math.ceil(totalHeight * maxPpi)}`;
    monitorsElem.style['aspect-ratio'] = `${totalWidth} / ${totalHeight}`;
    document.querySelector('#monitors').innerHTML = monitors.map((monitor) => `
        <li id="${monitor.id}" style=" width:${monitor.widthInch * 100}px; ">
            <div class="options" style=" height:${monitor.scaledH * 100 / (totalHeight * maxPpi)}%; " > 
                <input type="button" value="<-" class="moveLeft">
                <input type="button" value="x" class="delete">
                <p>${monitor.resolution} ${monitor.diagonal}"</p>
                <input type="button" value="->" class="moveRight">
            </div>
            <canvas  height="${monitor.height}px" width="${monitor.width}px" ></canvas>
        </li>
        `).join('');
    monitors = monitors.map((monitor) => ({ ...monitor, canvas: document.querySelector(`#${monitor.id} canvas`) }));
    document.querySelectorAll('#monitors li').forEach(d => d.addEventListener('click', handleMonitorEvents));
}

function handleMonitorEvents(e) {
    const value = e.target.closest('input').value;
    const id = e.target.closest('li').id;
    if (value == 'x') {
        monitors = monitors.filter(monitor => monitor.id != id);
    } else {
        const i = monitors.findIndex(monitor => monitor.id == id);
        const move = value == '<-' ? -1 : 1;
        const newI = (i + move) % monitors.length;
        const temp = monitors[i];
        monitors[i] = monitors[newI];
        monitors[newI] = temp;
    }
    localStorage.setItem('monitors', JSON.stringify(monitors));
    showMonitors();
    changeRects();
    showResult();
}

function getWidthAndHeightInInch(diagonal, w, h) {
    const diagonalPixels = Math.sqrt(h ** 2 + w ** 2);
    const ppi = diagonalPixels / diagonal;
    const widthInch = w / ppi;
    const heightInch = h / ppi;
    return {
        ppi,
        widthInch,
        heightInch
    };
}