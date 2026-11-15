import { CONFIG, type WeaponId } from '../config';

export type SoundCue = keyof typeof CONFIG.audio.sounds;

export class AudioManager {
  private context: AudioContext | null = null;
  private unlocked = false;
  private muted: boolean;
  private activeVoices = 0;

  constructor(muted: boolean) { this.muted = muted; }

  setMuted(value: boolean): void { this.muted = value; }
  get isMuted(): boolean { return this.muted; }

  async unlock(): Promise<void> {
    if (this.unlocked) {
      if (this.context?.state === 'suspended') await this.context.resume().catch(() => undefined);
      return;
    }
    this.unlocked = true;
    try {
      const Context = window.AudioContext;
      if (!Context) return;
      this.context = new Context();
      if (this.context.state === 'suspended') await this.context.resume().catch(() => undefined);
    } catch {
      this.context = null;
    }
  }

  async suspend(): Promise<void> {
    if (this.context?.state === 'running') await this.context.suspend().catch(() => undefined);
  }

  async resume(): Promise<void> {
    if (this.unlocked && this.context?.state === 'suspended') await this.context.resume().catch(() => undefined);
  }

  play(cue: SoundCue, weapon?: WeaponId): void {
    if (this.muted || !this.unlocked || !this.context || this.activeVoices >= CONFIG.audio.oscillatorLimit) return;
    const context = this.context;
    const sound = CONFIG.audio.sounds[cue];
    const weaponTone = weapon ? CONFIG.audio.weaponTone[weapon] : 1;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = sound.wave;
    oscillator.frequency.setValueAtTime(sound.frequency * weaponTone, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(CONFIG.audio.minimumFrequency, sound.frequency * sound.bend * weaponTone), now + sound.duration);
    gain.gain.setValueAtTime(CONFIG.audio.volumeDefault * CONFIG.audio.soundGainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    this.activeVoices += 1;
    oscillator.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now);
    oscillator.stop(now + sound.duration);
  }

  playImpact(heavy: boolean): void {
    this.play('hit');
    if (heavy) this.playBassThud(68, 0.2, 0.19);
  }

  playExplosion(): void {
    this.play('explosion', 'rocket');
    this.playBassThud(52, 0.3, 0.24);
  }

  playKnockout(): void {
    this.play('ko');
    this.playBassThud(58, 0.24, 0.2);
  }

  private playBassThud(frequency: number, duration: number, peak: number): void {
    if (this.muted || !this.unlocked || !this.context || this.activeVoices >= CONFIG.audio.oscillatorLimit) return;
    const context = this.context;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(34, now + duration);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    this.activeVoices += 1;
    oscillator.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  close(): void {
    if (this.context) void this.context.close().catch(() => undefined);
    this.context = null;
    this.unlocked = false;
  }
}
