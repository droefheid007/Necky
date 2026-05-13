/**
 * SoundManager.ts
 * Procedural audio for NeckRacer using Web Audio API.
 * No assets to load — everything is generated in real-time.
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Engine
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  
  // Wind
  private windNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private windGain: GainNode | null = null;

  constructor() {
    // Context is created on first user interaction to comply with browser policies
  }

  private init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);

    this.setupEngine();
    this.setupWind();
  }

  private setupEngine() {
    if (!this.ctx || !this.masterGain) return;
    
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60; // Base RPM
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.1;

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    
    this.engineOsc.start();
  }

  private setupWind() {
    if (!this.ctx || !this.masterGain) return;

    // Simple white noise for wind
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.05;

    noise.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    
    noise.start();
  }

  public update(speedKmH: number) {
    if (!this.ctx) this.init();
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.ctx?.resume();
    }

    const normalizedSpeed = Math.min(1, speedKmH / 150);

    // Update Engine Pitch
    if (this.engineOsc) {
      const freq = 60 + (normalizedSpeed * 140);
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx!.currentTime, 0.1);
    }

    // Update Wind Volume & Filter
    if (this.windGain) {
      const vol = 0.05 + (normalizedSpeed * 0.15);
      this.windGain.gain.setTargetAtTime(vol, this.ctx!.currentTime, 0.2);
    }
  }

  public playEffect(type: 'jump' | 'slide' | 'hit') {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.connect(g);
    g.connect(this.masterGain);

    const now = this.ctx.currentTime;

    if (type === 'jump') {
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start();
      osc.stop(now + 0.3);
    } else if (type === 'slide') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start();
      osc.stop(now + 0.4);
    }
  }

  public stop() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
