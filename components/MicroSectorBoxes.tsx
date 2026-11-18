'use client';

import React from 'react';
import { SectorPerformance } from '../types/f1';

interface MicroSectorBoxesProps {
  statuses?: [SectorPerformance, SectorPerformance, SectorPerformance];
}

const getSectorColorClass = (status: SectorPerformance): string => {
  switch (status) {
    case 'PURPLE':
      return 'bg-purple-500';
    case 'GREEN':
      return 'bg-emerald-500';
    case 'YELLOW':
      return 'bg-amber-400';
    default:
      return 'bg-zinc-800/90 border border-zinc-700/50';
  }
};

const getSectorTitle = (idx: number, status: SectorPerformance): string => {
  const label = `S${idx + 1}`;
  if (status === 'PURPLE') return `${label}: Overall Fastest (Purple)`;
  if (status === 'GREEN') return `${label}: Personal Best (Green)`;
  if (status === 'YELLOW') return `${label}: Slower than PB (Yellow)`;
  return `${label}: No Sector Time`;
};

export const MicroSectorBoxes: React.FC<MicroSectorBoxesProps> = ({ statuses }) => {
  const safeStatuses: [SectorPerformance, SectorPerformance, SectorPerformance] = statuses ?? [
    'NONE',
    'NONE',
    'NONE',
  ];

  return (
    <div className="inline-flex items-center gap-0.5" aria-label="Sector Telemetry">
      {safeStatuses.map((status, idx) => (
        <span
          key={idx}
          title={getSectorTitle(idx, status)}
          className={`w-2.5 h-1.5 rounded-[1.5px] transition-colors duration-200 ${getSectorColorClass(
            status
          )}`}
        />
      ))}
    </div>
  );
};

