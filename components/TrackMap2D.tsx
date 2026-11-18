'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Compass, Sparkles } from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { DriverState } from '../types/f1';
import { getTrackGeometryById } from '../constants/trackPaths';

interface Point2D {
  x: number;
  y: number;
}

interface CornerLabelPoint {
  name: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
}

export const TrackMap2D: React.FC = () => {
  const {
    drivers,
    circuit,
    flagStatus,
    trackWetness,
    sessionPhase,
    practiceSession,
    qualifyingStage,
    qualifyingDriversState,
  } = useRaceStore();

  const trackGeo = getTrackGeometryById(circuit.id);

  const trackPathRef = useRef<SVGPathElement | null>(null);
  const pitPathRef = useRef<SVGPathElement | null>(null);

  const [pathLength, setPathLength] = useState<number>(0);
  const [pitPathLength, setPitPathLength] = useState<number>(0);
  const [pitLabelPoint, setPitLabelPoint] = useState<Point2D>({ x: 380, y: 348 });
  const [driverCoords, setDriverCoords] = useState<Record<string, Point2D>>({});
  const [sectorMarkers, setSectorMarkers] = useState<{
    startFinish: Point2D;
    s1End: Point2D;
    s2End: Point2D;
    s3Mid: Point2D;
  } | null>(null);
  const [cornerLabels, setCornerLabels] = useState<CornerLabelPoint[]>([]);

  const visibleDrivers: DriverState[] =
    sessionPhase === 'QUALIFYING'
      ? drivers.filter((d) => qualifyingDriversState[d.id]?.runPhase !== 'ELIMINATED')
      : drivers;

  // Hitung ulang geometri path, koordinat sektor (S1 Merah, S2 Biru, S3 Kuning), pit lane & tikungan ikonik saat sirkuit berganti
  useEffect(() => {
    const pathEl = trackPathRef.current;
    const pitEl = pitPathRef.current;
    if (!pathEl) return;

    const totalLen = pathEl.getTotalLength();
    setPathLength(totalLen);

    const getPt = (pct: number): Point2D => {
      const clamped = Math.max(0, Math.min(100, pct));
      const pt = pathEl.getPointAtLength((clamped / 100) * totalLen);
      return { x: pt.x, y: pt.y };
    };

    setSectorMarkers({
      startFinish: getPt(0),
      s1End: getPt(33.3),
      s2End: getPt(66.6),
      s3Mid: getPt(85),
    });

    const corners: CornerLabelPoint[] = trackGeo.iconicCorners.map((c) => {
      const pt = getPt(c.pct);
      return {
        name: c.name,
        x: pt.x,
        y: pt.y,
        labelX: pt.x + (c.dx ?? 0),
        labelY: pt.y + (c.dy ?? -14),
      };
    });
    setCornerLabels(corners);

    if (pitEl) {
      const pLen = pitEl.getTotalLength();
      setPitPathLength(pLen);
      if (pLen > 0) {
        const midPit = pitEl.getPointAtLength(pLen * 0.5);
        setPitLabelPoint({ x: midPit.x, y: midPit.y - 10 });
      }
    }
  }, [circuit.id, trackGeo]);

  // Hitung koordinat (x, y) seluruh mobil menggunakan SVGPathElement.getPointAtLength()
  useEffect(() => {
    const pathEl = trackPathRef.current;
    const pitEl = pitPathRef.current;
    if (!pathEl || pathLength <= 0) return;

    const activeList =
      sessionPhase === 'QUALIFYING'
        ? drivers.filter((d) => qualifyingDriversState[d.id]?.runPhase !== 'ELIMINATED')
        : drivers;

    const nextCoords: Record<string, Point2D> = {};
    let pitCarIdx = 0;

    activeList.forEach((driver) => {
      if (driver.isInPit) {
        if (pitEl && pitPathLength > 0) {
          const slotFraction = 0.18 + ((pitCarIdx % 10) / 9) * 0.64;
          const pt = pitEl.getPointAtLength(slotFraction * pitPathLength);
          nextCoords[driver.id] = { x: pt.x, y: pt.y };
        } else {
          const fallbackPt = pathEl.getPointAtLength(0);
          nextCoords[driver.id] = {
            x: fallbackPt.x + (pitCarIdx % 6) * 14,
            y: fallbackPt.y - 18,
          };
        }
        pitCarIdx += 1;
      } else {
        const clampedProgress = ((driver.trackProgress % 100) + 100) % 100;
        const distanceAlongPath = (clampedProgress / 100) * pathLength;
        const pt = pathEl.getPointAtLength(distanceAlongPath);
        nextCoords[driver.id] = { x: pt.x, y: pt.y };
      }
    });

    setDriverCoords(nextCoords);
  }, [drivers, pathLength, pitPathLength, circuit.id, sessionPhase, qualifyingDriversState]);

  // Urutkan render agar pembalap Player dan P1 selalu berada di layer SVG paling atas
  const sortedForRender: DriverState[] = [...visibleDrivers].sort((a, b) => {
    if (a.isPlayerControlled !== b.isPlayerControlled) {
      return a.isPlayerControlled ? 1 : -1;
    }
    return b.position - a.position;
  });

  const activeCarsOnTrackCount = visibleDrivers.filter((d) => !d.isInPit).length;
  const sessionStageLabel =
    sessionPhase === 'FREE_PRACTICE'
      ? `${practiceSession} LIVE GPS TELEMETRY`
      : sessionPhase === 'QUALIFYING'
      ? `${qualifyingStage} KNOCKOUT (${visibleDrivers.length} CARS)`
      : 'F1 TV GPS TRACK MAP';

  const trackRimColor =
    flagStatus === 'SC' || flagStatus === 'VSC'
      ? '#F59E0B'
      : flagStatus === 'YELLOW'
      ? '#EAB308'
      : trackWetness > 35
      ? '#38BDF8'
      : '#3F3F46';

  // Segmentasi panjang untuk highlight Sektor 1 (Merah), Sektor 2 (Biru), Sektor 3 (Kuning)
  const s1Len = pathLength > 0 ? pathLength * 0.333 : 0;
  const s2Len = pathLength > 0 ? pathLength * 0.333 : 0;
  const s3Len = pathLength > 0 ? pathLength * 0.334 : 0;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col shrink-0">
      {/* Header Peta Sirkuit F1 Broadcast */}
      <div className="px-4 py-2.5 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1 h-4 rounded-full bg-red-600 shrink-0" />
          <Navigation className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100 truncate">
            {sessionStageLabel}
          </h2>
          <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[10px] tabular-nums text-emerald-400 font-bold shrink-0">
            {activeCarsOnTrackCount} ON TRACK
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-[10px] font-mono text-zinc-400 shrink-0 tabular-nums">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 ring-1 ring-white/80" />
            <span className="hidden sm:inline">Player</span>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1 text-zinc-300 font-semibold">
            <Compass className="w-3 h-3 text-zinc-500" />
            <span>{circuit.lengthKm} km</span>
          </span>
        </div>
      </div>

      {/* Kanvas SVG Peta Sirkuit Unik (viewBox 0 0 800 500) */}
      <div className="relative bg-zinc-950 px-3 pt-2 pb-7 flex items-center justify-center">
        {/* Background Telemetry Dot Grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #52525b 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />

        <svg
          viewBox="0 0 800 500"
          className="w-full h-[250px] sm:h-[280px] select-none overflow-visible"
        >
          <defs>
            <filter id="playerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Jalur Pit Lane Khusus Tiap Sirkuit */}
          <path
            ref={pitPathRef}
            d={trackGeo.pitLanePath}
            fill="none"
            stroke="#3F3F46"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
          <text
            x={pitLabelPoint.x}
            y={pitLabelPoint.y}
            textAnchor="middle"
            className="fill-zinc-500 font-mono text-[9px] font-bold uppercase tracking-widest pointer-events-none"
          >
            PIT LANE
          </text>

          {/* Outer Track Curb / Shadow */}
          <path
            d={trackGeo.svgPath}
            fill="none"
            stroke="#18181B"
            strokeWidth={22}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Track Edge Status (Green/Yellow/SC/Wet) */}
          <path
            d={trackGeo.svgPath}
            fill="none"
            stroke={trackRimColor}
            strokeWidth={15}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-500"
          />

          {/* Main Asphalt Track Path (Digunakan untuk getPointAtLength) */}
          <path
            ref={trackPathRef}
            d={trackGeo.svgPath}
            fill="none"
            stroke="#27272A"
            strokeWidth={10.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Overlay Warna Sektor 1 (Merah), Sektor 2 (Biru), Sektor 3 (Kuning) di Lintasan */}
          {pathLength > 0 && (
            <g className="pointer-events-none" opacity={0.75}>
              <path
                d={trackGeo.svgPath}
                fill="none"
                stroke="#EF4444"
                strokeWidth={2.4}
                strokeDasharray={`${s1Len} ${pathLength}`}
                strokeDashoffset={0}
                strokeLinecap="round"
              />
              <path
                d={trackGeo.svgPath}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={2.4}
                strokeDasharray={`${s2Len} ${pathLength}`}
                strokeDashoffset={-s1Len}
                strokeLinecap="round"
              />
              <path
                d={trackGeo.svgPath}
                fill="none"
                stroke="#EAB308"
                strokeWidth={2.4}
                strokeDasharray={`${s3Len} ${pathLength}`}
                strokeDashoffset={-(s1Len + s2Len)}
                strokeLinecap="round"
              />
            </g>
          )}

          {/* Racing Centerline */}
          <path
            d={trackGeo.svgPath}
            fill="none"
            stroke="#71717A"
            strokeWidth={0.9}
            strokeDasharray="4 6"
            strokeOpacity={0.5}
          />

          {/* Label Tikungan Ikonik Tiap Sirkuit */}
          <g className="pointer-events-none">
            {cornerLabels.map((corner, i) => (
              <g key={`${circuit.id}-corner-${i}`}>
                <circle
                  cx={corner.x}
                  cy={corner.y}
                  r={2.5}
                  fill="#E4E4E7"
                  opacity={0.7}
                />
                <text
                  x={corner.labelX}
                  y={corner.labelY}
                  textAnchor="middle"
                  className="fill-zinc-400 font-mono text-[8.5px] font-semibold uppercase tracking-wide"
                  style={{
                    paintOrder: 'stroke',
                    stroke: '#09090B',
                    strokeWidth: '3px',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  }}
                >
                  {corner.name}
                </text>
              </g>
            ))}
          </g>

          {/* Indikator Garis Start/Finish & Titik Sektor S1 (Merah), S2 (Biru), S3 (Kuning) */}
          {sectorMarkers && (
            <g className="pointer-events-none">
              {/* Start/Finish Line */}
              <g
                transform={`translate(${sectorMarkers.startFinish.x}, ${sectorMarkers.startFinish.y})`}
              >
                <line x1={0} y1={-13} x2={0} y2={13} stroke="#FFFFFF" strokeWidth={3.5} />
                <line
                  x1={0}
                  y1={-13}
                  x2={0}
                  y2={13}
                  stroke="#EF4444"
                  strokeWidth={3.5}
                  strokeDasharray="3 3"
                />
                <rect
                  x={-26}
                  y={16}
                  width={52}
                  height={14}
                  rx={3}
                  fill="#09090B"
                  stroke="#52525B"
                  strokeWidth={0.9}
                />
                <text
                  x={0}
                  y={26}
                  textAnchor="middle"
                  className="fill-zinc-100 font-mono text-[8px] font-extrabold"
                >
                  S/F LINE
                </text>
              </g>

              {/* Sektor 1 Boundary (Merah) */}
              <g transform={`translate(${sectorMarkers.s1End.x}, ${sectorMarkers.s1End.y})`}>
                <circle r={4.5} fill="#EF4444" stroke="#09090B" strokeWidth={1.2} />
                <rect
                  x={7}
                  y={-9}
                  width={22}
                  height={14}
                  rx={3}
                  fill="#09090B"
                  stroke="#EF4444"
                  strokeWidth={0.9}
                />
                <text
                  x={18}
                  y={1}
                  textAnchor="middle"
                  className="fill-red-400 font-mono text-[8.5px] font-extrabold"
                >
                  S1
                </text>
              </g>

              {/* Sektor 2 Boundary (Biru) */}
              <g transform={`translate(${sectorMarkers.s2End.x}, ${sectorMarkers.s2End.y})`}>
                <circle r={4.5} fill="#3B82F6" stroke="#09090B" strokeWidth={1.2} />
                <rect
                  x={-11}
                  y={-22}
                  width={22}
                  height={14}
                  rx={3}
                  fill="#09090B"
                  stroke="#3B82F6"
                  strokeWidth={0.9}
                />
                <text
                  x={0}
                  y={-12}
                  textAnchor="middle"
                  className="fill-blue-400 font-mono text-[8.5px] font-extrabold"
                >
                  S2
                </text>
              </g>

              {/* Sektor 3 Zone (Kuning) */}
              <g transform={`translate(${sectorMarkers.s3Mid.x}, ${sectorMarkers.s3Mid.y})`}>
                <circle r={4.5} fill="#EAB308" stroke="#09090B" strokeWidth={1.2} />
                <rect
                  x={-11}
                  y={10}
                  width={22}
                  height={14}
                  rx={3}
                  fill="#09090B"
                  stroke="#EAB308"
                  strokeWidth={0.9}
                />
                <text
                  x={0}
                  y={20}
                  textAnchor="middle"
                  className="fill-yellow-400 font-mono text-[8.5px] font-extrabold"
                >
                  S3
                </text>
              </g>
            </g>
          )}

          {/* Watermark Identitas Sirkuit Aktif */}
          <g className="pointer-events-none">
            <text
              x={400}
              y={238}
              textAnchor="middle"
              className="fill-zinc-700/80 font-mono text-[13px] font-extrabold uppercase tracking-[0.25em]"
            >
              {circuit.officialName}
            </text>
            <text
              x={400}
              y={256}
              textAnchor="middle"
              className="fill-zinc-600/90 font-mono text-[9.5px] font-bold tracking-[0.2em] uppercase"
            >
              {trackGeo.tagline} • {circuit.totalLaps} LAPS
            </text>
          </g>

          {/* Render Titik Mobil Pembalap */}
          {sortedForRender.map((driver) => {
            const coord = driverCoords[driver.id];
            if (!coord) return null;

            const isPlayer = driver.isPlayerControlled;
            const isLeader = driver.position === 1;
            const isDNF = driver.status === 'DNF' || driver.status === 'RETIRED';

            return (
              <g
                key={driver.id}
                transform={`translate(${coord.x}, ${coord.y})`}
                className={`transition-transform duration-150 ease-linear ${
                  isDNF ? 'opacity-35' : ''
                }`}
              >
                {isPlayer && !isDNF && (
                  <>
                    <circle
                      r={13}
                      fill="none"
                      stroke={driver.teamColor}
                      strokeWidth={1.6}
                      strokeOpacity={0.65}
                      className="animate-ping"
                    />
                    <circle
                      r={10}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      filter="url(#playerGlow)"
                    />
                  </>
                )}

                {!isPlayer && isLeader && !isDNF && (
                  <circle
                    r={8.5}
                    fill="none"
                    stroke="#FACC15"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  r={isPlayer ? 6.8 : 5.2}
                  fill={isDNF ? '#7F1D1D' : driver.teamColor}
                  stroke={isPlayer ? '#FFFFFF' : '#09090B'}
                  strokeWidth={isPlayer ? 1.8 : 1.2}
                />

                <g transform={`translate(0, ${isPlayer ? -15 : -11.5})`}>
                  {isPlayer && (
                    <rect
                      x={-17}
                      y={-9}
                      width={34}
                      height={12}
                      rx={3}
                      fill="#DC2626"
                      stroke="#FFFFFF"
                      strokeWidth={0.8}
                    />
                  )}
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    className={`font-mono font-extrabold select-none ${
                      isPlayer ? 'fill-white text-[8.5px]' : 'fill-zinc-200 text-[7.5px]'
                    }`}
                    style={
                      !isPlayer
                        ? {
                            paintOrder: 'stroke',
                            stroke: '#09090B',
                            strokeWidth: '2.8px',
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                          }
                        : undefined
                    }
                  >
                    {driver.code}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Footer Overlay Legenda Sektor (S1 Merah, S2 Biru, S3 Kuning) & DRS */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none text-[10px] font-mono text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 rounded-sm bg-red-500" />
              <span className="text-red-400 font-bold">S1</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 rounded-sm bg-blue-500" />
              <span className="text-blue-400 font-bold">S2</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 rounded-sm bg-yellow-500" />
              <span className="text-yellow-400 font-bold">S3</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400/85 font-bold">
            <Sparkles className="w-3 h-3" />
            <span>ACTIVE AERO & OVERRIDE ZONES</span>
          </div>
        </div>
      </div>
    </section>
  );
};
