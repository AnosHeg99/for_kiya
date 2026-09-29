import {
  MASTER_BGM_CONFIG,
  SCENE_CLICK_REGISTRY,
  HOSHINEKO_VOICE_REGISTRY,
  SPECIAL_SFX_REGISTRY,
} from '../data/sceneAssetRegistry';

/**
 * Procedural Web Audio Ambient Engine
 * Synthesizes dynamic golden-hour soundscapes, ethereal harmonic pads,
 * soft vinyl/tape whispers, and interactive pentatonic celestial chimes
 * without any overt player UI.
 */

class AcousticEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private isInitialized = false;
  private isPlaying = false;
  private currentChordIndex = 0;
  private chordTimer: number | null = null;

  // Optional external BGM player
  private bgmAudio: HTMLAudioElement | null = null;

  // Pentatonic scale frequencies in Hz (tuned around Eb warm soothing key)
  private readonly pentatonicNotes = [
    311.13, // Eb4
    349.23, // F4
    392.00, // G4
    466.16, // Bb4
    523.25, // C5
    622.25, // Eb5
    698.46, // F5
    783.99, // G5
    932.33, // Bb5
    1046.50 // C6
  ];

  // Ethereal chord progressions (Ebmaj9, Gm7, Fm9, Abmaj7)
  private readonly chords = [
    [155.56, 311.13, 392.00, 466.16, 587.33], // Ebmaj9
    [196.00, 293.66, 349.23, 440.00, 523.25], // Gm7
    [174.61, 261.63, 349.23, 415.30, 523.25], // Fm9
    [207.65, 311.13, 392.00, 466.16, 622.25]  // Abmaj7
  ];

  public init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      // Master volume selalu aktif di 0.92 agar seluruh SFX, klik, dan meow pasti terdengar jelas
      this.masterGain.gain.setValueAtTime(0.92, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create ambient pad bus
      this.padGain = this.ctx.createGain();
      this.padGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
      this.padGain.connect(this.masterGain);

      // Create gentle vinyl warmth
      this.setupWarmthWhisper();

      this.isInitialized = true;
    } catch {
      // Graceful fallback for non-audio environments
    }
  }

  public activate() {
    if (!this.isInitialized) {
      this.init();
    }

    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    // Pastikan master gain aktif
    const targetVol = Math.max(0.2, Math.min(1.0, MASTER_BGM_CONFIG?.volume ?? 0.92));
    this.masterGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);

    if (!this.isPlaying) {
      this.isPlaying = true;

      const customUrl = MASTER_BGM_CONFIG?.customAudioUrl?.trim();
      if (customUrl && customUrl !== '') {
        // Coba putar MP3 kustom
        const started = this.startConfiguredBgm();
        if (!started) {
          this.startProceduralBgm();
        }
      } else {
        // Jika tidak ada kustom, putar synthesizer bawaan
        this.startProceduralBgm();
      }
    }
  }

  private setupWarmthWhisper() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.04;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    whiteNoise.start();
  }

  /**
   * Starts the configured external BGM with automatic fallback
   */
  private startConfiguredBgm(): boolean {
    if (typeof window === 'undefined') return false;

    const url = MASTER_BGM_CONFIG.customAudioUrl?.trim();
    if (!url) return false;

    try {
      if (!this.bgmAudio) {
        this.bgmAudio = new Audio(url);
        this.bgmAudio.preload = 'auto';

        // Jika file 404 / gagal dimuat, langsung fallback ke instrumen agar TIDAK HENING!
        this.bgmAudio.addEventListener('error', () => {
          this.startProceduralBgm();
        });

        this.bgmAudio.addEventListener('ended', () => {
          if (!this.bgmAudio || !MASTER_BGM_CONFIG.loop) return;
          this.bgmAudio.currentTime = 0;
          void this.bgmAudio.play().catch(() => {});
        });
      }

      this.bgmAudio.loop = MASTER_BGM_CONFIG.loop !== false;
      this.bgmAudio.volume = Math.max(0, Math.min(1, MASTER_BGM_CONFIG.volume ?? 0.92));

      const playPromise = this.bgmAudio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise
          .then(() => {
            // Berhasil memutar MP3 -> matikan instrumen bawaan agar suara jernih
            this.stopProceduralBgm();
          })
          .catch(() => {
            // Jika autoplay ditahan browser sebelum klik, nyalakan synth dulu agar bersuara
            this.startProceduralBgm();
          });
      }

      return true;
    } catch {
      this.startProceduralBgm();
      return false;
    }
  }

  private stopProceduralBgm() {
    if (this.chordTimer !== null) {
      clearTimeout(this.chordTimer);
      this.chordTimer = null;
    }
    if (this.padGain && this.ctx) {
      this.padGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    }
  }

  private startProceduralBgm() {
    if (this.chordTimer !== null) return;
    if (this.padGain && this.ctx) {
      this.padGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
    }
    this.playPadCycle();
  }

  private playPadCycle() {
    if (!this.ctx || !this.padGain) return;

    const chord = this.chords[this.currentChordIndex];
    this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;

    const duration = 7.5;
    const now = this.ctx.currentTime;

    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.padGain) return;

      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * (idx % 2 === 0 ? 1.002 : 0.998), now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + idx * 80, now);
      filter.frequency.exponentialRampToValueAtTime(540 + idx * 60, now + duration * 0.5);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06 / (idx + 1), now + duration * 0.35);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.padGain);

      osc.start(now);
      osc2.start(now);

      osc.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    });

    this.chordTimer = window.setTimeout(() => {
      this.chordTimer = null;
      this.playPadCycle();
    }, (duration - 1.5) * 1000);
  }

  public playChime(intensity = 1.0, noteOffset?: number) {
    if (!this.isInitialized) {
      this.activate();
    }
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const noteIndex = noteOffset !== undefined 
      ? Math.max(0, Math.min(this.pentatonicNotes.length - 1, noteOffset))
      : Math.floor(Math.random() * this.pentatonicNotes.length);

    const freq = this.pentatonicNotes[noteIndex];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.Q.setValueAtTime(3, now);

    const vol = Math.min(0.24, 0.1 * intensity);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.9);
  }

  public playKawaiiPop(pitch = 1.0) {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const base = 480 * pitch;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.8, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playSqueak() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.linearRampToValueAtTime(1350, now + 0.08);
    osc.frequency.linearRampToValueAtTime(1100, now + 0.16);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playMagicSparkle() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    freqs.forEach((f, i) => {
      window.setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.65);
      }, i * 75);
    });
  }

  public playTactileClick() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.045);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playCatMeow(pitch = 1.0) {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 * pitch, now);
    filter.Q.setValueAtTime(4, now);

    const startF = 620 * pitch;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.linearRampToValueAtTime(startF * 1.55, now + 0.12);
    osc.frequency.linearRampToValueAtTime(startF * 1.25, now + 0.32);
    osc.frequency.exponentialRampToValueAtTime(startF * 0.9, now + 0.48);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playCatChirp() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(5, now);

    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(1450, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playFrostCrack() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const pitch = 2400 + Math.random() * 800;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCatPurr() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.linearRampToValueAtTime(85, now + 0.3);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playWhoosh() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.18);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.4);

    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playCardAccept() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chords.forEach((freq, idx) => {
      window.setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15 / (idx + 1), now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.95);
      }, idx * 60);
    });
  }

  public playCardDecline() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.22);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playDimensionalShatter() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const shatterPitches = [1600, 2100, 2700, 3400, 4200];
    shatterPitches.forEach((p, i) => {
      window.setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const subNow = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p, subNow);
        gain.gain.setValueAtTime(0.14, subNow);
        gain.gain.exponentialRampToValueAtTime(0.001, subNow + 0.45);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(subNow);
        osc.stop(subNow + 0.5);
      }, i * 35);
    });

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.7);

    subGain.gain.setValueAtTime(0.25, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 0.8);
  }

  public playSeasonalShift() {
    this.playMagicSparkle();
    this.playChime(1.5, 6);
  }

  public playCrystallineShatter() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const freqs = [1046.5, 1318.5, 1567.98, 2093.0];
    freqs.forEach((f, i) => {
      window.setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.7, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
      }, i * 40);
    });
  }

  private playCustomAudio(url?: string): boolean {
    if (!url || typeof window === 'undefined') return false;
    try {
      const audio = new Audio(url);
      audio.volume = Math.max(0, Math.min(1, MASTER_BGM_CONFIG.volume ?? 0.92));
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  public playSceneClick(sceneId: string) {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const config = SCENE_CLICK_REGISTRY[sceneId] || SCENE_CLICK_REGISTRY.opening;
    if (this.playCustomAudio(config?.customAudioUrl)) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    switch (config.acousticType) {
      case 'crystal-tap': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(config.basePitchHz, now);
        osc.frequency.exponentialRampToValueAtTime(config.basePitchHz * 0.45, now + 0.05);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(config.basePitchHz * 1.2, now);
        filter.Q.setValueAtTime(config.resonance, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        break;
      }
      case 'parchment-tick': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(config.basePitchHz, now);
        osc.frequency.linearRampToValueAtTime(config.basePitchHz * 0.55, now + 0.04);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        break;
      }
      case 'celestial-snap': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(config.basePitchHz, now);
        osc.frequency.exponentialRampToValueAtTime(config.basePitchHz * 0.4, now + 0.065);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(config.basePitchHz * 1.5, now);
        filter.Q.setValueAtTime(3.5, now);

        gain.gain.setValueAtTime(0.19, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        break;
      }
      case 'velvet-ping': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(config.basePitchHz, now);
        osc.frequency.exponentialRampToValueAtTime(config.basePitchHz * 0.65, now + 0.06);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(config.basePitchHz * 1.3, now);
        filter.Q.setValueAtTime(4.2, now);

        gain.gain.setValueAtTime(0.17, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        break;
      }
      case 'starlight-droplet': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(config.basePitchHz, now);
        osc.frequency.exponentialRampToValueAtTime(config.basePitchHz * 1.35, now + 0.035);
        osc.frequency.exponentialRampToValueAtTime(config.basePitchHz * 0.6, now + 0.07);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2800, now);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
        break;
      }
      case 'sacred-bell':
      default: {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(config.basePitchHz, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(config.basePitchHz * 1.2, now);
        filter.Q.setValueAtTime(config.resonance, now);

        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        break;
      }
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playMagicalGiftOpen() {
    if (!this.isInitialized) this.activate();
    if (this.playCustomAudio(SPECIAL_SFX_REGISTRY.giftOpenMagical.customAudioUrl)) return;
    if (!this.ctx || !this.masterGain) return;

    const freqs = SPECIAL_SFX_REGISTRY.giftOpenMagical.harmonicFrequencies;

    freqs.forEach((f, idx) => {
      window.setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(f * 1.25, now);
        filter.Q.setValueAtTime(4.0, now);

        const vol = 0.16 / (1 + idx * 0.12);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 1.25);
      }, idx * 65);
    });

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(220, now);
    subOsc.frequency.exponentialRampToValueAtTime(110, now + 0.5);

    subGain.gain.setValueAtTime(0.12, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.65);
  }

  public playAscensionSend() {
    if (!this.isInitialized) this.activate();
    if (this.playCustomAudio(SPECIAL_SFX_REGISTRY.replySendAscension.customAudioUrl)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const whooshOsc = this.ctx.createOscillator();
    const whooshFilter = this.ctx.createBiquadFilter();
    const whooshGain = this.ctx.createGain();

    whooshOsc.type = 'sine';
    whooshFilter.type = 'lowpass';
    whooshFilter.frequency.setValueAtTime(240, now);
    whooshFilter.frequency.exponentialRampToValueAtTime(3200, now + 0.35);
    whooshFilter.frequency.exponentialRampToValueAtTime(400, now + 0.85);

    whooshOsc.frequency.setValueAtTime(160, now);
    whooshOsc.frequency.exponentialRampToValueAtTime(950, now + 0.38);
    whooshOsc.frequency.exponentialRampToValueAtTime(240, now + 0.85);

    whooshGain.gain.setValueAtTime(0.01, now);
    whooshGain.gain.linearRampToValueAtTime(0.22, now + 0.25);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    whooshOsc.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(this.masterGain);

    whooshOsc.start(now);
    whooshOsc.stop(now + 0.95);

    const ascensionPitches = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    ascensionPitches.forEach((p, i) => {
      window.setTimeout(() => {
        if (!this.ctx || !this.masterGain) return;
        const subNow = this.ctx.currentTime;
        const sOsc = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();

        sOsc.type = 'sine';
        sOsc.frequency.setValueAtTime(p, subNow);
        sGain.gain.setValueAtTime(0.001, subNow);
        sGain.gain.linearRampToValueAtTime(0.14, subNow + 0.03);
        sGain.gain.exponentialRampToValueAtTime(0.001, subNow + 0.85);

        sOsc.connect(sGain);
        sGain.connect(this.masterGain);
        sOsc.start(subNow);
        sOsc.stop(subNow + 0.9);
      }, 120 + i * 55);
    });
  }

  public playHoshinekoVoice(situation = 'greeting') {
    if (!this.isInitialized) this.activate();
    const voiceSlot = HOSHINEKO_VOICE_REGISTRY[situation] || HOSHINEKO_VOICE_REGISTRY.greeting;
    if (this.playCustomAudio(voiceSlot.customAudioUrl)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    filter.type = 'bandpass';

    const pitch = voiceSlot.pitch || 1.15;

    switch (voiceSlot.formantFilter) {
      case 'warm-purr': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(72 * pitch, now);
        osc.frequency.linearRampToValueAtTime(78 * pitch, now + 0.35);

        filter.frequency.setValueAtTime(350, now);
        filter.Q.setValueAtTime(2.0, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.55);
        return;
      }
      case 'cute-chirp': {
        filter.frequency.setValueAtTime(1750 * pitch, now);
        filter.Q.setValueAtTime(4.5, now);

        osc.frequency.setValueAtTime(920 * pitch, now);
        osc.frequency.linearRampToValueAtTime(1520 * pitch, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(1150 * pitch, now + 0.17);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        break;
      }
      case 'sparkle-nya': {
        filter.frequency.setValueAtTime(1450 * pitch, now);
        filter.Q.setValueAtTime(3.8, now);

        const base = 680 * pitch;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.linearRampToValueAtTime(base * 1.6, now + 0.1);
        osc.frequency.linearRampToValueAtTime(base * 1.3, now + 0.25);
        osc.frequency.exponentialRampToValueAtTime(base * 0.95, now + 0.42);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        this.playChime(1.2, 8);
        break;
      }
      case 'happy-nya':
      case 'gentle-mew':
      default: {
        filter.frequency.setValueAtTime(1300 * pitch, now);
        filter.Q.setValueAtTime(3.5, now);

        const startF = 620 * pitch;
        osc.frequency.setValueAtTime(startF, now);
        osc.frequency.linearRampToValueAtTime(startF * 1.48, now + 0.11);
        osc.frequency.linearRampToValueAtTime(startF * 1.22, now + 0.28);
        osc.frequency.exponentialRampToValueAtTime(startF * 0.9, now + 0.45);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.17, now + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
        break;
      }
    }

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  public ensureBgmPlaying() {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    // Jika file BGM kustom sedang terhenti, coba putar
    if (this.bgmAudio) {
      if (this.bgmAudio.paused) {
        void this.bgmAudio.play().then(() => {
          this.stopProceduralBgm();
        }).catch(() => {
          this.startProceduralBgm();
        });
      }
      return;
    }

    // Jika belum jalan sama sekali, jalankan
    if (!this.isPlaying || !this.isInitialized) {
      this.activate();
    }
  }

  public shiftAtmosphereTone(tone: 'golden' | 'amber' | 'twilight') {
    if (!this.ctx || !this.padGain) return;
    const now = this.ctx.currentTime;
    if (tone === 'golden') {
      this.padGain.gain.linearRampToValueAtTime(0.24, now + 1.0);
    } else if (tone === 'amber') {
      this.padGain.gain.linearRampToValueAtTime(0.28, now + 1.0);
    } else {
      this.padGain.gain.linearRampToValueAtTime(0.18, now + 1.0);
    }
  }

  public destroy() {
    if (this.chordTimer) {
      clearTimeout(this.chordTimer);
      this.chordTimer = null;
    }

    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio.removeAttribute('src');
      this.bgmAudio.load();
      this.bgmAudio = null;
    }

    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
    this.isPlaying = false;
  }
}

export const acousticEngine = new AcousticEngine();
