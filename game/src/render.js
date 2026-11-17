// Nova Keeper — every pixel the player sees. The canvas fills the window;
// the 960x600 field is letterboxed inside it. All art is drawn from code:
// stars, a glowing core, vector enemies, particles and the HUD.
import { FIELD, CENTER, CORE, TURRET, COLORS, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let view = { scale: 1, ox: 0, oy: 0, width: 0, height: 0 };
  let cardRects = [];

  let lastW = 0;
  let lastH = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view = {
      scale,
      ox: (canvas.width - FIELD.width * scale) / 2,
      oy: (canvas.height - FIELD.height * scale) / 2,
      width: canvas.width,
      height: canvas.height,
    };
  }

  function toField(px, py) {
    return { x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale };
  }

  function fieldX(px) { return (px - view.ox) / view.scale; }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStars(state, time) {
    for (const star of state.stars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * star.speed + star.phase));
      ctx.globalAlpha = tw * 0.9;
      ctx.fillStyle = COLORS.star;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Two soft nebulae for depth.
    const nebulae = [
      { x: 150, y: 110, r: 210, color: 'rgba(64, 90, 180, 0.16)' },
      { x: 830, y: 500, r: 230, color: 'rgba(150, 60, 140, 0.13)' },
      { x: 700, y: 90, r: 150, color: 'rgba(40, 140, 150, 0.10)' },
    ];
    for (const n of nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, TAU);
      ctx.fill();
    }
  }

  function drawCore(state, time) {
    const pulse = 1 + Math.sin(time * 2.2) * 0.05;
    const r = CORE.radius * pulse;
    const hpFrac = state.coreHp / state.coreMaxHp;
    const glow = ctx.createRadialGradient(CENTER.x, CENTER.y, 0, CENTER.x, CENTER.y, r * 3.4);
    glow.addColorStop(0, 'rgba(255, 214, 106, 0.55)');
    glow.addColorStop(0.45, 'rgba(255, 170, 60, 0.16)');
    glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, r * 3.4, 0, TAU);
    ctx.fill();

    const body = ctx.createRadialGradient(CENTER.x - r * 0.3, CENTER.y - r * 0.3, r * 0.1, CENTER.x, CENTER.y, r);
    body.addColorStop(0, COLORS.coreHot);
    body.addColorStop(0.6, COLORS.core);
    body.addColorStop(1, '#ff9a3c');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, r, 0, TAU);
    ctx.fill();

    // HP ring around the core.
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, r + 10, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = hpFrac > 0.35 ? COLORS.good : COLORS.danger;
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * hpFrac);
    ctx.stroke();
  }

  function drawTurret(state) {
    const a = state.turretAngle;
    const x = CENTER.x + Math.cos(a) * TURRET.orbit;
    const y = CENTER.y + Math.sin(a) * TURRET.orbit;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.shadowColor = '#9fe8ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.turret;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a2030';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBolt(bolt) {
    const len = 16;
    const nx = bolt.vx / (Math.hypot(bolt.vx, bolt.vy) || 1);
    const ny = bolt.vy / (Math.hypot(bolt.vx, bolt.vy) || 1);
    ctx.strokeStyle = COLORS.bolt;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#ffcf5d';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(bolt.x - nx * len, bolt.y - ny * len);
    ctx.lineTo(bolt.x, bolt.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawEnemy(enemy, time) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : enemy.color;
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = 2;
    const r = enemy.radius;
    if (enemy.kind === 'mote') {
      ctx.rotate(time * 1.2 + enemy.wobble);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.8, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.8, 0);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === 'darter') {
      ctx.rotate(enemy.angle);
      ctx.beginPath();
      ctx.moveTo(r + 4, 0);
      ctx.lineTo(-r, -r * 0.7);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(-r, r * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === 'splitter') {
      ctx.rotate(time * 0.8);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(7,11,24,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, TAU);
      ctx.fill();
    } else if (enemy.kind === 'weaver') {
      ctx.rotate(enemy.angle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -r - 3);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(7,11,24,0.9)';
      ctx.beginPath();
      ctx.arc(0, 1, r * 0.32, 0, TAU);
      ctx.fill();
    } else {
      // bulwark: armoured square with a ring.
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
      ctx.restore();
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, TAU);
      ctx.stroke();
      if (enemy.maxHp > 1) {
        const w = 34;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(-w / 2, -r - 14, w, 5);
        ctx.fillStyle = '#ff8d8d';
        ctx.fillRect(-w / 2, -r - 14, (w * enemy.hp) / enemy.maxHp, 5);
      }
    }
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(state) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function bar(x, y, w, h, frac, fill, edge) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    rr(x - 2, y - 2, w + 4, h + 4, 6);
    ctx.fill();
    ctx.fillStyle = fill;
    if (frac > 0) {
      rr(x, y, Math.max(6, w * frac), h, 4);
      ctx.fill();
    }
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    rr(x, y, w, h, 4);
    ctx.stroke();
  }

  function drawHud(state, best) {
    const pad = 16;
    ctx.textBaseline = 'alphabetic';
    // Score, left.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(String(state.score).padStart(6, '0'), pad, 38);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`BEST ${best}`, pad, 56);
    // Wave, centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`WAVE ${Math.min(state.wave, WAVES.total)} / ${WAVES.total}`, FIELD.width / 2, 34);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`${state.enemies.length + state.spawnQueue.length} HOSTILES LEFT`, FIELD.width / 2, 52);
    // Nova + combo, right.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`NOVA ${'◆'.repeat(state.nova)}${'◇'.repeat(Math.max(0, state.modifiers.novaMax - state.nova))}`, FIELD.width - pad, 34);
    if (state.combo >= 2) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`COMBO x${(1 + state.combo * 0.1).toFixed(1)}`, FIELD.width - pad, 56);
    }
    // Core HP bar, bottom centre.
    const bw = 240;
    const bx = FIELD.width / 2 - bw / 2;
    const by = FIELD.height - 30;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText('CORE', bx, by - 6);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(state.coreHp)} / ${state.coreMaxHp}`, bx + bw, by - 6);
    bar(bx, by, bw, 12, state.coreHp / state.coreMaxHp, state.coreHp / state.coreMaxHp > 0.35 ? '#7dff6a' : '#ff5d5d', '#2c3d63');
  }

  function panel(title, lines, accent) {
    const w = 520;
    const h = 92 + lines.length * 30;
    const x = FIELD.width / 2 - w / 2;
    const y = FIELD.height / 2 - h / 2;
    ctx.fillStyle = 'rgba(4, 8, 18, 0.82)';
    rr(x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    rr(x, y, w, h, 16);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(title, FIELD.width / 2, y + 58);
    ctx.fillStyle = COLORS.text;
    ctx.font = '17px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, y + 100 + i * 30));
    return { x, y, w, h };
  }

  function drawTitle(state, best, time) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.shadowColor = '#ff9a3c';
    ctx.shadowBlur = 26;
    ctx.fillText('NOVA KEEPER', FIELD.width / 2, 168);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.text;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Defend the last star from the void.', FIELD.width / 2, 206);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Mouse to aim · Hold click to fire · Shift for Nova · Survive all 10 waves', FIELD.width / 2, 238);
    ctx.fillText('Between waves, pick 1 of 3 upgrades — choose well.', FIELD.width / 2, 262);
    if (Math.sin(time * 3) > -0.2) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 396);
    }
    if (best > 0) {
      ctx.fillStyle = COLORS.dim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`BEST SCORE  ${best}`, FIELD.width / 2, 428);
    }
  }

  function drawUpgrade(state) {
    ctx.fillStyle = 'rgba(4, 8, 18, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7dff6a';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText(`WAVE ${state.wave} CLEARED!`, FIELD.width / 2, 120);
    ctx.fillStyle = COLORS.text;
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('Choose one upgrade to take into the next wave.', FIELD.width / 2, 152);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Press 1, 2 or 3 — or click a card.', FIELD.width / 2, 176);
    cardRects = [];
    const cw = 250;
    const ch = 170;
    const gap = 24;
    const total = cw * 3 + gap * 2;
    const x0 = FIELD.width / 2 - total / 2;
    const y0 = 220;
    state.upgradeChoices.forEach((up, i) => {
      const x = x0 + i * (cw + gap);
      ctx.fillStyle = COLORS.card;
      rr(x, y0, cw, ch, 14);
      ctx.fill();
      ctx.strokeStyle = COLORS.cardEdge;
      ctx.lineWidth = 2;
      rr(x, y0, cw, ch, 14);
      ctx.stroke();
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(`[${i + 1}]`, x + cw / 2, y0 + 40);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(up.name, x + cw / 2, y0 + 76);
      ctx.fillStyle = COLORS.dim;
      ctx.font = '15px system-ui, sans-serif';
      wrapText(up.blurb, x + cw / 2, y0 + 108, cw - 32, 20);
      cardRects.push({ x, y: y0, w: cw, h: ch, pick: i + 1 });
    });
    ctx.fillStyle = COLORS.dim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Score ${state.score} · Core ${Math.ceil(state.coreHp)}/${state.coreMaxHp} · Nova ${state.nova}/${state.modifiers.novaMax}`, FIELD.width / 2, y0 + ch + 36);
  }

  function wrapText(text, cx, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, cx, ly);
        line = word;
        ly += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, cx, ly);
  }

  function drawEnd(state, best, won) {
    const stats = [
      `Score  ${state.score}   ·   Best  ${best}`,
      `Waves cleared  ${won ? WAVES.total : state.wave - 1} / ${WAVES.total}   ·   Shards destroyed  ${state.kills}`,
      `Accuracy  ${state.shotsFired === 0 ? 0 : Math.round((state.shotsHit / state.shotsFired) * 100)}%   ·   Time  ${formatTime(state.time)}`,
    ];
    if (won) {
      panel('THE VOID RECEDES', ['You kept the last star burning through all 10 waves!', ...stats, 'Press R or click to play again.'], '#7dff6a');
    } else {
      panel('THE STAR HAS FALLEN', ['The void took the core — but the keeper returns.', ...stats, 'Press R or click to play again.'], '#ff5d5d');
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return {
    resize,
    toField,
    fieldX,
    cardRects() { return cardRects; },
    draw(state, screen, best, time) {
      resize();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, view.width, view.height);
      const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
      const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
      ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + shakeX * view.scale, view.oy + shakeY * view.scale);
      // Clip to the field so letterbox bars stay clean.
      ctx.beginPath();
      ctx.rect(0, 0, FIELD.width, FIELD.height);
      ctx.clip();

      drawStars(state, time);
      drawCore(state, time);
      if (screen !== SCREEN_TITLE) drawTurret(state);
      for (const bolt of state.bolts) drawBolt(bolt);
      for (const enemy of state.enemies) drawEnemy(enemy, time);
      drawParticles(state);
      drawFloaters(state);

      if (screen === SCREEN_PLAY) drawHud(state, best);
      else if (screen === SCREEN_TITLE) drawTitle(state, best, time);
      else if (screen === SCREEN_UPGRADE) { drawHud(state, best); drawUpgrade(state); }
      else if (screen === SCREEN_PAUSED) {
        drawHud(state, best);
        ctx.fillStyle = 'rgba(4, 8, 18, 0.6)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        panel('PAUSED', ['Press P or click to keep defending.'], '#9fe8ff');
      } else if (screen === SCREEN_OVER) drawEnd(state, best, false);
      else if (screen === SCREEN_WIN) drawEnd(state, best, true);
    },
  };
}
