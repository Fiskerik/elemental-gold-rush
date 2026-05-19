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
  
  // Vårt ackordsbibliotek (Grundton, Terts, Kvint)
  const lib = [
    [220.00, 261.63, 329.63], // 0: Am
    [174.61, 220.00, 261.63], // 1: F
    [261.63, 329.63, 392.00], // 2: C
    [196.00, 246.94, 293.66], // 3: G
    [146.83, 174.61, 220.00], // 4: Dm
    [164.81, 207.65, 246.94], // 5: E (Dur)
  ];

  // En 64 takter lång struktur (ca 2 minuter och 8 sekunder)
const songStructure = [
  // Gladare Intro (mer major, ljusare)
  2, 3, 1, 5, 2, 3, 1, 2,   // C → G → F → E → C → G → F → C
  2, 3, 1, 5, 2, 3, 1, 2,

  // Bas kommer in (fortfarande relativt ljust)
  1, 2, 3, 1, 4, 2, 3, 5,
  2, 3, 1, 2, 1, 2, 3, 2,

  // Arpeggio kommer in
  2, 3, 1, 5, 2, 3, 1, 2,
  1, 2, 3, 1, 4, 2, 3, 5,

  // Melodi & Klimax
  2, 3, 1, 2, 2, 3, 1, 5,
  2, 3, 1, 2, 2, 3, 1, 2   // Avslutning mot loop
];

  const measure = musicStep % 64;
  const chordIdx = songStructure[measure];
  const chord = lib[chordIdx];
  musicStep += 1;

  // Styr vilka instrument som är aktiva beroende på var vi är i låten
  const hasBass = measure >= 16;
  const hasArp = measure >= 32 && measure < 60;
  const hasMelody = measure >= 48;

  // 1. PADS (Atmosfären, spelas alltid men varierar i intensitet)
  const padIntensity = hasMelody ? 0.04 : 0.06;
  chord.forEach((freq, index) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = index === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);
    
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(padIntensity, now + 0.8);
    gain.gain.linearRampToValueAtTime(padIntensity * 0.6, now + 1.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 2.6);
  });

  // 2. BASS (Drivet, pulserande 4 gånger per takt)
  if (hasBass) {
    const bassFreq = chord[0] / 2; // En oktav under grundtonen
    for (let i = 0; i < 4; i++) {
      const time = now + i * 0.5;
      const bassOsc = c.createOscillator();
      const bassGain = c.createGain();
      const filter = c.createBiquadFilter();
      
      bassOsc.type = "sawtooth";
      bassOsc.frequency.setValueAtTime(bassFreq, time);
      
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);
      
      bassGain.gain.setValueAtTime(0.0001, time);
      bassGain.gain.exponentialRampToValueAtTime(0.06, time + 0.05);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
      
      bassOsc.connect(filter).connect(bassGain).connect(master);
      bassOsc.start(time);
      bassOsc.stop(time + 0.45);
    }
  }

  // 3. ARPEGGIO (Det lilla extra, 8 noter per takt)
  if (hasArp) {
    const arpNotes = [chord[0], chord[1], chord[2], chord[1]].map(f => f * 2);
    for (let i = 0; i < 8; i++) {
      const time = now + i * 0.25;
      const arpOsc = c.createOscillator();
      const arpGain = c.createGain();
      
      arpOsc.type = "square";
      arpOsc.frequency.setValueAtTime(arpNotes[i % arpNotes.length], time);
      
      arpGain.gain.setValueAtTime(0.0001, time);
      arpGain.gain.exponentialRampToValueAtTime(0.012, time + 0.02);
      arpGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
      
      arpOsc.connect(arpGain).connect(master);
      arpOsc.start(time);
      arpOsc.stop(time + 0.2);
    }
  }

  // 4. MELODI (Den svävande leaden)
  if (hasMelody) {
    const leadOsc = c.createOscillator();
    const leadGain = c.createGain();
    
    leadOsc.type = "triangle";
    // Spelar grundtonen eller tertsen två oktaver upp
    const leadFreq = (measure % 2 === 0 ? chord[0] : chord[1]) * 4;
    
    leadOsc.frequency.setValueAtTime(leadFreq, now);
    // Skapar en liten vibrato-effekt/böjning
    leadOsc.frequency.exponentialRampToValueAtTime(leadFreq * 1.01, now + 1.0);
    
    leadGain.gain.setValueAtTime(0.0001, now);
    leadGain.gain.linearRampToValueAtTime(0.02, now + 0.4);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    
    leadOsc.connect(leadGain).connect(master);
    leadOsc.start(now);
    leadOsc.stop(now + 2.0);
  }

  // 5. TRANSITION (Vind-svep var 8:e takt)
  if (measure % 8 === 7) {
    const bufferSize = c.sampleRate * 2;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; // Vitt brus
    
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = c.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(1200, now + 1);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 2);
    
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.03, now + 1);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 2);
    
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start(now);
    noise.stop(now + 2);
  }
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
  // Sänkte mastervolymen lite eftersom vi lagt till fler instrument
  musicMaster.gain.setValueAtTime(0.07, c.currentTime);
  musicMaster.connect(c.destination);
  
  // Sätt variabeln till 0 så den alltid startar från början när man slår på musiken
  musicStep = 0;
  playAmbientStep(c, c.currentTime + 0.02);
  
  // Kallar på nästa takt varje 2:a sekund
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
