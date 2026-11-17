// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, upgrade, paused, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|upgrade|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_HIT, EVENT_KILL, EVENT_NOVA, EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 3.2);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let prevNovaHeld = false;
  let lastKillSound = 0;

  world.startDemo();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Defend the core through 10 waves.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.lose();
    announce(won ? `Victory. Score ${world.state.score}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function playSounds(events, now) {
    if (events & EVENT_KILL && now - lastKillSound > 70) {
      audio.pop();
      lastKillSound = now;
    }
    if (events & EVENT_HIT) audio.coreHit();
    if (events & EVENT_NOVA) audio.nova();
    if (events & EVENT_WAVE_CLEAR) audio.waveClear();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function controlsFor(now) {
    const aimPx = input.aim();
    const aim = renderer.toField(aimPx.x, aimPx.y);
    const novaHeld = input.novaHeld();
    const novaEdge = novaHeld && !prevNovaHeld;
    prevNovaHeld = novaHeld;
    return {
      aimX: aim.x,
      aimY: aim.y,
      firing: input.firing(),
      nova: novaEdge,
      upgradePick: input.takeUpgradePick(),
    };
  }

  function handleActions(now) {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) {
      audio.click();
      startGame();
    } else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if ((screen === SCREEN_OVER || screen === SCREEN_WIN) && (actions & (ACTION_CONFIRM | ACTION_RESTART))) {
      audio.click();
      startGame();
    }
  }

  function clickUpgrade(event) {
    if (screen !== SCREEN_UPGRADE) return;
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (canvas.width / rect.width);
    const py = (event.clientY - rect.top) * (canvas.height / rect.height);
    for (const card of renderer.cardRects()) {
      // Card rects are stored in field coordinates; convert the click to field space.
      const f = renderer.toField(px, py);
      if (f.x >= card.x && f.x <= card.x + card.w && f.y >= card.y && f.y <= card.y + card.h) {
        audio.upgrade();
        world.step(STEP, { aimX: 0, aimY: 0, firing: false, nova: false, upgradePick: card.pick });
        screen = SCREEN_PLAY;
        announce(`Upgrade taken. Wave ${world.state.wave}.`);
        return;
      }
    }
  }
  canvas.addEventListener('mousedown', clickUpgrade);

  function step(now) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { aimX: 0, aimY: 0, firing: false, nova: false, upgradePick: 0 });
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      const pick = input.takeUpgradePick();
      if (pick > 0) {
        audio.upgrade();
        world.step(STEP, { aimX: 0, aimY: 0, firing: false, nova: false, upgradePick: pick });
        screen = SCREEN_PLAY;
        announce(`Upgrade taken. Wave ${world.state.wave}.`);
      } else {
        world.step(STEP, { aimX: 0, aimY: 0, firing: false, nova: false, upgradePick: 0 });
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP, controlsFor(now));
    playSounds(events, now);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions(now);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_UPGRADE) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_UPGRADE)) {
        step(now);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, now / 1000);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Nova Keeper. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
