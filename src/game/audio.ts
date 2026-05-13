// Tiny WebAudio merge sound — no asset files required.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function playMergeSound(chainDepth: number) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  const baseFreq = 320 + chainDepth * 90;
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function playShootSound() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

export function playWinSound() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, now + i * 0.1);
    gain.gain.setValueAtTime(0.0001, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.4);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.5);
  });
}

export function vibrate(ms: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* noop */
    }
  }
}