// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by an autopilot, so the frame is what a short game really looks
// like and the same seed always gives the same frame.
import { CENTER, STEP } from './config.js';
import { PHASE_OVER, PHASE_PLAY, PHASE_UPGRADE, EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const UPGRADE_LIMIT_SECONDS = 240;
const END_LIMIT_SECONDS = 600;

/** The enemy closest to the core, or null when the field is empty. */
function mostDangerous(state) {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    const dist = Math.hypot(enemy.x - CENTER.x, enemy.y - CENTER.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  return best;
}

/** Good play: lead the most dangerous enemy, fire always, nova when swarmed. */
function goodPilot(state) {
  const target = mostDangerous(state);
  let aimX = CENTER.x;
  let aimY = CENTER.y - 100;
  if (target) {
    const dist = Math.hypot(target.x - CENTER.x, target.y - CENTER.y) || 1;
    const flight = dist / 560;
    // Lead along its velocity toward the core.
    const lead = flight * target.speed;
    aimX = target.x + ((CENTER.x - target.x) / dist) * lead;
    aimY = target.y + ((CENTER.y - target.y) / dist) * lead;
  }
  let close = 0;
  for (const enemy of state.enemies) {
    if (Math.hypot(enemy.x - CENTER.x, enemy.y - CENTER.y) < 240) close += 1;
  }
  return {
    aimX, aimY,
    firing: state.enemies.length > 0,
    nova: close >= 5 && state.nova > 0,
    upgradePick: 0,
  };
}

/** Bad play: stare at a corner, never fire, never nova — the core falls. */
function badPilot() {
  return { aimX: 0, aimY: 0, firing: false, nova: false, upgradePick: 0 };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play' || name === 'upgrade' || name === 'end') {
    world.reset();
  } else {
    world.startDemo();
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, badPilot());
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const controls = goodPilot(world.state);
      // If a wave clears mid-scene, take the first upgrade and keep playing,
      // so the frame stays in the action instead of on the upgrade screen.
      if (world.state.phase === PHASE_UPGRADE) controls.upgradePick = 1;
      if (world.step(STEP, controls) & EVENT_OVER) break;
    }
    return { screen: world.state.phase === PHASE_OVER ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }

  if (name === 'upgrade') {
    for (let i = 0; i < UPGRADE_LIMIT_SECONDS / STEP; i += 1) {
      world.step(STEP, goodPilot(world.state));
      if (world.state.phase === PHASE_UPGRADE) break;
      if (world.state.phase === PHASE_OVER) break;
    }
    if (world.state.phase === PHASE_UPGRADE) return { screen: SCREEN_UPGRADE, best: world.state.score };
    return { screen: SCREEN_PLAY, best: world.state.score };
  }

  // end: the pilot defends well for the first stretch, so the game-over
  // screen shows a real run (score, kills, waves), then stops shooting and
  // lets the void take the core. When a wave clears by attrition it takes
  // the first upgrade, so the next wave comes and finishes the job.
  const END_GOOD_SECONDS = 20;
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const controls = world.state.time < END_GOOD_SECONDS ? goodPilot(world.state) : badPilot();
    if (world.state.phase === PHASE_UPGRADE) controls.upgradePick = 1;
    if (world.step(STEP, controls) & EVENT_OVER) break;
  }
  return { screen: world.state.phase === PHASE_OVER ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
