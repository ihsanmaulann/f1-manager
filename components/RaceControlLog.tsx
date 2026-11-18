'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal,
  Wrench,
  Timer,
  AlertTriangle,
  Info,
  Radio,
} from 'lucide-react';
import { useRaceStore, RaceLogType } from '../store/useRaceStore';
import { TeamRadioBroadcastCard } from './TeamRadioBroadcastCard';

const LOG_STYLE_MAP: Record<
  RaceLogType,
  {
    badgeLabel: string;
    badgeClass: string;
    textClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  INFO: {
    badgeLabel: 'RACE CTRL',
    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    textClass: 'text-zinc-300',
    icon: Info,
  },
  PIT: {
    badgeLabel: 'PIT LANE',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    textClass: 'text-amber-200',
    icon: Wrench,
  },
  FASTEST_LAP: {
    badgeLabel: 'FASTEST',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    textClass: 'text-purple-200 font-semibold',
    icon: Timer,
  },
  INCIDENT: {
    badgeLabel: 'INCIDENT',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    textClass: 'text-red-200 font-semibold',
    icon: AlertTriangle,
  },
};

export const RaceControlLog: React.FC = () => {
  const { raceLogs, teamRadioMessages } = useRaceStore();
  const [activeFeed, setActiveFeed] = useState<'TEAM_RADIO' | 'RACE_CONTROL'>('TEAM_RADIO');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Urutkan secara kronologis dari lama ke terbaru agar auto-scroll ke bawah terasa seperti terminal telemetri asli
  const chronologicalLogs = [...raceLogs].reverse();
  const chronologicalRadios = [...teamRadioMessages].reverse();

  // Auto-scroll ke pesan terbaru di bagian bawah setiap kali daftar bertambah atau tab berubah
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [raceLogs.length, teamRadioMessages.length, activeFeed]);

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[220px] max-h-[310px]">
      {/* Header Kotak Log Terminal & Team Radio */}
      <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {activeFeed === 'TEAM_RADIO' ? (
            <Radio className="w-4 h-4 text-red-400" />
          ) : (
            <Terminal className="w-4 h-4 text-emerald-400" />
          )}
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-100">
            FIA Race Control &amp; Team Radio Feed
          </h2>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <button
            type="button"
            onClick={() => setActiveFeed('TEAM_RADIO')}
            className={`px-2.5 py-1 rounded border uppercase font-bold transition cursor-pointer ${
              activeFeed === 'TEAM_RADIO'
                ? 'bg-red-600/20 border-red-500 text-red-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Team Radio ({teamRadioMessages.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFeed('RACE_CONTROL')}
            className={`px-2.5 py-1 rounded border uppercase font-bold transition cursor-pointer ${
              activeFeed === 'RACE_CONTROL'
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Race Control ({raceLogs.length})
          </button>
        </div>
      </div>

      {/* Daftar Pesan Team Radio / FIA Race Control dengan Auto-Scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-950/80 font-mono text-xs"
      >
        {activeFeed === 'TEAM_RADIO' ? (
          chronologicalRadios.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center text-zinc-500 text-xs px-4 gap-1">
              <span className="font-bold text-zinc-300 uppercase">Team Radio Standby</span>
              <span>
                Pesan radio tim (Putih = Race Engineer, Berwarna = Pembalap) muncul otomatis saat mengubah strategi/taktik, perintah/keluar pit, insiden kerusakan mobil, atau akhir sesi &amp; balapan.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chronologicalRadios.map((msg) => (
                <TeamRadioBroadcastCard key={msg.id} message={msg} compact />
              ))}
            </div>
          )
        ) : chronologicalLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
            Menunggu telemetri balapan dimulai...
          </div>
        ) : (
          chronologicalLogs.map((log) => {
            const style = LOG_STYLE_MAP[log.type];
            const IconComponent = style.icon;

            return (
              <div
                key={log.id}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700/80 transition-colors"
              >
                {/* Indikator Lap */}
                <span className="px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800 text-[10px] font-bold shrink-0">
                  L{String(log.lap).padStart(2, '0')}
                </span>

                {/* Badge Tipe Log */}
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase shrink-0 ${style.badgeClass}`}
                >
                  <IconComponent className="w-3 h-3" />
                  <span>{style.badgeLabel}</span>
                </span>

                {/* Isi Pesan */}
                <p className={`text-[11px] leading-relaxed break-words ${style.textClass}`}>
                  {log.message}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

