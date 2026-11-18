'use client';

import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Timer,
  Copy,
  RotateCw,
  ChevronRight,
  Gauge,
  CheckCircle2,
  Activity,
  Flame,
  Fuel,
  Sparkles,
  Wrench,
  Play,
  Pause,
  Trophy,
  ArrowDownToLine,
  Send,
} from 'lucide-react';
import { useRaceStore, SimulationSpeed } from '../store/useRaceStore';
import { useCareerStore } from '../store/useCareerStore';
import {
  CLIMATE_PROFILE_SPECS,
  DEFAULT_CAR_SETUP,
  ROOKIE_FP1_TARGET_PER_CAR,
  TYRE_SPECS,
  getTrackConditionBadge,
} from '../constants/f1Data';
import { PracticeSessionType, TyreCompound } from '../types/f1';
import { TrackMap2D } from './TrackMap2D';
import { MicroSectorBoxes } from './MicroSectorBoxes';
import { GaragePartsBar } from './GaragePartsBar';

const ALL_COMPOUNDS: TyreCompound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];
const PRACTICE_SESSIONS: PracticeSessionType[] = ['FP1', 'FP2', 'FP3'];

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

const getConfidenceBadge = (confidence: number) => {
  if (confidence >= 90) {
    return {
      label: 'PURPLE / SWEET SPOT',
      barClass: 'bg-purple-500',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    };
  }
  if (confidence >= 75) {
    return {
      label: 'OPTIMAL WINDOW',
      barClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  }
  if (confidence >= 55) {
    return {
      label: 'MODERATE BALANCE',
      barClass: 'bg-amber-400',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }
  return {
    label: 'UNSTABLE / OFF-PEAK',
    barClass: 'bg-red-500',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
  };
};

const renderHintBadge = (
  status:
    | 'OPTIMAL'
    | 'TOO_LOW'
    | 'TOO_HIGH'
    | 'TOO_SOFT'
    | 'TOO_STIFF'
    | 'TOO_REARWARD'
    | 'TOO_FORWARD'
    | undefined
) => {
  if (!status) {
    return (
      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
        NO DATA YET
      </span>
    );
  }
  if (status === 'OPTIMAL') {
    return (
      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
        <CheckCircle2 className="w-2.5 h-2.5" /> OPTIMAL
      </span>
    );
  }

  const labelMap: Record<string, string> = {
    TOO_LOW: 'LOW ↑',
    TOO_HIGH: 'HIGH ↓',
    TOO_SOFT: 'SOFT ↑',
    TOO_STIFF: 'STIFF ↓',
    TOO_REARWARD: 'REAR ↑',
    TOO_FORWARD: 'FRONT ↓',
  };

  return (
    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
      {labelMap[status] ?? status}
    </span>
  );
};

export const FreePracticeScreen: React.FC = () => {
  const {
    circuit,
    drivers,
    weather,
    trackWetness,
    carSetups,
    setupConfidences,
    practiceSession,
    practiceClockSeconds,
    practiceMinutesRemaining,
    isPracticeSimulating,
    practiceKnowledge,
    practiceStandings,
    practiceRuns,
    weekendTyreAllocation,
    simulationSpeed,
    setSimulationSpeed,
    updateCarSetup,
    runFreePracticeStint,
    sendCarsOutPractice,
    recallCarsPractice,
    simulatePracticeFlyingLaps,
    togglePracticeSimulation,
    tickPractice,
    advancePracticeSession,
    proceedToQualifying,
  } = useRaceStore();

  const {
    rookieFp1Completed,
    rookieFp1UsedThisRound,
    completeRookieFp1,
  } = useCareerStore();

  const [selectedTestTyres, setSelectedTestTyres] = useState<Record<string, TyreCompound>>({});

  // Loop simulasi lintasan real-time untuk Free Practice (FP1, FP2, FP3)
  useEffect(() => {
    if (!isPracticeSimulating) return;
    const intervalMs = Math.round(250 / simulationSpeed);
    const timer = setInterval(() => {
      tickPractice();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPracticeSimulating, simulationSpeed, tickPractice]);

  const playerDrivers = drivers
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.number - b.number);

  const climateSpec = CLIMATE_PROFILE_SPECS[circuit.climateProfile];
  const conditionBadge = getTrackConditionBadge(trackWetness);

  const defaultSuggestedCompound: TyreCompound =
    trackWetness >= 55 || weather === 'HEAVY_RAIN'
      ? 'WET'
      : trackWetness >= 20 || weather === 'LIGHT_RAIN'
      ? 'INTER'
      : 'MEDIUM';

  const getDriverTestTyre = (driverId: string): TyreCompound =>
    selectedTestTyres[driverId] ?? defaultSuggestedCompound;

  const handleCopySetup = (sourceId: string, targetId: string) => {
    const sourceSetup = carSetups[sourceId];
    if (sourceSetup) {
      updateCarSetup(targetId, { ...sourceSetup });
    }
  };

  const handleSimulateFlyingLaps = () => {
    const compoundMap: Record<string, TyreCompound> = {};
    playerDrivers.forEach((d) => {
      compoundMap[d.id] = getDriverTestTyre(d.id);
    });
    simulatePracticeFlyingLaps(compoundMap);
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto p-4 flex flex-col gap-5">
      {/* HEADER FREE PRACTICE (FP1 / FP2 / FP3) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Indikator 3 Sesi FP1 -> FP2 -> FP3 */}
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
                {PRACTICE_SESSIONS.map((sess) => {
                  const isActive = practiceSession === sess;
                  const currentIdx = PRACTICE_SESSIONS.indexOf(practiceSession);
                  const sessIdx = PRACTICE_SESSIONS.indexOf(sess);
                  const isDone = sessIdx < currentIdx;

                  return (
                    <span
                      key={sess}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase ${
                        isActive
                          ? 'bg-sky-600 text-white shadow'
                          : isDone
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      {sess}
                    </span>
                  );
                })}
              </div>

              <span className="text-xs font-mono text-zinc-300 font-bold uppercase">
                {circuit.officialName} ({circuit.lengthKm} km)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-300">
                {climateSpec.label}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${conditionBadge.badgeClass}`}
              >
                {conditionBadge.label} ({trackWetness.toFixed(0)}%)
              </span>
              {circuit.isSprintWeekend && (
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border bg-amber-500/20 border-amber-500/50 text-amber-300">
                  FP1 ONLY • SPRINT WEEKEND
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-1">
              {practiceSession} Live Track Telemetry & Car Setup Discovery
            </h2>
          </div>
        </div>

        {/* Kontrol Jam Sesi, Live Simulation, Send Cars Out, & Advance Session */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Clock 60:00 */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
            <Timer
              className={`w-4 h-4 ${
                practiceClockSeconds > 1200
                  ? 'text-emerald-400'
                  : practiceClockSeconds > 0
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            />
            <div>
              <div className="text-[9px] font-mono uppercase text-zinc-500">
                {practiceSession} CLOCK
              </div>
              <div className="font-mono tabular-nums text-base font-extrabold text-white">
                {formatClockMMSS(practiceClockSeconds)}{' '}
                <span className="text-[10px] font-normal text-zinc-500">/ 60:00</span>
              </div>
            </div>
          </div>

          {/* Live Track Play/Pause + Speed */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              disabled={practiceClockSeconds <= 0}
              onClick={() => {
                if (!isPracticeSimulating) {
                  const compoundMap: Record<string, TyreCompound> = {};
                  playerDrivers.forEach((d) => {
                    compoundMap[d.id] = getDriverTestTyre(d.id);
                  });
                  sendCarsOutPractice(
                    playerDrivers.map((d) => d.id),
                    compoundMap
                  );
                } else {
                  togglePracticeSimulation(false);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                isPracticeSimulating
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isPracticeSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Live Track</span>
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

          {/* Tombol Utama: SEND CARS OUT (SIMULATE FLYING LAPS) */}
          <button
            type="button"
            disabled={practiceClockSeconds <= 0}
            onClick={handleSimulateFlyingLaps}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed"
          >
            <Activity className="w-4 h-4" />
            <span>SEND CARS OUT (SIMULATE FLYING LAPS)</span>
          </button>

          {/* Tombol Lanjut Sesi FP1 -> FP2 -> FP3 -> Qualifying (atau Sprint Qualifying jika Sprint Weekend) */}
          {practiceSession !== 'FP3' && !circuit.isSprintWeekend ? (
            <button
              type="button"
              onClick={advancePracticeSession}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
            >
              <span>Next: {practiceSession === 'FP1' ? 'FP2' : 'FP3'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={proceedToQualifying}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                circuit.isSprintWeekend
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-purple-600 hover:bg-purple-500'
              }`}
            >
              <span>
                {circuit.isSprintWeekend
                  ? 'Proceed to Sprint Qualifying'
                  : 'Proceed to Qualifying'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* FIA ROOKIE FP1 OBLIGATION BAR (2x per car per season) */}
      {practiceSession === 'FP1' && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-extrabold uppercase">
              FIA Rookie FP1 Rule
            </span>
            <span className="font-mono text-xs text-zinc-300">
              Wajib menurunkan pembalap Rookie di FP1{' '}
              <strong className="text-white">{ROOKIE_FP1_TARGET_PER_CAR}x per mobil</strong>/musim
              (Car #1: <strong>{rookieFp1Completed.car1}/{ROOKIE_FP1_TARGET_PER_CAR}</strong> • Car #2:{' '}
              <strong>{rookieFp1Completed.car2}/{ROOKIE_FP1_TARGET_PER_CAR}</strong>)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(['car1', 'car2'] as const).map((slot, i) => {
              const used = rookieFp1UsedThisRound;
              const done = rookieFp1Completed[slot] >= ROOKIE_FP1_TARGET_PER_CAR;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={used || done}
                  onClick={() => completeRookieFp1(slot)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    used
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-200 hover:border-emerald-400'
                  }`}
                >
                  {used
                    ? `Car #${i + 1} Rookie Active ✓`
                    : done
                    ? `Car #${i + 1} Quota Met ✓`
                    : `Run Rookie in Car #${i + 1} (+Data)`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LAYOUT KIRI (PETA 2D + SETUP MOBIL) & KANAN (TABEL KLASEMEN P1 - P22) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KOLOM KIRI (7 Kolom): Peta Sirkuit 2D + Kontrol Car Setup Kedua Pembalap */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <TrackMap2D />

          {/* Panel Setup & Telemetri Kedua Pembalap Player */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {playerDrivers.map((driver, idx) => {
              const setup = carSetups[driver.id] ?? DEFAULT_CAR_SETUP;
              const confidence = setupConfidences[driver.id] ?? 70;
              const knowledge = practiceKnowledge[driver.id] ?? 0;
              const confBadge = getConfidenceBadge(confidence);
              const driverRuns = practiceRuns[driver.id] ?? [];
              const latestRun = driverRuns[0];
              const teammate = playerDrivers[idx === 0 ? 1 : 0];
              const chosenTestTyre = getDriverTestTyre(driver.id);
              const bonusSeconds = ((confidence / 100) * 0.8).toFixed(2);
              const isOnTrack = !driver.isInPit;

              return (
                <div
                  key={driver.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Header Pembalap */}
                    <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-1.5 h-7 rounded-full"
                          style={{ backgroundColor: driver.teamColor }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 text-white">
                              #{driver.number} {driver.code}
                            </span>
                            <h3 className="text-sm font-bold text-white">{driver.name}</h3>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                isOnTrack
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              {isOnTrack ? 'ON TRACK' : 'IN GARAGE'}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                            {idx === 0 ? 'Aggressive Oversteer' : 'Smooth Rear-Stability'} •
                            Knowledge: <strong className="text-sky-300">+{knowledge.toFixed(1)}%</strong> •
                            Pace: <strong className="text-emerald-400">-{bonusSeconds}s</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {teammate && (
                          <button
                            type="button"
                            onClick={() => handleCopySetup(driver.id, teammate.id)}
                            title={`Copy Setup to ${teammate.code}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono text-[10px] transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>→ {teammate.code}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => updateCarSetup(driver.id, { ...DEFAULT_CAR_SETUP })}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 font-mono text-[10px] transition cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Bar Setup Confidence */}
                    <div className="px-4 py-2.5 bg-zinc-950/50 border-b border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-[11px] font-mono uppercase text-zinc-400">
                            Setup Confidence:
                          </span>
                          <span className="font-mono text-sm font-extrabold text-white">
                            {confidence.toFixed(1)}%
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold uppercase ${confBadge.badgeClass}`}
                        >
                          {confBadge.label}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className={`h-full transition-all duration-300 ${confBadge.barClass}`}
                          style={{ width: `${confidence}%` }}
                        />
                      </div>
                    </div>

                    {/* 4 Slider Setup */}
                    <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono font-bold text-zinc-200">
                            1. Front Wing ({setup.frontWingAngle}/10)
                          </span>
                          {renderHintBadge(latestRun?.parameterFeedback.frontWing)}
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={setup.frontWingAngle}
                          onChange={(e) =>
                            updateCarSetup(driver.id, { frontWingAngle: Number(e.target.value) })
                          }
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>

                      <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono font-bold text-zinc-200">
                            2. Rear Wing ({setup.rearWingAngle}/10)
                          </span>
                          {renderHintBadge(latestRun?.parameterFeedback.rearWing)}
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={setup.rearWingAngle}
                          onChange={(e) =>
                            updateCarSetup(driver.id, { rearWingAngle: Number(e.target.value) })
                          }
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>

                      <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono font-bold text-zinc-200">
                            3. Suspension ({setup.suspensionStiffness}/10)
                          </span>
                          {renderHintBadge(latestRun?.parameterFeedback.suspension)}
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
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>

                      <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono font-bold text-zinc-200">
                            4. Brake Bias ({setup.brakeBias}%)
                          </span>
                          {renderHintBadge(latestRun?.parameterFeedback.brakeBias)}
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={60}
                          step={1}
                          value={setup.brakeBias}
                          onChange={(e) =>
                            updateCarSetup(driver.id, { brakeBias: Number(e.target.value) })
                          }
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Pilihan Ban Uji & Tombol Aksi */}
                    <div className="px-3.5 pb-3.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {ALL_COMPOUNDS.map((comp) => {
                          const spec = TYRE_SPECS[comp];
                          const active = chosenTestTyre === comp;
                          const setsLeft =
                            weekendTyreAllocation[driver.id]?.[comp] ?? 0;
                          return (
                            <button
                              key={comp}
                              type="button"
                              disabled={setsLeft <= 0}
                              onClick={() =>
                                setSelectedTestTyres((prev) => ({ ...prev, [driver.id]: comp }))
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

                      <div className="flex items-center gap-1.5">
                        {isOnTrack ? (
                          <button
                            type="button"
                            onClick={() => recallCarsPractice([driver.id])}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold uppercase cursor-pointer"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            <span>Box Car</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={practiceClockSeconds <= 0}
                            onClick={() =>
                              sendCarsOutPractice([driver.id], { [driver.id]: chosenTestTyre })
                            }
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 disabled:opacity-40 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold uppercase cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send Out</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={practiceMinutesRemaining < 10}
                          onClick={() => runFreePracticeStint(driver.id, chosenTestTyre)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-[10px] font-bold uppercase cursor-pointer"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>5-Lap Stint (-10m)</span>
                        </button>
                      </div>
                    </div>

                    {/* Multi-Part Damage & Spare Parts Fitment */}
                    <div className="px-3.5 pb-3.5">
                      <GaragePartsBar driver={driver} />
                    </div>
                  </div>

                  {/* Ringkasan Telemetri Terakhir */}
                  <div className="border-t border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5">
                    {latestRun ? (
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                          <div className="text-zinc-500">BEST STINT</div>
                          <div className="font-extrabold text-purple-300">
                            {formatLapTime(latestRun.bestLapTime)}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                          <div className="text-zinc-500 flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5 text-amber-400" /> WEAR
                          </div>
                          <div className="font-extrabold text-amber-300">
                            -{latestRun.tyreWearPerLap}%/lap
                          </div>
                        </div>
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                          <div className="text-zinc-500 flex items-center gap-1">
                            <Fuel className="w-2.5 h-2.5 text-sky-400" /> FUEL
                          </div>
                          <div className="font-extrabold text-sky-300">
                            {latestRun.fuelBurnPerLap} kg/lap
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-1 flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>
                          Klik <strong>Send Cars Out</strong> atau <strong>5-Lap Stint</strong> untuk membuka feedback setup {driver.code}.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KOLOM KANAN (5 Kolom): Tabel Klasemen Waktu P1 - P22 */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-zinc-950/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-zinc-100">
                {practiceSession} Live Timing (P1 - P{practiceStandings.length || drivers.length})
              </h3>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-1.5 rounded-[1px] bg-purple-500" />
                <span>S-Best</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-1.5 rounded-[1px] bg-emerald-500" />
                <span>PB</span>
              </span>
              <span className="text-zinc-600">|</span>
              <span className={isPracticeSimulating ? 'text-emerald-400 font-bold' : ''}>
                {isPracticeSimulating ? 'LIVE' : 'STANDBY'}
              </span>
            </div>
          </div>

          <div className="overflow-auto max-h-[680px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-zinc-950">
                <tr className="border-b border-zinc-800 font-mono text-[10px] uppercase text-zinc-400">
                  <th className="py-2.5 pl-3 pr-1.5 w-10 text-center">Pos</th>
                  <th className="py-2.5 px-2">Driver / Team</th>
                  <th className="py-2.5 px-1.5 text-center">Sec</th>
                  <th className="py-2.5 px-1.5 text-center">Tyre</th>
                  <th className="py-2.5 px-1.5 text-center">Laps</th>
                  <th className="py-2.5 px-2 text-right">Best Lap</th>
                  <th className="py-2.5 pl-2 pr-3 text-right">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {practiceStandings.map((entry) => {
                  const tyreSpec = TYRE_SPECS[entry.tyreCompound];
                  const isP1 = entry.position === 1 && entry.bestLapTime > 0;
                  return (
                    <tr
                      key={entry.driverId}
                      style={{
                        boxShadow: `inset 3px 0 0 ${entry.teamColor}`,
                      }}
                      className={`transition-colors ${
                        entry.isPlayerControlled
                          ? 'bg-red-950/30 hover:bg-red-950/45'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="py-2 pl-3 pr-1.5 text-center font-mono tabular-nums font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-5 rounded text-[11px] ${
                            isP1
                              ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                              : entry.position <= 3 && entry.bestLapTime > 0
                              ? 'bg-zinc-800 text-white'
                              : 'text-zinc-400'
                          }`}
                        >
                          P{entry.position}
                        </span>
                      </td>

                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1 h-5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.teamColor }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white">{entry.code}</span>
                              {entry.isOnTrack && (
                                <span
                                  title="Mobil sedang berada di lintasan"
                                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                                />
                              )}
                              {entry.isPlayerControlled && (
                                <span className="px-1 py-0 rounded text-[9px] font-mono font-bold bg-red-600/30 text-red-300 border border-red-500/40">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                              {entry.teamName}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-1.5 text-center whitespace-nowrap">
                        <MicroSectorBoxes statuses={entry.sectorStatuses} />
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

                      <td className="py-2 px-1.5 text-center font-mono tabular-nums text-zinc-400">
                        {entry.lapsCompleted}
                      </td>

                      <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-zinc-100">
                        {formatLapTime(entry.bestLapTime)}
                      </td>

                      <td className="py-2 pl-2 pr-3 text-right font-mono tabular-nums text-zinc-400">
                        {entry.bestLapTime <= 0
                          ? '--'
                          : isP1
                          ? 'FASTEST'
                          : `+${entry.gapToLeader.toFixed(3)}s`}
                      </td>
                    </tr>
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
