// Mouse and keyboard input. The world reads a plain controls object each step:
// where the player aims (field coordinates), whether the trigger is held, and
// one-shot actions (nova, pause, confirm, restart, upgrade pick, mute).
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_NOVA = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let upgradePick = 0;

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (event.clientX - rect.left) * scaleX;
    mouseY = (event.clientY - rect.top) * scaleY;
  }

  canvas.addEventListener('mousemove', toField);
  canvas.addEventListener('mousedown', (event) => {
    toField(event);
    mouseDown = true;
    if (event.button === 0) actions |= ACTION_CONFIRM;
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    }
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'Digit1') upgradePick = 1;
    if (event.code === 'Digit2') upgradePick = 2;
    if (event.code === 'Digit3') upgradePick = 3;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });

  return {
    /** Aim point in canvas pixels (the renderer maps it into field space). */
    aim() { return { x: mouseX, y: mouseY }; },
    firing() { return mouseDown || keys.has('Space'); },
    /** Nova is a held key too, so the world can read it as a level. */
    novaHeld() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeUpgradePick() {
      const pick = upgradePick;
      upgradePick = 0;
      return pick;
    },
  };
}
