// Nova Keeper — tuning constants. One place for every number the rest of the game
// reads, so balancing is a matter of editing this file and nothing else.
export const STEP = 1 / 60;

export const FIELD = { width: 960, height: 600 };
export const CENTER = { x: FIELD.width / 2, y: FIELD.height / 2 };

export const CORE = {
  radius: 26,
  maxHp: 100,
  /** Damage one mote deals when it reaches the core. */
  hitDamage: 8,
};

export const TURRET = {
  /** Distance from the core centre to the gun ring. */
  orbit: 52,
  fireInterval: 0.2,
  boltSpeed: 560,
  boltDamage: 1,
  boltLife: 1.1,
  boltRadius: 4,
};

export const NOVA = {
  startCharges: 1,
  maxCharges: 3,
  /** Charges granted when a wave is cleared. */
  perWave: 1,
  /** Enemies this close to the core are destroyed by a nova. */
  radius: 9999,
};

export const COMBO = {
  /** Seconds a kill chain survives without another kill. */
  window: 2.5,
  /** Multiplier step per kill, capped at max. */
  step: 0.1,
  max: 5,
};

export const WAVES = {
  total: 10,
  /** Seconds of calm between waves, while the upgrade cards are up. */
  betweenSeconds: 9999, // upgrade phase waits for the player to pick
  /** Spawn budget in points for wave n (1-based). */
  budget: (n) => 12 + n * 6,
  /** Seconds between spawns at wave n. */
  spawnInterval: (n) => Math.max(0.25, 0.9 - n * 0.06),
  /** Enemy hit points scale up with the wave. */
  hpScale: (n) => 1 + Math.floor((n - 1) / 2),
  /** Enemy speed scale with the wave. */
  speedScale: (n) => 1 + (n - 1) * 0.05,
};

// Enemy kinds. cost: wave-budget points. hp: base hit points (scaled by
// WAVES.hpScale). speed: pixels per second toward the core. score: base
// points. color: the glow the renderer draws them in.
export const ENEMY_KINDS = {
  mote: { cost: 1, hp: 1, speed: 60, score: 10, radius: 11, color: '#ffb454', damage: 8 },
  darter: { cost: 2, hp: 1, speed: 125, score: 15, radius: 9, color: '#ff5da2', damage: 8 },
  splitter: { cost: 3, hp: 2, speed: 50, score: 20, radius: 15, color: '#4dd7ff', damage: 10 },
  weaver: { cost: 3, hp: 2, speed: 78, score: 25, radius: 11, color: '#7dff6a', damage: 8 },
  bulwark: { cost: 5, hp: 6, speed: 34, score: 40, radius: 19, color: '#ff5d5d', damage: 16 },
};

// Which kinds may appear from which wave on.
export const ENEMY_UNLOCK = [
  { wave: 1, kind: 'mote' },
  { wave: 2, kind: 'darter' },
  { wave: 3, kind: 'splitter' },
  { wave: 4, kind: 'weaver' },
  { wave: 5, kind: 'bulwark' },
];

// Upgrades offered between waves. apply(state) mutates the run's modifiers.
export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Coils',
    blurb: 'Fire 15% faster.',
    apply: (m) => { m.fireInterval *= 0.85; },
  },
  {
    id: 'heavy',
    name: 'Heavy Bolts',
    blurb: '+1 damage per bolt.',
    apply: (m) => { m.boltDamage += 1; },
  },
  {
    id: 'twin',
    name: 'Twin Barrels',
    blurb: '+1 bolt per shot, fanned out.',
    apply: (m) => { m.boltsPerShot += 1; },
  },
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    blurb: 'Bolts pass through +1 enemy.',
    apply: (m) => { m.pierce += 1; },
  },
  {
    id: 'nova',
    name: 'Nova Cell',
    blurb: '+1 nova charge (max 3).',
    apply: (m, s) => { m.novaMax = Math.min(3, m.novaMax + 1); s.nova += 1; },
  },
  {
    id: 'plate',
    name: 'Core Plating',
    blurb: 'Repair the core by 35 HP.',
    apply: (m, s) => { s.coreHp = Math.min(s.coreMaxHp, s.coreHp + 35); },
  },
  {
    id: 'swift',
    name: 'Swift Rounds',
    blurb: 'Bolts fly 30% faster and farther.',
    apply: (m) => { m.boltSpeed *= 1.3; m.boltLife *= 1.2; },
  },
];

export const BEST_KEY = 'nova-keeper-best';

export const COLORS = {
  background: '#070b18',
  star: '#cdd8ff',
  core: '#ffd76a',
  coreHot: '#fff3c4',
  turret: '#9fe8ff',
  bolt: '#ffe9a8',
  text: '#eaf2ff',
  dim: '#8fa3c8',
  danger: '#ff5d5d',
  good: '#7dff6a',
  card: '#131c33',
  cardEdge: '#2c3d63',
};
