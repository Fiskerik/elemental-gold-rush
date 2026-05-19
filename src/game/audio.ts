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

// ====================== NY GLAD AMBIENT LÅT ======================
function playAmbientStep(c: AudioContext, now: number) {
  if (!musicMaster) return;
  const master = musicMaster;

  // Gladare ackordbibliotek (C-dur baserat)
  const lib = [
    [261.63, 329.63, 392.00], // 0: C
    [293.66, 369.99, 440.00], // 1: D
    [329.63, 415.30, 493.88], // 2: E
    [349.23, 440.00, 523.25], // 3: F
    [392.00, 493.88, 587.33], // 4: G
    [440.00, 554.37, 659.25], // 5: A
    [261.63, 392.00, 523.25], // 6: C (hög)
  ];

  // Ny glad låtstruktur (64 takter)
  const songStructure = [
    // Intro - Ljust och luftigt
    0, 4, 5, 3, 0, 4, 5, 1,
    0, 4, 5, 3, 0, 4, 5, 1,
    // Bas kommer in
    0, 5, 3, 4, 0, 5, 1, 4,
    2, 5, 3, 0, 2, 4, 5, 1,
    // Arpeggio
    0, 4, 5, 3, 0, 4, 5, 1,
    0, 5, 3, 4, 0, 5, 1, 4,
    // Melodi & Klimax
    5, 3, 4, 0, 5, 1, 4, 2,
    0, 4, 5, 3, 0, 5, 4, 0   // Avslutning
  ];

  const measure = musicStep % 64;
  const chordIdx = songStructure[measure];
  const chord = lib[chordIdx];
  musicStep += 1;

  const hasBass = measure >= 16;
  const hasArp = measure >= 32 && measure < 60;
  const hasMelody = measure >= 48;

  // 1. PADS - Ljusare och varmare
  const padIntensity = hasMelody ? 0.045 : 0.075;
  chord.forEach((freq, index) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = index === 0 ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(padIntensity, now + 0.6);
    gain.gain.linearRampToValueAtTime(padIntensity * 0.7, now + 2.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 3);
  });

  // 2. BASS - Mjuk och dansant
  if (hasBass) {
    const bassFreq = chord[0] / 2;
    for (let i = 0; i < 4; i++) {
      const time = now + i * 0.5;
      const bassOsc = c.createOscillator();
      const bassGain = c.createGain();
      const filter = c.createBiquadFilter();

      bassOsc.type = "sawtooth";
      bassOsc.frequency.setValueAtTime(bassFreq, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.exponentialRampToValueAtTime(180, time + 0.4);

      bassGain.gain.setValueAtTime(0.0001, time);
      bassGain.gain.exponentialRampToValueAtTime(0.055, time + 0.04);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

      bassOsc.connect(filter).connect(bassGain).connect(master);
      bassOsc.start(time);
      bassOsc.stop(time + 0.48);
    }
  }

  // 3. ARPEGGIO - Glittrande och glad
  if (hasArp) {
    const arpNotes = [chord[0], chord[1], chord[2], chord[1], chord[0], chord[2]].map(f => f * 2);
    for (let i = 0; i < 8; i++) {
      const time = now + i * 0.25;
      const arpOsc = c.createOscillator();
      const arpGain = c.createGain();

      arpOsc.type = "square";
      arpOsc.frequency.setValueAtTime(arpNotes[i % arpNotes.length], time);

      arpGain.gain.setValueAtTime(0.0001, time);
      arpGain.gain.exponentialRampToValueAtTime(0.018, time + 0.015);
      arpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

      arpOsc.connect(arpGain).connect(master);
      arpOsc.start(time);
      arpOsc.stop(time + 0.22);
    }
  }

  // 4. MELODI - Svävande och positiv
  if (hasMelody) {
    const leadOsc = c.createOscillator();
    const leadGain = c.createGain();

    leadOsc.type = "sawtooth";
    const leadFreq = (measure % 2 === 0 ? chord[2] : chord[1]) * 4; // högre och gladare

    leadOsc.frequency.setValueAtTime(leadFreq, now);
    leadOsc.frequency.exponentialRampToValueAtTime(leadFreq * 1.02, now + 1.2);

    leadGain.gain.setValueAtTime(0.0001, now);
    leadGain.gain.linearRampToValueAtTime(0.028, now + 0.3);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

    leadOsc.connect(leadGain).connect(master);
    leadOsc.start(now);
    leadOsc.stop(now + 2.2);
  }

  // 5. TRANSITION - Lätt glitter istället för mörkt brus
  if (measure % 8 === 7) {
    const bufferSize = c.sampleRate * 1.8;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = c.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(2800, now + 0.8);
    noiseFilter.frequency.exponentialRampToValueAtTime(900, now + 2);

    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.025, now + 0.6);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 2);

    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start(now);
    noise.stop(now + 2.1);
  }
}

export function startAmbientMusic() {
  const c = getCtx();
  if (!c || musicTimer != null) return;
  if (c.state === "suspended") {
    void c.resume().then(() => startAmbientMusic()).catch((error) => console.log("Audio context resume failed", error));
    return;
  }

  musicMaster = c.createGain();
  musicMaster.gain.setValueAtTime(0.065, c.currentTime); // lite högre volym för gladare känsla
  musicMaster.connect(c.destination);

  musicStep = 0;
  playAmbientStep(c, c.currentTime + 0.02);

  musicTimer = window.setInterval(() => {
    const active = getCtx();
    if (!active) return;
    playAmbientStep(active, active.currentTime + 0.02);
  }, 2000);
}

export function stopAmbientMusic() {
  if (musicTimer != null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicMaster) {
    try {
      musicMaster.gain.exponentialRampToValueAtTime(0.0001, musicMaster.context.currentTime + 0.3);
      window.setTimeout(() => {
        musicMaster?.disconnect();
        musicMaster = null;
      }, 350);
    } catch {
      musicMaster.disconnect();
      musicMaster = null;
    }
  }
}

export function primeAudio() {
  const c = getCtx();
  if (!c || c.state !== "suspended") return;
  void c.resume().catch((error) => console.log("Audio context resume failed", error));
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
