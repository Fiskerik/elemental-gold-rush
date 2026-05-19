// Tiny WebAudio merge sound — no asset files required.
type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;
let musicTimer: number | null = null;
let musicMaster: GainNode | null = null;
let musicStep = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx?.state === "closed") ctx = null;
  if (!ctx) {
    try {
      const AudioContextCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!AudioContextCtor) return null;
      ctx = new AudioContextCtor();
    } catch (error) {
      console.log("Audio context unavailable", error);
      return null;
    }
  }
  if (ctx.state === "suspended") {
    void ctx.resume().catch((error) => console.log("Audio context resume failed", error));
  }
  return ctx;
}

function runSound(play: (c: AudioContext, now: number) => void) {
  const c = getCtx();
  if (!c) return;
  const playNow = () => {
    try {
      play(c, c.currentTime);
    } catch (error) {
      console.log("Sound playback failed", error);
    }
  };
  if (c.state === "suspended") {
    void c
      .resume()
      .then(playNow)
      .catch((error) => console.log("Audio context resume failed", error));
    return;
  }
  playNow();
}

export function playMergeSound(chainDepth: number) {
  runSound((c, now) => {
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
  });
}

export function playShootSound() {
  runSound((c, now) => {
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
  });
}

export function playWinSound() {
  runSound((c, now) => {
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
  });
}

function playAmbientStep(c: AudioContext, now: number) {
  if (!musicMaster) return;
  const master = musicMaster;
  const chords = [
    [196, 246.94, 293.66],
    [174.61, 220, 261.63],
    [207.65, 261.63, 329.63],
    [164.81, 196, 246.94],
  ];
  const chord = chords[musicStep % chords.length];
  musicStep += 1;

  chord.forEach((freq, index) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = index === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.006, now + 3.8);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.08 : 0.045, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 4.4);
  });

  const sparkle = c.createOscillator();
  const sparkleGain = c.createGain();
  sparkle.type = "sine";
  sparkle.frequency.setValueAtTime(chord[2] * 2, now + 0.12);
  sparkle.frequency.exponentialRampToValueAtTime(chord[2] * 2.6, now + 1.1);
  sparkleGain.gain.setValueAtTime(0.0001, now + 0.12);
  sparkleGain.gain.exponentialRampToValueAtTime(0.035, now + 0.2);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
  sparkle.connect(sparkleGain).connect(master);
  sparkle.start(now + 0.12);
  sparkle.stop(now + 1.4);
}

export function startAmbientMusic() {
  const c = getCtx();
  if (!c || musicTimer != null) return;
  musicMaster = c.createGain();
  musicMaster.gain.setValueAtTime(0.055, c.currentTime);
  musicMaster.connect(c.destination);
  playAmbientStep(c, c.currentTime + 0.02);
  musicTimer = window.setInterval(() => {
    const active = getCtx();
    if (!active) return;
    playAmbientStep(active, active.currentTime + 0.02);
  }, 3600);
}

export function stopAmbientMusic() {
  if (musicTimer != null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicMaster) {
    try {
      musicMaster.gain.exponentialRampToValueAtTime(0.0001, musicMaster.context.currentTime + 0.25);
      window.setTimeout(() => {
        musicMaster?.disconnect();
        musicMaster = null;
      }, 320);
    } catch {
      musicMaster.disconnect();
      musicMaster = null;
    }
  }
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
