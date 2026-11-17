// Nova Keeper — the run itself: waves, shooting, collisions, scoring, combo,
// upgrades, nova and the win/lose conditions. The renderer only paints what
// this file keeps; input only feeds it a controls object each step.
import {
  STEP, FIELD, CENTER, CORE, TURRET, NOVA, COMBO, WAVES, UPGRADES,
} from './config.js';
import { moveEnemy, pickKind, spawnEnemy, splitEnemy } from './enemies.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_KILL = 16;
export const EVENT_NOVA = 32;

export const PHASE_DEMO = 'demo';
export const PHASE_PLAY = 'play';
export const PHASE_UPGRADE = 'upgrade';
export const PHASE_OVER = 'over';
export const PHASE_WIN = 'win';

function freshModifiers() {
  return {
    fireInterval: TURRET.fireInterval,
    boltDamage: TURRET.boltDamage,
    boltsPerShot: 1,
    pierce: 0,
    boltSpeed: TURRET.boltSpeed,
    boltLife: TURRET.boltLife,
    novaMax: NOVA.startCharges,
  };
}

export function createWorld(random) {
  const state = {
    random,
    phase: PHASE_DEMO,
    time: 0,
    score: 0,
    wave: 1,
    coreHp: CORE.maxHp,
    coreMaxHp: CORE.maxHp,
    nova: NOVA.startCharges,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    enemies: [],
    bolts: [],
    particles: [],
    floaters: [],
    stars: [],
    spawnQueue: [],
    spawnTimer: 0,
    fireTimer: 0,
    shake: 0,
    turretAngle: -Math.PI / 2,
    modifiers: freshModifiers(),
    upgradeChoices: [],
    demoTimer: 0,
  };

  function buildStars() {
    state.stars = [];
    for (let i = 0; i < 110; i += 1) {
      state.stars.push({
        x: random.range(0, FIELD.width),
        y: random.range(0, FIELD.height),
        r: random.range(0.5, 1.8),
        phase: random.range(0, Math.PI * 2),
        speed: random.range(0.4, 1.4),
      });
    }
  }

  function buildWave(wave) {
    let budget = WAVES.budget(wave);
    const queue = [];
    let guard = 0;
    while (budget > 0 && guard < 200) {
      guard += 1;
      const kind = pickKind(random, wave);
      const cost = { mote: 1, darter: 2, splitter: 3, weaver: 3, bulwark: 5 }[kind];
      if (cost > budget) continue;
      queue.push(kind);
      budget -= cost;
    }
    // Shuffle so the wave does not arrive in kind order.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random.next() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    state.spawnQueue = queue;
    state.spawnTimer = 0.6;
  }

  function pickUpgrades() {
    const pool = UPGRADES.filter((u) => {
      if (u.id === 'nova' && state.modifiers.novaMax >= 3) return false;
      if (u.id === 'plate' && state.coreHp >= state.coreMaxHp) return false;
      return true;
    });
    const choices = [];
    const bag = [...pool];
    while (choices.length < 3 && bag.length > 0) {
      const index = Math.floor(random.next() * bag.length);
      choices.push(bag.splice(index, 1)[0]);
    }
    while (choices.length < 3) choices.push(UPGRADES[0]);
    state.upgradeChoices = choices;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, Math.PI * 2);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: random.range(0.3, 0.7),
        maxLife: 0.7,
        size: random.range(1.5, 3.5),
        color,
      });
    }
  }

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function multiplier() {
    return Math.min(COMBO.max, 1 + state.combo * COMBO.step);
  }

  function killEnemy(enemy, index, award) {
    state.enemies.splice(index, 1);
    state.kills += 1;
    if (award) {
      state.combo += 1;
      state.comboTimer = COMBO.window;
      const gained = Math.round(enemy.score * multiplier());
      state.score += gained;
      floater(enemy.x, enemy.y - 10, `+${gained}`, '#ffe9a8');
    }
    burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'bulwark' ? 26 : 14, 170);
    if (enemy.kind === 'splitter' && award) {
      for (const child of splitEnemy(random, enemy, state.wave)) {
        state.enemies.push(child);
      }
    }
  }

  function fireBolts(aimX, aimY) {
    const m = state.modifiers;
    const angle = Math.atan2(aimY - CENTER.y, aimX - CENTER.x);
    state.turretAngle = angle;
    const n = m.boltsPerShot;
    const tipX = CENTER.x + Math.cos(angle) * (TURRET.orbit + 16);
    const tipY = CENTER.y + Math.sin(angle) * (TURRET.orbit + 16);
    for (let i = 0; i < n; i += 1) {
      const spread = (i - (n - 1) / 2) * 0.14;
      const a = angle + spread;
      state.bolts.push({
        x: tipX, y: tipY,
        vx: Math.cos(a) * m.boltSpeed,
        vy: Math.sin(a) * m.boltSpeed,
        life: m.boltLife,
        damage: m.boltDamage,
        pierce: m.pierce,
        radius: TURRET.boltRadius,
      });
    }
    state.shotsFired += n;
    state.fireTimer = m.fireInterval;
  }

  function doNova() {
    if (state.nova <= 0 || state.enemies.length === 0) return EVENT_NONE;
    state.nova -= 1;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      burst(enemy.x, enemy.y, '#bfe9ff', 10, 200);
      killEnemy(enemy, i, true);
    }
    state.shake = Math.max(state.shake, 10);
    return EVENT_NOVA;
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - 40 * dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
  }

  function updateBolts(dt) {
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = state.bolts[i];
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (bolt.life <= 0 || bolt.x < -20 || bolt.x > FIELD.width + 20 || bolt.y < -20 || bolt.y > FIELD.height + 20) {
        state.bolts.splice(i, 1);
      }
    }
  }

  function updateEnemies(dt) {
    let events = EVENT_NONE;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      moveEnemy(enemy, dt);
      const dist = Math.hypot(enemy.x - CENTER.x, enemy.y - CENTER.y);
      if (dist < CORE.radius + enemy.radius) {
        state.enemies.splice(i, 1);
        state.coreHp -= enemy.damage;
        state.combo = 0;
        state.comboTimer = 0;
        state.shake = Math.max(state.shake, 14);
        burst(CENTER.x, CENTER.y, '#ff5d5d', 18, 220);
        floater(CENTER.x, CENTER.y - 44, `-${enemy.damage}`, '#ff8d8d');
        events |= EVENT_HIT;
        if (state.coreHp <= 0) {
          state.coreHp = 0;
          state.phase = PHASE_OVER;
          burst(CENTER.x, CENTER.y, '#ffd76a', 60, 320);
          events |= EVENT_OVER;
        }
      }
    }
    return events;
  }

  function collideBolts() {
    let events = EVENT_NONE;
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = state.bolts[i];
      let spent = false;
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        const dist = Math.hypot(bolt.x - enemy.x, bolt.y - enemy.y);
        if (dist < bolt.radius + enemy.radius) {
          enemy.hp -= bolt.damage;
          enemy.flash = 0.09;
          state.shotsHit += 1;
          if (enemy.hp <= 0) {
            killEnemy(enemy, j, true);
            events |= EVENT_KILL;
          }
          if (bolt.pierce > 0) {
            bolt.pierce -= 1;
          } else {
            spent = true;
          }
          break;
        }
      }
      if (spent) state.bolts.splice(i, 1);
    }
    return events;
  }

  function stepPlay(dt, controls) {
    let events = EVENT_NONE;
    state.time += dt;
    state.fireTimer -= dt;

    if (controls.nova) events |= doNova();
    if (controls.firing && state.fireTimer <= 0) fireBolts(controls.aimX, controls.aimY);
    else state.turretAngle = Math.atan2(controls.aimY - CENTER.y, controls.aimX - CENTER.x);

    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        // Enemies arrive in bursts that grow with the wave: one at a time
        // early, up to four at once late, so the turret cannot pick them
        // off one by one forever.
        const group = Math.min(1 + Math.floor((state.wave - 1) / 3), 4, state.spawnQueue.length);
        for (let g = 0; g < group; g += 1) {
          const kind = state.spawnQueue.shift();
          state.enemies.push(spawnEnemy(random, kind, state.wave));
        }
        state.spawnTimer = WAVES.spawnInterval(state.wave) * random.range(0.7, 1.3);
      }
    }

    updateBolts(dt);
    events |= collideBolts();
    events |= updateEnemies(dt);
    updateParticles(dt);

    if (state.phase === PHASE_PLAY && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      if (state.wave >= WAVES.total) {
        state.phase = PHASE_WIN;
        events |= EVENT_WIN;
      } else {
        state.phase = PHASE_UPGRADE;
        state.nova = Math.min(state.modifiers.novaMax, state.nova + NOVA.perWave);
        pickUpgrades();
        events |= EVENT_WAVE_CLEAR;
      }
    }
    return events;
  }

  function stepDemo(dt) {
    state.time += dt;
    state.demoTimer -= dt;
    if (state.demoTimer <= 0) {
      state.enemies.push(spawnEnemy(random, 'mote', 1));
      state.demoTimer = random.range(0.9, 1.8);
    }
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      moveEnemy(enemy, dt);
      const dist = Math.hypot(enemy.x - CENTER.x, enemy.y - CENTER.y);
      if (dist < CORE.radius + 90) {
        burst(enemy.x, enemy.y, enemy.color, 6, 90);
        state.enemies.splice(i, 1);
      }
    }
    updateParticles(dt);
    return EVENT_NONE;
  }

  const world = {
    state,
    reset() {
      state.phase = PHASE_PLAY;
      state.time = 0;
      state.score = 0;
      state.wave = 1;
      state.coreHp = CORE.maxHp;
      state.coreMaxHp = CORE.maxHp;
      state.nova = NOVA.startCharges;
      state.combo = 0;
      state.comboTimer = 0;
      state.kills = 0;
      state.shotsFired = 0;
      state.shotsHit = 0;
      state.enemies = [];
      state.bolts = [];
      state.particles = [];
      state.floaters = [];
      state.spawnQueue = [];
      state.spawnTimer = 0;
      state.fireTimer = 0;
      state.shake = 0;
      state.turretAngle = -Math.PI / 2;
      state.modifiers = freshModifiers();
      state.upgradeChoices = [];
      state.demoTimer = 0;
      buildStars();
      buildWave(1);
    },
    startDemo() {
      state.phase = PHASE_DEMO;
      state.time = 0;
      state.enemies = [];
      state.bolts = [];
      state.particles = [];
      state.floaters = [];
      state.demoTimer = 0;
      buildStars();
    },
    /** One fixed step. controls: { aimX, aimY, firing, nova, upgradePick }. */
    step(dt, controls) {
      if (state.phase === PHASE_DEMO) return stepDemo(dt);
      if (state.phase === PHASE_UPGRADE) {
        updateParticles(dt);
        const pick = controls.upgradePick || 0;
        if (pick >= 1 && pick <= state.upgradeChoices.length) {
          const upgrade = state.upgradeChoices[pick - 1];
          upgrade.apply(state.modifiers, state);
          state.upgradeChoices = [];
          state.wave += 1;
          buildWave(state.wave);
          state.phase = PHASE_PLAY;
        }
        return EVENT_NONE;
      }
      if (state.phase !== PHASE_PLAY) {
        updateParticles(dt);
        return EVENT_NONE;
      }
      return stepPlay(dt, controls);
    },
    accuracy() {
      return state.shotsFired === 0 ? 0 : Math.round((state.shotsHit / state.shotsFired) * 100);
    },
    multiplier() {
      return multiplier();
    },
    enemiesLeft() {
      return state.enemies.length + state.spawnQueue.length;
    },
  };

  return world;
}
