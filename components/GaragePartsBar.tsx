'use client';

import React, { useState } from 'react';
import { Wrench, AlertTriangle, Plus } from 'lucide-react';
import { CarPhysicalPartType, DriverState } from '../types/f1';
import { PART_MANUFACTURE_SPECS, useCareerStore } from '../store/useCareerStore';
import { computeTotalPartDamagePaceLoss, getDriverPartDamage } from '../store/useRaceStore';

interface GaragePartsBarProps {
  driver: DriverState;
  compact?: boolean;
  canFitInGarage?: boolean;
}

const PART_KEYS: CarPhysicalPartType[] = [
  'frontWing',
  'rearWing',
  'floor',
  'sidepods',
  'suspension',
  'chassis',
];

export const GaragePartsBar: React.FC<GaragePartsBarProps> = ({
  driver,
  compact = false,
  canFitInGarage = true,
}) => {
  const {
    sparePartsInventory,
    fitSparePartToDriverCar,
    fitAllDamagedPartsForDriver,
    manufactureSparePart,
  } = useCareerStore();

  const [notice, setNotice] = useState<{ success: boolean; message: string } | null>(null);

  const partDamage = getDriverPartDamage(driver);
  const totalPaceLoss = computeTotalPartDamagePaceLoss(partDamage);
  const damagedCount = PART_KEYS.filter((k) => (partDamage[k] ?? 0) > 0).length;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex flex-col gap-2 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
          <Wrench className="w-3 h-3 text-zinc-400" />
          <span>Car Parts &amp; Spares</span>
          {totalPaceLoss > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-bold">
              +{totalPaceLoss.toFixed(2)}s/lap
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {damagedCount > 0 && canFitInGarage && (
            <button
              type="button"
              onClick={() => setNotice(fitAllDamagedPartsForDriver(driver.id))}
              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
            >
              Repair All ({damagedCount})
            </button>
          )}
          {!canFitInGarage && damagedCount > 0 && (
            <span className="text-[9px] text-amber-300">
              In Race (Box/Red Flag to fit)
            </span>
          )}
        </div>
      </div>

      <div className={`grid gap-1.5 ${compact ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-6'}`}>
        {PART_KEYS.map((key) => {
          const spec = PART_MANUFACTURE_SPECS[key];
          const dmg = partDamage[key] ?? 0;
          const stock = sparePartsInventory[key] ?? 0;
          const isDamaged = dmg > 0;

          return (
            <div
              key={key}
              className={`rounded border p-1.5 flex flex-col justify-between gap-1 ${
                dmg >= 40
                  ? 'bg-red-950/35 border-red-500/50'
                  : dmg > 0
                  ? 'bg-amber-950/25 border-amber-500/40'
                  : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-zinc-200">{spec.shortCode}</span>
                <span
                  className={`font-bold ${
                    dmg >= 40
                      ? 'text-red-300'
                      : dmg > 0
                      ? 'text-amber-300'
                      : 'text-emerald-400'
                  }`}
                >
                  {dmg > 0 ? `-${dmg}%` : 'OK'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[9px] text-zinc-400">
                <span>Stk: {stock}</span>
                {!compact && (
                  <button
                    type="button"
                    title={`Manufacture +1 ${spec.label} ($${(spec.normalCost / 1_000_000).toFixed(2)}M)`}
                    onClick={() => setNotice(manufactureSparePart(key, false))}
                    className="p-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {isDamaged && canFitInGarage && (
                <button
                  type="button"
                  onClick={() => setNotice(fitSparePartToDriverCar(driver.id, key))}
                  className={`w-full py-0.5 px-1 rounded text-[9px] font-bold cursor-pointer ${
                    stock > 0
                      ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600/80 hover:bg-amber-500 text-zinc-950'
                  }`}
                >
                  {stock > 0
                    ? 'Fit Spare'
                    : `Emg $${(spec.emergencyCost / 1_000_000).toFixed(2)}M`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {notice && (
        <div
          className={`px-2 py-1 rounded border text-[10px] flex items-center justify-between gap-2 ${
            notice.success
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/60 border-red-500/40 text-red-200'
          }`}
        >
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {notice.message}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="underline text-[9px] cursor-pointer shrink-0"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
};
