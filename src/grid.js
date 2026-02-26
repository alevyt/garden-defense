import { CELL_H, CELL_W, HEIGHT, HOUSE_X, HUD_H, ROWS, COLS, WIDTH } from "./config.js";

export function rowCenterY(row) {
  return HUD_H + row * CELL_H + CELL_H / 2;
}

export function colCenterX(col) {
  return col * CELL_W + CELL_W / 2;
}

export function tileFromMouse(mx, my) {
  if (my < HUD_H) return null;
  const col = Math.floor(mx / CELL_W);
  const row = Math.floor((my - HUD_H) / CELL_H);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { row, col };
}

export function drawGrid(ctx) {
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