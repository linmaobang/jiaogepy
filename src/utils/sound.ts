let audioCtx: AudioContext | null = null;
let muted = false;

export function setSoundMuted(nextMuted: boolean): void {
  muted = nextMuted;
}

export function getSoundMuted(): boolean {
  return muted;
}

function getAudioContext(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return null;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

const PENTATONIC_FREQS = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0,  // A5
  1046.5, // C6
  1174.66, // D6
  1318.51, // E6
];

export function playPentatonicPop(comboIndex: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freq = PENTATONIC_FREQS[Math.abs(comboIndex) % PENTATONIC_FREQS.length];

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 0.92, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.12, now + 0.045);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.085, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playPotTapSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(160, now + 0.085);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

export function playWateringSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const dropletTimes = [0.02, 0.09, 0.16, 0.23, 0.31, 0.38];
  const baseFreqs = [620, 760, 880, 720, 960, 1080];

  dropletTimes.forEach((offset, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = baseFreqs[idx];
    osc.frequency.setValueAtTime(startFreq, now + offset);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.5, now + offset + 0.085);

    gain.gain.setValueAtTime(0.001, now + offset);
    gain.gain.linearRampToValueAtTime(0.075, now + offset + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + offset);
    osc.stop(now + offset + 0.15);
  });
}

export function playBloomChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * 0.055;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.07, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.45);
  });
}
