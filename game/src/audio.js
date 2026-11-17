// Synthesized sound effects: no audio files, every sound is built from
// oscillators and filtered noise at run time, so the game ships no assets.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, to = null, dur = 0.12, type = 'sine', gain = 0.12, delay = 0 }) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.2, gain = 0.18, cutoff = 1200, delay = 0 }) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + delay;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(ac.destination);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shoot() { tone({ freq: 720, to: 320, dur: 0.07, type: 'square', gain: 0.05 }); },
    pop() { noise({ dur: 0.16, gain: 0.16, cutoff: 2400 }); tone({ freq: 220, to: 60, dur: 0.16, type: 'triangle', gain: 0.12 }); },
    split() { tone({ freq: 500, to: 900, dur: 0.09, type: 'sine', gain: 0.09 }); noise({ dur: 0.1, gain: 0.08, cutoff: 3200 }); },
    coreHit() { tone({ freq: 130, to: 55, dur: 0.28, type: 'sawtooth', gain: 0.16 }); noise({ dur: 0.2, gain: 0.12, cutoff: 700 }); },
    nova() { tone({ freq: 180, to: 1400, dur: 0.4, type: 'sawtooth', gain: 0.1 }); noise({ dur: 0.5, gain: 0.14, cutoff: 3600 }); },
    upgrade() { [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.14, gain: 0.1, delay: i * 0.07 })); },
    waveClear() { [392, 523, 659].forEach((f, i) => tone({ freq: f, dur: 0.16, gain: 0.1, delay: i * 0.08 })); },
    click() { tone({ freq: 880, dur: 0.05, gain: 0.07 }); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.22, gain: 0.11, delay: i * 0.1 })); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.11, delay: i * 0.14 })); },
  };
}
