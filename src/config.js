export const WIDTH = 960;
export const HEIGHT = 540;

export const COLS = 9;
export const ROWS = 5;

export const HUD_H = 72;
export const PLAY_H = HEIGHT - HUD_H;

export const CELL_W = WIDTH / COLS;
export const CELL_H = PLAY_H / ROWS;

export const ENEMY_W = CELL_W * 0.7;
export const ENEMY_H = CELL_H * 0.7;

export const DEF_W = CELL_W * 0.75;
export const DEF_H = CELL_H * 0.75;

export const PEA_R = 6;
export const PEA_SPEED = 420;

export const HOUSE_X = 10;

export const WAVES = [
  { duration: 18, spawnEvery: 2.2, enemyHp: 110, speedMin: 50, speedMax: 65 },
  { duration: 20, spawnEvery: 2.0, enemyHp: 125, speedMin: 52, speedMax: 70 },
  { duration: 22, spawnEvery: 1.8, enemyHp: 140, speedMin: 55, speedMax: 75 },
  { duration: 24, spawnEvery: 1.6, enemyHp: 160, speedMin: 58, speedMax: 80 },
  { duration: 26, spawnEvery: 1.4, enemyHp: 185, speedMin: 60, speedMax: 86 },
];

export const BREAK_DURATION = 6;

export const CARDS = [
  { id: "blocker", name: "Hay Bale", cost: 50, cooldown: 0.5 },
  { id: "shooter", name: "Pea Plant", cost: 100, cooldown: 0.8 },
];

export const START_COMPOST = 150;
export const PASSIVE_INCOME_PER_SEC = 4;
export const COMPOST_CAP = 999;