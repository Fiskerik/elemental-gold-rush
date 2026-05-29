// Tiny WebAudio merge sound — no asset files required.
type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;
let musicTimer: number | null = null;
let musicMaster: GainNode | null = null;
let musicStep = 0;
export type MusicTheme = "default" | "boss" | "powerup" | "compound";
let currentMusicTheme: MusicTheme = "default";
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
function scheduleTone(
  c: AudioContext,
  master: GainNode,
  {
    type,
    frequency,
    start,
    duration,
    peak,
    attack = 0.02,
    decay = duration,
    endFrequency,
    filterFrequency,
    filterType,
  }: {
    type: OscillatorType;
    frequency: number;
    start: number;
    duration: number;
    peak: number;
    attack?: number;
    decay?: number;
    endFrequency?: number;
    filterFrequency?: number;
    filterType?: BiquadFilterType;
  },
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const output = filterType ? c.createBiquadFilter() : null;
  osc.type = type;
  osc.frequency.setValueAtTime(finitePositive(frequency, 220), start);
  if (endFrequency) {
    osc.frequency.exponentialRampToValueAtTime(finitePositive(endFrequency, frequency), start + duration);
  }
  gain.gain.setValueAtTime(MIN_EXP_VALUE, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, MIN_EXP_VALUE * 2), start + attack);
  gain.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, start + Math.max(decay, attack + 0.01));

  if (output) {
    output.type = filterType!;
    output.frequency.setValueAtTime(filterFrequency ?? 1200, start);
    osc.connect(output).connect(gain).connect(master);
  } else {
    osc.connect(gain).connect(master);
  }
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noiseBurst(
  c: AudioContext,
  master: GainNode,
  {
    start,
    duration,
    peak,
    filterType = "bandpass",
    frequency = 1600,
  }: {
    start: number;
    duration: number;
    peak: number;
    filterType?: BiquadFilterType;
    frequency?: number;
  },
) {
  const source = c.createBufferSource();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * duration)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(Math.max(peak, MIN_EXP_VALUE * 2), start);
  gain.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, start + duration);
  source.connect(filter).connect(gain).connect(master);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function kick(c: AudioContext, master: GainNode, start: number, peak: number, startFreq = 140, endFreq = 42) {
  scheduleTone(c, master, {
    type: "sine",
    frequency: startFreq,
    endFrequency: endFreq,
    start,
    duration: 0.26,
    peak,
    attack: 0.004,
    decay: 0.22,
  });
}

function chordLibraryFromRoots(roots: number[]) {
  return roots.map((root) => [root, root * 1.2599, root * 1.4983]);
}

function playDefaultThemeStep(c: AudioContext, now: number) {
  if (!musicMaster) return;
  const master = musicMaster;

  const lib = chordLibraryFromRoots([261.63, 293.66, 329.63, 349.23, 392.0, 440.0]);

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

function playBossThemeStep(c: AudioContext, now: number) {
  if (!musicMaster) return;
  const master = musicMaster;
  const lib = [
    [220.0, 261.63, 329.63],
    [196.0, 246.94, 293.66],
    [174.61, 220.0, 261.63],
    [246.94, 293.66, 349.23],
  ];
  const progression = [0, 1, 2, 3, 0, 1, 3, 2];
  const chord = lib[progression[musicStep % progression.length] ?? 0] ?? lib[0];
  musicStep += 1;

  chord.forEach((freq, index) => {
    scheduleTone(c, master, {
      type: index === 0 ? "sawtooth" : "triangle",
      frequency: freq,
      start: now,
      duration: 2.6,
      peak: index === 0 ? 0.024 : 0.018,
      attack: 0.04,
      decay: 2.4,
      filterType: "lowpass",
      filterFrequency: 1800,
    });
  });

  for (let i = 0; i < 8; i++) {
    const t = now + i * 0.25;
    if (i % 2 === 0) kick(c, master, t, 0.42, 156, 45);
    if (i % 4 === 2) noiseBurst(c, master, { start: t, duration: 0.18, peak: 0.24, frequency: 1400 });
    if (i % 2 === 1) noiseBurst(c, master, { start: t, duration: 0.08, peak: 0.05, filterType: "highpass", frequency: 7200 });

    scheduleTone(c, master, {
      type: "square",
      frequency: finitePositive((chord[0] ?? 220) / 2, 110),
      start: t,
      duration: 0.21,
      peak: 0.06,
      attack: 0.01,
      decay: 0.19,
      filterType: "lowpass",
      filterFrequency: 720,
    });
  }

  const leadPattern = [2, 1, 0, 1, 2, 1, 2, 0];
  for (let i = 0; i < 4; i++) {
    const t = now + 0.125 + i * 0.5;
    const note = finitePositive(chord[leadPattern[(musicStep + i) % leadPattern.length] ?? 0] ?? chord[0] ?? 220, 220) * 2;
    scheduleTone(c, master, {
      type: "sawtooth",
      frequency: note,
      start: t,
      duration: 0.34,
      peak: 0.032,
      attack: 0.02,
      decay: 0.28,
      filterType: "lowpass",
      filterFrequency: 2200,
    });
  }
}

function playPowerupThemeStep(c: AudioContext, now: number) {
  if (!musicMaster) return;
  const master = musicMaster;
  const lib = chordLibraryFromRoots([261.63, 329.63, 392.0, 440.0]);
  const progression = [0, 1, 2, 1, 3, 2, 1, 0];
  const chord = lib[progression[musicStep % progression.length] ?? 0] ?? lib[0];
  musicStep += 1;

  chord.forEach((freq) => {
    scheduleTone(c, master, {
      type: "triangle",
      frequency: freq,
      start: now,
      duration: 2.4,
      peak: 0.016,
      attack: 0.08,
      decay: 2.1,
    });
  });

  for (let i = 0; i < 8; i++) {
    const t = now + i * 0.25;
    const note = finitePositive(chord[[0, 1, 2, 1, 2, 1, 0, 2][i] ?? 0] ?? chord[0] ?? 220, 220) * (i % 2 === 0 ? 4 : 2);
    scheduleTone(c, master, {
      type: "square",
      frequency: note,
      start: t,
      duration: 0.14,
      peak: 0.016,
      attack: 0.01,
      decay: 0.12,
    });
    if (i % 4 === 0) {
      scheduleTone(c, master, {
        type: "sine",
        frequency: finitePositive((chord[0] ?? 220) / 2, 110),
        start: t,
        duration: 0.3,
        peak: 0.024,
        attack: 0.02,
        decay: 0.24,
      });
    }
  }

  noiseBurst(c, master, {
    start: now + 1.65,
    duration: 0.2,
    peak: 0.03,
    filterType: "highpass",
    frequency: 6200,
  });
}

function playCompoundThemeStep(c: AudioContext, now: number) {
  if (!musicMaster) return;
  const master = musicMaster;
  const lib = [
    [246.94, 311.13, 369.99],
    [220.0, 277.18, 329.63],
    [261.63, 329.63, 392.0],
    [293.66, 369.99, 440.0],
  ];
  const progression = [0, 1, 2, 1, 0, 3, 2, 1];
  const chord = lib[progression[musicStep % progression.length] ?? 0] ?? lib[0];
  musicStep += 1;

  chord.forEach((freq, index) => {
    scheduleTone(c, master, {
      type: index === 1 ? "sine" : "triangle",
      frequency: freq,
      start: now,
      duration: 2.7,
      peak: 0.015,
      attack: 0.1,
      decay: 2.3,
      filterType: "lowpass",
      filterFrequency: 1500,
    });
  });

  for (let i = 0; i < 4; i++) {
    const t = now + i * 0.5;
    scheduleTone(c, master, {
      type: "triangle",
      frequency: finitePositive((chord[0] ?? 220) / 2, 110),
      start: t,
      duration: 0.36,
      peak: 0.028,
      attack: 0.02,
      decay: 0.3,
      filterType: "lowpass",
      filterFrequency: 900,
    });
  }

  const arpPattern = [0, 2, 1, 2, 0, 1, 2, 1];
  for (let i = 0; i < 8; i++) {
    const t = now + i * 0.25;
    const note = finitePositive(chord[arpPattern[i] ?? 0] ?? chord[0] ?? 220, 220) * 4;
    scheduleTone(c, master, {
      type: "sine",
      frequency: note,
      start: t,
      duration: 0.18,
      peak: 0.012,
      attack: 0.012,
      decay: 0.16,
    });
  }

  if (musicStep % 2 === 0) {
    noiseBurst(c, master, {
      start: now + 1.1,
      duration: 0.12,
      peak: 0.018,
      filterType: "bandpass",
      frequency: 2600,
    });
  }
}

function playMusicStep(c: AudioContext, now: number) {
  switch (currentMusicTheme) {
    case "boss":
      playBossThemeStep(c, now);
      break;
    case "powerup":
      playPowerupThemeStep(c, now);
      break;
    case "compound":
      playCompoundThemeStep(c, now);
      break;
    default:
      playDefaultThemeStep(c, now);
      break;
  }
}

export function startAmbientMusic(theme: MusicTheme = "default") {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    void c.resume().then(() => startAmbientMusic(theme)).catch(() => {});
    return;
  }
  if (musicTimer != null && musicMaster && currentMusicTheme === theme) return;
  if (musicTimer != null) stopAmbientMusic();

  currentMusicTheme = theme;

  musicMaster = c.createGain();
  musicMaster.gain.setValueAtTime(0.072, c.currentTime);
  musicMaster.connect(c.destination);

  musicStep = 0;
  playMusicStep(c, c.currentTime + 0.05);

  musicTimer = window.setInterval(() => {
    const active = getCtx();
    if (active) playMusicStep(active, active.currentTime + 0.05);
  }, 2000);
}

export function stopAmbientMusic() {
  if (musicTimer != null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicMaster) {
    const master = musicMaster;
    musicMaster = null;
    master.gain.exponentialRampToValueAtTime(MIN_EXP_VALUE, master.context.currentTime + 0.4);
    setTimeout(() => { master.disconnect(); }, 500);
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
