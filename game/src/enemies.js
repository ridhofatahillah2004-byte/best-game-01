// Enemies: kinds, spawning and movement. Each enemy is a plain object the
// world updates; this file knows how each kind moves and what it looks like
// as data, while render.js decides how to draw it.
import { ENEMY_KINDS, ENEMY_UNLOCK, FIELD, CENTER, WAVES } from './config.js';

let nextId = 1;

/** Kinds the player may meet from `wave` on. */
export function kindsForWave(wave) {
  return ENEMY_UNLOCK.filter((row) => row.wave <= wave).map((row) => row.kind);
}

/** Pick a kind for one spawn, weighted by cost so cheap kinds stay common. */
export function pickKind(random, wave) {
  const kinds = kindsForWave(wave);
  const bag = [];
  for (const kind of kinds) {
    const weight = Math.max(1, 6 - ENEMY_KINDS[kind].cost);
    for (let i = 0; i < weight; i += 1) bag.push(kind);
  }
  return random.pick(bag);
}

/** A point just outside the field edge, on a random side. */
function edgePoint(random) {
  const side = random.int(0, 3);
  const m = 30;
  if (side === 0) return { x: random.range(0, FIELD.width), y: -m };
  if (side === 1) return { x: FIELD.width + m, y: random.range(0, FIELD.height) };
  if (side === 2) return { x: random.range(0, FIELD.width), y: FIELD.height + m };
  return { x: -m, y: random.range(0, FIELD.height) };
}

export function spawnEnemy(random, kind, wave) {
  const def = ENEMY_KINDS[kind];
  const at = edgePoint(random);
  const angle = Math.atan2(CENTER.y - at.y, CENTER.x - at.x);
  const hpScale = WAVES.hpScale(wave);
  const speedScale = WAVES.speedScale(wave);
  return {
    id: nextId,
    kind,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    angle,
    hp: Math.max(1, Math.round(def.hp * hpScale)),
    maxHp: Math.max(1, Math.round(def.hp * hpScale)),
    speed: def.speed * speedScale * random.range(0.9, 1.1),
    radius: def.radius,
    score: def.score,
    damage: def.damage,
    color: def.color,
    /** Weavers ride a sine wave; darters zig-zag; both read this clock. */
    wobble: random.range(0, Math.PI * 2),
    flash: 0,
  };
}

/** Steer one enemy toward the core for `dt` seconds. */
export function moveEnemy(enemy, dt) {
  const dx = CENTER.x - enemy.x;
  const dy = CENTER.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  let vx = (dx / dist) * enemy.speed;
  let vy = (dy / dist) * enemy.speed;
  if (enemy.kind === 'weaver') {
    const px = -dy / dist;
    const py = dx / dist;
    const sway = Math.sin(enemy.wobble * 2.2) * 46;
    vx += px * sway;
    vy += py * sway;
  } else if (enemy.kind === 'darter') {
    const px = -dy / dist;
    const py = dx / dist;
    const zig = Math.sin(enemy.wobble * 5) > 0 ? 42 : -42;
    vx += px * zig;
    vy += py * zig;
  }
  enemy.wobble += dt;
  enemy.x += vx * dt;
  enemy.y += vy * dt;
  enemy.angle = Math.atan2(dy, dx);
  if (enemy.flash > 0) enemy.flash -= dt;
}

/** Split a splitter into two motes at its position. */
export function splitEnemy(random, enemy, wave) {
  const children = [];
  for (let i = 0; i < 2; i += 1) {
    const child = spawnEnemy(random, 'mote', wave);
    child.x = enemy.x + random.range(-14, 14);
    child.y = enemy.y + random.range(-14, 14);
    child.speed *= 1.35;
    children.push(child);
  }
  return children;
}

export function resetEnemyIds() {
  nextId = 1;
}
