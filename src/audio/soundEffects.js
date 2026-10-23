// Web Audio API procedural sound engine for cinematic meme transitions
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // Muted by default as requested
    this.riserOsc1 = null;
    this.riserOsc2 = null;
    this.riserGain = null;
    this.riserFilter = null;
    this.isRiserPlaying = false;
    this.lastTriggerTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.isMuted) {
      this.stopRiser();
    }
  }

  // Cinematic rising pitch drone during anticipation phase
  updateRiser(progress) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Only play riser when progress is between 25% and 90%
    if (progress > 0.25 && progress < 0.95) {
      if (!this.isRiserPlaying) {
        this.startRiser();
      }
      if (this.riserGain && this.riserFilter && this.riserOsc1 && this.riserOsc2) {
        const now = this.ctx.currentTime;
        // Frequency rises from 110Hz to 330Hz
        const targetFreq = 110 + (progress - 0.25) * 350;
        this.riserOsc1.frequency.setTargetAtTime(targetFreq, now, 0.08);
        this.riserOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.08); // fifth harmony

        // Filter opens up as user tilts higher
        const cutoff = 300 + (progress - 0.25) * 2500;
        this.riserFilter.frequency.setTargetAtTime(cutoff, now, 0.08);

        // Volume rises smoothly
        const gainLevel = Math.min(0.25, (progress - 0.25) * 0.4);
        this.riserGain.gain.setTargetAtTime(gainLevel, now, 0.05);
      }
    } else {
      if (this.isRiserPlaying) {
        this.stopRiser();
      }
    }
  }

  startRiser() {
    if (this.isRiserPlaying || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.riserOsc1 = this.ctx.createOscillator();
      this.riserOsc2 = this.ctx.createOscillator();
      this.riserGain = this.ctx.createGain();
      this.riserFilter = this.ctx.createBiquadFilter();

      this.riserOsc1.type = 'sawtooth';
      this.riserOsc2.type = 'triangle';
      this.riserFilter.type = 'lowpass';
      this.riserFilter.Q.value = 4.0;
      this.riserFilter.frequency.setValueAtTime(300, now);

      this.riserGain.gain.setValueAtTime(0.001, now);

      this.riserOsc1.connect(this.riserFilter);
      this.riserOsc2.connect(this.riserFilter);
      this.riserFilter.connect(this.riserGain);
      this.riserGain.connect(this.ctx.destination);

      this.riserOsc1.start(now);
      this.riserOsc2.start(now);
      this.isRiserPlaying = true;
    } catch (e) {
      console.warn('Audio riser error:', e);
    }
  }

  stopRiser() {
    if (!this.isRiserPlaying || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      if (this.riserGain) {
        this.riserGain.gain.setTargetAtTime(0.0001, now, 0.08);
      }
      setTimeout(() => {
        try {
          if (this.riserOsc1) { this.riserOsc1.stop(); this.riserOsc1.disconnect(); }
          if (this.riserOsc2) { this.riserOsc2.stop(); this.riserOsc2.disconnect(); }
          this.riserOsc1 = null;
          this.riserOsc2 = null;
          this.riserGain = null;
          this.riserFilter = null;
        } catch (_) {}
        this.isRiserPlaying = false;
      }, 120);
    } catch (e) {
      this.isRiserPlaying = false;
    }
  }

  // Preset-aware dramatic impact audio
  playMemeImpact(type = 'cinematic') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (now - this.lastTriggerTime < 0.8) return;
    this.lastTriggerTime = now;

    this.stopRiser();

    if (type === 'cheerful' || type === 'warm-vintage') {
      // Cheerful / Sweet Arpeggio Chord for Smile Meme (C major pentatonic sparkle: C4, E4, G4, A4, C5)
      const notes = [261.63, 329.63, 392.00, 440.00, 523.25];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.3);
      });
      return;
    }

    // 1. Sub-Bass 808 Boom (Sine drop 140Hz -> 32Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 1.2);

    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.6);

    // 2. Metallic smack / Vine boom transient
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(type === 'vine_boom' ? 500 : 800, now);
    noiseFilter.Q.value = 2.5;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(type === 'vine_boom' ? 0.6 : 0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // 3. Cinematic choir (for Willem Dafoe cinematic mode)
    if (type !== 'vine_boom') {
      const chordNotes = [73.42, 110.0, 174.61, 261.63, 329.63];
      chordNotes.forEach((freq, idx) => {
        const chordOsc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();
        const chordFilter = this.ctx.createBiquadFilter();

        chordOsc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        chordOsc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, now);

        chordFilter.type = 'lowpass';
        chordFilter.frequency.setValueAtTime(450, now);
        chordFilter.frequency.exponentialRampToValueAtTime(3800, now + 0.12);
        chordFilter.frequency.exponentialRampToValueAtTime(250, now + 2.5);

        chordGain.gain.setValueAtTime(0.001, now);
        chordGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
        chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        chordOsc.connect(chordFilter);
        chordFilter.connect(chordGain);
        chordGain.connect(this.ctx.destination);

        chordOsc.start(now);
        chordOsc.stop(now + 3.0);
      });
    }
  }

  // Whoosh sound on camera reset
  playWhoosh() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(900, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const sounds = new SoundEffects();
