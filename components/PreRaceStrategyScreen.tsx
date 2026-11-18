'use client';

import React, { useEffect, useMemo } from 'react';
import {
  CloudSun,
  Sun,
  CloudRain,
  CloudLightning,
  Fuel,
  Flag,
  Gauge,
  Radio,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Droplets,
} from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { useCareerStore } from '../store/useCareerStore';
import {
  CLIMATE_PROFILE_SPECS,
  MAX_FUEL_LOAD_2026_KG,
  TYRE_SPECS,
  getCircuitFuelBurn2026,
  getStandardFuelLoad2026,
  getTrackConditionBadge,
} from '../constants/f1Data';
import { TyreCompound, WeatherTimelineEntry, WeatherType } from '../types/f1';
import { GaragePartsBar } from './GaragePartsBar';

const ALL_COMPOUNDS: TyreCompound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];

interface WeatherStintSegment {
  startLap: number;
  endLap: number;
  weather: WeatherType;
  maxWetness: number;
}

function summarizeWeatherStints(timeline: WeatherTimelineEntry[]): WeatherStintSegment[] {
  if (timeline.length === 0) return [];
  const segments: WeatherStintSegment[] = [];

  let current: WeatherStintSegment = {
    startLap: timeline[0].lap,
    endLap: timeline[0].lap,
    weather: timeline[0].weather,
    maxWetness: timeline[0].projectedWetness ?? 0,
  };

  for (let i = 1; i < timeline.length; i++) {
    const item = timeline[i];
    if (item.weather === current.weather) {
      current.endLap = item.lap;
      current.maxWetness = Math.max(current.maxWetness, item.projectedWetness ?? 0);
    } else {
      segments.push(current);
      current = {
        startLap: item.lap,
        endLap: item.lap,
        weather: item.weather,
        maxWetness: item.projectedWetness ?? 0,
      };
    }
  }
  segments.push(current);
  return segments;
}

export const PreRaceStrategyScreen: React.FC = () => {
  const {
    circuit,
    totalLaps,
    drivers,
    trackWetness,
    weatherTimeline,
    radarAccuracyPercent,
    preRaceStartingTyres,
    preRaceStartingFuel,
    setupConfidences,
    weekendTyreAllocation,
    parcFermeBreached,
    initializeStartingTyresForAI,
    setPreRaceDriverConfig,
    applyGridPenalties,
    proceedToGrid,
  } = useRaceStore();

  const { carPowerUnits, clearPendingGridPenalties } = useCareerStore();

  const handleGoToGrid = () => {
    const p1 = carPowerUnits.car1.pendingGridPenalty;
    const p2 = carPowerUnits.car2.pendingGridPenalty;
    if (p1 > 0 || p2 > 0) {
      applyGridPenalties(p1, p2);
      clearPendingGridPenalties();
    }
    proceedToGrid();
  };

  useEffect(() => {
    initializeStartingTyresForAI();
  }, [initializeStartingTyresForAI]);

  const playerDrivers = drivers
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.position - b.position);

  const aiDrivers = drivers.filter((d) => !d.isPlayerControlled);
  const aiTyreSummary = useMemo(() => {
    const counts: Record<TyreCompound, number> = {
      SOFT: 0,
      MEDIUM: 0,
      HARD: 0,
      INTER: 0,
      WET: 0,
    };
    aiDrivers.forEach((d) => {
      counts[d.tyreCompound] = (counts[d.tyreCompound] ?? 0) + 1;
    });
    return counts;
  }, [aiDrivers]);

  const climateSpec = CLIMATE_PROFILE_SPECS[circuit.climateProfile];
  const weatherStints = useMemo(
    () => summarizeWeatherStints(weatherTimeline),
    [weatherTimeline]
  );

  const fuelBurn2026 = getCircuitFuelBurn2026(circuit);
  const standardRaceFuelKg = getStandardFuelLoad2026(circuit);
  const underfuelAttackKg = Math.max(45, Number((standardRaceFuelKg - 4.0).toFixed(1)));
  const overfuelHeavyPushKg = Math.min(
    MAX_FUEL_LOAD_2026_KG,
    Number((standardRaceFuelKg + 3.5).toFixed(1))
  );

  const lap1Weather = weatherTimeline[0]?.weather ?? 'DRY';
  const lap1Wetness = weatherTimeline[0]?.projectedWetness ?? trackWetness;
  const trackConditionBadge = getTrackConditionBadge(lap1Wetness);

  return (
    <div className="max-w-[1600px] w-full mx-auto p-4 flex flex-col gap-5">
      {/* HEADER PRE-RACE STRATEGY & WEATHER BRIEFING */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <CloudSun className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-[10px] font-bold uppercase tracking-widest">
                SESSION 3 • PRE-RACE STRATEGY BRIEFING
              </span>
              <span className="text-xs font-mono text-zinc-400 uppercase">
                {circuit.officialName} • {totalLaps} LAPS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
              Full Race Weather Forecast & Starting Tyre Allocation
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Analisis grafik cuaca dari Lap 1 hingga Lap {totalLaps} serta tentukan{' '}
              <strong className="text-zinc-200">Starting Tyre Compound</strong> &{' '}
              <strong className="text-zinc-200">Fuel Load</strong> kedua mobil sebelum menuju Starting Grid.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoToGrid}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition cursor-pointer"
        >
          <Flag className="w-4 h-4 fill-current" />
          <span>GO TO STARTING GRID (LIGHTS OUT)</span>
        </button>
      </div>

      {(Object.values(parcFermeBreached).some(Boolean) ||
        carPowerUnits.car1.pendingGridPenalty > 0 ||
        carPowerUnits.car2.pendingGridPenalty > 0) && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-950/35 p-3.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>FIA STEWARDS NOTICE:</strong>{' '}
              {Object.values(parcFermeBreached).some(Boolean) &&
                'Parc Fermé Breach terdeteksi (Pit Lane Start). '}
              {carPowerUnits.car1.pendingGridPenalty > 0 &&
                `Car #1 PU/Gearbox Grid Penalty (+${carPowerUnits.car1.pendingGridPenalty} Grid). `}
              {carPowerUnits.car2.pendingGridPenalty > 0 &&
                `Car #2 PU/Gearbox Grid Penalty (+${carPowerUnits.car2.pendingGridPenalty} Grid).`}
            </span>
          </div>
          <span className="text-[10px] text-amber-300 font-bold">
            OTOMATIS DITERAPKAN SAAT KE STARTING GRID
          </span>
        </div>
      )}

      {/* BANNER INDIKATOR KONDISI TREK JELAS & ALOKASI BAN AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={`lg:col-span-2 rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${trackConditionBadge.badgeClass}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-950/60 border border-white/15 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest opacity-80">
                OFFICIAL FIA TRACK SURFACE SENSOR • LAP 1 WETNESS: {lap1Wetness.toFixed(0)}%
              </div>
              <div className="text-sm sm:text-base font-mono font-extrabold tracking-wide mt-0.5">
                {trackConditionBadge.label}
              </div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-white/15 font-mono text-xs font-bold">
            Recommended: <span className="underline">{trackConditionBadge.recommendedTyre}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col justify-center gap-1.5 font-mono">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>AI Grid Tyre Allocation ({aiDrivers.length} Cars)</span>
            <span className="text-emerald-400 font-bold">LIVE TELEMETRY</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold pt-0.5">
            {ALL_COMPOUNDS.map((c) =>
              aiTyreSummary[c] > 0 ? (
                <span
                  key={c}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-1.5 text-white"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: TYRE_SPECS[c].colorHex }}
                  />
                  {c}: {aiTyreSummary[c]} AI
                </span>
              ) : null
            )}
          </div>
        </div>
      </div>

      {/* PANEL 1: LAPORAN CUACA LENGKAP (FULL RACE WEATHER TIMELINE GRAPH LAP 1 - TOTAL LAPS) */}
      <div className="bg-zinc-900/85 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Synoptic Weather Timeline (Lap 1 — Lap {totalLaps})
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-300">
              {climateSpec.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
              Radar Accuracy: {radarAccuracyPercent}% Confidence
            </span>
            <span className="text-[11px] text-zinc-400">
              Inertia: Max +1.5% Wetness/Lap (Rain) • -1.0% Drying/Lap (Dry)
            </span>
          </div>
        </div>

        {/* Rangkuman Segmen Stint Cuaca (misal: Lap 1-20 Cerah, Lap 21-40 Hujan Ringan, dst.) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {weatherStints.map((seg, i) => {
            const isHeavy = seg.weather === 'HEAVY_RAIN';
            const isLight = seg.weather === 'LIGHT_RAIN';
            const Icon = isHeavy ? CloudLightning : isLight ? CloudRain : Sun;
            const weatherTitle = isHeavy
              ? 'Heavy Rain (Full Wet)'
              : isLight
              ? 'Light Rain (Intermediate)'
              : i > 0
              ? 'Cloudy / Drying Track'
              : 'Clear / Dry Track';

            return (
              <div
                key={`${seg.startLap}-${seg.endLap}`}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  isHeavy
                    ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                    : isLight
                    ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isHeavy
                        ? 'text-blue-400'
                        : isLight
                        ? 'text-sky-400'
                        : 'text-amber-400'
                    }`}
                  />
                  <div>
                    <div className="font-mono text-xs font-extrabold text-white">
                      LAP {seg.startLap} — {seg.endLap}
                    </div>
                    <div className="text-[11px] text-zinc-400">{weatherTitle}</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[10px] text-zinc-500">PEAK WET</div>
                  <div className="text-xs font-bold text-sky-300">
                    {seg.maxWetness.toFixed(0)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grafik Bar Visual Lap 1 s/d Total Laps */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>TRACK WETNESS & RAIN PROBABILITY CURVE (LAP 1 → LAP {totalLaps})</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-sm bg-amber-400" /> DRY (Slicks &lt;15%)
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2 h-2 rounded-sm bg-sky-400" /> LIGHT RAIN (Inter 15-60%)
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <span className="w-2 h-2 rounded-sm bg-blue-500" /> HEAVY RAIN (Wet &gt;60%)
              </span>
            </div>
          </div>

          <div className="relative h-32 w-full flex items-end gap-[2px] pt-4 pb-1 px-1 border-b border-zinc-800">
            {/* Garis Ambang Batas Ban INTER (15%) dan WET (60%) */}
            <div
              className="absolute left-0 right-0 border-t border-dashed border-emerald-500/40 pointer-events-none flex justify-end pr-2"
              style={{ bottom: '18%' }}
            >
              <span className="text-[9px] font-mono text-emerald-400 bg-zinc-950 px-1 -mt-2">
                INTER CROSSOVER (15% WET)
              </span>
            </div>
            <div
              className="absolute left-0 right-0 border-t border-dashed border-blue-500/40 pointer-events-none flex justify-end pr-2"
              style={{ bottom: '60%' }}
            >
              <span className="text-[9px] font-mono text-blue-400 bg-zinc-950 px-1 -mt-2">
                FULL WET CROSSOVER (60% WET)
              </span>
            </div>

            {weatherTimeline.map((item) => {
              const wet = item.projectedWetness ?? 0;
              const barHeight = Math.max(8, Math.min(100, wet > 0 ? wet : item.rainProbability * 0.4));
              const barColor =
                item.weather === 'HEAVY_RAIN'
                  ? 'bg-blue-500'
                  : item.weather === 'LIGHT_RAIN'
                  ? 'bg-sky-400'
                  : wet > 5
                  ? 'bg-teal-500/70'
                  : 'bg-amber-400/60';

              return (
                <div
                  key={item.lap}
                  className="flex-1 h-full flex flex-col justify-end group relative"
                  title={`Lap ${item.lap}: ${item.weather} • Est. Wetness: ${wet.toFixed(
                    1
                  )}% • Rain Prob: ${item.rainProbability}%`}
                >
                  <div
                    className={`w-full rounded-t transition-all group-hover:opacity-100 opacity-85 ${barColor}`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between font-mono text-[10px] text-zinc-500">
            <span>LAP 1 (START)</span>
            <span>LAP {Math.round(totalLaps * 0.25)}</span>
            <span>LAP {Math.round(totalLaps * 0.5)} (MID-RACE)</span>
            <span>LAP {Math.round(totalLaps * 0.75)}</span>
            <span>LAP {totalLaps} (FINISH)</span>
          </div>
        </div>
      </div>

      {/* PANEL 2: PEMILIHAN STARTING TYRE COMPOUND & FUEL LOAD UNTUK 2 PEMBALAP PLAYER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {playerDrivers.map((driver) => {
          const chosenTyre = preRaceStartingTyres[driver.id] ?? driver.tyreCompound;
          const chosenFuel = preRaceStartingFuel[driver.id] ?? standardRaceFuelKg;
          const confidence = setupConfidences[driver.id] ?? 75;
          const tyreSpec = TYRE_SPECS[chosenTyre];

          // Estimasi umur lap ban (sampai tyreHealth menyentuh 30% Tyre Cliff)
          const driverTyreSkillFactor = 1 - ((driver.tyreManagement - 80) / 100) * 0.35;
          const wearPerLap =
            tyreSpec.degradationRate * circuit.tyreWearMultiplier * driverTyreSkillFactor;
          const estimatedStintLaps = Math.max(5, Math.floor(70 / Math.max(0.5, wearPerLap)));
          const estimatedFuelLaps = Math.floor(
            chosenFuel / Math.max(0.6, fuelBurn2026)
          );

          const isSlickChosenOnWetStart =
            (chosenTyre === 'SOFT' || chosenTyre === 'MEDIUM' || chosenTyre === 'HARD') &&
            (lap1Weather !== 'DRY' || lap1Wetness >= 20);

          return (
            <div
              key={driver.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-5"
            >
              {/* Header Pembalap & Posisi Grid Start */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-mono text-base font-black text-white border"
                    style={{
                      backgroundColor: `${driver.teamColor}25`,
                      borderColor: driver.teamColor,
                    }}
                  >
                    P{driver.position}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-zinc-800 text-white">
                        #{driver.number} {driver.code}
                      </span>
                      <h3 className="text-base font-extrabold text-white">{driver.name}</h3>
                    </div>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      Starting Grid: <strong className="text-white">P{driver.position}</strong> • FP/Quali Setup Confidence:{' '}
                      <strong className="text-emerald-400">{confidence.toFixed(1)}%</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                    Est. 1st Stint: <strong className="text-amber-300">~{estimatedStintLaps} Laps</strong>
                  </span>
                </div>
              </div>

              {/* 1. Pemilihan Starting Tyre Compound */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-red-400" />
                    1. Select Starting Tyre Compound
                  </label>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Selected: <strong className="text-white">{tyreSpec.label}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {ALL_COMPOUNDS.map((compound) => {
                    const spec = TYRE_SPECS[compound];
                    const isSelected = chosenTyre === compound;
                    const cWear =
                      spec.degradationRate * circuit.tyreWearMultiplier * driverTyreSkillFactor;
                    const cStintLaps = Math.max(5, Math.floor(70 / Math.max(0.5, cWear)));
                    const setsLeft =
                      weekendTyreAllocation[driver.id]?.[compound] ?? 0;

                    return (
                      <button
                        key={compound}
                        type="button"
                        disabled={setsLeft <= 0}
                        onClick={() =>
                          setPreRaceDriverConfig(driver.id, compound, chosenFuel)
                        }
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'bg-zinc-800/95 border-white scale-[1.02]'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-black text-zinc-950 shadow-md"
                          style={{ backgroundColor: spec.colorHex }}
                        >
                          {spec.shortCode}
                        </div>
                        <div className="font-mono text-[11px] font-bold text-white">
                          {compound} <span className="text-zinc-400">x{setsLeft}</span>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                          {spec.gripBonus <= 0
                            ? `${spec.gripBonus.toFixed(2)}s`
                            : `+${spec.gripBonus.toFixed(1)}s`}
                        </div>
                        <div className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-amber-300">
                          ~{cStintLaps} Laps
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isSlickChosenOnWetStart ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-2 text-xs font-mono text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      Peringatan: Lap 1 diprediksi basah ({lap1Weather}). Pertimbangkan memulai dengan ban INTER atau WET!
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Ban {chosenTyre} siap dipasang di grid P{driver.position}.
                    </span>
                    <span>Wear Rate: -{wearPerLap.toFixed(2)}%/lap</span>
                  </div>
                )}
              </div>

              {/* 2. Pemilihan Beban Bahan Bakar Awal (Starting Fuel Load) */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-sky-400" />
                    2. Starting E-Fuel Load (Max {MAX_FUEL_LOAD_2026_KG} kg)
                  </label>
                  <span className="font-mono text-xs font-extrabold text-sky-300">
                    {chosenFuel.toFixed(1)} kg (~{estimatedFuelLaps} Laps)
                  </span>
                </div>

                <input
                  type="range"
                  min={45}
                  max={MAX_FUEL_LOAD_2026_KG}
                  step={0.5}
                  value={chosenFuel}
                  onChange={(e) =>
                    setPreRaceDriverConfig(
                      driver.id,
                      chosenTyre,
                      Number(e.target.value)
                    )
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />

                {/* Tombol Preset Strategi Bahan Bakar */}
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setPreRaceDriverConfig(driver.id, chosenTyre, underfuelAttackKg)
                    }
                    className={`py-2 px-2.5 rounded-xl border transition cursor-pointer ${
                      Math.abs(chosenFuel - underfuelAttackKg) < 0.6
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>Light / Underfuel</div>
                    <div className="text-[10px] text-emerald-400">{underfuelAttackKg} kg (Fast)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPreRaceDriverConfig(driver.id, chosenTyre, standardRaceFuelKg)
                    }
                    className={`py-2 px-2.5 rounded-xl border transition cursor-pointer ${
                      Math.abs(chosenFuel - standardRaceFuelKg) < 0.6
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>Standard Load</div>
                    <div className="text-[10px] text-sky-300">{standardRaceFuelKg} kg (Balanced)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPreRaceDriverConfig(driver.id, chosenTyre, overfuelHeavyPushKg)
                    }
                    className={`py-2 px-2.5 rounded-xl border transition cursor-pointer ${
                      Math.abs(chosenFuel - overfuelHeavyPushKg) < 0.6
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>Heavy Push Load</div>
                    <div className="text-[10px] text-amber-300">{overfuelHeavyPushKg} kg (Push)</div>
                  </button>
                </div>
              </div>

              <GaragePartsBar driver={driver} canFitInGarage={true} />
            </div>
          );
        })}
      </div>

      {/* FOOTER CALL TO ACTION */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-300">
          <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            Kedua mobil siap menuju Starting Grid ({drivers.length} mobil F1 2026 • E-Fuel Max {MAX_FUEL_LOAD_2026_KG}kg • Wajib gunakan 2 kompon kering berbeda pada trek kering).
          </span>
        </div>

        <button
          type="button"
          onClick={proceedToGrid}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition cursor-pointer"
        >
          <Flag className="w-4 h-4 fill-current" />
          <span>GO TO STARTING GRID (LIGHTS OUT)</span>
        </button>
      </div>
    </div>
  );
};

