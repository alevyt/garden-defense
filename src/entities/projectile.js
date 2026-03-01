import { ENEMY_H, ENEMY_W, PEA_SPEED, WIDTH } from "../config.js";
import { enemies, projectiles } from "../state.js";

export function spawnPea({ row, x, y, r, damage }) {
  projectiles.push({ row, x, y, r, speed: PEA_SPEED, damage });
}

export function updateProjectiles(dt) {
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

export function renderProjectiles(ctx) {
  for (const p of projectiles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "#a6ff7a";
    ctx.fill();
  }
}