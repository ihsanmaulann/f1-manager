'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { TeamRadioMessage } from '../types/f1';
import { useRaceStore } from '../store/useRaceStore';

const TEAM_LOGO_BY_ID: Record<string, string> = {
  mercedes: '/assets/Team-Logo/mercedes.png',
  'red-bull': '/assets/Team-Logo/redbull.png',
  ferrari: '/assets/Team-Logo/ferrari.png',
  mclaren: '/assets/Team-Logo/mclaren.png',
  alpine: '/assets/Team-Logo/alpine.png',
  rb: '/assets/Team-Logo/visa-cash-app.png',
  audi: '/assets/Team-Logo/audi.png',
  haas: '/assets/Team-Logo/haas.png',
  williams: '/assets/Team-Logo/williams.png',
  'aston-martin': '/assets/Team-Logo/aston-martin.png',
  cadillac: '/assets/Team-Logo/cadillac.png',
};

const resolveTeamLogoPath = (teamId: string, teamName: string): string | null => {
  if (TEAM_LOGO_BY_ID[teamId]) return TEAM_LOGO_BY_ID[teamId];
  const lower = teamName.toLowerCase();
  if (lower.includes('mercedes')) return '/assets/Team-Logo/mercedes.png';
  if (lower.includes('red bull')) return '/assets/Team-Logo/redbull.png';
  if (lower.includes('ferrari')) return '/assets/Team-Logo/ferrari.png';
  if (lower.includes('mclaren')) return '/assets/Team-Logo/mclaren.png';
  if (lower.includes('alpine')) return '/assets/Team-Logo/alpine.png';
  if (lower.includes('racing bulls') || lower.includes('vcarb'))
    return '/assets/Team-Logo/visa-cash-app.png';
  if (lower.includes('audi')) return '/assets/Team-Logo/audi.png';
  if (lower.includes('haas')) return '/assets/Team-Logo/haas.png';
  if (lower.includes('williams')) return '/assets/Team-Logo/williams.png';
  if (lower.includes('aston')) return '/assets/Team-Logo/aston-martin.png';
  if (lower.includes('cadillac')) return '/assets/Team-Logo/cadillac.png';
  return null;
};

/** Ensure custom team accent color stays legible against the dark #15151E radio panel. */
const resolveReadableAccentColor = (hex: string): string => {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '#E80020';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.2 ? '#EF4444' : hex;
};

const EQUALIZER_BAR_HEIGHTS = [16, 24, 24, 36, 36, 52, 42, 32, 22, 18];

interface TeamRadioBroadcastCardProps {
  message: TeamRadioMessage;
  onDismiss?: () => void;
  compact?: boolean;
}

/** Official F1 TV broadcast-style team radio card: white engineer message (left), team-colored driver reply (right). */
export const TeamRadioBroadcastCard: React.FC<TeamRadioBroadcastCardProps> = ({
  message,
  onDismiss,
  compact = false,
}) => {
  const accentColor = resolveReadableAccentColor(message.teamColor);
  const logoSrc = resolveTeamLogoPath(message.teamId, message.teamName);

  return (
    <div
      className="relative overflow-hidden border border-zinc-800 bg-[#15151e] select-none"
      style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}
    >
      {/* Broadcast Header Band */}
      <div
        className={`relative overflow-hidden ${compact ? 'px-3 pt-2 pb-1.5' : 'px-3.5 pt-2.5 pb-2'}`}
        style={{
          background: `linear-gradient(180deg, rgba(21,21,30,0.98) 15%, ${accentColor}26 100%)`,
          borderBottom: `3px solid ${accentColor}`,
        }}
      >
        {/* Subtle F1 stepped telemetry waveform behind driver number & team crest */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 flex items-end opacity-25"
        >
          {EQUALIZER_BAR_HEIGHTS.map((heightPct, idx) => (
            <div
              key={idx}
              className="flex-1"
              style={{
                height: `${heightPct}%`,
                backgroundColor: accentColor,
              }}
            />
          ))}
        </div>

        {/* Optional top-left session tag & dismiss control */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Close team radio"
                className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              {message.sessionLabel}
            </span>
          </div>

          <div className="text-right">
            <div
              className={`font-black uppercase tracking-tight leading-none ${
                compact ? 'text-sm' : 'text-lg'
              }`}
              style={{ color: accentColor }}
            >
              {message.driverSurname}
            </div>
            <div
              className={`font-black uppercase tracking-wide text-white leading-none mt-0.5 ${
                compact ? 'text-xs' : 'text-sm'
              }`}
            >
              RADIO
            </div>
          </div>
        </div>

        {/* Driver Number (Left) & Official Team Crest (Right) */}
        <div className="relative z-10 flex items-end justify-between mt-1">
          <span
            className={`font-black leading-none tracking-tighter ${
              compact ? 'text-2xl' : 'text-4xl'
            }`}
            style={{ color: accentColor }}
          >
            {message.driverNumber}
          </span>

          {logoSrc ? (
            <img
              src={logoSrc}
              alt={message.teamName}
              className={`${compact ? 'h-7 w-8' : 'h-9 w-10'} object-contain shrink-0`}
            />
          ) : (
            <span
              className="px-1.5 py-0.5 text-[10px] font-black uppercase border"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              {message.driverCode}
            </span>
          )}
        </div>
      </div>

      {/* Two-way Radio Transcript Body */}
      <div className={`${compact ? 'px-3 py-2.5 space-y-2' : 'px-3.5 py-3 space-y-3'} bg-[#15151e]`}>
        <p
          className={`text-left font-bold uppercase tracking-wide text-white leading-snug max-w-[94%] ${
            compact ? 'text-[11px]' : 'text-[12.5px]'
          }`}
        >
          &ldquo;{message.engineerMessage}&rdquo;
        </p>

        <p
          className={`text-right font-bold uppercase tracking-wide leading-snug max-w-[94%] ml-auto ${
            compact ? 'text-[11px]' : 'text-[12.5px]'
          }`}
          style={{ color: accentColor }}
        >
          &ldquo;{message.driverMessage}&rdquo;
        </p>
      </div>
    </div>
  );
};

/** Global floating broadcast radio overlay shown across FP, Qualifying, Sprint, and Race. */
export const TeamRadioFloatingOverlay: React.FC = () => {
  const activeTeamRadioPopup = useRaceStore((s) => s.activeTeamRadioPopup);
  const dismissTeamRadioPopup = useRaceStore((s) => s.dismissTeamRadioPopup);
  const sessionPhase = useRaceStore((s) => s.sessionPhase);

  useEffect(() => {
    if (!activeTeamRadioPopup) return;
    const timer = window.setTimeout(() => {
      dismissTeamRadioPopup();
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [activeTeamRadioPopup, dismissTeamRadioPopup]);

  if (!activeTeamRadioPopup || sessionPhase === 'MAIN_MENU') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[300px] sm:w-[330px] shadow-2xl">
      <TeamRadioBroadcastCard
        message={activeTeamRadioPopup}
        onDismiss={dismissTeamRadioPopup}
      />
    </div>
  );
};
