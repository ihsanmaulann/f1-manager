'use client';

import React, { useState } from 'react';
import {
  Zap,
  Flag,
  Trophy,
  ArrowRight,
  Timer,
  Disc,
  CloudRain,
  Sun,
} from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { useCareerStore } from '../store/useCareerStore';
import { SPRINT_POINTS_2026, TYRE_SPECS } from '../constants/f1Data';
import { TyreCompound } from '../types/f1';
import { GaragePartsBar } from './GaragePartsBar';

const formatLapTime = (seconds: number): string => {
  if (!seconds || !Number.isFinite(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${mins}:${secs}`;
};

const SPRINT_COMPOUNDS: TyreCompound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];

export const SprintScreen: React.FC = () => {
  const {
    circuit,
    sessionPhase,
    drivers,
    weather,
    trackWetness,
    weekendTyreAllocation,
    sprintQualifyingResults,
    sprintRaceResults,
    isSprintCompleted,
    runSprintQualifying,
    runSprintRace,
    proceedFromSprintToQualifying,
  } = useRaceStore();

  const awardSprintPoints = useCareerStore((s) => s.awardSprintPoints);

  const playerDrivers = drivers
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.number - b.number);

  const defaultTyre: TyreCompound =
    trackWetness >= 55 || weather === 'HEAVY_RAIN'
      ? 'WET'
      : trackWetness >= 20 || weather === 'LIGHT_RAIN'
      ? 'INTER'
      : 'MEDIUM';

  const [selectedTyres, setSelectedTyres] = useState<Record<string, TyreCompound>>(() => {
    const map: Record<string, TyreCompound> = {};
    playerDrivers.forEach((d) => {
      map[d.id] = defaultTyre;
    });
    return map;
  });

  const sprintLaps = Math.max(
    12,
    Math.min(24, Math.round(100 / Math.max(3, circuit.lengthKm)))
  );

  const handleRunSprintRace = () => {
    const results = runSprintRace(selectedTyres);
    awardSprintPoints(results);
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto px-4 py-4 flex flex-col gap-4">
      {/* Header Banner */}
      <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" />
              F1 2026 SPRINT WEEKEND
            </span>
            <span className="font-mono text-xs text-zinc-400">
              {circuit.name} • ~100km ({sprintLaps} Laps) • Top 8 Score Points (8-7-6-5-4-3-2-1)
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-black tracking-tight text-white uppercase">
            {sessionPhase === 'SPRINT_QUALIFYING'
              ? 'Sprint Qualifying (SQ1 / SQ2 / SQ3)'
              : isSprintCompleted
              ? 'Sprint Race Classification & Points'
              : 'Sprint Race Grid & Tyre Selection'}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-2 font-mono text-xs">
            {trackWetness >= 20 ? (
              <CloudRain className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-zinc-300">
              {weather.replace('_', ' ')} ({Math.round(trackWetness)}%)
            </span>
          </div>

          {sessionPhase === 'SPRINT_QUALIFYING' && sprintQualifyingResults.length === 0 && (
            <button
              type="button"
              onClick={() => runSprintQualifying()}
              className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-amber-500/20"
            >
              <Timer className="w-4 h-4" />
              Run Sprint Qualifying (SQ1-SQ3)
            </button>
          )}

          {sessionPhase === 'SPRINT_RACE' && !isSprintCompleted && (
            <button
              type="button"
              onClick={handleRunSprintRace}
              className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-red-600/25"
            >
              <Flag className="w-4 h-4" />
              Lights Out! Run {sprintLaps}-Lap Sprint
            </button>
          )}

          {isSprintCompleted && (
            <button
              type="button"
              onClick={() => proceedFromSprintToQualifying()}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-emerald-600/25"
            >
              <span>Proceed to Main GP Qualifying (Q1/Q2/Q3)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* Player Tyre Selection before Sprint Race */}
      {sessionPhase === 'SPRINT_RACE' && !isSprintCompleted && (
        <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Disc className="w-4 h-4 text-amber-400" />
              Select Sprint Starting Tyre (Free Choice • No Mandatory Pit Stop)
            </h2>
            <span className="font-mono text-[10px] text-zinc-500">
              Uses 1 set from Weekend Tyre Allocation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {playerDrivers.map((driver) => {
              const alloc = weekendTyreAllocation[driver.id] ?? {
                SOFT: 8,
                MEDIUM: 3,
                HARD: 2,
                INTER: 4,
                WET: 3,
              };
              const chosen = selectedTyres[driver.id] ?? defaultTyre;
              const sqPos =
                sprintQualifyingResults.find((r) => r.driverId === driver.id)?.position ?? '-';

              return (
                <div
                  key={driver.id}
                  className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-6 rounded-full"
                        style={{ backgroundColor: driver.teamColor }}
                      />
                      <span className="font-bold text-sm text-white">{driver.name}</span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        ({driver.code})
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 font-mono text-[11px] font-bold text-amber-300">
                      Sprint Grid: P{sqPos}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {SPRINT_COMPOUNDS.map((comp) => {
                      const spec = TYRE_SPECS[comp];
                      const setsLeft = alloc[comp] ?? 0;
                      const isActive = chosen === comp;
                      return (
                        <button
                          key={comp}
                          type="button"
                          disabled={setsLeft <= 0}
                          onClick={() =>
                            setSelectedTyres((prev) => ({ ...prev, [driver.id]: comp }))
                          }
                          className={`py-1.5 px-1 rounded border font-mono text-[10px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                            isActive
                              ? 'bg-zinc-800 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                          style={{ borderColor: isActive ? spec.colorHex : undefined }}
                        >
                          <span style={{ color: spec.colorHex }}>{spec.shortCode}</span>
                          <span>{comp}</span>
                          <span className="text-[9px] text-zinc-500">x{setsLeft}</span>
                        </button>
                      );
                    })}
                  </div>

                  <GaragePartsBar driver={driver} canFitInGarage={true} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Results Table: Sprint Qualifying or Sprint Race */}
      <section className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200">
              {isSprintCompleted
                ? `Official Sprint Race Results (${sprintLaps} Laps)`
                : sprintQualifyingResults.length > 0
                ? 'Sprint Qualifying Starting Grid (SQ1-SQ3)'
                : 'Awaiting Sprint Qualifying Session'}
            </span>
          </div>
          {isSprintCompleted && (
            <span className="font-mono text-[10px] text-emerald-400 font-bold">
              CHAMPIONSHIP POINTS AWARDED (TOP 8)
            </span>
          )}
        </div>

        {isSprintCompleted && sprintRaceResults.length > 0 ? (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left border-collapse font-mono text-xs tabular-nums">
              <thead className="bg-zinc-950 text-[10px] uppercase text-zinc-500 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3">Pos</th>
                  <th className="py-2 px-3">Driver</th>
                  <th className="py-2 px-3">Team</th>
                  <th className="py-2 px-3 text-center">Tyre</th>
                  <th className="py-2 px-3 text-right">Gap / Time</th>
                  <th className="py-2 px-3 text-right">Sprint Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {sprintRaceResults.map((entry) => {
                  const pts = SPRINT_POINTS_2026[entry.position - 1] ?? 0;
                  const spec = TYRE_SPECS[entry.tyreCompound];
                  return (
                    <tr
                      key={entry.driverId}
                      className={
                        entry.isPlayerControlled
                          ? 'bg-red-950/25 hover:bg-red-950/35'
                          : 'hover:bg-zinc-800/30'
                      }
                    >
                      <td className="py-2 px-3 font-extrabold text-zinc-200">
                        P{entry.position}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1 h-4 rounded-full"
                            style={{ backgroundColor: entry.teamColor }}
                          />
                          <span className="font-bold text-white">{entry.code}</span>
                          <span className="text-zinc-400">{entry.name}</span>
                          {entry.isPlayerControlled && (
                            <span className="px-1 rounded text-[9px] bg-red-600/30 text-red-300 border border-red-500/40 font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-zinc-400">{entry.teamName}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className="px-1.5 py-0.5 rounded border text-[10px] font-extrabold"
                          style={{
                            borderColor: spec.colorHex,
                            color: spec.colorHex,
                          }}
                        >
                          {spec.shortCode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-zinc-300">
                        {entry.position === 1
                          ? 'WINNER'
                          : `+${entry.gapToLeader.toFixed(3)}s`}
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold">
                        {pts > 0 ? (
                          <span className="text-amber-300">+{pts}</span>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : sprintQualifyingResults.length > 0 ? (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left border-collapse font-mono text-xs tabular-nums">
              <thead className="bg-zinc-950 text-[10px] uppercase text-zinc-500 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3">Grid</th>
                  <th className="py-2 px-3">Driver</th>
                  <th className="py-2 px-3">Team</th>
                  <th className="py-2 px-3 text-right">SQ Time</th>
                  <th className="py-2 px-3 text-right">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {sprintQualifyingResults.map((q) => (
                  <tr
                    key={q.driverId}
                    className={
                      q.isPlayerControlled
                        ? 'bg-red-950/25 hover:bg-red-950/35'
                        : 'hover:bg-zinc-800/30'
                    }
                  >
                    <td className="py-2 px-3 font-extrabold text-zinc-200">
                      P{q.position}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1 h-4 rounded-full"
                          style={{ backgroundColor: q.teamColor }}
                        />
                        <span className="font-bold text-white">{q.code}</span>
                        <span className="text-zinc-400">{q.name}</span>
                        {q.isPlayerControlled && (
                          <span className="px-1 rounded text-[9px] bg-red-600/30 text-red-300 border border-red-500/40 font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-zinc-400">{q.teamName}</td>
                    <td className="py-2 px-3 text-right text-zinc-200">
                      {formatLapTime(q.lapTime)}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-400">
                      {q.position === 1 ? 'POLE' : `+${q.gapToPole.toFixed(3)}s`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center font-mono text-xs text-zinc-400">
            Klik <strong className="text-amber-300">Run Sprint Qualifying (SQ1-SQ3)</strong> di
            atas untuk menentukan grid Sprint Race {sprintLaps} lap.
          </div>
        )}
      </section>
    </div>
  );
};
