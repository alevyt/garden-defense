import { cardAt, renderHud, renderOverlay } from "./ui.js";
import {
  BREAK_DURATION,
  CARDS,
  COMPOST_CAP,
  DEF_H,
  DEF_W,
  ENEMY_H,
  ENEMY_W,
  HEIGHT,
  HOUSE_X,
  HUD_H,
  PASSIVE_INCOME_PER_SEC,
  PEA_R,
  PEA_SPEED,
  ROWS,
  START_COMPOST,
  WAVES,
  WIDTH,
} from "./config.js";

import { colCenterX, drawGrid, rowCenterY, tileFromMouse } from "./grid.js";
import {
  addCompost,
  cardState,
  defenders,
  enemies,
  gameState,
  incWave,
  phase,
  phaseTimer,
  popSpawnTimer,
  projectiles,
  resetGame,
  resetPhaseTimers,
  selectedCardId,
  setGameState,
  setPhase,
  setSelectedCardId,
  spendCompost,
  spawnTimer,
  sun,
  tickPhaseTimer,
  tickSpawnTimer,
  waveIndex,
} from "./state.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = WIDTH;
canvas.height = HEIGHT;

let lastTs = performance.now();
const mouse = { x: 0, y: 0 };

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
      sun = Math.min(COMPOST_CAP, sun + d.produceAmount);
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
    sun = Math.min(COMPOST_CAP, sun + 60);

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
            sun = Math.min(COMPOST_CAP, sun + 60);
        }
    }
}

function update(dt) {
    if (gameState !== "playing") return;

    sun += dt * PASSIVE_INCOME_PER_SEC;
    if (sun > COMPOST_CAP) sun = COMPOST_CAP;

    updateWaves(dt);

    updateGenerators(dt);

    const t = nowSeconds();
    updateDefenders(t);
    updateProjectiles(dt);
    updateEnemies(dt);
    cleanup();
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

function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    renderHud(ctx, { compost: sun, selectedCardId, canUseCard, waveIndex, phase });
    drawGrid(ctx);
    renderDefenders();
    renderEnemies();
    renderProjectiles();
    renderGhost();
    renderOverlay(ctx, gameState)
}

function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);