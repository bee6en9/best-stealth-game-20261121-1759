// Keyboard state: one place reads the keys, everything else asks this module
// what the player wants to do. WASD and arrows move; Shift sneaks.

const keys = new Set();

/** Keys the game cares about, so the page never scrolls while playing. */
const HANDLED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ShiftLeft', 'ShiftRight', 'Enter', 'KeyP', 'KeyR', 'KeyM', 'Space',
]);

/** Just-pressed keys, consumed once per frame by the game loop. */
const pressed = new Set();

export function installInput() {
  window.addEventListener('keydown', (event) => {
    if (!HANDLED.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
}

/** Movement direction from the held keys, normalised. */
export function moveDirection() {
  let x = 0;
  let y = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

export function sneaking() {
  return keys.has('ShiftLeft') || keys.has('ShiftRight');
}

/** True once, the frame after the key went down. */
export function wasPressed(code) {
  return pressed.has(code);
}

/** Clear the just-pressed set; the game loop calls this every frame. */
export function endFrame() {
  pressed.clear();
}
