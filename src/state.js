import { CARDS, COMPOST_CAP, START_COMPOST, WAVES } from "./config.js";

export const enemies = [];
export const defenders = [];
export const projectiles = [];

export let sun = START_COMPOST;
export let selectedCardId = null;

export let gameState = "playing";

export let waveIndex = 0;
export let phase = "wave";
export let phaseTimer = 0;
export let spawnTimer = 0;

export const cardState = new Map(CARDS.map((c) => [c.id, { lastUsed: -Infinity }]));

export function setSelectedCardId(v) {
  selectedCardId = v;
}

export function addCompost(amount) {
  sun = Math.min(COMPOST_CAP, sun + amount);
}

export function spendCompost(amount) {
  sun = Math.max(0, sun - amount);
}

export function setGameState(v) {
  gameState = v;
}

export function incWave() {
  waveIndex += 1;
}

export function setPhase(v) {
  phase = v;
}

export function resetPhaseTimers() {
  phaseTimer = 0;
  spawnTimer = 0;
}

export function tickPhaseTimer(dt) {
  phaseTimer += dt;
}

export function tickSpawnTimer(dt) {
  spawnTimer += dt;
}

export function popSpawnTimer(period) {
  spawnTimer -= period;
}

export function resetGame() {
  enemies.length = 0;
  defenders.length = 0;
  projectiles.length = 0;

  sun = START_COMPOST;
  selectedCardId = null;

  waveIndex = 0;
  phase = "wave";
  phaseTimer = 0;
  spawnTimer = 0;

  for (const c of WAVES) {}
  for (const c of CARDS) cardState.get(c.id).lastUsed = -Infinity;

  gameState = "playing";
}