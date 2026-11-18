'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  TrendingUp,
  Disc,
  Fuel,
  Zap,
  ArrowUpDown,
  Flag,
  Wrench,
} from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { MAX_FUEL_LOAD_2026_KG, TYRE_SPECS } from '../constants/f1Data';
import { PlayerLapTelemetryEntry, SectorPerformance } from '../types/f1';

type ChartMetric = 'LAP_TIME' | 'TYRE_HEALTH' | 'FUEL_ERS';

const formatLapTime = (seconds: number): string => {
  if (seconds <= 0 || !Number.isFinite(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
};

const sectorColorClass = (status: SectorPerformance): string => {
  if (status === 'PURPLE') return 'bg-purple-500';
  if (status === 'GREEN') return 'bg-emerald-500';
  if (status === 'YELLOW') return 'bg-amber-400';
  return 'bg-zinc-700';
};

export const PlayerLapTelemetryPanel: React.FC = () => {
  const { drivers, playerLapTelemetry, fastestLapTime, circuit } = useRaceStore();

  const [selectedDriverFilter, setSelectedDriverFilter] = useState<'ALL' | string>('ALL');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('LAP_TIME');
  const [newestFirst, setNewestFirst] = useState<boolean>(true);
  const [hoveredLap, setHoveredLap] = useState<number | null>(null);

  const playerDrivers = useMemo(
    () =>
      drivers
        .filter((d) => d.isPlayerControlled)
        .sort((a, b) => a.number - b.number),
    [drivers]
  );

  const driver1 = playerDrivers[0] ?? null;
  const driver2 = playerDrivers[1] ?? null;

  const d1Entries = useMemo(
    () => (driver1 ? playerLapTelemetry[driver1.id] ?? [] : []),
    [driver1, playerLapTelemetry]
  );
  const d2Entries = useMemo(
    () => (driver2 ? playerLapTelemetry[driver2.id] ?? [] : []),
    [driver2, playerLapTelemetry]
  );

  const activeDriverIds = useMemo(() => {
    if (selectedDriverFilter !== 'ALL') {
      return new Set([selectedDriverFilter]);
    }
    return new Set(playerDrivers.map((d) => d.id));
  }, [selectedDriverFilter, playerDrivers]);

  const combinedRows = useMemo(() => {
    const all: PlayerLapTelemetryEntry[] = [];
    playerDrivers.forEach((d) => {
      if (!activeDriverIds.has(d.id)) return;
      const entries = playerLapTelemetry[d.id] ?? [];
      all.push(...entries);
    });

    return all.sort((a, b) => {
      if (a.lap !== b.lap) {
        return newestFirst ? b.lap - a.lap : a.lap - b.lap;
      }
      return a.position - b.position;
    });
  }, [playerDrivers, activeDriverIds, playerLapTelemetry, newestFirst]);

  // Hitung summary statistik khusus pembalap tim player
  const summaryStats = useMemo(() => {
    const pool = [...d1Entries, ...d2Entries];
    if (pool.length === 0) {
      return {
        totalRecordedLaps: 0,
        teamBestLap: null as PlayerLapTelemetryEntry | null,
        avgTeamLapTime: 0,
      };
    }
    let bestEntry: PlayerLapTelemetryEntry | null = null;
    let greenSum = 0;
    let greenCount = 0;
    pool.forEach((entry) => {
      if (!bestEntry || entry.lapTime < bestEntry.lapTime) {
        bestEntry = entry;
      }
      if (entry.flagStatus === 'GREEN' && !entry.pitInLap) {
        greenSum += entry.lapTime;
        greenCount += 1;
      }
    });
    return {
      totalRecordedLaps: Math.max(d1Entries.length, d2Entries.length),
      teamBestLap: bestEntry,
      avgTeamLapTime: greenCount > 0 ? greenSum / greenCount : 0,
    };
  }, [d1Entries, d2Entries]);

  // Hitung best lap masing-masing pembalap tim untuk penanda PB
  const personalBestByDriver = useMemo(() => {
    const map: Record<string, number> = {};
    playerDrivers.forEach((d) => {
      const list = playerLapTelemetry[d.id] ?? [];
      if (list.length > 0) {
        map[d.id] = Math.min(...list.map((e) => e.lapTime));
      }
    });
    return map;
  }, [playerDrivers, playerLapTelemetry]);

  // SVG Chart Geometry
  const svgW = 760;
  const svgH = 175;
  const padL = 46;
  const padR = 16;
  const padT = 16;
  const padB = 24;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const chartData = useMemo(() => {
    const visibleD1 =
      driver1 && activeDriverIds.has(driver1.id) ? d1Entries : [];
    const visibleD2 =
      driver2 && activeDriverIds.has(driver2.id) ? d2Entries : [];
    const allVisible = [...visibleD1, ...visibleD2];
    if (allVisible.length === 0) {
      return null;
    }

    const maxLap = Math.max(2, ...allVisible.map((e) => e.lap));
    const minLap = Math.min(...allVisible.map((e) => e.lap));
    const lapSpan = Math.max(1, maxLap - minLap);

    let minY = 0;
    let maxY = 100;

    if (chartMetric === 'LAP_TIME') {
      const times = allVisible.map((e) => e.lapTime);
      const rawMin = Math.min(...times);
      const rawMax = Math.max(...times);
      const margin = Math.max(0.6, (rawMax - rawMin) * 0.14);
      minY = Math.floor((rawMin - margin) * 10) / 10;
      maxY = Math.ceil((rawMax + margin) * 10) / 10;
    } else if (chartMetric === 'TYRE_HEALTH') {
      minY = 0;
      maxY = 100;
    } else {
      minY = 0;
      maxY = 100;
    }

    const yRange = Math.max(0.5, maxY - minY);
    const toX = (lap: number) =>
      padL + ((lap - minLap) / lapSpan) * plotW;
    const toY = (val: number) =>
      padT + plotH - ((val - minY) / yRange) * plotH;

    const getVal = (entry: PlayerLapTelemetryEntry): number => {
      if (chartMetric === 'LAP_TIME') return entry.lapTime;
      if (chartMetric === 'TYRE_HEALTH') return entry.tyreHealth;
      return (entry.fuelLoad / MAX_FUEL_LOAD_2026_KG) * 100;
    };

    const buildPath = (entries: PlayerLapTelemetryEntry[]) =>
      entries
        .map((e, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(e.lap).toFixed(1)} ${toY(getVal(e)).toFixed(1)}`)
        .join(' ');

    const buildErsPath = (entries: PlayerLapTelemetryEntry[]) =>
      entries
        .map((e, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(e.lap).toFixed(1)} ${toY(e.ersBattery).toFixed(1)}`)
        .join(' ');

    return {
      minLap,
      maxLap,
      minY,
      maxY,
      toX,
      toY,
      getVal,
      visibleD1,
      visibleD2,
      d1Path: buildPath(visibleD1),
      d2Path: buildPath(visibleD2),
      d1ErsPath: chartMetric === 'FUEL_ERS' ? buildErsPath(visibleD1) : '',
      d2ErsPath: chartMetric === 'FUEL_ERS' ? buildErsPath(visibleD2) : '',
    };
  }, [driver1, driver2, activeDriverIds, d1Entries, d2Entries, chartMetric, plotW, plotH]);

  const hoveredEntries = useMemo(() => {
    if (hoveredLap === null) return null;
    return {
      lap: hoveredLap,
      d1: d1Entries.find((e) => e.lap === hoveredLap) ?? null,
      d2: d2Entries.find((e) => e.lap === hoveredLap) ?? null,
    };
  }, [hoveredLap, d1Entries, d2Entries]);

  const teamLabel = playerDrivers[0]?.teamName ?? 'MY F1 TEAM';
  const teamColor = playerDrivers[0]?.teamColor ?? '#E8002D';

  return (
    <section className="w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
      {/* HEADER PANEL */}
      <div
        className="px-4 py-2.5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3"
        style={{
          background: `linear-gradient(90deg, ${teamColor}1f 0%, rgba(24,24,27,0.95) 55%)`,
        }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-700 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                My Team Per-Lap Telemetry
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                {teamLabel} ONLY
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400">
              {circuit.name} • Catatan Lap Time, Sektor, Aus Ban, E-Fuel & ERS khusus 2 pembalap tim Anda
            </p>
          </div>
        </div>

        {/* SUMMARY KPI PILLS */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <div className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
            Laps Recorded:{' '}
            <strong className="text-white">{summaryStats.totalRecordedLaps}</strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
            Team Best:{' '}
            <strong className="text-purple-300">
              {summaryStats.teamBestLap
                ? `${formatLapTime(summaryStats.teamBestLap.lapTime)} (${summaryStats.teamBestLap.driverCode} L${summaryStats.teamBestLap.lap})`
                : '--:--.---'}
            </strong>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
            Clean Avg Pace:{' '}
            <strong className="text-emerald-300">
              {summaryStats.avgTeamLapTime > 0
                ? formatLapTime(summaryStats.avgTeamLapTime)
                : '--:--.---'}
            </strong>
          </div>
        </div>
      </div>

      {/* FILTER & CHART TOOLBAR */}
      <div className="px-4 py-2.5 border-b border-zinc-800/70 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        {/* Driver Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setSelectedDriverFilter('ALL')}
            className={`px-2.5 py-1 rounded-md border font-bold transition cursor-pointer ${
              selectedDriverFilter === 'ALL'
                ? 'bg-zinc-100 text-zinc-950 border-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            COMPARE BOTH ({playerDrivers.length})
          </button>

          {playerDrivers.map((d, idx) => {
            const isSelected = selectedDriverFilter === d.id;
            const lineColor = idx === 0 ? 'bg-emerald-400' : 'bg-sky-400';
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDriverFilter(d.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 text-white border-zinc-500'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${lineColor}`} />
                <span>
                  #{d.number} {d.code}
                </span>
                <span className="text-[10px] text-zinc-500">
                  ({(playerLapTelemetry[d.id] ?? []).length}L)
                </span>
              </button>
            );
          })}
        </div>

        {/* Metric Switcher & Sort Order */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setChartMetric('LAP_TIME')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                chartMetric === 'LAP_TIME'
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Lap Time</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('TYRE_HEALTH')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                chartMetric === 'TYRE_HEALTH'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Disc className="w-3 h-3" />
              <span>Tyre Health %</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('FUEL_ERS')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                chartMetric === 'FUEL_ERS'
                  ? 'bg-sky-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Fuel className="w-3 h-3" />
              <span>E-Fuel & ERS %</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setNewestFirst((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold transition cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>{newestFirst ? 'Newest Lap First' : 'Lap 1 First'}</span>
          </button>
        </div>
      </div>

      {/* BODY */}
      {combinedRows.length === 0 ? (
        <div className="p-6 text-center font-mono text-xs text-zinc-400">
          Belum ada lap yang diselesaikan oleh pembalap tim Anda. Data telemetri per lap akan muncul otomatis segera setelah mobil melewati garis finis Lap 1.
        </div>
      ) : (
        <div className="p-3.5 flex flex-col gap-3.5">
          {/* 1. GRAFIK TELEMETRI PER-LAP SVG */}
          {chartData && (
            <div className="bg-zinc-950/85 border border-zinc-800/90 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-3">
                  {driver1 && activeDriverIds.has(driver1.id) && (
                    <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                      #{driver1.number} {driver1.code}
                      {chartMetric === 'FUEL_ERS' && ' (Fuel% / dotted ERS%)'}
                    </span>
                  )}
                  {driver2 && activeDriverIds.has(driver2.id) && (
                    <span className="flex items-center gap-1.5 text-sky-300 font-bold">
                      <span className="w-3 h-0.5 bg-sky-400 inline-block" />
                      #{driver2.number} {driver2.code}
                      {chartMetric === 'FUEL_ERS' && ' (Fuel% / dotted ERS%)'}
                    </span>
                  )}
                  <span className="text-amber-300">● PIT IN LAP</span>
                </div>

                {hoveredEntries ? (
                  <div className="flex items-center gap-3 text-zinc-200 bg-zinc-900 border border-zinc-700 px-2.5 py-0.5 rounded">
                    <span className="font-bold text-white">LAP {hoveredEntries.lap}:</span>
                    {hoveredEntries.d1 && activeDriverIds.has(hoveredEntries.d1.driverId) && (
                      <span className="text-emerald-300">
                        {hoveredEntries.d1.driverCode} {formatLapTime(hoveredEntries.d1.lapTime)} •{' '}
                        {hoveredEntries.d1.tyreCompound[0]} {hoveredEntries.d1.tyreHealth.toFixed(0)}% •{' '}
                        {hoveredEntries.d1.fuelLoad.toFixed(1)}kg
                      </span>
                    )}
                    {hoveredEntries.d2 && activeDriverIds.has(hoveredEntries.d2.driverId) && (
                      <span className="text-sky-300">
                        {hoveredEntries.d2.driverCode} {formatLapTime(hoveredEntries.d2.lapTime)} •{' '}
                        {hoveredEntries.d2.tyreCompound[0]} {hoveredEntries.d2.tyreHealth.toFixed(0)}% •{' '}
                        {hoveredEntries.d2.fuelLoad.toFixed(1)}kg
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-500">
                    Arahkan kursor ke titik lap untuk inspeksi telemetri detail
                  </span>
                )}
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-44 min-w-[460px] select-none"
                >
                  {/* Grid Horizontal & Label Y */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                    const y = padT + plotH - t * plotH;
                    const yVal = chartData.minY + t * (chartData.maxY - chartData.minY);
                    const yLabel =
                      chartMetric === 'LAP_TIME'
                        ? `${yVal.toFixed(1)}s`
                        : `${Math.round(yVal)}%`;
                    return (
                      <g key={t}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={svgW - padR}
                          y2={y}
                          stroke="#27272a"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 6}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-zinc-500 font-mono text-[9px]"
                        >
                          {yLabel}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-axis ticks */}
                  {[
                    chartData.minLap,
                    Math.round((chartData.minLap + chartData.maxLap) / 2),
                    chartData.maxLap,
                  ].map((lapTick, i) => (
                    <text
                      key={`${lapTick}-${i}`}
                      x={chartData.toX(lapTick)}
                      y={svgH - 6}
                      textAnchor="middle"
                      className="fill-zinc-500 font-mono text-[9px]"
                    >
                      L{lapTick}
                    </text>
                  ))}

                  {/* Optional ERS dotted lines in FUEL_ERS mode */}
                  {chartData.d1ErsPath && (
                    <path
                      d={chartData.d1ErsPath}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="1.4"
                      strokeDasharray="3 3"
                      opacity={0.55}
                    />
                  )}
                  {chartData.d2ErsPath && (
                    <path
                      d={chartData.d2ErsPath}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.4"
                      strokeDasharray="3 3"
                      opacity={0.55}
                    />
                  )}

                  {/* Main Telemetry Lines */}
                  {chartData.d1Path && (
                    <path
                      d={chartData.d1Path}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {chartData.d2Path && (
                    <path
                      d={chartData.d2Path}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data points + hover targets */}
                  {chartData.visibleD1.map((entry) => {
                    const cx = chartData.toX(entry.lap);
                    const cy = chartData.toY(chartData.getVal(entry));
                    const isHover = hoveredLap === entry.lap;
                    return (
                      <g
                        key={`d1-${entry.lap}`}
                        onMouseEnter={() => setHoveredLap(entry.lap)}
                        onMouseLeave={() => setHoveredLap(null)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={entry.pitInLap || isHover ? 4.5 : 2.8}
                          fill={entry.pitInLap ? '#f59e0b' : '#34d399'}
                          stroke="#09090b"
                          strokeWidth="1.2"
                        />
                        <circle cx={cx} cy={cy} r={10} fill="transparent" />
                      </g>
                    );
                  })}

                  {chartData.visibleD2.map((entry) => {
                    const cx = chartData.toX(entry.lap);
                    const cy = chartData.toY(chartData.getVal(entry));
                    const isHover = hoveredLap === entry.lap;
                    return (
                      <g
                        key={`d2-${entry.lap}`}
                        onMouseEnter={() => setHoveredLap(entry.lap)}
                        onMouseLeave={() => setHoveredLap(null)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={entry.pitInLap || isHover ? 4.5 : 2.8}
                          fill={entry.pitInLap ? '#f59e0b' : '#38bdf8'}
                          stroke="#09090b"
                          strokeWidth="1.2"
                        />
                        <circle cx={cx} cy={cy} r={10} fill="transparent" />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* 2. TABEL TELEMETRI DETAIL PER-LAP (KHUSUS PEMBALAP TIM SENDIRI) */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
              <table className="w-full text-left border-collapse font-mono text-[11px] tabular-nums">
                <thead className="bg-zinc-900 sticky top-0 z-10 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3">LAP</th>
                    <th className="py-2 px-3">DRIVER</th>
                    <th className="py-2 px-3">POS / GAP</th>
                    <th className="py-2 px-3">LAP TIME</th>
                    <th className="py-2 px-3">SECTORS</th>
                    <th className="py-2 px-3">TYRE (AGE / HEALTH)</th>
                    <th className="py-2 px-3">E-FUEL</th>
                    <th className="py-2 px-3">ERS BATTERY</th>
                    <th className="py-2 px-3">PACE / FLAG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {combinedRows.map((row) => {
                    const spec = TYRE_SPECS[row.tyreCompound];
                    const isSessionBest =
                      fastestLapTime < Infinity &&
                      Math.abs(row.lapTime - fastestLapTime) < 0.002;
                    const isPersonalBest =
                      personalBestByDriver[row.driverId] !== undefined &&
                      Math.abs(row.lapTime - personalBestByDriver[row.driverId]) < 0.002;
                    const isD1 = driver1?.id === row.driverId;

                    return (
                      <tr
                        key={`${row.driverId}-${row.lap}`}
                        onMouseEnter={() => setHoveredLap(row.lap)}
                        onMouseLeave={() => setHoveredLap(null)}
                        className={`transition-colors ${
                          hoveredLap === row.lap
                            ? 'bg-zinc-800/60'
                            : row.pitInLap
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : 'hover:bg-zinc-900/80'
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>L{row.lap}</span>
                            {row.pitInLap && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px]">
                                <Wrench className="w-2.5 h-2.5" /> PIT
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isD1 ? 'bg-emerald-400' : 'bg-sky-400'
                              }`}
                            />
                            <span className="font-extrabold text-zinc-100">
                              {row.driverCode}
                            </span>
                            <span className="text-zinc-500 hidden sm:inline">
                              {row.driverName.split(' ').slice(-1)[0]}
                            </span>
                          </div>
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-bold text-white">P{row.position}</span>
                          <span className="text-zinc-500 ml-1.5">
                            {row.position === 1 ? 'LDR' : `+${row.gapToLeader.toFixed(2)}s`}
                          </span>
                        </td>

                        <td
                          className={`py-2 px-3 font-extrabold whitespace-nowrap ${
                            isSessionBest
                              ? 'text-purple-400'
                              : isPersonalBest
                              ? 'text-emerald-400'
                              : row.flagStatus !== 'GREEN'
                              ? 'text-amber-300'
                              : 'text-zinc-100'
                          }`}
                        >
                          {formatLapTime(row.lapTime)}
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {(row.sectorStatuses ?? ['NONE', 'NONE', 'NONE']).map((st, sIdx) => (
                              <span
                                key={sIdx}
                                className={`w-3 h-2 rounded-[2px] ${sectorColorClass(st)}`}
                                title={`S${sIdx + 1}: ${st}`}
                              />
                            ))}
                          </div>
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border shrink-0"
                              style={{
                                borderColor: spec.colorHex,
                                color: spec.colorHex,
                              }}
                            >
                              {spec.shortCode}
                            </span>
                            <span className="text-zinc-300">{row.tyreAge}L</span>
                            <span
                              className={`font-bold ${
                                row.tyreHealth < 30
                                  ? 'text-red-400'
                                  : row.tyreHealth < 60
                                  ? 'text-amber-300'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {row.tyreHealth.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              row.fuelLoad < 8 ? 'text-amber-300' : 'text-zinc-200'
                            }`}
                          >
                            {row.fuelLoad.toFixed(1)} kg
                          </span>
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="font-bold text-cyan-300">
                              {row.ersBattery.toFixed(0)}%
                            </span>
                            <span className="text-[9px] text-zinc-500">
                              ({row.ersMode === 'DEPLOY' ? 'OVR' : row.ersMode.slice(0, 3)})
                            </span>
                          </div>
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                row.paceMode === 'PUSH'
                                  ? 'bg-red-500/20 text-red-300'
                                  : row.paceMode === 'CONSERVE'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {row.paceMode}
                            </span>
                            {row.flagStatus !== 'GREEN' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                <Flag className="w-2.5 h-2.5" />
                                {row.flagStatus}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

