import { CARDS, COMPOST_CAP, HEIGHT, HUD_H, WIDTH, WAVES } from "./config.js";

export function cardRects() {
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

export function cardAt(mx, my) {
  for (const r of cardRects()) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r;
  }
  return null;
}

export function renderHud(ctx, { compost, selectedCardId, canUseCard, waveIndex, phase }) {
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, WIDTH, HUD_H);

  const c = Math.max(0, Math.min(COMPOST_CAP, compost));

  ctx.fillStyle = "#e6e6e6";
  ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Compost: ${Math.floor(c)}`, WIDTH - 160, 28);

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

export function renderOverlay(ctx, gameState) {
  if (gameState === "playing") return;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.font = "28px system-ui, -apple-system, Segoe UI, Roboto, Arial";

  const title = gameState === "victory" ? "Victory" : "Game Over";
  const offset = title === "Victory" ? 55 : 80;
  ctx.fillText(title, WIDTH / 2 - offset, HEIGHT / 2 - 10);

  ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("Click to restart", WIDTH / 2 - 70, HEIGHT / 2 + 20);
}