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
const projectiles = [];

const ENEMY_W = CELL_W * 0.7;
const ENEMY_H = CELL_H * 0.7;

const DEF_W = CELL_W * 0.75;
const DEF_H = CELL_H * 0.75;

const PEA_R = 6;
const PEA_SPEED = 420;

const HOUSE_X = 10;

let sun = 150;

const PASSIVE_INCOME_PER_SEC = 4;

const CARDS = [
    { id: "blocker", name: "Hay Bale", cost: 50, cooldown: 0.5 },
    { id: "shooter", name: "Pea Plant", cost: 100, cooldown: 0.8 },
    { id: "generator", name: "Composter", cost: 75, cooldown: 0.8 },
];

const cardState = new Map(CARDS.map((c) => [c.id, { lastUsed: -Infinity }]));
let selectedCardId = null;

let lastTs = performance.now();
const mouse = { x: 0, y: 0 };

let gameState = "playing";

const WAVES = [
    { duration: 18, spawnEvery: 2.2, enemyHp: 110, speedMin: 50, speedMax: 65 },
    { duration: 20, spawnEvery: 2.0, enemyHp: 125, speedMin: 52, speedMax: 70 },
    { duration: 22, spawnEvery: 1.8, enemyHp: 140, speedMin: 55, speedMax: 75 },
    { duration: 24, spawnEvery: 1.6, enemyHp: 160, speedMin: 58, speedMax: 80 },
    { duration: 26, spawnEvery: 1.4, enemyHp: 185, speedMin: 60, speedMax: 86 },
];

const BREAK_DURATION = 6;

let waveIndex = 0;
let phase = "wave"; // 'wave' | 'break'
let phaseTimer = 0;
let spawnTimer = 0;

function resetGame() {
    enemies.length = 0;
    defenders.length = 0;
    projectiles.length = 0;

    sun = 100;
    selectedCardId = null;

    waveIndex = 0;
    phase = "wave";
    phaseTimer = 0;
    spawnTimer = 0;

    for (const c of CARDS) cardState.get(c.id).lastUsed = -Infinity;

    gameState = "playing";
}

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

    ctx.strokeStyle = "#555";
    ctx.beginPath();
    ctx.moveTo(HOUSE_X, HUD_H);
    ctx.lineTo(HOUSE_X, HEIGHT);
    ctx.stroke();
}

function currentWave() {
    return WAVES[Math.min(waveIndex, WAVES.length - 1)];
}

function spawnEnemy() {
    const w = currentWave();
    const row = (Math.random() * ROWS) | 0;
    enemies.push({
        row,
        x: WIDTH + ENEMY_W / 2,
        y: rowCenterY(row),
        hp: w.enemyHp,
        maxHp: w.enemyHp,
        speed: w.speedMin + Math.random() * (w.speedMax - w.speedMin),
        biteEvery: 0.65,
        biteDamage: 22,
        biteTimer: 0,
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
        defenders.push({ ...base, hp: 320, maxHp: 320 });
        return true;
    }

    if (cardId === "shooter") {
        defenders.push({
            ...base,
            hp: 160,
            maxHp: 160,
            fireRate: 1.0,
            lastShot: -Infinity,
            damage: 20,
        });
        return true;
    }

    if (cardId === "generator") {
        defenders.push({
            ...base,
            hp: 120,
            maxHp: 120,
            produceEvery: 4.0,
            produceTimer: 0,
            produceAmount: 25,
        });
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

    if (gameState !== "playing") {
        resetGame();
        return;
    }

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

function nearestEnemyInRowAhead(row, xMin) {
    let best = null;
    let bestX = Infinity;
    for (const e of enemies) {
        if (e.row !== row) continue;
        if (e.x <= xMin) continue;
        if (e.x < bestX) {
            bestX = e.x;
            best = e;
        }
    }
    return best;
}

function updateDefenders(t) {
    for (const d of defenders) {
        if (d.id !== "shooter") continue;

        const target = nearestEnemyInRowAhead(d.row, d.x + DEF_W * 0.25);
        if (!target) continue;

        if (t - d.lastShot >= d.fireRate) {
            d.lastShot = t;
            projectiles.push({
                row: d.row,
                x: d.x + DEF_W * 0.35,
                y: d.y,
                r: PEA_R,
                speed: PEA_SPEED,
                damage: d.damage,
            });
        }
    }
}

function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.speed * dt;

        let hitEnemyIndex = -1;
        for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (e.row !== p.row) continue;

            const ex1 = e.x - ENEMY_W / 2;
            const ex2 = e.x + ENEMY_W / 2;
            const ey1 = e.y - ENEMY_H / 2;
            const ey2 = e.y + ENEMY_H / 2;

            if (p.x >= ex1 && p.x <= ex2 && p.y >= ey1 && p.y <= ey2) {
                hitEnemyIndex = j;
                break;
            }
        }

        if (hitEnemyIndex !== -1) {
            enemies[hitEnemyIndex].hp -= p.damage;
            projectiles.splice(i, 1);
            continue;
        }

        if (p.x > WIDTH + 20) projectiles.splice(i, 1);
    }
}

function updateGenerators(dt) {
  for (const d of defenders) {
    if (d.id !== "generator") continue;

    d.produceTimer += dt;
    while (d.produceTimer >= d.produceEvery) {
      d.produceTimer -= d.produceEvery;
      sun = Math.min(999, sun + d.produceAmount);
    }
  }
}

function findFrontDefenderForEnemy(e) {
    let best = null;
    let bestDx = Infinity;

    for (const d of defenders) {
        if (d.row !== e.row) continue;
        const dx = e.x - d.x;
        if (dx < 0) continue;
        if (dx < bestDx) {
            bestDx = dx;
            best = d;
        }
    }
    return best;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function updateEnemies(dt) {
    for (const e of enemies) {
        const target = findFrontDefenderForEnemy(e);

        if (target) {
            const enemyX = e.x - ENEMY_W / 2;
            const enemyY = e.y - ENEMY_H / 2;
            const defX = target.x - DEF_W / 2;
            const defY = target.y - DEF_H / 2;

            const touching = rectsOverlap(enemyX, enemyY, ENEMY_W, ENEMY_H, defX, defY, DEF_W, DEF_H);

            if (touching) {
                e.biteTimer += dt;
                while (e.biteTimer >= e.biteEvery) {
                    e.biteTimer -= e.biteEvery;
                    target.hp -= e.biteDamage;
                }
                continue;
            }
        }

        e.biteTimer = 0;
        e.x -= e.speed * dt;

        if (e.x - ENEMY_W / 2 <= HOUSE_X) gameState = "gameOver";
    }
}

function cleanup() {
    for (let i = defenders.length - 1; i >= 0; i--) {
        if (defenders[i].hp <= 0) defenders.splice(i, 1);
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].hp <= 0) enemies.splice(i, 1);
    }
}

function updateWaves(dt) {
    if (waveIndex >= WAVES.length) {
        if (enemies.length === 0) gameState = "victory";
        return;
    }

    phaseTimer += dt;
    sun = Math.min(999, sun + 60);

    if (phase === "wave") {
        const w = currentWave();
        spawnTimer += dt;
        while (spawnTimer >= w.spawnEvery) {
            spawnTimer -= w.spawnEvery;
            spawnEnemy();
        }

        if (phaseTimer >= w.duration) {
            phase = "break";
            phaseTimer = 0;
            spawnTimer = 0;
        }
    } else {
        if (phaseTimer >= BREAK_DURATION) {
            phase = "wave";
            phaseTimer = 0;
            spawnTimer = 0;
            waveIndex += 1;
            sun = Math.min(999, sun + 60);
        }
    }
}

function update(dt) {
    if (gameState !== "playing") return;

    sun += dt * PASSIVE_INCOME_PER_SEC;
    if (sun > 999) sun = 999;

    updateWaves(dt);

    updateGenerators(dt);

    const t = nowSeconds();
    updateDefenders(t);
    updateProjectiles(dt);
    updateEnemies(dt);
    cleanup();
}

function renderHud() {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, WIDTH, HUD_H);

    ctx.fillStyle = "#e6e6e6";
    ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`Compost: ${Math.floor(sun)}`, WIDTH - 160, 28);

    const waveText = waveIndex < WAVES.length ? `Wave ${waveIndex + 1}/${WAVES.length}` : `Finale`;
    const phaseText = phase === "wave" ? "Fighting" : "Preparing";
    ctx.fillStyle = "#bdbdbd";
    ctx.fillText(`${waveText} — ${phaseText}`, WIDTH - 260, 52);

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
    if (!selectedCardId || gameState !== "playing") return;
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
        else if (d.id === "shooter") ctx.fillStyle = "#4aa3ff";
        else ctx.fillStyle = "#ffd36a";
        
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
        const hp01 = Math.max(0, Math.min(1, e.hp / e.maxHp));
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

function renderProjectiles() {
    for (const p of projectiles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "#a6ff7a";
        ctx.fill();
    }
}

function renderOverlay() {
    if (gameState === "playing") return;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffffff";
    ctx.font = "28px system-ui, -apple-system, Segoe UI, Roboto, Arial";

    const title = gameState === "victory" ? "Victory" : "Game Over";
    ctx.fillText(title, WIDTH / 2 - (title === "Victory" ? 55 : 80), HEIGHT / 2 - 10);

    ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Click to restart", WIDTH / 2 - 70, HEIGHT / 2 + 20);
}

function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    renderHud();
    drawGrid();
    renderDefenders();
    renderEnemies();
    renderProjectiles();
    renderGhost();
    renderOverlay();
}

function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);