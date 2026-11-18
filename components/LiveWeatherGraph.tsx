'use client';

import React, { useMemo, useState } from 'react';
import {
  CloudRain,
  CloudLightning,
  Sun,
  Droplets,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { getTrackConditionBadge } from '../constants/f1Data';
import { WeatherType } from '../types/f1';

interface RadarDataPoint {
  lap: number;
  wetness: number;
  weather: WeatherType;
  rainProbability: number;
  isCurrentLap: boolean;
}

export const LiveWeatherGraph: React.FC = () => {
  const {
    currentLap,
    totalLaps,
    weather,
    trackWetness,
    weatherTimeline,
    radarAccuracyPercent,
  } = useRaceStore();

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Bangun 16 titik data: dari currentLap hingga currentLap + 15 (dibatasi totalLaps)
  const points: RadarDataPoint[] = useMemo(() => {
    const startLap = Math.max(1, currentLap);
    const maxHorizonLap = Math.min(totalLaps, startLap + 15);
    const result: RadarDataPoint[] = [];

    let simulatedWetness = trackWetness;

    for (let lapNum = startLap; lapNum <= maxHorizonLap; lapNum++) {
      const entry = weatherTimeline.find((w) => w.lap === lapNum);
      if (lapNum === startLap) {
        result.push({
          lap: lapNum,
          wetness: Number(trackWetness.toFixed(1)),
          weather: weather,
          rainProbability: entry?.rainProbability ?? (weather === 'DRY' ? 5 : 80),
          isCurrentLap: true,
        });
      } else {
        const lapWeather = entry?.weather ?? weather;
        // Gunakan projectedWetness dari timeline namun diselaraskan secara halus dari live trackWetness saat ini
        if (entry?.projectedWetness !== undefined) {
          const delta = entry.projectedWetness - simulatedWetness;
          const clampedStep =
            delta > 0 ? Math.min(1.5, delta) : Math.max(-1.0, delta);
          simulatedWetness = Math.max(
            0,
            Math.min(100, Number((simulatedWetness + clampedStep).toFixed(1)))
          );
        } else {
          const step =
            lapWeather === 'HEAVY_RAIN'
              ? 1.5
              : lapWeather === 'LIGHT_RAIN'
              ? 1.1
              : -1.0;
          simulatedWetness = Math.max(
            0,
            Math.min(100, Number((simulatedWetness + step).toFixed(1)))
          );
        }

        result.push({
          lap: lapNum,
          wetness: simulatedWetness,
          weather: lapWeather,
          rainProbability: entry?.rainProbability ?? 0,
          isCurrentLap: false,
        });
      }
    }

    // Jika sisa balapan kurang dari 2 titik (misal lap terakhir), pastikan minimal ada 2 titik untuk garis SVG
    if (result.length === 1) {
      result.push({
        ...result[0],
        lap: result[0].lap,
        isCurrentLap: false,
      });
    }

    return result;
  }, [currentLap, totalLaps, trackWetness, weather, weatherTimeline]);

  // Deteksi lap pertama di mana grafik menembus INTER CROSSOVER (20%) atau WET CROSSOVER (55%) atau mengering di bawah 20%
  const crossoverAlert = useMemo(() => {
    if (points.length < 2) return null;
    const nowWet = points[0].wetness;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1].wetness;
      const curr = points[i].wetness;
      const lap = points[i].lap;

      if (nowWet < 55 && prev < 55 && curr >= 55) {
        return {
          type: 'WET_CROSSOVER',
          text: `WET CROSSOVER (55%) AT LAP ${lap} — BOX FOR FULL WETS`,
          className: 'bg-blue-500/20 text-blue-200 border-blue-400/60',
        };
      }
      if (nowWet < 20 && prev < 20 && curr >= 20) {
        return {
          type: 'INTER_CROSSOVER',
          text: `INTER CROSSOVER (20%) AT LAP ${lap} — PREPARE INTERMEDIATES`,
          className: 'bg-sky-500/20 text-sky-200 border-sky-400/60',
        };
      }
      if (nowWet >= 20 && prev >= 20 && curr < 20) {
        return {
          type: 'DRY_CROSSOVER',
          text: `SLICK CROSSOVER (<20%) AT LAP ${lap} — TRACK DRYING FOR SLICKS`,
          className: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60',
        };
      }
    }
    return null;
  }, [points]);

  // Dimensi koordinat internal SVG
  const svgWidth = 560;
  const svgHeight = 165;
  const padLeft = 36;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 24;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getX = (idx: number): number => {
    if (points.length <= 1) return padLeft;
    return Number((padLeft + (idx / (points.length - 1)) * chartW).toFixed(1));
  };

  const getY = (wetnessPercent: number): number => {
    const clamped = Math.max(0, Math.min(100, wetnessPercent));
    return Number((padTop + chartH - (clamped / 100) * chartH).toFixed(1));
  };

  const yInter20 = getY(20);
  const yWet55 = getY(55);
  const yZero = getY(0);

  const linePath = useMemo(() => {
    return points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(pt.wetness)}`)
      .join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(points.length - 1);
    return `${linePath} L ${lastX} ${yZero} L ${firstX} ${yZero} Z`;
  }, [linePath, points.length, yZero]);

  const activePoint =
    hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : points[0];
  const conditionBadge = getTrackConditionBadge(trackWetness);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex flex-col gap-2.5">
      {/* Header Live Weather Radar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
          <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-white">
            Live Weather Radar Graph (+15 Laps Horizon)
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
            Acc: {radarAccuracyPercent}%
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-sky-300 font-bold">
            <Droplets className="w-3 h-3 text-sky-400" />
            Wetness: {trackWetness.toFixed(1)}%
          </span>
          <span
            className={`px-2 py-0.5 rounded border font-bold ${conditionBadge.badgeClass}`}
          >
            {conditionBadge.shortLabel}
          </span>
        </div>
      </div>

      {/* Alert Crossover Otomatis jika grafik menembus batas 20% atau 55% */}
      {crossoverAlert && (
        <div
          className={`px-3 py-1.5 rounded-xl border font-mono text-[11px] font-bold flex items-center gap-2 ${crossoverAlert.className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{crossoverAlert.text}</span>
        </div>
      )}

      {/* SVG Area Chart Interaktif */}
      <div className="relative bg-zinc-950 border border-zinc-800/90 rounded-xl p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-40 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="liveWetnessAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#0284c7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Zona Latar Belakang: Monsoon (>55%), Inter (20-55%), Slick (<20%) */}
          <rect
            x={padLeft}
            y={padTop}
            width={chartW}
            height={yWet55 - padTop}
            fill="#1e3a8a"
            fillOpacity="0.16"
          />
          <rect
            x={padLeft}
            y={yWet55}
            width={chartW}
            height={yInter20 - yWet55}
            fill="#0284c7"
            fillOpacity="0.10"
          />

          {/* Sumbu Y Grid (0%, 20%, 55%, 100%) */}
          {[0, 20, 55, 100].map((val) => {
            const yPos = getY(val);
            return (
              <g key={val}>
                <text
                  x={padLeft - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  className="fill-zinc-500 font-mono text-[9px]"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Garis Dasar 0% */}
          <line
            x1={padLeft}
            y1={yZero}
            x2={svgWidth - padRight}
            y2={yZero}
            stroke="#27272a"
            strokeWidth="1"
          />

          {/* GARIS PUTUS-PUTUS 1: INTER CROSSOVER (20%) */}
          <line
            x1={padLeft}
            y1={yInter20}
            x2={svgWidth - padRight}
            y2={yInter20}
            stroke="#10b981"
            strokeWidth="1.25"
            strokeDasharray="5 4"
          />
          <text
            x={svgWidth - padRight - 4}
            y={yInter20 - 4}
            textAnchor="end"
            className="fill-emerald-400 font-mono text-[8.5px] font-bold"
          >
            INTER CROSSOVER (20%)
          </text>

          {/* GARIS PUTUS-PUTUS 2: WET CROSSOVER (55%) */}
          <line
            x1={padLeft}
            y1={yWet55}
            x2={svgWidth - padRight}
            y2={yWet55}
            stroke="#60a5fa"
            strokeWidth="1.25"
            strokeDasharray="5 4"
          />
          <text
            x={svgWidth - padRight - 4}
            y={yWet55 - 4}
            textAnchor="end"
            className="fill-blue-400 font-mono text-[8.5px] font-bold"
          >
            WET CROSSOVER (55%)
          </text>

          {/* Area di bawah kurva */}
          <path d={areaPath} fill="url(#liveWetnessAreaGrad)" />

          {/* Garis Kurva Biru Track Wetness */}
          <path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Titik-titik Data & Label Lap di Sumbu X */}
          {points.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.wetness);
            const isHovered = hoveredIdx === idx;
            const showLapLabel =
              idx === 0 ||
              idx === points.length - 1 ||
              idx % 3 === 0;

            const dotFill =
              pt.wetness >= 55
                ? '#3b82f6'
                : pt.wetness >= 20
                ? '#38bdf8'
                : '#10b981';

            return (
              <g
                key={pt.lap}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Area sentuh transparan agar mudah di-hover */}
                <rect
                  x={cx - 12}
                  y={padTop}
                  width={24}
                  height={chartH}
                  fill="transparent"
                />

                {isHovered && (
                  <line
                    x1={cx}
                    y1={padTop}
                    x2={cx}
                    y2={yZero}
                    stroke="#71717a"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r={pt.isCurrentLap || isHovered ? 4.5 : 2.8}
                  fill={dotFill}
                  stroke="#09090b"
                  strokeWidth="1.5"
                />

                {showLapLabel && (
                  <text
                    x={cx}
                    y={svgHeight - 6}
                    textAnchor="middle"
                    className={`font-mono text-[9px] ${
                      pt.isCurrentLap
                        ? 'fill-amber-300 font-extrabold'
                        : 'fill-zinc-400'
                    }`}
                  >
                    {pt.isCurrentLap ? `L${pt.lap} (NOW)` : `L${pt.lap}`}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Bar Info Titik Lap yang Sedang Di-inspeksi / Hover */}
        {activePoint && (
          <div className="mt-1 pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] px-1">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">
                {activePoint.isCurrentLap
                  ? `CURRENT LAP ${activePoint.lap}:`
                  : `FORECAST LAP ${activePoint.lap} (+${
                      activePoint.lap - currentLap
                    } Laps):`}
              </span>
              <span className="font-bold text-white flex items-center gap-1">
                {activePoint.weather === 'HEAVY_RAIN' ? (
                  <CloudLightning className="w-3.5 h-3.5 text-blue-400" />
                ) : activePoint.weather === 'LIGHT_RAIN' ? (
                  <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
                {activePoint.weather}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sky-300 font-bold">
                Track Water: {activePoint.wetness.toFixed(1)}%
              </span>
              <span className="text-zinc-400">
                Optimal Tyre:{' '}
                <strong
                  className={
                    activePoint.wetness >= 55
                      ? 'text-blue-400'
                      : activePoint.wetness >= 20
                      ? 'text-sky-400'
                      : 'text-emerald-400'
                  }
                >
                  {activePoint.wetness >= 55
                    ? 'FULL WET'
                    : activePoint.wetness >= 20
                    ? 'INTERMEDIATE'
                    : 'SLICK (S/M/H)'}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

