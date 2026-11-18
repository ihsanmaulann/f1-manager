'use client';

import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Timer,
  Flag,
  Sparkles,
  Gauge,
  CheckCircle2,
  Copy,
  Trophy,
  Zap,
  ChevronRight,
  Play,
  Pause,
  FastForward,
  Send,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { useRaceStore, SimulationSpeed } from '../store/useRaceStore';
import {
  DEFAULT_CAR_SETUP,
  TYRE_SPECS,
  getTrackConditionBadge,
} from '../constants/f1Data';
import { QualifyingStage, TyreCompound } from '../types/f1';
import { TrackMap2D } from './TrackMap2D';
import { MicroSectorBoxes } from './MicroSectorBoxes';
import { GaragePartsBar } from './GaragePartsBar';

const ALL_COMPOUNDS: TyreCompound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];
const QUALI_STAGES: Array<{ id: QualifyingStage; label: string; cars: number; mins: number }> = [
  { id: 'Q1', label: 'Q1 (18m)', cars: 22, mins: 18 },
  { id: 'Q2', label: 'Q2 (15m)', cars: 16, mins: 15 },
  { id: 'Q3', label: 'Q3 (12m)', cars: 10, mins: 12 },
];

const formatLapTime = (seconds: number): string => {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
};

const formatClockMMSS = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const getConfidenceFeedback = (confidence: number) => {
  if (confidence >= 90) {
    return {
      label: 'PURPLE / SWEET SPOT',
      barClass: 'bg-purple-500',
      textClass: 'text-purple-300',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    };
  }
  if (confidence >= 75) {
    return {
      label: 'OPTIMAL BALANCE',
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  }
  if (confidence >= 55) {
    return {
      label: 'MODERATE / DRAGGY',
      barClass: 'bg-amber-400',
      textClass: 'text-amber-300',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }
  return {
    label: 'POOR / UNSTABLE',
    barClass: 'bg-red-500',
    textClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
  };
};

export const QualifyingScreen: React.FC = () => {
  const {
    circuit,
    drivers,
    weather,
    trackWetness,
    carSetups,
    setupConfidences,
    qualifyingStage,
    qualifyingClockSeconds,
    isQualiSimulating,
    qualifyingStageFinished,
    qualifyingDriversState,
    qualifyingResults,
    weekendTyreAllocation,
    parcFermeLocked,
    parcFermeBreached,
    simulationSpeed,
    setSimulationSpeed,
    updateCarSetup,
    sendDriverOutQualifying,
    toggleQualiSimulation,
    tickQualifying,
    fastForwardQualiStage,
    advanceQualifyingStage,
    proceedToPreRaceStrategy,
  } = useRaceStore();

  const [selectedQualiTyres, setSelectedQualiTyres] = useState<Record<string, TyreCompound>>({});
  const [showSetupFor, setShowSetupFor] = useState<Record<string, boolean>>({});

  // Loop real-time Qualifying (Q1 / Q2 / Q3)
  useEffect(() => {
    if (!isQualiSimulating || qualifyingStageFinished) return;
    const intervalMs = Math.round(250 / simulationSpeed);
    const timer = setInterval(() => {
      tickQualifying();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isQualiSimulating, qualifyingStageFinished, simulationSpeed, tickQualifying]);

  const playerDrivers = drivers
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.number - b.number);

  const conditionBadge = getTrackConditionBadge(trackWetness);
  const suggestedQualiTyre: TyreCompound =
    trackWetness >= 55 || weather === 'HEAVY_RAIN'
      ? 'WET'
      : trackWetness >= 20 || weather === 'LIGHT_RAIN'
      ? 'INTER'
      : 'SOFT';

  const getDriverQualiTyre = (driverId: string): TyreCompound =>
    selectedQualiTyres[driverId] ?? suggestedQualiTyre;

  const handleCopySetupToTeammate = (sourceDriverId: string, targetDriverId: string) => {
    const sourceSetup = carSetups[sourceDriverId];
    if (sourceSetup) {
      updateCarSetup(targetDriverId, { ...sourceSetup });
    }
  };

  // Urutkan klasemen Knockout Qualifying (Aktif di stage sekarang di atas, Tereliminasi di bawah)
  const stageTimeOf = (id: string): number => {
    const qs = qualifyingDriversState[id];
    if (!qs) return 0;
    if (qualifyingStage === 'Q1') return qs.q1Time;
    if (qualifyingStage === 'Q2') return qs.q2Time;
    return qs.q3Time;
  };

  const eliminatedList = drivers
    .filter((d) => qualifyingDriversState[d.id]?.runPhase === 'ELIMINATED')
    .sort(
      (a, b) =>
        (qualifyingDriversState[a.id]?.lockedGridPosition ?? 99) -
        (qualifyingDriversState[b.id]?.lockedGridPosition ?? 99)
    );

  const activeList = drivers.filter(
    (d) => qualifyingDriversState[d.id]?.runPhase !== 'ELIMINATED'
  );
  const activeTimed = activeList
    .filter((d) => stageTimeOf(d.id) > 0)
    .sort((a, b) => stageTimeOf(a.id) - stageTimeOf(b.id));
  const activeUntimed = activeList
    .filter((d) => stageTimeOf(d.id) <= 0)
    .sort((a, b) => {
      const qa = qualifyingDriversState[a.id];
      const qb = qualifyingDriversState[b.id];
      const prevA = (qa?.q2Time || qa?.q1Time) ?? 9999;
      const prevB = (qb?.q2Time || qb?.q1Time) ?? 9999;
      if (Math.abs(prevA - prevB) > 0.001) return prevA - prevB;
      return b.basePace - a.basePace;
    });

  const sortedClassification = [...activeTimed, ...activeUntimed, ...eliminatedList];
  const stageBestLeaderTime = activeTimed[0] ? stageTimeOf(activeTimed[0].id) : 0;

  const totalGridCars = Math.max(22, drivers.length);
  const q1EliminatedCount = Math.max(1, totalGridCars - 16);
  const currentStageCars =
    qualifyingStage === 'Q1' ? totalGridCars : qualifyingStage === 'Q2' ? 16 : 10;
  const cutoffLinePosition = qualifyingStage === 'Q1' ? 16 : qualifyingStage === 'Q2' ? 10 : null;

  return (
    <div className="max-w-[1600px] w-full mx-auto p-4 flex flex-col gap-5">
      {/* HEADER KNOCKOUT QUALIFYING (Q1 / Q2 / Q3) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Indikator 3 Tahap Q1 -> Q2 -> Q3 */}
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
                {QUALI_STAGES.map((st) => {
                  const isActive = qualifyingStage === st.id;
                  const stageIdx = QUALI_STAGES.findIndex((x) => x.id === qualifyingStage);
                  const thisIdx = QUALI_STAGES.findIndex((x) => x.id === st.id);
                  const isDone = thisIdx < stageIdx || (isActive && qualifyingStageFinished);

                  return (
                    <span
                      key={st.id}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase ${
                        isActive
                          ? 'bg-purple-600 text-white shadow'
                          : isDone
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      {st.label}
                    </span>
                  );
                })}
              </div>

              <span className="text-xs font-mono text-zinc-300 font-bold uppercase">
                {circuit.officialName} • {currentStageCars} Active Cars
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${conditionBadge.badgeClass}`}
              >
                {conditionBadge.label} ({trackWetness.toFixed(0)}%)
              </span>
              {Object.values(parcFermeBreached).some(Boolean) ? (
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border bg-red-500/20 border-red-500/50 text-red-300">
                  PARC FERMÉ BREACHED • PIT LANE START
                </span>
              ) : parcFermeLocked ? (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-amber-500/15 border-amber-500/40 text-amber-300">
                  PARC FERMÉ LOCKED
                </span>
              ) : null}
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-1">
              {qualifyingStage === 'Q1'
                ? `Q1 Knockout Qualifying (Bottom ${q1EliminatedCount} P17–P${totalGridCars} Eliminated)`
                : qualifyingStage === 'Q2'
                ? 'Q2 Knockout Qualifying (Bottom 6 P11–P16 Eliminated)'
                : 'Q3 Top 10 Pole Position Shootout'}
            </h2>
          </div>
        </div>

        {/* Jam Sesi, Live Simulation Controls, Fast-Forward, & Proceed */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
            <Timer
              className={`w-4 h-4 ${
                qualifyingClockSeconds > 180
                  ? 'text-purple-400'
                  : qualifyingClockSeconds > 0
                  ? 'text-amber-400 animate-pulse'
                  : 'text-red-400'
              }`}
            />
            <div>
              <div className="text-[9px] font-mono uppercase text-zinc-500">
                {qualifyingStage} SESSION CLOCK
              </div>
              <div className="font-mono tabular-nums text-base font-extrabold text-white">
                {qualifyingStageFinished ? '00:00 (END)' : formatClockMMSS(qualifyingClockSeconds)}
              </div>
            </div>
          </div>

          {/* Play/Pause + Speed */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              disabled={qualifyingStageFinished}
              onClick={() => toggleQualiSimulation()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                isQualiSimulating
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {isQualiSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Start {qualifyingStage}</span>
                </>
              )}
            </button>

            {([1, 2, 4] as SimulationSpeed[]).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimulationSpeed(spd)}
                className={`px-2 py-1.5 rounded-lg font-mono text-[11px] font-bold transition cursor-pointer ${
                  simulationSpeed === spd
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {!qualifyingStageFinished && (
            <button
              type="button"
              onClick={fastForwardQualiStage}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5 text-purple-400" />
              <span>Finish {qualifyingStage}</span>
            </button>
          )}

          {qualifyingStageFinished && qualifyingStage !== 'Q3' && (
            <button
              type="button"
              onClick={advanceQualifyingStage}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer animate-pulse"
            >
              <span>Proceed to {qualifyingStage === 'Q1' ? 'Q2 (15m)' : 'Q3 Shootout (12m)'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={proceedToPreRaceStrategy}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              qualifyingResults.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>
              {qualifyingResults.length > 0
                ? 'Proceed to Pre-Race Strategy'
                : 'Skip / Auto-Finish to Strategy'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GRID UTAMA: KIRI (TRACK MAP 2D + GARAGE TIMING & SETUP) & KANAN (KNOCKOUT TABLE P1 - P22) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KOLOM KIRI (7 Kolom): Live Track Map 2D + Player Qualifying Timing Control */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <TrackMap2D />

          {/* Info Strategi Traffic & Cuaca */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>
                Pantau <strong>Track Map 2D</strong> di atas dan grafik cuaca di bawah: tekan{' '}
                <strong className="text-white">SEND OUT NOW</strong> saat lintasan lengang untuk menghindari penalti traffic saat <em>Flying Lap</em>!
              </span>
            </div>
          </div>

          {/* Kartu Kontrol Garasi Kualifikasi Kedua Pembalap Player */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {playerDrivers.map((driver, idx) => {
              const qState = qualifyingDriversState[driver.id];
              const runPhase = qState?.runPhase ?? 'IN_GARAGE';
              const isEliminated = runPhase === 'ELIMINATED';
              const isOnTrack =
                runPhase === 'OUT_LAP' || runPhase === 'FLYING_LAP' || runPhase === 'IN_LAP';
              const chosenTyre = getDriverQualiTyre(driver.id);
              const bestStageTime = stageTimeOf(driver.id);
              const setup = carSetups[driver.id] ?? DEFAULT_CAR_SETUP;
              const confidence = setupConfidences[driver.id] ?? 70;
              const feedback = getConfidenceFeedback(confidence);
              const teammate = playerDrivers[idx === 0 ? 1 : 0];
              const isSetupExpanded = !!showSetupFor[driver.id];

              const phaseBadge =
                runPhase === 'ELIMINATED'
                  ? {
                      text: `ELIMINATED (${qState?.eliminatedIn ?? 'Q1'}) • P${
                        qState?.lockedGridPosition ?? '-'
                      }`,
                      cls: 'bg-red-600/25 text-red-300 border-red-500/50',
                    }
                  : runPhase === 'FLYING_LAP'
                  ? {
                      text: 'FLYING LAP',
                      cls: 'bg-purple-600/30 text-purple-200 border-purple-400/60 animate-pulse',
                    }
                  : runPhase === 'OUT_LAP'
                  ? {
                      text: 'OUT LAP',
                      cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
                    }
                  : runPhase === 'IN_LAP'
                  ? {
                      text: 'IN LAP',
                      cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    }
                  : {
                      text: 'IN GARAGE',
                      cls: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                    };

              return (
                <div
                  key={driver.id}
                  className={`border rounded-2xl overflow-hidden flex flex-col ${
                    isEliminated
                      ? 'bg-red-950/20 border-red-900/50 opacity-85'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  {/* Header Pembalap */}
                  <div
                    className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2"
                    style={{
                      background: `linear-gradient(90deg, ${driver.teamColor}25 0%, rgba(24,24,27,0.95) 65%)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-red-600 text-white">
                        #{driver.number} {driver.code}
                      </span>
                      <h3 className="text-sm font-bold text-white">{driver.name}</h3>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase ${phaseBadge.cls}`}
                    >
                      {phaseBadge.text}
                    </span>
                  </div>

                  {/* Ringkasan Catatan Waktu & Traffic */}
                  <div className="px-4 py-3 bg-zinc-950/70 border-b border-zinc-800 grid grid-cols-3 gap-2 font-mono text-xs">
                    <div>
                      <div className="text-[9px] text-zinc-500">{qualifyingStage} BEST</div>
                      <div className="font-extrabold text-white">
                        {formatLapTime(bestStageTime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500">RUNS DONE</div>
                      <div className="font-bold text-zinc-300">{qState?.runsCompleted ?? 0} Run</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-zinc-500">SETUP CONF</div>
                      <div className={`font-extrabold ${feedback.textClass}`}>
                        {confidence.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Kontrol Send Out Now + Pilihan Ban Qualifying */}
                  <div className="p-3.5 space-y-3">
                    {isEliminated ? (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-2 text-xs font-mono text-red-300">
                        <Ban className="w-4 h-4 shrink-0" />
                        <span>
                          Tereliminasi di {qState?.eliminatedIn}. Grid start balapan terkunci di{' '}
                          <strong>P{qState?.lockedGridPosition}</strong>.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            {ALL_COMPOUNDS.map((comp) => {
                              const spec = TYRE_SPECS[comp];
                              const active = chosenTyre === comp;
                              const setsLeft =
                                weekendTyreAllocation[driver.id]?.[comp] ?? 0;
                              return (
                                <button
                                  key={comp}
                                  type="button"
                                  disabled={isOnTrack || setsLeft <= 0}
                                  onClick={() =>
                                    setSelectedQualiTyres((prev) => ({
                                      ...prev,
                                      [driver.id]: comp,
                                    }))
                                  }
                                  className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 ${
                                    active
                                      ? 'bg-zinc-800 text-white border-white shadow-sm'
                                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                  }`}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: spec.colorHex }}
                                  />
                                  <span>{spec.shortCode}</span>
                                  <span className="text-[9px] text-zinc-500">x{setsLeft}</span>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            disabled={
                              runPhase !== 'IN_GARAGE' ||
                              qualifyingStageFinished ||
                              qualifyingClockSeconds <= 0
                            }
                            onClick={() => sendDriverOutQualifying(driver.id, chosenTyre)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isOnTrack ? runPhase.replace('_', ' ') : 'SEND OUT NOW'}</span>
                          </button>
                        </div>

                        {qState?.trafficEncountered && (
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Traffic terdeteksi di depan pada run ini (+time loss)!</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Toggle Fine-Tuning Setup Mobil (Boleh ubah selama di garasi sebelum Parc Ferme) */}
                    <div className="pt-1 border-t border-zinc-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setShowSetupFor((prev) => ({
                            ...prev,
                            [driver.id]: !prev[driver.id],
                          }))
                        }
                        className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <Gauge className="w-3.5 h-3.5 text-purple-400" />
                        <span>
                          {isSetupExpanded ? 'Hide Car Setup Sliders' : 'Fine-Tune Car Setup'}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          (-{((confidence / 100) * 0.8).toFixed(2)}s)
                        </span>
                      </button>

                      {teammate && (
                        <button
                          type="button"
                          onClick={() => handleCopySetupToTeammate(driver.id, teammate.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>→ {teammate.code}</span>
                        </button>
                      )}
                    </div>

                    {isSetupExpanded && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-2">
                          <div className="flex justify-between font-mono text-[10px] text-zinc-300 mb-1">
                            <span>Front Wing</span>
                            <span className="font-bold">{setup.frontWingAngle}/10</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={setup.frontWingAngle}
                            onChange={(e) =>
                              updateCarSetup(driver.id, {
                                frontWingAngle: Number(e.target.value),
                              })
                            }
                            className="w-full accent-purple-500 cursor-pointer"
                          />
                        </div>

                        <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-2">
                          <div className="flex justify-between font-mono text-[10px] text-zinc-300 mb-1">
                            <span>Rear Wing</span>
                            <span className="font-bold">{setup.rearWingAngle}/10</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={setup.rearWingAngle}
                            onChange={(e) =>
                              updateCarSetup(driver.id, {
                                rearWingAngle: Number(e.target.value),
                              })
                            }
                            className="w-full accent-purple-500 cursor-pointer"
                          />
                        </div>

                        <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-2">
                          <div className="flex justify-between font-mono text-[10px] text-zinc-300 mb-1">
                            <span>Suspension</span>
                            <span className="font-bold">{setup.suspensionStiffness}/10</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={setup.suspensionStiffness}
                            onChange={(e) =>
                              updateCarSetup(driver.id, {
                                suspensionStiffness: Number(e.target.value),
                              })
                            }
                            className="w-full accent-purple-500 cursor-pointer"
                          />
                        </div>

                        <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-2">
                          <div className="flex justify-between font-mono text-[10px] text-zinc-300 mb-1">
                            <span>Brake Bias</span>
                            <span className="font-bold">{setup.brakeBias}%</span>
                          </div>
                          <input
                            type="range"
                            min={50}
                            max={60}
                            step={1}
                            value={setup.brakeBias}
                            onChange={(e) =>
                              updateCarSetup(driver.id, {
                                brakeBias: Number(e.target.value),
                              })
                            }
                            className="w-full accent-purple-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    <GaragePartsBar
                      driver={driver}
                      canFitInGarage={runPhase === 'IN_GARAGE'}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN (5 Kolom): Tabel Klasemen Knockout Qualifying P1 - P22 */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-zinc-950/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-zinc-100">
                {qualifyingStage} Classification (P1 - P{drivers.length})
              </h3>
            </div>

            <div className="flex items-center gap-2.5 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-2 h-1.5 rounded-[1px] bg-purple-500" />
                <span>S-Best</span>
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-2 h-1.5 rounded-[1px] bg-emerald-500" />
                <span>PB</span>
              </span>
              {qualifyingResults.length > 0 ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> LOCKED
                </span>
              ) : (
                <span className="text-zinc-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-400" />
                  {qualifyingStage === 'Q1'
                    ? 'TOP 16'
                    : qualifyingStage === 'Q2'
                    ? 'TOP 10'
                    : 'POLE'}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-auto max-h-[680px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-zinc-950">
                <tr className="border-b border-zinc-800 font-mono text-[10px] uppercase text-zinc-400">
                  <th className="py-2.5 pl-3 pr-1.5 w-10 text-center">Pos</th>
                  <th className="py-2.5 px-2">Driver / Status</th>
                  <th className="py-2.5 px-1.5 text-center">Sec</th>
                  <th className="py-2.5 px-1.5 text-center">Tyre</th>
                  <th className="py-2.5 px-2 text-right">{qualifyingStage} Best</th>
                  <th className="py-2.5 pl-2 pr-3 text-right">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {sortedClassification.map((driver, idx) => {
                  const pos = idx + 1;
                  const qs = qualifyingDriversState[driver.id];
                  const isEliminated = qs?.runPhase === 'ELIMINATED';
                  const inDropZone =
                    !isEliminated && cutoffLinePosition !== null && pos > cutoffLinePosition;
                  const displayBest =
                    isEliminated && qs?.eliminatedIn === 'Q1'
                      ? qs.q1Time
                      : isEliminated && qs?.eliminatedIn === 'Q2'
                      ? qs.q2Time
                      : stageTimeOf(driver.id);

                  const isP1 = pos === 1 && !isEliminated && displayBest > 0;
                  const tyreSpec = TYRE_SPECS[qs?.tyreCompound ?? 'SOFT'];
                  const gapSeconds =
                    !isEliminated && displayBest > 0 && stageBestLeaderTime > 0 && pos > 1
                      ? displayBest - stageBestLeaderTime
                      : 0;

                  const showCutoffDivider =
                    cutoffLinePosition !== null && pos === cutoffLinePosition + 1;

                  return (
                    <React.Fragment key={driver.id}>
                      {showCutoffDivider && (
                        <tr className="bg-red-950/50 border-y border-red-500/40">
                          <td
                            colSpan={6}
                            className="py-1 px-3 text-center font-mono text-[9px] font-extrabold uppercase tracking-widest text-red-300"
                          >
                            ▼ KNOCKOUT DROP ZONE ({qualifyingStage === 'Q1' ? `P17–P${totalGridCars}` : 'P11–P16'} ELIMINATED) ▼
                          </td>
                        </tr>
                      )}
                      <tr
                        style={{
                          boxShadow: `inset 3px 0 0 ${isEliminated ? '#7F1D1D' : driver.teamColor}`,
                        }}
                        className={`transition-colors ${
                          isEliminated
                            ? 'bg-red-950/25 opacity-65'
                            : driver.isPlayerControlled
                            ? 'bg-red-950/35 hover:bg-red-950/50'
                            : inDropZone
                            ? 'bg-amber-950/20 hover:bg-zinc-800/40'
                            : 'hover:bg-zinc-800/40'
                        }`}
                      >
                        <td className="py-2 pl-3 pr-1.5 font-mono tabular-nums font-bold text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-5 rounded text-[11px] ${
                              isEliminated
                                ? 'bg-red-900/40 text-red-300 border border-red-500/40'
                                : isP1
                                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
                                : pos <= 3 && displayBest > 0
                                ? 'bg-zinc-800 text-white'
                                : inDropZone
                                ? 'text-amber-300'
                                : 'text-zinc-400'
                            }`}
                          >
                            P{pos}
                          </span>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-1 h-5 rounded-full shrink-0"
                              style={{ backgroundColor: driver.teamColor }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-white">
                                  {driver.code}
                                </span>
                                {driver.isPlayerControlled && (
                                  <span className="px-1 rounded text-[9px] font-mono font-bold bg-red-600/30 text-red-300 border border-red-500/40">
                                    YOU
                                  </span>
                                )}
                                {isEliminated ? (
                                  <span className="px-1.5 rounded text-[9px] font-mono font-extrabold bg-red-600/30 text-red-300 border border-red-500/50">
                                    ELIMINATED ({qs?.eliminatedIn})
                                  </span>
                                ) : qs?.runPhase === 'FLYING_LAP' ? (
                                  <span className="px-1.5 rounded text-[9px] font-mono font-bold bg-purple-600/30 text-purple-200 border border-purple-500/40 animate-pulse">
                                    FLYING
                                  </span>
                                ) : qs?.runPhase === 'OUT_LAP' ? (
                                  <span className="px-1 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300">
                                    OUT
                                  </span>
                                ) : qs?.runPhase === 'IN_LAP' ? (
                                  <span className="px-1 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300">
                                    IN
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                                {driver.teamName}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-1.5 text-center whitespace-nowrap">
                          <MicroSectorBoxes statuses={qs?.sectorStatuses} />
                        </td>

                        <td className="py-2 px-1.5 text-center">
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full font-mono text-[10px] font-extrabold border"
                            style={{
                              borderColor: tyreSpec.colorHex,
                              color: tyreSpec.colorHex,
                              backgroundColor: `${tyreSpec.colorHex}18`,
                            }}
                          >
                            {tyreSpec.shortCode}
                          </span>
                        </td>

                        <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-zinc-100">
                          {formatLapTime(displayBest)}
                        </td>

                        <td className="py-2 pl-2 pr-3 text-right font-mono tabular-nums text-zinc-400">
                          {isEliminated
                            ? 'OUT'
                            : displayBest <= 0
                            ? '--'
                            : isP1
                            ? qualifyingStage === 'Q3'
                              ? 'POLE'
                              : 'P1'
                            : `+${gapSeconds.toFixed(3)}s`}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
