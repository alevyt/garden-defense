const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = 960;
const HEIGHT = 540;
canvas.width = WIDTH;
canvas.height = HEIGHT;

const COLS = 9;
const ROWS = 5;

const CELL_W = WIDTH / COLS;
const CELL_H = HEIGHT / ROWS;

const enemies = [];

const ENEMY_W = CELL_W * 0.7;
const ENEMY_H = CELL_H * 0.7;

let spawnEvery = 1.8;
let spawnTimer = 0;

let lastTs = performance.now();

function drawGrid() {
  ctx.strokeStyle = "#333";
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_W, 0);
    ctx.lineTo(c * CELL_W, HEIGHT);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL_H);
    ctx.lineTo(WIDTH, r * CELL_H);
    ctx.stroke();
  }
}

function rowCenterY(row) {
  return row * CELL_H + CELL_H / 2;
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

function update(dt) {
  spawnTimer += dt;
  while (spawnTimer >= spawnEvery) {
    spawnTimer -= spawnEvery;
    spawnEnemy();
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.x -= e.speed * dt;
    if (e.x < -ENEMY_W) enemies.splice(i, 1);
  }
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawGrid();

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

function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);