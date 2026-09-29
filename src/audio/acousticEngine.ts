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

  // Optional external BGM player. When MASTER_BGM_CONFIG.customAudioUrl is set,
  // the external track is used instead of the procedural chord cycle.
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
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create ambient pad bus
      this.padGain = this.ctx.createGain();
      this.padGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
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
      this.ctx.resume();
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      // Gentle 4-second fade in for the procedural engine.
      this.masterGain.gain.linearRampToValueAtTime(0.75, this.ctx.currentTime + MASTER_BGM_CONFIG.fadeInDurationSec);

      // Prefer a user-provided BGM file when configured.
      // When no external URL is configured (''), keep the existing procedural BGM.
      if (!this.startConfiguredBgm()) {
        this.startProceduralBgm();
      }
    }
  }

  private setupWarmthWhisper() {
    if (!this.ctx || !this.masterGain) return;

    // Buffer for gentle vinyl/wind pinkish noise
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
    this.noiseGain.gain.setValueAtTime(0.045, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    whiteNoise.start();
  }

  /**
   * Starts the configured external BGM, if one exists.
   * The HTMLAudioElement itself owns the infinite loop so the track restarts
   * automatically when it reaches the end. If playback is rejected by the
   * browser/environment, the engine falls back to the procedural BGM.
   */
  private startConfiguredBgm(): boolean {
    if (typeof window === 'undefined') return false;

    const url = MASTER_BGM_CONFIG.customAudioUrl?.trim();
    if (!url) return false;

    try {
      if (!this.bgmAudio) {
        this.bgmAudio = new Audio(url);
        this.bgmAudio.preload = 'auto';

        this.bgmAudio.addEventListener('error', () => {
          // External BGM failed to load; fall back to the procedural engine.
          if (!this.isPlaying) return;
          this.startProceduralBgm();
        });

        this.bgmAudio.addEventListener('ended', () => {
          // loop=true normally makes the browser restart automatically.
          // This explicit safeguard handles environments that do not honor it.
          if (!this.isPlaying || !this.bgmAudio || !MASTER_BGM_CONFIG.loop) return;
          this.bgmAudio.currentTime = 0;
          void this.bgmAudio.play().catch(() => {});
        });
      }

      this.bgmAudio.loop = MASTER_BGM_CONFIG.loop;
      this.bgmAudio.volume = Math.max(0, Math.min(1, MASTER_BGM_CONFIG.volume));

      const playPromise = this.bgmAudio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Browser autoplay policy or a loading issue: use procedural BGM instead.
          if (this.isPlaying) {
            this.startProceduralBgm();
          }
        });
      }

      return true;
    } catch {
      return false;
    }
  }

  private startProceduralBgm() {
    // Prevent duplicate procedural loops when an external BGM later fails.
    if (!this.isPlaying || this.chordTimer !== null) return;
    this.playPadCycle();
  }

  private playPadCycle() {
    if (!this.isPlaying || !this.ctx || !this.padGain) return;

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

      // Warm triangle & sine layering with micro-detune
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

  /**
   * Plays an ethereal pentatonic chime when the user interacts
   * with elements, touches the canvas, or glides the cursor
   */
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

    // Warm high-register sparkle
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.Q.setValueAtTime(3, now);

    const vol = Math.min(0.22, 0.08 * intensity);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.9);
  }

  /**
   * Playful kawaii bounce / pop sound for interactive treats
   */
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

  /**
   * Cute kawaii high squeak / purr sound
   */
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

  /**
   * Celestial multi-tone arpeggio sparkle
   */
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

  /**
   * Soft tactile crystal click feedback for any element
   */
  public playTactileClick() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.045);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Anime cat meow synthesis for Hoshineko
   */
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

    // Natural anime cat meow pitch contour (nyaa~)
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

  /**
   * High cute anime cat chirp (nya-n!)
   */
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

  /**
   * Frost crystal ice typing crackle
   */
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

  /**
   * Cat purr soothing vibration
   */
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

  /**
   * Whoosh card glide sound
   */
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

  /**
   * Grand acceptance celestial chime for "Iya" button
   */
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

  /**
   * Gentle dismissal swish for "Tidak" button
   */
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

  /**
   * Massive dimensional shatter sound with glass crack and low resonance
   */
  public playDimensionalShatter() {
    if (!this.isInitialized) this.activate();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. Crystal shatter chimes
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

    // 2. Low resonant dimensional impact boom
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

  /**
   * Seasonal transition harmonic arpeggio
   */
  public playSeasonalShift() {
    this.playMagicSparkle();
    this.playChime(1.5, 6);
  }

  /**
   * Crystalline magic seal shatter / unboxing sound
   */
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

  /**
   * Helper to play custom audio file if provided by user in registry,
   * otherwise cleanly fall back to procedural acoustic synthesizer.
   */
  private playCustomAudio(url?: string): boolean {
    if (!url || typeof window === 'undefined') return false;
    try {
      const audio = new Audio(url);
      audio.volume = 0.8;
      audio.play().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scene-Specific Dynamic Click Sound
   * Synthesizes distinct acoustic textures per scene (or plays user custom audio if configured)
   */
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
        // Scene 1: Opening Gate - High crystal ping with harmonic shimmer
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
        // Scene 2: Novel Cover - Soft tactile book parchment click with subtle bell
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
        // Scene 3: Letter - Sacred wax seal snap with bell bloom
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
        // Scene 4: Gift Pavilion - Sweet velvet ribbon ping with glass resonance
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
        // Scene 5: Reply - Gentle starlight water droplet
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
        // Scene 6: Epilogue Sanctum - Resonant peace bell with deep warm decay
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

  /**
   * Magical Celestial Gift Opening Sound
   * Pure organic cascading harmonic glockenspiel & harp arpeggio (Zero robotic/AI noise)
   */
  public playMagicalGiftOpen() {
    if (!this.isInitialized) this.activate();
    if (this.playCustomAudio(SPECIAL_SFX_REGISTRY.giftOpenMagical.customAudioUrl)) return;
    if (!this.ctx || !this.masterGain) return;

    const freqs = SPECIAL_SFX_REGISTRY.giftOpenMagical.harmonicFrequencies;

    // 1. Cascading crystalline bells
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

    // 2. Soft warm sub-bass bloom (acoustic presence)
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

  /**
   * Dimensional Soaring Ascension Sound for Letter Sending
   * Celestial swoosh with rising starlight harmonic tail
   */
  public playAscensionSend() {
    if (!this.isInitialized) this.activate();
    if (this.playCustomAudio(SPECIAL_SFX_REGISTRY.replySendAscension.customAudioUrl)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. Aerodynamic celestial whoosh
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

    // 2. Ascending starlight arpeggio
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

  /**
   * Situational Hoshineko Natural Cat Voice
   * Authentic, cute, sweet feline harmonic formant synthesis (Non-robotic, non-AI)
   */
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
        // Deep rhythmic purr
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
        // High quick affectionate chirp
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
        // Excited celestial kitten chime meow
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
        // Sweet natural two-tone kitten meow (mew-nyaa~)
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

  /**
   * Ensures seamless BGM continuity across all scene transitions
   */
  public ensureBgmPlaying() {
    if (!this.isPlaying || !this.isInitialized) {
      this.activate();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public shiftAtmosphereTone(tone: 'golden' | 'amber' | 'twilight') {
    if (!this.ctx || !this.padGain) return;
    const now = this.ctx.currentTime;
    if (tone === 'golden') {
      this.padGain.gain.linearRampToValueAtTime(0.2, now + 1.0);
    } else if (tone === 'amber') {
      this.padGain.gain.linearRampToValueAtTime(0.24, now + 1.0);
    } else {
      this.padGain.gain.linearRampToValueAtTime(0.16, now + 1.0);
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
