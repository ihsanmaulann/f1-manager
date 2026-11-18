'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  DollarSign,
  Sliders,
  Trophy,
  Flag,
  Wrench,
  CloudSun,
  Mic,
} from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { useCareerStore } from '../store/useCareerStore';
import { TopControlBar } from '../components/TopControlBar';
import { LiveTimingBoard } from '../components/LiveTimingBoard';
import { TrackMap2D } from '../components/TrackMap2D';
import { LiveWeatherGraph } from '../components/LiveWeatherGraph';
import { RaceControlLog } from '../components/RaceControlLog';
import { PlayerTelemetryCards } from '../components/PlayerTelemetryCards';
import { PlayerLapTelemetryPanel } from '../components/PlayerLapTelemetryPanel';
import { TeamHQModal } from '../components/TeamHQModal';
import { MediaDayScreen } from '../components/MediaDayScreen';
import { FreePracticeScreen } from '../components/FreePracticeScreen';
import { QualifyingScreen } from '../components/QualifyingScreen';
import { PreRaceStrategyScreen } from '../components/PreRaceStrategyScreen';
import { SprintScreen } from '../components/SprintScreen';
import { PostRaceSummaryModal } from '../components/PostRaceSummaryModal';
import { OffSeasonModal } from '../components/OffSeasonModal';
import { MainMenuScreen } from '../components/MainMenuScreen';
import { TeamRadioFloatingOverlay } from '../components/TeamRadioBroadcastCard';

export default function PitWallDashboardPage() {
  const {
    circuit,
    sessionPhase,
    raceStatus,
    simulationSpeed,
    drivers,
    setSessionPhase,
    tick,
  } = useRaceStore();
  const {
    isTeamCreated,
    teamName,
    teamColor,
    budget,
    seasonNumber,
    currentRoundIndex,
    seasonCalendar,
    isSeasonCompleted,
    finishRaceAndClaimPrize,
    advanceToNextSeason,
  } = useCareerStore();
  const [isHQOpen, setIsHQOpen] = useState(false);
  const isFinalRound = currentRoundIndex + 1 >= seasonCalendar.length;

  // Loop utama simulasi: memanggil tick() dengan interval yang menyesuaikan simulationSpeed (1x, 2x, 4x)
  useEffect(() => {
    if (raceStatus !== 'RACING') return;

    const intervalMs = Math.round(250 / simulationSpeed);

    const timer = setInterval(() => {
      tick();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [raceStatus, simulationSpeed, tick]);

  // Tampilkan Landing Screen Main Menu saat aplikasi pertama dibuka atau saat kembali ke MAIN_MENU
  if (sessionPhase === 'MAIN_MENU') {
    return <MainMenuScreen />;
  }

  const activePlayerDriver = drivers.find((d) => d.isPlayerControlled);
  const displayTeamName = isTeamCreated
    ? teamName
    : activePlayerDriver?.teamName ?? 'Scuderia Ferrari HP';
  const displayTeamColor = isTeamCreated
    ? teamColor
    : activePlayerDriver?.teamColor ?? '#E8002D';

  const isHQModalVisible = isHQOpen || sessionPhase === 'HQ';

  const handleCloseHQ = () => {
    setIsHQOpen(false);
    if (sessionPhase === 'HQ') {
      setSessionPhase('MEDIA_DAY');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Bar Kontrol Atas */}
      <TopControlBar />

      {/* Sub-Bar Navigasi Sesi & Team HQ */}
      <div className="w-full bg-zinc-950 border-b border-zinc-800 px-4 py-1.5 shrink-0">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Identitas Tim Aktif Pemain */}
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: displayTeamColor }}
              />
              <span>{displayTeamName}</span>
            </div>
            <span className="text-zinc-500">
              R{currentRoundIndex + 1}/{seasonCalendar.length}
            </span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              ${(budget / 1_000_000).toFixed(2)}M
            </span>

            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

            {/* Switcher Sesi */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={raceStatus === 'RACING'}
                onClick={() => setSessionPhase('MEDIA_DAY')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  sessionPhase === 'MEDIA_DAY'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Mic className="w-3 h-3" />
                <span>Media</span>
              </button>

              <button
                type="button"
                disabled={raceStatus === 'RACING'}
                onClick={() => setSessionPhase('FREE_PRACTICE')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  sessionPhase === 'FREE_PRACTICE'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>Practice</span>
              </button>

              {circuit.isSprintWeekend && (
                <button
                  type="button"
                  disabled={raceStatus === 'RACING'}
                  onClick={() => setSessionPhase('SPRINT_QUALIFYING')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    sessionPhase === 'SPRINT_QUALIFYING' || sessionPhase === 'SPRINT_RACE'
                      ? 'bg-zinc-800 text-amber-300'
                      : 'text-amber-400/80 hover:text-amber-300 hover:bg-zinc-900'
                  }`}
                >
                  <span>Sprint</span>
                </button>
              )}

              <button
                type="button"
                disabled={raceStatus === 'RACING'}
                onClick={() => setSessionPhase('QUALIFYING')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  sessionPhase === 'QUALIFYING'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Qualifying</span>
              </button>

              <button
                type="button"
                disabled={raceStatus === 'RACING'}
                onClick={() => setSessionPhase('PRE_RACE_STRATEGY')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  sessionPhase === 'PRE_RACE_STRATEGY'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <CloudSun className="w-3 h-3" />
                <span>Strategy</span>
              </button>

              <button
                type="button"
                onClick={() => setSessionPhase('RACE')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                  sessionPhase === 'RACE' || sessionPhase === 'POST_RACE'
                    ? 'bg-red-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Flag className="w-3 h-3" />
                <span>Race</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(raceStatus === 'FINISHED' || sessionPhase === 'POST_RACE' || isSeasonCompleted) &&
              (isFinalRound || isSeasonCompleted ? (
                <button
                  type="button"
                  onClick={() => {
                    if (raceStatus === 'FINISHED' && !isSeasonCompleted) {
                      finishRaceAndClaimPrize();
                    }
                    advanceToNextSeason();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-zinc-950 font-mono text-xs font-bold uppercase cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>End Season {seasonNumber}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsHQOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-zinc-950 font-mono text-xs font-bold uppercase cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Race Finished — Claim Prize & Next GP</span>
                </button>
              ))}

            <button
              type="button"
              onClick={() => setIsHQOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Open Team HQ & R&D</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Berdasarkan sessionPhase */}
      {sessionPhase === 'MEDIA_DAY' ? (
        <main className="flex-1 flex flex-col">
          <MediaDayScreen />
        </main>
      ) : sessionPhase === 'FREE_PRACTICE' ? (
        <main className="flex-1 flex flex-col">
          <FreePracticeScreen />
          <div className="max-w-[1600px] w-full mx-auto px-4 pb-5">
            <LiveWeatherGraph />
          </div>
        </main>
      ) : sessionPhase === 'SPRINT_QUALIFYING' || sessionPhase === 'SPRINT_RACE' ? (
        <main className="flex-1 flex flex-col">
          <SprintScreen />
          <div className="max-w-[1600px] w-full mx-auto px-4 pb-5">
            <LiveWeatherGraph />
          </div>
        </main>
      ) : sessionPhase === 'QUALIFYING' ? (
        <main className="flex-1 flex flex-col">
          <QualifyingScreen />
          <div className="max-w-[1600px] w-full mx-auto px-4 pb-5">
            <LiveWeatherGraph />
          </div>
        </main>
      ) : sessionPhase === 'PRE_RACE_STRATEGY' ? (
        <main className="flex-1 flex flex-col">
          <PreRaceStrategyScreen />
        </main>
      ) : (
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-4">
          {/* Bagian Atas: Peta 2D + Live Weather Radar Graph + Log Radio di Kiri, Live Timing Board 22 Pembalap di Kanan */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-5 flex flex-col gap-3">
              <TrackMap2D />
              <LiveWeatherGraph />
              <RaceControlLog />
            </div>

            <div className="lg:col-span-7 flex flex-col h-[560px] lg:h-[880px]">
              <LiveTimingBoard />
            </div>
          </div>

          {/* Bagian Bawah: Kartu Kontrol Strategi & Telemetri 2 Pembalap Player */}
          <PlayerTelemetryCards />

          {/* Telemetri Data Per-Lap Khusus Pembalap Tim Sendiri */}
          <PlayerLapTelemetryPanel />
        </main>
      )}

      {/* Floating F1 Broadcast Team Radio Graphic (Engineer Putih / Driver Warna Tim) */}
      <TeamRadioFloatingOverlay />

      {/* Modal Otomatis Ringkasan Hasil Balapan & Finansial saat raceStatus === 'FINISHED' */}
      <PostRaceSummaryModal onContinueToHQ={() => setIsHQOpen(true)} />

      {/* Modal Manajemen Tim (Team HQ, R&D Upgrades, Sponsors, Driver Market, Save Manager) */}
      <TeamHQModal isOpen={isHQModalVisible} onClose={handleCloseHQ} />

      {/* Modal Rekapitulasi Off-Season (Champion Honours, Silly Season Transfers, Power Rankings) */}
      <OffSeasonModal />
    </div>
  );
}
