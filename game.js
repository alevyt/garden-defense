const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = 960;
const HEIGHT = 540;
canvas.width = WIDTH;
canvas.height = HEIGHT;

const COLS = 9;
const ROWS = 5;

const HUD_H = 72;
const PLAY_H = HEIGHT - HUD_H;

const CELL_W = WIDTH / COLS;
const CELL_H = PLAY_H / ROWS;

const enemies = [];
const defenders = [];

const ENEMY_W = CELL_W * 0.7;
const ENEMY_H = CELL_H * 0.7;

const DEF_W = CELL_W * 0.75;
const DEF_H = CELL_H * 0.75;

let spawnEvery = 1.8;
let spawnTimer = 0;

let sun = 100;

const CARDS = [
  { id: "blocker", name: "Hay Bale", cost: 50, cooldown: 0.5 },
  { id: "shooter", name: "Pea Plant", cost: 100, cooldown: 0.8 },
];

const cardState = new Map(CARDS.map((c) => [c.id, { lastUsed: -Infinity }]));
let selectedCardId = null;

let lastTs = performance.now();

function rowCenterY(row) {
  return HUD_H + row * CELL_H + CELL_H / 2;
}

function colCenterX(col) {
  return col * CELL_W + CELL_W / 2;
}

function drawGrid() {
  ctx.strokeStyle = "#333";
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_W, HUD_H);
    ctx.lineTo(c * CELL_W, HEIGHT);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, HUD_H + r * CELL_H);
    ctx.lineTo(WIDTH, HUD_H + r * CELL_H);
    ctx.stroke();
  }
}

function spawnEnemy() {
  const row = (Math.random() * ROWS) | 0;
  enemies.push({
    row,
    x: WIDTH + ENEMY_W / 2,
    y: rowCenterY(row),
    hp: 100,
    speed: 55 + Math.random() * 20,
  });
}

function tileFromMouse(mx, my) {
  if (my < HUD_H) return null;
  const col = Math.floor(mx / CELL_W);
  const row = Math.floor((my - HUD_H) / CELL_H);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { row, col };
}

function defenderAt(row, col) {
  return defenders.find((d) => d.row === row && d.col === col) || null;
}

function nowSeconds() {
  return performance.now() / 1000;
}

function canUseCard(card) {
  const st = cardState.get(card.id);
  const t = nowSeconds();
  return t - st.lastUsed >= card.cooldown && sun >= card.cost;
}

function useCard(card) {
  const st = cardState.get(card.id);
  st.lastUsed = nowSeconds();
  sun -= card.cost;
}

function placeDefender(cardId, row, col) {
  if (defenderAt(row, col)) return false;
  const card = CARDS.find((c) => c.id === cardId);
  if (!card) return false;
  if (!canUseCard(card)) return false;

  useCard(card);

  const base = {
    id: cardId,
    row,
    col,
    x: colCenterX(col),
    y: rowCenterY(row),
  };

  if (cardId === "blocker") {
    defenders.push({ ...base, hp: 300, maxHp: 300 });
    return true;
  }

  if (cardId === "shooter") {
    defenders.push({ ...base, hp: 140, maxHp: 140, fireRate: 1.0, lastShot: -Infinity });
    return true;
  }

  return false;
}

function cardRects() {
  const pad = 12;
  const w = 150;
  const h = HUD_H - pad * 2;
  const y = pad;
  const res = [];
  for (let i = 0; i < CARDS.length; i++) {
    const x = pad + i * (w + 10);
    res.push({ ...CARDS[i], x, y, w, h });
  }
  return res;
}

function cardAt(mx, my) {
  for (const r of cardRects()) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r;
  }
  return null;
}

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);

  const c = cardAt(mx, my);
  if (c) {
    selectedCardId = selectedCardId === c.id ? null : c.id;
    return;
  }

  if (!selectedCardId) return;

  const tile = tileFromMouse(mx, my);
  if (!tile) return;

  const placed = placeDefender(selectedCardId, tile.row, tile.col);
  if (placed) selectedCardId = null;
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") selectedCardId = null;
});

const mouse = { x: 0, y: 0 };

function update(dt) {
  spawnTimer += dt;
  while (spawnTimer >= spawnEvery) {
    spawnTimer -= spawnEvery;
    spawnEnemy();
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i];
    en.x -= en.speed * dt;
    if (en.x < -ENEMY_W) enemies.splice(i, 1);
  }

  sun += dt * 3;
  if (sun > 999) sun = 999;
}

function renderHud() {
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, WIDTH, HUD_H);

  ctx.fillStyle = "#e6e6e6";
  ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Compost: ${Math.floor(sun)}`, WIDTH - 160, 28);

  for (const r of cardRects()) {
    const selected = r.id === selectedCardId;
    const usable = canUseCard(r);

    ctx.fillStyle = selected ? "#2b2b2b" : "#242424";
    ctx.fillRect(r.x, r.y, r.w, r.h);

    ctx.strokeStyle = selected ? "#e6e6e6" : "#3a3a3a";
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = 1;

    ctx.fillStyle = "#e6e6e6";
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(r.name, r.x + 10, r.y + 22);

    ctx.fillStyle = "#bdbdbd";
    ctx.fillText(`Cost: ${r.cost}`, r.x + 10, r.y + 44);

    if (!usable) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }
}

function renderGhost() {
  if (!selectedCardId) return;
  const tile = tileFromMouse(mouse.x, mouse.y);
  if (!tile) return;
  const occupied = !!defenderAt(tile.row, tile.col);

  const x = colCenterX(tile.col);
  const y = rowCenterY(tile.row);

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = occupied ? "#ff4d4d" : "#7aa7ff";
  ctx.fillRect(x - DEF_W / 2, y - DEF_H / 2, DEF_W, DEF_H);
  ctx.globalAlpha = 1;
}

function renderDefenders() {
  for (const d of defenders) {
    if (d.id === "blocker") ctx.fillStyle = "#d6b07b";
    else ctx.fillStyle = "#4aa3ff";

    ctx.fillRect(d.x - DEF_W / 2, d.y - DEF_H / 2, DEF_W, DEF_H);

    const barW = DEF_W;
    const barH = 6;
    const hp01 = Math.max(0, Math.min(1, d.hp / d.maxHp));
    const bx = d.x - barW / 2;
    const by = d.y - DEF_H / 2 - 10;

    ctx.fillStyle = "#222";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = "#60d66a";
    ctx.fillRect(bx, by, barW * hp01, barH);
    ctx.strokeStyle = "#111";
    ctx.strokeRect(bx, by, barW, barH);
  }
}

function renderEnemies() {
  for (const e of enemies) {
    ctx.fillStyle = "#7bd67b";
    ctx.fillRect(e.x - ENEMY_W / 2, e.y - ENEMY_H / 2, ENEMY_W, ENEMY_H);

    const barW = ENEMY_W;
    const barH = 6;
    const hp01 = Math.max(0, Math.min(1, e.hp / 100));
    const bx = e.x - barW / 2;
    const by = e.y - ENEMY_H / 2 - 10;

    ctx.fillStyle = "#222";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = "#ff4d4d";
    ctx.fillRect(bx, by, barW * hp01, barH);
    ctx.strokeStyle = "#111";
    ctx.strokeRect(bx, by, barW, barH);
  }
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  renderHud();
  drawGrid();
  renderDefenders();
  renderEnemies();
  renderGhost();
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);