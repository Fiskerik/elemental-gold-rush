// Tiny WebAudio merge sound — no asset files required.
type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;
let musicTimer: number | null = null;
let musicMaster: GainNode | null = null;
let musicStep = 0;
const MIN_EXP_VALUE = 0.0001;

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

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
    try { play(c, c.currentTime); } catch (error) { console.log("Sound playback failed", error); }
  };
  if (c.state === "suspended") {
    void c.resume().then(playNow).catch((error) => console.log("Audio context resume failed", error));
    return;
  }
  playNow();
}

// ====================== LJUD ======================
export function playMergeSound(chainDepth: number) {
  runSound((c, now) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const baseFreq = finitePositive(320 + chainDepth * 90, 320);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.18);
    gain.gain.setValueAtTime(MIN_EXP_VALUE, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, now + 0.25);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  });
}

export function playShootSound() {
  runSound((c, now) => {
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain).connect(c.destination);
    osc.start(now); osc.stop(now + 0.12);
  });
}

export function playWinSound() {
  runSound((c, now) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = c.createOscillator(); const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + i * 0.1);
      gain.gain.setValueAtTime(0.0001, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.4);
      osc.connect(gain).connect(c.destination);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.5);
    });
  });
}

// ====================== POLYPHONIC AMBIENT ======================
function playAmbientStep(c: AudioContext, now: number) {
  if (!musicMaster) return;
  const master = musicMaster;

  const lib = [
    [261.63, 329.63, 392.00], // 0: C
    [293.66, 369.99, 440.00], // 1: D
    [329.63, 415.30, 493.88], // 2: E
    [349.23, 440.00, 523.25], // 3: F
    [392.00, 493.88, 587.33], // 4: G
    [440.00, 554.37, 659.25], // 5: A
  ];

  const songStructure = [
    0,4,5,3, 0,4,5,1,
    0,4,5,3, 0,4,5,1,
    0,5,3,4, 0,5,1,4,
    2,5,3,0, 2,4,5,1,
    0,4,5,3, 0,4,5,1,
    0,5,3,4, 0,5,1,4,
    5,3,4,0, 5,1,4,2,
    0,4,5,3, 0,5,4,0
  ];

  const measure = musicStep % songStructure.length;
  const chordIdx = songStructure[measure] ?? 0;
  const chord = lib[chordIdx] ?? lib[0];
  musicStep += 1;

  const hasBass = measure >= 12;
  const hasDrums = measure >= 8;
  const hasArp = measure >= 24;
  const hasMelody = measure >= 40;
  const section = Math.floor(measure / 16);

  // Master volym per sektion
  const masterVol = [0.07, 0.075, 0.08, 0.065][section % 4];

  // 1. PADS (varma ackord)
  const padVol = hasMelody ? 0.035 : 0.065;
  chord.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = i === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(finitePositive(freq, 220), now);
    gain.gain.setValueAtTime(MIN_EXP_VALUE, now);
    gain.gain.linearRampToValueAtTime(padVol, now + 0.8);
    gain.gain.linearRampToValueAtTime(padVol * 0.65, now + 2.4);
    gain.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, now + 3.0);
    osc.connect(gain).connect(master);
    osc.start(now); osc.stop(now + 3.2);
  });

  // 2. DRUMS (polyfon känsla!)
  if (hasDrums) {
    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.25;

      // Kick
      if (i % 2 === 0) {
        const k = c.createOscillator();
        const kg = c.createGain();
        k.type = "sine";
        k.frequency.setValueAtTime(140, t);
        k.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        kg.gain.setValueAtTime(0.6, t);
        kg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        k.connect(kg).connect(master);
        k.start(t); k.stop(t + 0.3);
      }

      // Snare / clap
      if (i % 4 === 2) {
        const noise = c.createBufferSource();
        const ng = c.createGain();
        const nf = c.createBiquadFilter();
        const buffer = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < data.length; j++) data[j] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        nf.type = "bandpass";
        nf.frequency.value = 1200;
        ng.gain.setValueAtTime(0.35, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        noise.connect(nf).connect(ng).connect(master);
        noise.start(t);
      }

      // Hi-hat
      if (i % 2 === 1 || i % 4 === 3) {
        const h = c.createBufferSource();
        const hg = c.createGain();
        const hf = c.createBiquadFilter();
        const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1;
        h.buffer = buf;
        hf.type = "highpass";
        hf.frequency.value = 7000;
        hg.gain.setValueAtTime(0.09, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        h.connect(hf).connect(hg).connect(master);
        h.start(t);
      }
    }
  }

  // 3. BASS
  if (hasBass) {
    const bassFreq = finitePositive((chord[0] ?? 220) / 2, 110);
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.5;
      const b = c.createOscillator();
      const g = c.createGain();
      const f = c.createBiquadFilter();
      b.type = "sawtooth";
      b.frequency.setValueAtTime(bassFreq, t);
      f.type = "lowpass"; f.frequency.setValueAtTime(650, t);
      g.gain.setValueAtTime(MIN_EXP_VALUE, t);
      g.gain.exponentialRampToValueAtTime(0.065, t + 0.03);
      g.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, t + 0.45);
      b.connect(f).connect(g).connect(master);
      b.start(t); b.stop(t + 0.5);
    }
  }

  // 4. ARPEGGIO + extra sparkle
  if (hasArp) {
    const arpPattern = [0,1,2,1, 0,2,1,2];
    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.25;
      const note = finitePositive(chord[arpPattern[i % 8]] ?? chord[0] ?? 220, 220) * (i % 3 === 2 ? 2 : 4); // varierar oktav

      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(note, t);
      g.gain.setValueAtTime(MIN_EXP_VALUE, t);
      g.gain.exponentialRampToValueAtTime(0.016, t + 0.02);
      g.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, t + 0.16);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.2);
    }
  }

  // 5. LEAD MELODY + HARMONY (riktig polyfoni!)
  if (hasMelody) {
    const melodyPattern = [0, 2, 1, 2, 1, 2, 0, 1];
    const harmPattern   = [2, 1, 0, 1, 0, 1, 2, 0];

    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.5;
      const idx = (measure + i) % 8;

      // Lead
      const leadFreq = finitePositive(chord[melodyPattern[idx]] ?? chord[0] ?? 220, 220) * 4;
      const lead = c.createOscillator();
      const lg = c.createGain();
      lead.type = "sawtooth";
      lead.frequency.setValueAtTime(leadFreq, t);
      lg.gain.setValueAtTime(MIN_EXP_VALUE, t);
      lg.gain.linearRampToValueAtTime(0.032, t + 0.1);
      lg.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, t + 0.55);
      lead.connect(lg).connect(master);
      lead.start(t); lead.stop(t + 0.6);

      // Harmony (tredje ovan)
      const harmFreq = finitePositive(chord[harmPattern[idx]] ?? chord[1] ?? chord[0] ?? 220, 220) * 4;
      const harm = c.createOscillator();
      const hg = c.createGain();
      harm.type = "triangle";
      harm.frequency.setValueAtTime(harmFreq, t);
      hg.gain.setValueAtTime(MIN_EXP_VALUE, t);
      hg.gain.linearRampToValueAtTime(0.022, t + 0.12);
      hg.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, t + 0.55);
      harm.connect(hg).connect(master);
      harm.start(t); harm.stop(t + 0.6);
    }
  }

  // 6. Glitter / transition
  if (measure % 8 === 7) {
    const noise = c.createBufferSource();
    const ng = c.createGain();
    const nf = c.createBiquadFilter();
    const buf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    nf.type = "bandpass";
    nf.frequency.setValueAtTime(900, now);
    nf.frequency.exponentialRampToValueAtTime(4200, now + 1.2);
    ng.gain.setValueAtTime(MIN_EXP_VALUE, now);
    ng.gain.exponentialRampToValueAtTime(0.028, now + 0.4);
    ng.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, now + 1.8);
    noise.connect(nf).connect(ng).connect(master);
    noise.start(now); noise.stop(now + 2);
  }
}

export function startAmbientMusic() {
  const c = getCtx();
  if (!c || musicTimer != null) return;
  if (c.state === "suspended") {
    void c.resume().then(() => startAmbientMusic()).catch(() => {});
    return;
  }

  musicMaster = c.createGain();
  musicMaster.gain.setValueAtTime(0.072, c.currentTime);
  musicMaster.connect(c.destination);

  musicStep = 0;
  playAmbientStep(c, c.currentTime + 0.05);

  musicTimer = window.setInterval(() => {
    const active = getCtx();
    if (active) playAmbientStep(active, active.currentTime + 0.05);
  }, 2000);
}

export function stopAmbientMusic() {
  if (musicTimer != null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicMaster) {
    musicMaster.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, musicMaster.context.currentTime + 0.4);
    setTimeout(() => { musicMaster?.disconnect(); musicMaster = null; }, 500);
  }
}

export function primeAudio() {
  const c = getCtx();
  if (c?.state === "suspended") void c.resume();
}

export function vibrate(ms: number | number[]) {
  void import("./nativeHaptics")
    .then(({ triggerNativeHaptic }) => triggerNativeHaptic(ms))
    .then((handled) => {
      if (!handled && "vibrate" in navigator) navigator.vibrate(ms);
    })
    .catch(() => {
      if ("vibrate" in navigator) navigator.vibrate(ms);
    });
}
