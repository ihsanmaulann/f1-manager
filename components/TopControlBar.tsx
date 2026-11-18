'use client';

import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sun,
  CloudRain,
  CloudLightning,
  Droplets,
  Flag,
  Trophy,
  CloudSun,
  Volume2,
  VolumeX,
  Home,
} from 'lucide-react';
import { useRaceStore, SimulationSpeed } from '../store/useRaceStore';
import { FlagStatus, SessionPhase, WeatherType } from '../types/f1';
import { getTrackConditionBadge } from '../constants/f1Data';
import { soundEngine } from '../utils/soundEffects';

const FLAG_BADGE_CONFIG: Record<
  FlagStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string; pulse?: boolean }
> = {
  GREEN: {
    label: 'GREEN FLAG',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
  },
  YELLOW: {
    label: 'YELLOW FLAG',
    bgClass: 'bg-amber-500/20',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/50',
    pulse: true,
  },
  VSC: {
    label: 'VSC DEPLOYED',
    bgClass: 'bg-amber-500/25',
    textClass: 'text-amber-200',
    borderClass: 'border-amber-400/70',
    pulse: true,
  },
  SC: {
    label: 'SAFETY CAR',
    bgClass: 'bg-amber-400 text-zinc-950',
    textClass: 'text-zinc-950',
    borderClass: 'border-amber-300',
    pulse: true,
  },
  RED: {
    label: 'RED FLAG',
    bgClass: 'bg-red-600 text-white',
    textClass: 'text-white',
    borderClass: 'border-red-400',
    pulse: true,
  },
};

const WEATHER_CONFIG: Record<
  WeatherType,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
  }
> = {
  DRY: {
    label: 'Dry / Clear',
    shortLabel: 'DRY',
    icon: Sun,
    colorClass: 'text-amber-400',
  },
  LIGHT_RAIN: {
    label: 'Light Rain',
    shortLabel: 'INTER',
    icon: CloudRain,
    colorClass: 'text-sky-400',
  },
  HEAVY_RAIN: {
    label: 'Heavy Rain',
    shortLabel: 'WET',
    icon: CloudLightning,
    colorClass: 'text-blue-400',
  },
};

const SESSION_BADGE_LABELS: Record<SessionPhase, string> = {
  MAIN_MENU: 'MENU',
  HQ: 'TEAM HQ',
  MEDIA_DAY: 'MEDIA',
  FREE_PRACTICE: 'FP1',
  SPRINT_QUALIFYING: 'SQ',
  SPRINT_RACE: 'SPRINT',
  QUALIFYING: 'QUALY',
  PRE_RACE_STRATEGY: 'STRATEGY',
  RACE: 'RACE',
  POST_RACE: 'POST-RACE',
};

const SPEED_OPTIONS: SimulationSpeed[] = [1, 2, 4];

export const TopControlBar: React.FC = () => {
  const {
    sessionPhase,
    circuit,
    currentLap,
    totalLaps,
    raceStatus,
    simulationSpeed,
    weather,
    trackWetness,
    weatherForecast,
    flagStatus,
    flagEndLap,
    startRace,
    pauseRace,
    resetRace,
    setSimulationSpeed,
    setSessionPhase,
  } = useRaceStore();

  const flagConfig = FLAG_BADGE_CONFIG[flagStatus];
  const weatherConfig = WEATHER_CONFIG[weather];
  const WeatherIcon = weatherConfig.icon;
  const trackConditionBadge = getTrackConditionBadge(trackWetness);

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  useEffect(() => {
    setIsAudioMuted(soundEngine.isMuted());
  }, []);

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsAudioMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.playStrategyClick();
    }
  };

  // Label dinamis di dalam slot Flag Status tengah tanpa pernah mengubah lebar w-64
  const getFlagDisplayText = (): string => {
    if (raceStatus === 'FINISHED') {
      return 'CHECKERED FLAG';
    }
    if (flagStatus === 'VSC') {
      if (flagEndLap !== null && currentLap + 1 >= flagEndLap) {
        return 'VSC ENDING';
      }
      return flagEndLap ? `VSC • END L${flagEndLap}` : 'VSC DEPLOYED';
    }
    if (flagStatus === 'SC') {
      return flagEndLap ? `SAFETY CAR • L${flagEndLap}` : 'SAFETY CAR';
    }
    if (flagStatus === 'RED') {
      return 'RED FLAG • FREE PIT';
    }
    return flagConfig.label;
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-zinc-950 border-b border-zinc-800 flex flex-col shrink-0">
      {/* 1. BAR KONTROL UTAMA DENGAN CSS GRID 3 KOLOM TETAP (ANTI-LAYOUT SHIFT) */}
      <div className="max-w-[1600px] w-full mx-auto grid grid-cols-[1fr_auto_1fr] items-center h-14 px-4 gap-3">
        {/* KOLOM KIRI (justify-self-start): Menu Utama, Nama Sirkuit, Sesi Aktif, Indikator Lap & Cuaca */}
        <div className="justify-self-start flex items-center gap-2.5 min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              if (raceStatus === 'RACING') {
                pauseRace();
              }
              soundEngine.playStrategyClick();
              setSessionPhase('MAIN_MENU');
            }}
            title="Kembali ke Main Menu"
            className="w-9 h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 flex items-center justify-center text-zinc-300 hover:text-white transition shrink-0 cursor-pointer"
          >
            <Home className="w-4 h-4 text-red-500" />
          </button>

          {/* Identitas Sirkuit & Sesi Aktif */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-7 rounded-full bg-red-600 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-semibold shrink-0">
                  {SESSION_BADGE_LABELS[sessionPhase]}
                </span>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider truncate hidden sm:inline">
                  • {circuit.country}
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-zinc-100 tracking-tight truncate">
                {circuit.name}
              </h1>
            </div>
          </div>

          <div className="h-7 w-px bg-zinc-800 hidden md:block shrink-0" />

          {/* Indikator Lap (LAP 14/53) */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 h-9 flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              LAP
            </span>
            <span className="font-mono tabular-nums text-xs sm:text-sm font-extrabold text-white">
              {currentLap}/{totalLaps}
            </span>
          </div>

          {/* Indikator Cuaca & Persentase Basah Lintasan */}
          <div className="hidden xl:flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 h-9 shrink-0">
            <div className="flex items-center gap-1.5">
              <WeatherIcon className={`w-3.5 h-3.5 ${weatherConfig.colorClass}`} />
              <span className="font-mono text-[11px] font-bold text-zinc-200">
                {weatherConfig.shortLabel}
              </span>
            </div>

            <div className="h-3.5 w-px bg-zinc-800" />

            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-sky-400" />
              <span
                className={`font-mono text-[11px] font-bold ${
                  trackWetness > 30 ? 'text-sky-400' : 'text-zinc-300'
                }`}
              >
                {trackWetness.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* KOLOM TENGAH (justify-self-center w-64): Slot Khusus Flag Status dengan Lebar Tetap */}
        <div className="justify-self-center w-64">
          <div
            className={`w-64 h-10 px-3 rounded-lg border font-mono text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 text-center truncate ${
              raceStatus === 'FINISHED'
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                : `${flagConfig.bgClass} ${flagConfig.textClass} ${flagConfig.borderClass} ${
                    flagConfig.pulse ? 'animate-pulse' : ''
                  }`
            }`}
          >
            {raceStatus === 'FINISHED' ? (
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Flag className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">{getFlagDisplayText()}</span>
          </div>
        </div>

        {/* KOLOM KANAN (justify-self-end): Tombol Play/Pause, Reset, Speed (1x|2x|4x) & Audio dengan Ukuran Tetap (w-10 h-10) */}
        <div className="justify-self-end flex items-center gap-1.5 shrink-0">
          {/* Tombol Play / Pause berukuran tetap w-10 h-10 */}
          {raceStatus === 'RACING' ? (
            <button
              type="button"
              onClick={pauseRace}
              title="Pause Race"
              aria-label="Pause Race"
              className="w-10 h-10 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRace}
              disabled={raceStatus === 'FINISHED'}
              title={raceStatus === 'PAUSED' ? 'Resume Race' : 'Start Race'}
              aria-label={raceStatus === 'PAUSED' ? 'Resume Race' : 'Start Race'}
              className="w-9 h-9 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          {/* Tombol Reset berukuran tetap w-10 h-10 */}
          <button
            type="button"
            onClick={resetRace}
            title="Reset Balapan"
            aria-label="Reset Balapan"
            className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-0.5 shrink-0" />

          {/* Tombol Kecepatan Simulasi 1x | 2x | 4x dengan ukuran masing-masing tetap w-10 h-10 */}
          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map((spd) => {
              const isActive = simulationSpeed === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    soundEngine.playStrategyClick();
                    setSimulationSpeed(spd);
                  }}
                  title={`Kecepatan Simulasi ${spd}x`}
                  className={`w-9 h-9 rounded-md font-mono text-xs font-bold border flex items-center justify-center transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {spd}x
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-0.5 hidden sm:block shrink-0" />

          {/* Tombol Mute / Unmute berukuran tetap w-10 h-10 */}
          <button
            type="button"
            onClick={handleToggleMute}
            title={isAudioMuted ? 'Unmute Telemetry Audio' : 'Mute Telemetry Audio'}
            aria-label={isAudioMuted ? 'Unmute Telemetry Audio' : 'Mute Telemetry Audio'}
            className={`w-10 h-10 rounded-lg border hidden sm:flex items-center justify-center transition cursor-pointer shrink-0 ${
              isAudioMuted
                ? 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                : 'bg-sky-500/15 text-sky-300 border-sky-500/40 hover:bg-sky-500/25'
            }`}
          >
            {isAudioMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
