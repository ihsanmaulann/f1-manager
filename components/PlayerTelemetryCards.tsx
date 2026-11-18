'use client';

import React, { useState } from 'react';
import {
  Flame,
  Gauge,
  Shield,
  Zap,
  BatteryCharging,
  Battery,
  Fuel,
  Disc,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  PowerOff,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import {
  getCircuitFuelBurn2026,
  MAX_FUEL_LOAD_2026_KG,
  TYRE_SPECS,
} from '../constants/f1Data';
import { DefendMode, ERSMode, OvertakeAggression, PaceMode, TyreCompound } from '../types/f1';
import { GaragePartsBar } from './GaragePartsBar';

const PACE_OPTIONS: Array<{
  mode: PaceMode;
  label: string;
  subLabel: string;
  activeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    mode: 'CONSERVE',
    label: 'CONSERVE',
    subLabel: 'Save',
    activeClass: 'bg-blue-600 text-white border-blue-500',
    icon: Shield,
  },
  {
    mode: 'STANDARD',
    label: 'STANDARD',
    subLabel: 'Balanced',
    activeClass: 'bg-emerald-600 text-white border-emerald-500',
    icon: Gauge,
  },
  {
    mode: 'PUSH',
    label: 'PUSH',
    subLabel: 'Attack',
    activeClass: 'bg-red-600 text-white border-red-500',
    icon: Flame,
  },
];

const ERS_OPTIONS: Array<{
  mode: ERSMode;
  label: string;
  subLabel: string;
  activeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    mode: 'HARVEST',
    label: 'HARVEST',
    subLabel: '+15%',
    activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/60',
    icon: BatteryCharging,
  },
  {
    mode: 'NEUTRAL',
    label: 'NEUTRAL',
    subLabel: 'Auto Z/X',
    activeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/60',
    icon: Battery,
  },
  {
    mode: 'DEPLOY',
    label: 'OVERRIDE',
    subLabel: '350kW',
    activeClass: 'bg-purple-600 text-white border-purple-500',
    icon: Zap,
  },
];

const ALL_COMPOUNDS: TyreCompound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'];

const getTyreHealthStyles = (health: number) => {
  if (health >= 65) {
    return {
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      statusLabel: 'OPTIMAL GRIP',
    };
  }
  if (health >= 30) {
    return {
      barClass: 'bg-amber-400',
      textClass: 'text-amber-300',
      statusLabel: 'MODERATE WEAR',
    };
  }
  return {
    barClass: 'bg-red-500',
    textClass: 'text-red-400 animate-pulse',
    statusLabel: 'TYRE CLIFF WARNING',
  };
};

export const PlayerTelemetryCards: React.FC = () => {
  const {
    circuit,
    drivers,
    flagStatus,
    pitRemainingTime,
    weekendTyreAllocation,
    setDriverStrategy,
    setDriverTactics,
    orderPitStop,
    cancelPitStop,
    toggleRepairWingOnNextPit,
    retireCarToGarage,
    redFlagFreeTyreSwap,
  } = useRaceStore();

  const [selectedCompounds, setSelectedCompounds] = useState<Record<string, TyreCompound>>({});
  const [confirmRetireId, setConfirmRetireId] = useState<string | null>(null);

  const playerDrivers = drivers
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.number - b.number);

  const teamLabel = playerDrivers[0]?.teamName ?? 'PLAYER F1 TEAM';

  return (
    <section className="w-full flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Garage Pit Wall • {teamLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {playerDrivers.map((driver) => {
          const isDNF = driver.status === 'DNF';
          const isRetired = driver.status === 'RETIRED';
          const isOut = isDNF || isRetired;

          const carAhead =
            driver.position > 1
              ? drivers.find((d) => d.position === driver.position - 1)
              : null;
          const carBehind =
            driver.position < drivers.length
              ? drivers.find((d) => d.position === driver.position + 1)
              : null;

          const currentTyreSpec = TYRE_SPECS[driver.tyreCompound];
          const tyreStyle = getTyreHealthStyles(driver.tyreHealth);
          const queuedCompound: TyreCompound =
            selectedCompounds[driver.id] ?? driver.nextTyreCompound;
          const pitTimer = pitRemainingTime[driver.id] ?? 0;
          const isConfirmingRetire = confirmRetireId === driver.id;
          const driverAlloc = weekendTyreAllocation[driver.id] ?? {
            SOFT: 8,
            MEDIUM: 3,
            HARD: 2,
            INTER: 4,
            WET: 3,
          };

          const usedCompounds = driver.usedCompounds ?? [driver.tyreCompound];
          const usedWetOrInter = usedCompounds.some((c) => c === 'INTER' || c === 'WET');
          const distinctDryUsed = Array.from(
            new Set(
              usedCompounds.filter((c) => c === 'SOFT' || c === 'MEDIUM' || c === 'HARD')
            )
          );
          const twoCompoundRuleMet = usedWetOrInter || distinctDryUsed.length >= 2;

          const isOverrideReady =
            !isOut &&
            flagStatus === 'GREEN' &&
            driver.currentLap >= 2 &&
            driver.position > 1 &&
            driver.interval <= 1.0;
          const overrideStatusText =
            flagStatus !== 'GREEN'
              ? `LOCKED (${flagStatus})`
              : driver.currentLap < 2
              ? 'LOCKED (LAP 1)'
              : isOverrideReady
              ? '<1.0s OVERRIDE READY'
              : 'ACTIVE AERO Z/X';

          const handleSelectCompound = (compound: TyreCompound) => {
            if (isOut) return;
            setSelectedCompounds((prev) => ({ ...prev, [driver.id]: compound }));
            if (driver.boxThisLap && !driver.isInPit) {
              orderPitStop(driver.id, compound);
            }
          };

          const handleToggleBox = () => {
            if (driver.isInPit || isOut) return;
            if (driver.boxThisLap) {
              cancelPitStop(driver.id);
            } else {
              orderPitStop(driver.id, queuedCompound);
            }
          };

          const handleRetireClick = () => {
            if (isOut) return;
            if (isConfirmingRetire) {
              retireCarToGarage(driver.id);
              setConfirmRetireId(null);
            } else {
              setConfirmRetireId(driver.id);
            }
          };

          return (
            <div
              key={driver.id}
              className={`bg-zinc-900 border rounded-xl overflow-hidden flex flex-col ${
                isOut ? 'border-red-900/50 opacity-80' : 'border-zinc-800'
              }`}
            >
              {/* 1. HEADER: Nama Pembalap, Posisi Saat Ini, Status Wing Damage / DNF / RETIRED, Gap Depan & Belakang */}
              <div
                className="px-3.5 py-2 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2"
                style={{
                  background: `linear-gradient(90deg, ${driver.teamColor}26 0%, rgba(24,24,27,0.95) 60%)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-zinc-950 border border-zinc-700 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 leading-none">
                      POS
                    </span>
                    <span
                      className={`font-mono text-base font-extrabold leading-tight ${
                        isDNF
                          ? 'text-red-500'
                          : isRetired
                          ? 'text-amber-400'
                          : 'text-white'
                      }`}
                    >
                      {isDNF ? 'DNF' : isRetired ? 'RET' : `P${driver.position}`}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-mono text-xs font-extrabold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: driver.teamColor }}
                      >
                        #{driver.number} {driver.code}
                      </span>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {driver.name}
                      </h3>
                      {isDNF && (
                        <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-extrabold uppercase">
                          CRASH (DNF)
                        </span>
                      )}
                      {isRetired && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/25 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-extrabold uppercase">
                          RETIRED TO GARAGE (75% REPAIR SAVED)
                        </span>
                      )}
                      {driver.isInPit && !isOut && (
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-zinc-950 font-mono text-[10px] font-extrabold uppercase animate-pulse">
                          IN PIT ({pitTimer.toFixed(1)}s)
                        </span>
                      )}
                      {/* Indikator Eksplisit Front Wing Damage: X% */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase ${
                          driver.wingDamage >= 50
                            ? 'bg-red-500/20 border-red-500/50 text-red-300'
                            : driver.wingDamage > 0
                            ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <AlertOctagon className="w-3 h-3" />
                        Wing: {driver.wingDamage}%
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold ${
                          (driver.mentality ?? 75) >= 80
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : (driver.mentality ?? 75) < 55
                            ? 'bg-red-500/15 border-red-500/40 text-red-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        Mentality: {driver.mentality ?? 75}%
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Lap {driver.currentLap} • Pit Stops: {driver.pitStopsCount}
                      {driver.wingDamage > 0 && (
                        <span className="text-orange-300 ml-2">
                          • Aero Loss: +{((driver.wingDamage / 100) * 6.5).toFixed(2)}s/lap
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Gap dengan Mobil di Depan & di Belakang */}
                <div className="flex items-center gap-2.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 font-mono text-xs">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase text-zinc-500 flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      Ahead {carAhead ? `(${carAhead.code})` : ''}
                    </span>
                    <span className="text-zinc-200 font-bold">
                      {isOut
                        ? '---'
                        : carAhead
                        ? `+${driver.interval.toFixed(3)}s`
                        : 'LEADER'}
                    </span>
                  </div>

                  <div className="h-6 w-px bg-zinc-800" />

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase text-zinc-500 flex items-center gap-0.5">
                      <ArrowDownRight className="w-3 h-3 text-red-400" />
                      Behind {carBehind ? `(${carBehind.code})` : ''}
                    </span>
                    <span className="text-zinc-300 font-bold">
                      {isOut
                        ? '---'
                        : carBehind && carBehind.status === 'RUNNING'
                        ? `-${carBehind.interval.toFixed(3)}s`
                        : 'CLEAR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* BODY KARTU */}
              <div className="p-3 flex flex-col gap-2.5">
                {/* 2. VISUALISASI TELEMETRI */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-zinc-950/80 border border-zinc-800/90 rounded-lg p-2.5 tabular-nums">
                  {/* A. Tyre Health */}
                  <div className="flex flex-col justify-between gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                        <Disc className="w-3.5 h-3.5 text-zinc-400" />
                        Tyre Health
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        Age: <strong className="text-zinc-200">{driver.tyreAge}L</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-extrabold bg-zinc-900 border-2 shrink-0"
                        style={{
                          borderColor: currentTyreSpec.colorHex,
                          color: currentTyreSpec.colorHex,
                        }}
                      >
                        {currentTyreSpec.shortCode}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-mono text-xs mb-1">
                          <span className={`font-bold ${tyreStyle.textClass}`}>
                            {driver.tyreHealth.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-zinc-500">
                            {tyreStyle.statusLabel}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${tyreStyle.barClass}`}
                            style={{
                              width: `${Math.max(0, Math.min(100, driver.tyreHealth))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* B. ERS Battery */}
                  <div className="flex flex-col justify-between gap-1.5 sm:border-l sm:border-zinc-800 sm:pl-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        ERS Battery
                      </span>
                      <span className="font-mono text-[10px] uppercase text-cyan-400 font-semibold">
                        {driver.ersMode}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between font-mono text-xs mb-1">
                        <span className="font-bold text-zinc-100">
                          {driver.ersBattery.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            driver.ersMode === 'DEPLOY'
                              ? 'bg-purple-500'
                              : driver.ersMode === 'HARVEST'
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{
                            width: `${Math.max(0, Math.min(100, driver.ersBattery))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* C. Fuel Load (F1 2026 E-Fuel 75 kg Limit) */}
                  <div className="flex flex-col justify-between gap-1.5 sm:border-l sm:border-zinc-800 sm:pl-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                        Fuel Load
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between font-mono text-xs mb-1">
                        <span
                          className={`font-bold ${
                            driver.fuelLoad < 8 ? 'text-amber-300' : 'text-zinc-100'
                          }`}
                        >
                          {driver.fuelLoad.toFixed(1)} kg
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          ~
                          {Math.max(
                            0,
                            Math.floor(driver.fuelLoad / Math.max(0.6, getCircuitFuelBurn2026(circuit)))
                          )}
                          L
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, (driver.fuelLoad / MAX_FUEL_LOAD_2026_KG) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 & 4. KONTROL DRIVING PACE & ERS MODE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 3. Tombol Driving Pace */}
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                        Pace
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PACE_OPTIONS.map((opt) => {
                        const isActive = driver.paceMode === opt.mode;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.mode}
                            type="button"
                            disabled={isOut}
                            onClick={() =>
                              setDriverStrategy(driver.id, opt.mode, driver.ersMode)
                            }
                            className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-md border font-mono transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive
                                ? opt.activeClass
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-1 text-[11px] font-bold">
                              <Icon className="w-3 h-3" />
                              <span>{opt.label}</span>
                            </div>
                            <span
                              className={`text-[9px] mt-0.5 ${
                                isActive ? 'text-white/80' : 'text-zinc-500'
                              }`}
                            >
                              {opt.subLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Tombol ERS Mode (2026 Active Aero & Manual Override Mode) */}
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                        2026 Active Aero & ERS Mode
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isOverrideReady
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                            : flagStatus !== 'GREEN'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {overrideStatusText}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ERS_OPTIONS.map((opt) => {
                        const isActive = driver.ersMode === opt.mode;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.mode}
                            type="button"
                            disabled={isOut}
                            onClick={() =>
                              setDriverStrategy(driver.id, driver.paceMode, opt.mode)
                            }
                            className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-md border font-mono transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive
                                ? opt.activeClass
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-1 text-[11px] font-bold">
                              <Icon className="w-3 h-3" />
                              <span>{opt.label}</span>
                            </div>
                            <span
                              className={`text-[9px] mt-0.5 ${
                                isActive ? 'text-current opacity-85' : 'text-zinc-500'
                              }`}
                            >
                              {opt.subLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4b. F1 MANAGER 24 PIT WALL TACTICS (Overtake / Defend / Kerbs / Team Orders) */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase text-zinc-500 font-semibold">
                      Overtake
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['LOW', 'MEDIUM', 'HIGH'] as OvertakeAggression[]).map((lvl) => {
                        const active = (driver.overtakeAggression ?? 'MEDIUM') === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            disabled={isOut}
                            onClick={() =>
                              setDriverTactics(driver.id, { overtakeAggression: lvl })
                            }
                            className={`py-1 rounded border text-[10px] font-bold cursor-pointer disabled:opacity-40 ${
                              active
                                ? 'bg-zinc-800 text-white border-zinc-500'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                          >
                            {lvl === 'MEDIUM' ? 'MED' : lvl}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase text-zinc-500 font-semibold">
                      Defend
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['PASSIVE', 'NORMAL', 'ALWAYS'] as DefendMode[]).map((dm) => {
                        const active = (driver.defendMode ?? 'NORMAL') === dm;
                        return (
                          <button
                            key={dm}
                            type="button"
                            disabled={isOut}
                            onClick={() => setDriverTactics(driver.id, { defendMode: dm })}
                            className={`py-1 rounded border text-[10px] font-bold cursor-pointer disabled:opacity-40 ${
                              active
                                ? 'bg-zinc-800 text-white border-zinc-500'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                          >
                            {dm === 'PASSIVE' ? 'PASS' : dm === 'NORMAL' ? 'NORM' : 'ALW'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase text-zinc-500 font-semibold">
                      Directives
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        disabled={isOut}
                        onClick={() =>
                          setDriverTactics(driver.id, {
                            avoidHighRiskKerbs: !driver.avoidHighRiskKerbs,
                          })
                        }
                        className={`py-1 px-1 rounded border text-[10px] font-bold cursor-pointer disabled:opacity-40 truncate ${
                          driver.avoidHighRiskKerbs
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        Kerbs
                      </button>
                      <button
                        type="button"
                        disabled={isOut}
                        onClick={() =>
                          setDriverTactics(driver.id, {
                            letTeammatePass: !driver.letTeammatePass,
                          })
                        }
                        className={`py-1 px-1 rounded border text-[10px] font-bold cursor-pointer disabled:opacity-40 truncate ${
                          driver.letTeammatePass
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        Swap
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. PANEL STRATEGI PIT STOP + OPSI REPAIR FRONT WING (+4.5s) + RETIRE CAR TO GARAGE */}
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1 font-semibold">
                          <Wrench className="w-3 h-3 text-zinc-400" />
                          Select Next Pit Compound
                        </span>
                        <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded border font-bold ${
                              twoCompoundRuleMet
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            {twoCompoundRuleMet
                              ? '2-COMP RULE: MET ✓'
                              : `NEED 2ND DRY COMP (${distinctDryUsed.join('+') || driver.tyreCompound})`}
                          </span>
                          <span className="text-zinc-400">
                            Queued:{' '}
                            <strong
                              style={{ color: TYRE_SPECS[queuedCompound].colorHex }}
                            >
                              {queuedCompound}
                            </strong>
                            {(flagStatus === 'SC' || flagStatus === 'VSC') && (
                              <span className="ml-1.5 text-amber-400 font-bold">
                                • CHEAP PIT WINDOW!
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {flagStatus === 'RED' && !isOut && (
                        <div className="mb-1.5 rounded-md border border-red-500/60 bg-red-950/50 p-2 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-extrabold uppercase text-red-300 animate-pulse">
                              RED FLAG • FREE TYRE SWAP (0s PIT LOSS)
                            </span>
                            <span className="font-mono text-[9px] text-zinc-400">
                              Click compound to fit immediately
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {ALL_COMPOUNDS.map((comp) => {
                              const spec = TYRE_SPECS[comp];
                              const setsLeft = driverAlloc[comp] ?? 0;
                              const isCurrent = driver.tyreCompound === comp;
                              return (
                                <button
                                  key={`rf-${comp}`}
                                  type="button"
                                  disabled={setsLeft <= 0 || isCurrent}
                                  onClick={() => redFlagFreeTyreSwap(driver.id, comp)}
                                  className={`py-1 px-1 rounded border font-mono text-[9px] font-bold flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    isCurrent
                                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                      : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-red-400'
                                  }`}
                                >
                                  <span style={{ color: spec.colorHex }}>{spec.shortCode}</span>
                                  <span>({setsLeft})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-5 gap-1.5">
                        {ALL_COMPOUNDS.map((comp) => {
                          const spec = TYRE_SPECS[comp];
                          const isSelected = queuedCompound === comp;
                          const setsLeft = driverAlloc[comp] ?? 0;

                          return (
                            <button
                              key={comp}
                              type="button"
                              disabled={isOut || setsLeft <= 0}
                              onClick={() => handleSelectCompound(comp)}
                              className={`py-1.5 px-1 rounded-md border font-mono text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                isSelected
                                  ? 'bg-zinc-800 text-white shadow-sm'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                              }`}
                              style={{
                                borderColor: isSelected ? spec.colorHex : undefined,
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <span
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold border"
                                  style={{
                                    borderColor: spec.colorHex,
                                    color: spec.colorHex,
                                  }}
                                >
                                  {spec.shortCode}
                                </span>
                                <span className="text-[9px] text-zinc-400">x{setsLeft}</span>
                              </div>
                              <span>{comp}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tombol Besar BOX THIS LAP */}
                    <button
                      type="button"
                      disabled={driver.isInPit || isOut}
                      onClick={handleToggleBox}
                      className={`sm:w-48 py-2.5 px-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider border transition flex flex-col items-center justify-center gap-0.5 shrink-0 cursor-pointer disabled:cursor-not-allowed ${
                        isOut
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-600'
                          : driver.isInPit
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : driver.boxThisLap
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400'
                          : 'bg-red-600 hover:bg-red-500 text-white border-red-500'
                      }`}
                    >
                      {isDNF ? (
                        <span>DNF</span>
                      ) : isRetired ? (
                        <span>RETIRED</span>
                      ) : driver.isInPit ? (
                        <>
                          <span>IN PIT</span>
                          <span className="text-[10px] font-normal">
                            {pitTimer.toFixed(1)}s
                          </span>
                        </>
                      ) : driver.boxThisLap ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>BOX ({queuedCompound})</span>
                          </div>
                          <span className="text-[9px] font-medium opacity-85">
                            Click to cancel
                          </span>
                        </>
                      ) : (
                        <>
                          <span>BOX THIS LAP</span>
                          <span className="text-[10px] font-normal opacity-85">
                            Fit {queuedCompound}
                            {driver.repairWingOnNextPit && driver.wingDamage > 0
                              ? ' + Wing'
                              : ''}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bar Bawah Pit Panel: Repair Wing & Retire */}
                  <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={isOut || driver.isInPit}
                      onClick={() => toggleRepairWingOnNextPit(driver.id)}
                      className={`flex items-center gap-2 px-2.5 py-1 rounded border font-mono text-[11px] font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        driver.repairWingOnNextPit
                          ? 'bg-orange-500/15 border-orange-500/60 text-orange-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {driver.repairWingOnNextPit ? (
                        <CheckSquare className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}
                      <span>Repair Wing (+4.5s)</span>
                      <span className="text-[10px] text-zinc-500">
                        {driver.wingDamage}%
                      </span>
                    </button>

                    {!isOut && (
                      <div className="flex items-center gap-1.5">
                        {isConfirmingRetire && (
                          <button
                            type="button"
                            onClick={() => setConfirmRetireId(null)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleRetireClick}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[10px] font-bold uppercase transition cursor-pointer ${
                            isConfirmingRetire
                              ? 'bg-red-600 hover:bg-red-500 text-white border-red-500'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-300 border-zinc-800'
                          }`}
                        >
                          <PowerOff className="w-3 h-3" />
                          <span>
                            {isConfirmingRetire ? 'Confirm Retire?' : 'Retire Car'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <GaragePartsBar
                  driver={driver}
                  compact
                  canFitInGarage={flagStatus === 'RED' || driver.isInPit || isOut}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
