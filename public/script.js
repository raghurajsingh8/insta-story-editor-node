
// ===== Canvas + Layers =====
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// State
let baseImage = null;
let overlays = []; // optional frame/overlay images
const layers = []; // {type:'sticker'|'text', x,y, scale, rot, img? , text?, color?, size?}
let activeIndex = -1;

// Background color
let backgroundColor = "#ffffff"; // default white
const bgColorInput = document.getElementById('bgColorInput');
const bgClearBtn = document.getElementById('bgClearBtn');

// Filters state
const filters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  sepia: 0,
  grayscale: 0,
  blur: 0,
  hue: 0
};

// UI elements
const photoInput = document.getElementById("photoInput");
const addTextBtn = document.getElementById("addTextBtn");
const downloadBtn = document.getElementById("downloadBtn");

const textEdit = document.getElementById("textEdit");
const textColor = document.getElementById("textColor");
const textSize = document.getElementById("textSize");
const layerInfo = document.getElementById("layerInfo");
const bringFront = document.getElementById("bringFront");
const sendBack = document.getElementById("sendBack");
const deleteLayer = document.getElementById("deleteLayer");

// Songs
const player = document.getElementById("player");
const songsList = document.getElementById("songs");

// === Helpers ===
function filterString() {
  return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%) blur(${filters.blur}px) hue-rotate(${filters.hue}deg)`;
}

function draw() {
  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1) Background color
  if (backgroundColor) {
    ctx.save();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // 2) Base photo
  if (baseImage) {
    ctx.save();
    ctx.filter = filterString();
    const s = fitContain(baseImage.width, baseImage.height, canvas.width, canvas.height);
    const dx = (canvas.width - s.w) / 2;
    const dy = (canvas.height - s.h) / 2;
    ctx.drawImage(baseImage, dx, dy, s.w, s.h);
    ctx.restore();
  } else {
    ctx.fillStyle = (backgroundColor ? 'rgba(0,0,0,0.08)' : '#bbb');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Upload a Photo", canvas.width/2, canvas.height/2);
  }

  // 3) Layers (stickers & text)
  layers.forEach((layer, i) => {
    ctx.save();
    ctx.translate(layer.x, layer.y);
    ctx.rotate(layer.rot || 0);
    const selected = (i === activeIndex);

    if (layer.type === "sticker") {
      const img = layer.img;
      const w = img.width * layer.scale;
      const h = img.height * layer.scale;
      ctx.drawImage(img, -w/2, -h/2, w, h);
      if (selected) drawBBox(w, h);
    } else if (layer.type === "text") {
      ctx.fillStyle = layer.color || "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${layer.size || 48}px system-ui`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.strokeText(layer.text, 0, 0);
      ctx.fillText(layer.text, 0, 0);
      if (selected) {
        const metrics = ctx.measureText(layer.text);
        const w = metrics.width;
        const h = (layer.size || 48);
        drawBBox(w, h);
      }
    }
    ctx.restore();
  });

  // 4) Overlays (frames always on top)
  overlays.forEach(img => {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  });
}

function drawBBox(w, h) {
  ctx.save();
  ctx.strokeStyle = "#0d6efd";
  ctx.lineWidth = 2;
  ctx.setLineDash([6,4]);
  ctx.strokeRect(-w/2, -h/2, w, h);
  ctx.restore();
}

function fitContain(srcW, srcH, maxW, maxH) {
  const r = Math.min(maxW/srcW, maxH/srcH);
  return { w: Math.round(srcW*r), h: Math.round(srcH*r) };
}

// === Background Input Listeners ===
bgColorInput.addEventListener('input', (e) => {
  backgroundColor = e.target.value;
  draw();
});

bgClearBtn.addEventListener('click', () => {
  backgroundColor = null; 
  draw();
});

function pickLayerAt(x, y) {
  // Naive: pick topmost whose bbox contains point (after inverse transform)
  for (let i = layers.length - 1; i >= 0; i--) {
    const L = layers[i];
    const dx = x - L.x;
    const dy = y - L.y;
    const ang = -(L.rot || 0);
    const rx = dx * Math.cos(ang) - dy * Math.sin(ang);
    const ry = dx * Math.sin(ang) + dy * Math.cos(ang);
    if (L.type === "sticker") {
      const w = L.img.width * L.scale;
      const h = L.img.height * L.scale;
      if (rx >= -w/2 && rx <= w/2 && ry >= -h/2 && ry <= h/2) return i;
    } else if (L.type === "text") {
      // approximate bbox
      ctx.save();
      ctx.font = `bold ${L.size || 48}px system-ui`;
      const w = ctx.measureText(L.text).width;
      const h = (L.size || 48);
      ctx.restore();
      if (rx >= -w/2 && rx <= w/2 && ry >= -h/2 && ry <= h/2) return i;
    }
  }
  return -1;
}

function setActive(i) {
  activeIndex = i;
  updateInspector();
  draw();
}

function updateInspector() {
  if (activeIndex === -1) {
    layerInfo.textContent = "None";
    textEdit.value = "";
    return;
  }
  const L = layers[activeIndex];
  if (L.type === "text") {
    layerInfo.textContent = "Text Layer";
    textEdit.value = L.text;
    textColor.value = L.color || "#ffffff";
    textSize.value = L.size || 48;
  } else {
    layerInfo.textContent = "Sticker";
    textEdit.value = "";
  }
}

// === Photo Upload ===
photoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    baseImage = img;
    draw();
  };
  img.src = URL.createObjectURL(file);
});

// === Stickers & Overlays load ===
async function loadList(endpoint) {
  const res = await fetch(endpoint);
  if (!res.ok) return [];
  return res.json();
}

async function initAssets() {
  // stickers
  const stickerWrap = document.getElementById("stickers");
  const stickers = await loadList("/api/stickers");
  stickerWrap.innerHTML = "";
  stickers.forEach(s => {
    const img = document.createElement("img");
    img.src = s.url;
    img.title = s.name;
    img.addEventListener("click", () => addSticker(s.url));
    stickerWrap.appendChild(img);
  });

  // overlays
  const overlayWrap = document.getElementById("filtersOverlay");
  const overlaysList = await loadList("/api/filters");
  overlayWrap.innerHTML = "";
  overlaysList.forEach(s => {
    const img = document.createElement("img");
    img.src = s.url;
    img.title = s.name;
    img.addEventListener("click", () => toggleOverlay(s.url));
    overlayWrap.appendChild(img);
  });

  // songs
  const songs = await loadList("/api/songs");
  songsList.innerHTML = "";
  songs.forEach((s, idx) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = s.name;
    const btn = document.createElement("button");
    btn.textContent = "Play";
    btn.addEventListener("click", () => {
      player.src = s.url;
      player.play();
    });
    li.appendChild(span);
    li.appendChild(btn);
    songsList.appendChild(li);
    if (idx === 0) player.src = s.url;
  });
}

function addSticker(url) {
  const img = new Image();
  img.onload = () => {
    layers.push({
      type: "sticker",
      x: canvas.width/2,
      y: canvas.height/2,
      scale: Math.min(300 / Math.max(img.width, img.height), 1), // fit ~300px
      rot: 0,
      img
    });
    setActive(layers.length - 1);
  };
  img.crossOrigin = "anonymous";
  img.src = url;
}

function toggleOverlay(url) {
  // if already added, remove; else add
  const existing = overlays.find(o => o.src === url);
  if (existing) {
    overlays = overlays.filter(o => o.src !== url);
  } else {
    const img = new Image();
    img.onload = () => {
      overlays.push(img);
      draw();
    };
    img.crossOrigin = "anonymous";
    img.src = url;
  }
  draw();
}

// === Text ===
addTextBtn.addEventListener("click", () => {
  const text = prompt("Enter text:");
  if (!text) return;
  const layer = {
    type: "text",
    text,
    x: canvas.width/2,
    y: canvas.height/2,
    scale: 1,
    size: 64,
    color: "#ffffff",
    rot: 0
  };
  layers.push(layer);
  setActive(layers.length - 1);
});

textEdit.addEventListener("input", e => {
  if (activeIndex === -1) return;
  const L = layers[activeIndex];
  if (L.type !== "text") return;
  L.text = e.target.value;
  draw();
});

textColor.addEventListener("input", e => {
  if (activeIndex === -1) return;
  const L = layers[activeIndex];
  if (L.type !== "text") return;
  L.color = e.target.value;
  draw();
});

textSize.addEventListener("input", e => {
  if (activeIndex === -1) return;
  const L = layers[activeIndex];
  if (L.type !== "text") return;
  L.size = parseInt(e.target.value, 10);
  draw();
});

bringFront.addEventListener("click", () => {
  if (activeIndex === -1) return;
  const L = layers.splice(activeIndex, 1)[0];
  layers.push(L);
  setActive(layers.length - 1);
  draw();
});

sendBack.addEventListener("click", () => {
  if (activeIndex === -1) return;
  const L = layers.splice(activeIndex, 1)[0];
  layers.unshift(L);
  setActive(0);
  draw();
});

deleteLayer.addEventListener("click", () => {
  if (activeIndex === -1) return;
  layers.splice(activeIndex, 1);
  activeIndex = -1;
  updateInspector();
  draw();
});

// === Pointer interactions ===
let isDragging = false;
let dragOffset = {x:0, y:0};

canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const idx = pickLayerAt(x, y);
  setActive(idx);
  if (idx !== -1) {
    isDragging = true;
    dragOffset.x = x - layers[idx].x;
    dragOffset.y = y - layers[idx].y;
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!isDragging || activeIndex === -1) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const L = layers[activeIndex];
  L.x = x - dragOffset.x;
  L.y = y - dragOffset.y;
  draw();
});

canvas.addEventListener("pointerup", () => { isDragging = false; });
canvas.addEventListener("pointerleave", () => { isDragging = false; });

// Wheel: resize or rotate (hold R)
let rotateMode = false;
window.addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "r") rotateMode = true; });
window.addEventListener("keyup", (e) => { if (e.key.toLowerCase() === "r") rotateMode = false; });

canvas.addEventListener("wheel", (e) => {
  if (activeIndex === -1) return;
  e.preventDefault();
  const L = layers[activeIndex];
  if (rotateMode) {
    L.rot = (L.rot || 0) + (e.deltaY > 0 ? 0.05 : -0.05);
  } else {
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    if (L.type === "sticker") L.scale = Math.min(Math.max(L.scale * factor, 0.05), 5);
    if (L.type === "text") L.size = Math.min(Math.max((L.size || 48) * factor, 8), 300);
  }
  updateInspector();
  draw();
}, { passive: false });

// Delete key
window.addEventListener("keydown", (e) => {
  if (e.key === "Delete" && activeIndex !== -1) {
    layers.splice(activeIndex, 1);
    activeIndex = -1;
    updateInspector();
    draw();
  }
});

// === Filters (sliders) ===
const bind = (id, key, unit, labelId) => {
  const el = document.getElementById(id);
  const label = document.getElementById(labelId);
  el.addEventListener("input", () => {
    filters[key] = parseInt(el.value, 10);
    label.textContent = filters[key] + unit;
    draw();
  });
};

bind("f-brightness", "brightness", "%", "val-brightness");
bind("f-contrast", "contrast", "%", "val-contrast");
bind("f-saturate", "saturate", "%", "val-saturate");
bind("f-sepia", "sepia", "%", "val-sepia");
bind("f-grayscale", "grayscale", "%", "val-grayscale");
bind("f-blur", "blur", "px", "val-blur");
bind("f-hue", "hue", "°", "val-hue");

// === Download ===
downloadBtn.addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "story.png";
  a.click();
});

// === Init ===
initAssets();
draw();
function togglePanel(id) {
  const panel = document.getElementById(id);
  const btn = event.target;
  if (panel.style.display === "none") {
    panel.style.display = "block";
    btn.textContent = "▼ Filters";
  } else {
    panel.style.display = "none";
    btn.textContent = "▶ Filters";
  }
}


