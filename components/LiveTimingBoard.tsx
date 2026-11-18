'use client';

import React from 'react';
import { BatteryCharging, Flame, Shield, Zap, AlertOctagon } from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { TYRE_SPECS } from '../constants/f1Data';
import { MicroSectorBoxes } from './MicroSectorBoxes';

const formatLapTime = (seconds: number): string => {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
};

const formatGap = (seconds: number, isLeader: boolean, isDNF: boolean): string => {
  if (isDNF) return 'OUT';
  if (isLeader) return 'LEADER';
  if (!Number.isFinite(seconds) || seconds <= 0) return '+0.000s';
  return `+${seconds.toFixed(3)}s`;
};

const getTyreHealthBarColor = (health: number): string => {
  if (health >= 65) return 'bg-emerald-500';
  if (health >= 35) return 'bg-amber-400';
  return 'bg-red-500';
};

export const LiveTimingBoard: React.FC = () => {
  const { drivers, fastestLapDriverId } = useRaceStore();

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full min-h-0">
      {/* Header Panel F1 TV Pro Broadcast */}
      <div className="px-4 py-2.5 bg-zinc-950/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-zinc-100">
            F1 TV Live Timing Tower ({drivers.length} Cars)
          </h2>
        </div>

        {/* Legenda Warna Broadcast: Purple / Green / Yellow Micro-Sectors & Player */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1" title="Overall Fastest Sector">
            <span className="w-2.5 h-1.5 rounded-[1.5px] bg-purple-500" />
            <span>Overall</span>
          </span>
          <span className="flex items-center gap-1" title="Personal Best Sector">
            <span className="w-2.5 h-1.5 rounded-[1.5px] bg-emerald-500" />
            <span>PB</span>
          </span>
          <span className="flex items-center gap-1" title="Slower Sector">
            <span className="w-2.5 h-1.5 rounded-[1.5px] bg-amber-400" />
            <span>Slow</span>
          </span>
          <span className="hidden sm:flex items-center gap-1 text-red-300">
            <span className="w-2 h-2 rounded-sm bg-red-500/40 border border-red-500" />
            <span>YOU</span>
          </span>
        </div>
      </div>

      {/* Tabel Standings Scrollable dengan Header Sticky */}
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-zinc-950">
            <tr className="border-b border-zinc-800/90 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              <th className="py-2 pl-3 pr-1.5 w-10 text-center">Pos</th>
              <th className="py-2 px-2">Driver</th>
              <th className="py-2 px-2 text-right">Int</th>
              <th className="py-2 px-2 text-right">Gap</th>
              <th className="py-2 px-1.5 text-center">Sec</th>
              <th className="py-2 px-2 text-right hidden md:table-cell">Last Lap</th>
              <th className="py-2 px-2 text-right hidden sm:table-cell">Best Lap</th>
              <th className="py-2 px-2">Tyre & Wear</th>
              <th className="py-2 px-2">ERS</th>
              <th className="py-2 pl-1.5 pr-3 text-center">Pit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-xs">
            {drivers.map((driver) => {
              const tyreSpec = TYRE_SPECS[driver.tyreCompound];
              const isLeader = driver.position === 1;
              const hasFastestLap = fastestLapDriverId === driver.id;
              const isPlayer = driver.isPlayerControlled;
              const isDNF = driver.status !== 'RUNNING';
              const isVoluntaryRetired = driver.status === 'RETIRED';

              return (
                <tr
                  key={driver.id}
                  style={{
                    boxShadow: `inset 3px 0 0 ${isDNF ? '#3F3F46' : driver.teamColor}`,
                  }}
                  className={`transition-colors ${
                    isDNF
                      ? 'bg-zinc-950/80 opacity-50'
                      : isPlayer
                      ? 'bg-red-950/25 hover:bg-red-950/40'
                      : 'hover:bg-zinc-800/40'
                  }`}
                >
                  {/* 1. Posisi */}
                  <td className="py-1.5 pl-3 pr-1.5 font-mono tabular-nums font-bold text-center">
                    {isVoluntaryRetired ? (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-500/40 text-[10px]">
                        RET
                      </span>
                    ) : isDNF ? (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-500/40 text-[10px]">
                        DNF
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center justify-center w-6 h-5 rounded text-[11px] ${
                          driver.position === 1
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : driver.position <= 3
                            ? 'bg-zinc-800 text-zinc-100'
                            : 'text-zinc-400'
                        }`}
                      >
                        {driver.position}
                      </span>
                    )}
                  </td>

                  {/* 2. Team Accent + Kode Pembalap + Status Pit & Wing Damage */}
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1 h-5 rounded-full shrink-0"
                        style={{ backgroundColor: driver.teamColor }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-mono tabular-nums font-bold tracking-wide ${
                              isDNF
                                ? 'line-through text-zinc-500'
                                : isPlayer
                                ? 'text-white'
                                : 'text-zinc-200'
                            }`}
                          >
                            {driver.code}
                          </span>
                          <span className="font-mono tabular-nums text-[10px] text-zinc-500">
                            #{driver.number}
                          </span>

                          {isPlayer && (
                            <span className="px-1 py-0 rounded text-[9px] font-mono font-bold uppercase bg-red-600/30 text-red-300 border border-red-500/40">
                              YOU
                            </span>
                          )}

                          {driver.isInPit && !isDNF && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold uppercase bg-amber-500 text-zinc-950 animate-pulse">
                              IN PIT
                            </span>
                          )}

                          {!driver.isInPit && driver.boxThisLap && !isDNF && (
                            <span className="px-1.5 py-0 rounded text-[9px] font-mono font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              BOX
                            </span>
                          )}

                          {driver.wingDamage > 0 && !isDNF && (
                            <span
                              title={`Front Wing Damage: ${driver.wingDamage}% (+4.5s Pit Repair)`}
                              className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] font-mono font-bold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40"
                            >
                              <AlertOctagon className="w-2.5 h-2.5" />
                              {driver.wingDamage}%
                            </span>
                          )}

                          {(driver.timePenaltySeconds ?? 0) > 0 && !isDNF && (
                            <span
                              title={`FIA Time Penalty: +${driver.timePenaltySeconds}s`}
                              className="px-1 py-0 rounded text-[9px] font-mono font-extrabold uppercase bg-red-500/25 text-red-300 border border-red-500/50"
                            >
                              +{driver.timePenaltySeconds}s
                            </span>
                          )}

                          {(driver.gridPenaltyPositions ?? 0) > 0 && (
                            <span
                              title={`Grid Penalty: +${driver.gridPenaltyPositions} places`}
                              className="px-1 py-0 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            >
                              {(driver.gridPenaltyPositions ?? 0) >= 20 ? 'PIT START' : `+${driver.gridPenaltyPositions}G`}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate max-w-[110px] sm:max-w-[135px]">
                          {driver.teamName}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 3. Interval */}
                  <td className="py-1.5 px-2 text-right font-mono tabular-nums text-zinc-200 whitespace-nowrap">
                    {isDNF ? (
                      <span
                        title={driver.dnfReason ?? 'Retired'}
                        className="text-red-400/90 text-[10px] font-bold uppercase"
                      >
                        {driver.dnfReason && /MGU-K|ICE|GEARBOX|HYDRAULIC|ENGINE|POWER UNIT/i.test(driver.dnfReason)
                          ? 'DNF • MECH'
                          : driver.dnfReason
                          ? 'DNF • CRASH'
                          : 'RETIRED'}
                      </span>
                    ) : isLeader ? (
                      <span className="text-zinc-500 text-[10px]">INTERVAL</span>
                    ) : (
                      `+${driver.interval.toFixed(3)}s`
                    )}
                  </td>

                  {/* 4. Gap to Leader */}
                  <td className="py-1.5 px-2 text-right font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                    {formatGap(driver.gapToLeader, isLeader, isDNF)}
                  </td>

                  {/* 5. Micro Sector Telemetry (S1 S2 S3) */}
                  <td className="py-1.5 px-1.5 text-center whitespace-nowrap">
                    <MicroSectorBoxes statuses={driver.sectorStatuses} />
                  </td>

                  {/* 6. Last Lap */}
                  <td className="py-1.5 px-2 text-right font-mono tabular-nums text-zinc-300 whitespace-nowrap hidden md:table-cell">
                    {isDNF ? '---' : formatLapTime(driver.lastLapTime)}
                  </td>

                  {/* 7. Best Lap */}
                  <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap hidden sm:table-cell">
                    <span
                      className={
                        hasFastestLap
                          ? 'px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                          : 'text-zinc-400'
                      }
                    >
                      {formatLapTime(driver.bestLapTime)}
                    </span>
                  </td>

                  {/* 8. Indikator Ban (Badge S/M/H/I/W + Bar TyreHealth + Umur Ban) */}
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        title={tyreSpec.label}
                        className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-extrabold bg-zinc-950 border-2 shrink-0"
                        style={{
                          borderColor: tyreSpec.colorHex,
                          color: tyreSpec.colorHex,
                        }}
                      >
                        {tyreSpec.shortCode}
                      </span>

                      <div className="flex flex-col w-[72px]">
                        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums mb-0.5">
                          <span
                            className={`font-bold ${
                              driver.tyreHealth < 30 ? 'text-red-400 animate-pulse' : 'text-zinc-200'
                            }`}
                          >
                            {driver.tyreHealth.toFixed(0)}%
                          </span>
                          <span className="text-zinc-500">{driver.tyreAge}L</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${getTyreHealthBarColor(
                              driver.tyreHealth
                            )}`}
                            style={{ width: `${Math.max(0, Math.min(100, driver.tyreHealth))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 9. Indikator Baterai ERS & Mode */}
                  <td className="py-1.5 px-2">
                    <div className="flex flex-col w-14">
                      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums mb-0.5">
                        <span className="flex items-center gap-0.5 text-zinc-300">
                          {driver.ersMode === 'DEPLOY' && (
                            <Zap className="w-2.5 h-2.5 text-cyan-400 fill-current" />
                          )}
                          {driver.ersMode === 'HARVEST' && (
                            <BatteryCharging className="w-2.5 h-2.5 text-emerald-400" />
                          )}
                          {driver.ersBattery.toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-zinc-500 flex items-center">
                          {driver.paceMode === 'PUSH' && (
                            <Flame className="w-2.5 h-2.5 text-orange-400" />
                          )}
                          {driver.paceMode === 'CONSERVE' && (
                            <Shield className="w-2.5 h-2.5 text-sky-400" />
                          )}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            driver.ersMode === 'DEPLOY'
                              ? 'bg-cyan-400'
                              : driver.ersMode === 'HARVEST'
                              ? 'bg-emerald-400'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, driver.ersBattery))}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 10. Jumlah Pit Stop */}
                  <td className="py-1.5 pl-1.5 pr-3 text-center font-mono tabular-nums text-zinc-300">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-zinc-800/80 text-[10px]">
                      {driver.pitStopsCount}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
