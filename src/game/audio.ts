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
  
  // Am, F, C, G progression - klassisk och bra driv för spel
  const chords = [
    [220.00, 261.63, 329.63], // Am
    [174.61, 220.00, 261.63], // F
    [261.63, 329.63, 392.00], // C
    [196.00, 246.94, 293.66], // G
  ];
  
  const chord = chords[musicStep % chords.length];
  musicStep += 1;

  // 1. Spela upp ackordet (Pad)
  chord.forEach((freq, index) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = index === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);
    
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(index === 0 ? 0.05 : 0.03, now + 0.5);
    gain.gain.linearRampToValueAtTime(0.02, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 2.5);
  });

  // 2. Rytmisk bas (pulserande sågtandsvåg)
  const bassFreq = chord[0] / 2; // En oktav ner från grundtonen
  for (let i = 0; i < 4; i++) {
    const time = now + i * 0.5; // Spelar varje halvsekund
    const bassOsc = c.createOscillator();
    const bassGain = c.createGain();
    const filter = c.createBiquadFilter();
    
    bassOsc.type = "sawtooth";
    bassOsc.frequency.setValueAtTime(bassFreq, time);
    
    // Lågpassfilter för att basen inte ska bli för skrikig
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);
    
    bassGain.gain.setValueAtTime(0.0001, time);
    bassGain.gain.exponentialRampToValueAtTime(0.05, time + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
    
    bassOsc.connect(filter).connect(bassGain).connect(master);
    bassOsc.start(time);
    bassOsc.stop(time + 0.45);
  }

  // 3. Arpeggio/melodi (spelar på offbeats för lite sväng)
  const arpNotes = [chord[0] * 2, chord[1] * 2, chord[2] * 2, chord[1] * 2];
  arpNotes.forEach((freq, i) => {
    const time = now + i * 0.5 + 0.25; // Förskjuten 0.25s (offbeat)
    const arpOsc = c.createOscillator();
    const arpGain = c.createGain();
    const filter = c.createBiquadFilter();
    
    arpOsc.type = "square"; // Fyrkantsvåg för retro spel-feeling
    arpOsc.frequency.setValueAtTime(freq, time);
    
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, time);
    
    arpGain.gain.setValueAtTime(0.0001, time);
    arpGain.gain.exponentialRampToValueAtTime(0.015, time + 0.02);
    arpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    
    arpOsc.connect(filter).connect(arpGain).connect(master);
    arpOsc.start(time);
    arpOsc.stop(time + 0.25);
  });
}

export function startAmbientMusic() {
  const c = getCtx();
  if (!c || musicTimer != null) return;
  if (c.state === "suspended") {
    void c
      .resume()
      .then(() => startAmbientMusic())
      .catch((error) => console.log("Audio context resume failed", error));
    return;
  }
  musicMaster = c.createGain();
  musicMaster.gain.setValueAtTime(0.09, c.currentTime);
  musicMaster.connect(c.destination);
  playAmbientStep(c, c.currentTime + 0.02);
  
  // Ändrat intervallet till 2000 ms för att matcha tempot (4 slag á 0.5s)
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
