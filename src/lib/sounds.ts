'use client';

// Web Audio API synth — no external assets needed
let ctx: AudioContext | null = null;
let enabled = true;
const SOUND_KEY = 'dial-comp-sound-on';

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const W = window as unknown as { webkitAudioContext?: typeof AudioContext };
      ctx = new (window.AudioContext || W.webkitAudioContext!)();
    } catch { return null; }
  }
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch { /* */ }
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(SOUND_KEY);
    if (v === '0') enabled = false;
    if (v === '1') enabled = true;
  } catch { /* */ }
  return enabled;
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(c.destination);
  const now = c.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function chord(freqs: number[], duration: number, type: OscillatorType = 'sine', volume = 0.1) {
  freqs.forEach((f) => tone(f, duration, type, volume));
}

export const sfx = {
  click: () => tone(800, 0.05, 'square', 0.08),
  increment: () => tone(660, 0.08, 'triangle', 0.1),
  setScored: () => {
    chord([523, 659, 784], 0.4, 'sine', 0.12); // C major chord
  },
  kill: () => {
    tone(150, 0.2, 'sawtooth', 0.18);
    setTimeout(() => tone(80, 0.3, 'sawtooth', 0.15), 80);
  },
  hit: () => tone(200, 0.06, 'square', 0.08),
  achievement: () => {
    chord([523, 659, 784, 1046], 0.5, 'sine', 0.12);
  },
  powerup: () => {
    tone(880, 0.08, 'sine', 0.12);
    setTimeout(() => tone(1320, 0.12, 'sine', 0.12), 60);
  },
  rankUp: () => {
    tone(440, 0.1, 'sine', 0.1);
    setTimeout(() => tone(660, 0.1, 'sine', 0.1), 80);
    setTimeout(() => tone(880, 0.15, 'sine', 0.12), 160);
  },
  milestone: () => {
    chord([261, 329, 392, 523], 0.6, 'sine', 0.1);
  },
};
