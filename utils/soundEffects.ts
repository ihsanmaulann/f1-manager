'use client';

/**
 * Synthesizer Efek Suara Prosedural menggunakan Web Audio API bawaan browser.
 * Tidak memerlukan file audio eksternal (.mp3/.wav).
 */

const SOUND_MUTE_STORAGE_KEY = 'f1-manager-sound-muted';

class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = window.localStorage.getItem(SOUND_MUTE_STORAGE_KEY);
      this.muted = savedMute === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined' || this.muted) return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Abaikan jika belum ada interaksi pengguna
      });
    }

    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SOUND_MUTE_STORAGE_KEY, String(mute));
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    if (!this.muted) {
      this.playStrategyClick();
    }
    return this.muted;
  }

  /**
   * a. Bunyi "Beep" Radio F1 Khas (F1 Team Radio Chime)
   * Dua nada tinggi berurutan (1318Hz E6 -> 1760Hz A6) khas pembuka transmisi radio F1.
   */
  public playTeamRadioBeep(): void {
    if (typeof window === 'undefined' || this.muted) return;

    try {
      const audio = new Audio('/assets/Sound/formula-1-radio-notification.mp3');
      audio.volume = 0.55;
      audio.play().catch(() => {
        this.playProceduralRadioBeep();
      });
    } catch {
      this.playProceduralRadioBeep();
    }
  }

  private playProceduralRadioBeep(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playTone = (freq: number, startTime: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Nada 1 & Nada 2 khas F1 Broadcast Team Radio
    playTone(1318.5, now, 0.075, 0.09);
    playTone(1760.0, now + 0.085, 0.14, 0.11);
  }

  /**
   * b. Bunyi Klik Tombol Strategi di Pit Wall
   * Nada pendek taktil berfrekuensi presisi seperti switch konsol telemetri.
   */
  public playStrategyClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.045);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * c. Bunyi Alarm Peringatan saat Safety Car (SC / VSC) keluar atau terjadi Insiden
   * Sirine dua nada darurat (660Hz <-> 880Hz) bergaya FIA Race Control.
   */
  public playSafetyCarAlarm(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pulses = [
      { freq: 880, offset: 0.0, duration: 0.12 },
      { freq: 660, offset: 0.14, duration: 0.12 },
      { freq: 880, offset: 0.28, duration: 0.16 },
    ];

    pulses.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(p.freq, now + p.offset);

      gain.gain.setValueAtTime(0.0001, now + p.offset);
      gain.gain.exponentialRampToValueAtTime(0.07, now + p.offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.offset + p.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + p.offset);
      osc.stop(now + p.offset + p.duration);
    });
  }
}

export const soundEngine = new ProceduralSoundEngine();

