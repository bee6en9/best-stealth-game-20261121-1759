// Sound, Web Audio only — no files. Soft footstep ticks that get louder and
// faster when running, a low sting when a guard spots you, a soft chime at the
// gate. M toggles mute. The AudioContext is created on the first key press, so
// nothing sounds before the player has acted.

let ctx = null;
let muted = false;
let master = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  try {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function isMuted() {
  return muted;
}

function blip(freq, duration, type, volume, when = 0) {
  if (!ctx || muted) return;
  try {
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + duration);
  } catch {
    // Sound is garnish; a failed blip never breaks the game.
  }
}

/** A soft tick: quieter and slower while sneaking. */
export function footstep(sneaking) {
  blip(sneaking ? 140 : 190, 0.07, 'triangle', sneaking ? 0.05 : 0.12);
}

/** The low two-note sting when a guard spots you. */
export function alertSting() {
  blip(196, 0.35, 'sawtooth', 0.16);
  blip(147, 0.5, 'sawtooth', 0.16, 0.12);
}

/** A short rising note when a guard gets suspicious. */
export function suspiciousNote() {
  blip(330, 0.18, 'sine', 0.1);
}

/** The soft chime when the thief reaches the gate. */
export function gateChime() {
  blip(523, 0.4, 'sine', 0.14);
  blip(784, 0.6, 'sine', 0.14, 0.1);
}
