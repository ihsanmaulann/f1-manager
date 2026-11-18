'use client';

import React from 'react';
import {
  Trophy,
  DollarSign,
  CheckCircle2,
  XCircle,
  Timer,
  Wrench,
  Save,
  ChevronRight,
  Award,
  Briefcase,
} from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import {
  useCareerStore,
  F1_POINTS_SYSTEM,
  SPONSOR_OFFERS,
  calculatePlayerRepairCost,
} from '../store/useCareerStore';

interface PostRaceSummaryModalProps {
  onContinueToHQ: () => void;
}

const formatLapTime = (seconds: number): string => {
  if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
};

const formatCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
};

export const PostRaceSummaryModal: React.FC<PostRaceSummaryModalProps> = ({
  onContinueToHQ,
}) => {
  const { raceStatus, drivers, circuit, fastestLapDriverId } = useRaceStore();
  const {
    budget,
    currentRoundIndex,
    seasonCalendar,
    selectedSponsorId,
    driverMarket,
    isOffSeasonModalOpen,
    finishRaceAndClaimPrize,
    advanceToNextSeason,
  } = useCareerStore();

  // Modal ini otomatis muncul hanya ketika raceStatus === 'FINISHED' dan Off-Season modal belum terbuka
  if (raceStatus !== 'FINISHED' || isOffSeasonModalOpen) return null;

  const isFinalRaceOfSeason = currentRoundIndex + 1 >= seasonCalendar.length;

  const finalDrivers = [...drivers].sort((a, b) => a.position - b.position);
  const podiumDrivers = finalDrivers.slice(0, 3);

  // 1. Hitung poin FIA 2026 yang diperoleh masing-masing pembalap (Top 10, tanpa bonus poin Fastest Lap)
  const pointsMap: Record<string, number> = {};
  finalDrivers.forEach((driver, idx) => {
    if (driver.status !== 'RUNNING') {
      pointsMap[driver.id] = 0;
      return;
    }
    const pts = idx < F1_POINTS_SYSTEM.length ? F1_POINTS_SYSTEM[idx] : 0;
    pointsMap[driver.id] = pts;
  });

  // 2. Kalkulasi Rincian Finansial Tim Player
  const playerDrivers = finalDrivers
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.number - b.number);

  const playerPointsEarned = playerDrivers.reduce(
    (sum, d) => sum + (pointsMap[d.id] ?? 0),
    0
  );

  let podiumBonus = 0;
  for (const pd of playerDrivers) {
    if (pd.status !== 'RUNNING') continue;
    if (pd.position === 1) podiumBonus += 2_500_000;
    else if (pd.position === 2) podiumBonus += 1_500_000;
    else if (pd.position === 3) podiumBonus += 1_000_000;
  }

  const fiaPrizeMoney = 2_000_000 + playerPointsEarned * 280_000 + podiumBonus;

  const activeSponsor =
    SPONSOR_OFFERS.find((s) => s.id === selectedSponsorId) ?? SPONSOR_OFFERS[1];

  let sponsorObjectiveMet = false;
  if (activeSponsor.tier === 'CONSERVATIVE') {
    sponsorObjectiveMet = playerDrivers.some((d) => d.status === 'RUNNING');
  } else if (activeSponsor.tier === 'BALANCED') {
    sponsorObjectiveMet = playerDrivers.some(
      (d) => d.status === 'RUNNING' && d.position <= 10
    );
  } else if (activeSponsor.tier === 'HIGH_RISK') {
    const hasPodium = playerDrivers.some(
      (d) => d.status === 'RUNNING' && d.position <= 3
    );
    const hasFastestLap = playerDrivers.some((d) => d.id === fastestLapDriverId);
    sponsorObjectiveMet = hasPodium || hasFastestLap;
  }

  const sponsorUpfront = activeSponsor.upfrontPayout;
  const sponsorBonus = sponsorObjectiveMet ? activeSponsor.objectiveBonus : 0;

  const playerMarketEntries = driverMarket.filter((m) => m.isPlayerControlled);
  const salariesPaid = playerMarketEntries.reduce((sum, m) => sum + m.salaryPerRace, 0);
  const repairCostPaid = calculatePlayerRepairCost(playerDrivers);

  const netIncome =
    fiaPrizeMoney + sponsorUpfront + sponsorBonus - salariesPaid - repairCostPaid;
  const projectedBudget = Math.max(0, budget + netIncome);

  const handleSaveAndContinue = () => {
    finishRaceAndClaimPrize();
    if (isFinalRaceOfSeason) {
      advanceToNextSeason();
    } else {
      onContinueToHQ();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[93vh] flex flex-col overflow-hidden">
        {/* HEADER MODAL */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-amber-400 text-zinc-950 font-extrabold">
                  CHECKERED FLAG • ROUND {currentRoundIndex + 1} / {seasonCalendar.length}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {circuit.officialName} ({circuit.totalLaps} Laps)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-0.5">
                Official FIA Post-Race Classification & Financial Report
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveAndContinue}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              isFinalRaceOfSeason
                ? 'bg-gradient-to-r from-amber-400 to-red-600 hover:from-amber-300 hover:to-red-500 text-zinc-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>
              {isFinalRaceOfSeason
                ? 'ENTER OFF-SEASON (END SEASON)'
                : 'Save & Continue to Next Race'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. PODIUM CELEBRATION (P1, P2, P3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {podiumDrivers.map((driver, idx) => {
              const medalStyles =
                idx === 0
                  ? {
                      badge: 'bg-amber-400 text-zinc-950',
                      border: 'border-amber-400/60 bg-amber-500/10',
                      title: '1ST • RACE WINNER',
                    }
                  : idx === 1
                  ? {
                      badge: 'bg-zinc-300 text-zinc-950',
                      border: 'border-zinc-400/40 bg-zinc-800/40',
                      title: '2ND • RUNNER-UP',
                    }
                  : {
                      badge: 'bg-amber-700 text-white',
                      border: 'border-amber-700/50 bg-amber-950/20',
                      title: '3RD • PODIUM FINISH',
                    };

              return (
                <div
                  key={driver.id}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${medalStyles.border}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: driver.teamColor }}
                    />
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase ${medalStyles.badge}`}
                      >
                        {medalStyles.title}
                      </span>
                      <h3 className="text-base font-extrabold text-white mt-1">
                        {driver.name}{' '}
                        <span className="font-mono text-xs text-zinc-400">
                          (#{driver.number} {driver.code})
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-400">{driver.teamName}</p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-base font-extrabold text-amber-300">
                      +{pointsMap[driver.id] ?? 0} PTS
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {idx === 0 ? 'WINNER' : `+${driver.gapToLeader.toFixed(3)}s`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. GRID UTAMA: TABEL KLASIFIKASI 20 PEMBALAP (KIRI) & RINCIAN FINANSIAL (KANAN) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tabel Hasil Akhir 20 Pembalap (7 Kolom) */}
            <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Final Race Classification ({finalDrivers.length} Drivers)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  2026 FIA POINTS (TOP 10 • NO FL BONUS PT)
                </span>
              </div>

              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-[10px] uppercase text-zinc-400">
                      <th className="py-2 pl-3 pr-2 w-10 text-center">Pos</th>
                      <th className="py-2 px-2">Driver</th>
                      <th className="py-2 px-2">Team</th>
                      <th className="py-2 px-2 text-right">Time / Gap</th>
                      <th className="py-2 px-2 text-right">Best Lap</th>
                      <th className="py-2 px-2 text-center">Stops</th>
                      <th className="py-2 pl-2 pr-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {finalDrivers.map((d) => {
                      const isPlayer = d.isPlayerControlled;
                      const isDNF = d.status === 'DNF';
                      const isFastest = d.id === fastestLapDriverId;
                      const pts = pointsMap[d.id] ?? 0;

                      return (
                        <tr
                          key={d.id}
                          className={
                            isDNF
                              ? 'bg-zinc-950/80 opacity-55'
                              : isPlayer
                              ? 'bg-red-950/30 hover:bg-red-950/45'
                              : 'hover:bg-zinc-800/40'
                          }
                        >
                          <td className="py-2 pl-3 pr-2 font-mono font-bold text-center">
                            {isDNF ? (
                              <span className="px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 text-[10px]">
                                DNF
                              </span>
                            ) : (
                              <span className="text-zinc-200">{d.position}</span>
                            )}
                          </td>

                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-1 h-4 rounded-full shrink-0"
                                style={{ backgroundColor: d.teamColor }}
                              />
                              <span className="font-mono font-bold text-white">{d.code}</span>
                              <span className="text-zinc-300 truncate max-w-[110px]">
                                {d.name}
                              </span>
                              {isPlayer && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-red-600/30 text-red-300 border border-red-500/40">
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2 px-2 text-zinc-400 text-[11px] truncate max-w-[120px]">
                            {d.teamName}
                          </td>

                          <td className="py-2 px-2 text-right font-mono text-zinc-300">
                            {isDNF
                              ? 'RETIRED'
                              : d.position === 1
                              ? 'WINNER'
                              : `+${d.gapToLeader.toFixed(3)}s`}
                          </td>

                          <td className="py-2 px-2 text-right font-mono">
                            <span
                              className={
                                isFastest
                                  ? 'px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                                  : 'text-zinc-400'
                              }
                            >
                              {formatLapTime(d.bestLapTime)}
                            </span>
                          </td>

                          <td className="py-2 px-2 text-center font-mono text-zinc-400">
                            {d.pitStopsCount}
                          </td>

                          <td className="py-2 pl-2 pr-4 text-right font-mono font-extrabold">
                            {pts > 0 ? (
                              <span className="text-amber-300">
                                +{pts}
                                {isFastest && d.position <= 10 && !isDNF ? ' (FL)' : ''}
                              </span>
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
            </div>

            {/* Rincian Finansial & Evaluasi Sponsor (5 Kolom) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4 flex-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Team Financial Statement
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400">
                      AUTO-SAVED TO LOCALSTORAGE
                    </span>
                  </div>

                  {/* Baris-baris Pemasukan & Pengeluaran */}
                  <div className="space-y-2.5 font-mono text-xs">
                    {/* 1. Hadiah Posisi Finis FIA */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800">
                      <div>
                        <div className="text-zinc-200 font-bold">FIA Race Prize Money</div>
                        <div className="text-[10px] text-zinc-500">
                          Base + {playerPointsEarned} Team Points + Podium Bonus
                        </div>
                      </div>
                      <span className="text-emerald-400 font-extrabold text-sm">
                        +{formatCurrency(fiaPrizeMoney)}
                      </span>
                    </div>

                    {/* 2. Sponsor Upfront */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800">
                      <div>
                        <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                          <span>{activeSponsor.name} (Upfront)</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Guaranteed Race Appearance Fee
                        </div>
                      </div>
                      <span className="text-emerald-400 font-bold">
                        +{formatCurrency(sponsorUpfront)}
                      </span>
                    </div>

                    {/* 3. Sponsor Target Bonus */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800">
                      <div>
                        <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                          {sponsorObjectiveMet ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                          )}
                          <span>Sponsor Target Bonus</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {activeSponsor.objectiveDescription}
                        </div>
                      </div>
                      <span
                        className={`font-bold ${
                          sponsorObjectiveMet ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      >
                        {sponsorObjectiveMet
                          ? `+${formatCurrency(sponsorBonus)}`
                          : '$0.00M'}
                      </span>
                    </div>

                    {/* 4. Gaji Pembalap */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800">
                      <div>
                        <div className="text-zinc-300 font-bold">Driver Contract Salaries</div>
                        <div className="text-[10px] text-zinc-500">
                          {playerMarketEntries.map((m) => m.code).join(' & ')} Race Fee
                        </div>
                      </div>
                      <span className="text-red-400 font-bold">
                        -{formatCurrency(salariesPaid)}
                      </span>
                    </div>

                    {/* 5. Biaya Perbaikan Kerusakan Mobil (Wing Damage / DNF) */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800">
                      <div>
                        <div className="text-zinc-300 font-bold flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-orange-400" />
                          <span>Car & Front Wing Repair Costs</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {playerDrivers[0]?.code} ({playerDrivers[0]?.wingDamage}% dmg) &{' '}
                          {playerDrivers[1]?.code} ({playerDrivers[1]?.wingDamage}% dmg)
                        </div>
                      </div>
                      <span
                        className={`font-bold ${
                          repairCostPaid > 0 ? 'text-red-400' : 'text-zinc-400'
                        }`}
                      >
                        {repairCostPaid > 0 ? `-${formatCurrency(repairCostPaid)}` : '$0.00M'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Net Balance & Projected Budget */}
                <div className="pt-3 border-t border-zinc-800 space-y-2 font-mono">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 uppercase">Net Weekend Profit:</span>
                    <span
                      className={`text-base font-extrabold ${
                        netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {netIncome >= 0 ? `+${formatCurrency(netIncome)}` : formatCurrency(netIncome)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-zinc-950 border border-emerald-500/30 rounded-lg px-3 py-2">
                    <span className="text-zinc-300">Projected New HQ Budget:</span>
                    <span className="text-emerald-400 font-extrabold text-sm">
                      {formatCurrency(projectedBudget)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveAndContinue}
                className={`w-full py-3.5 px-5 rounded-xl font-mono text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                  isFinalRaceOfSeason
                    ? 'bg-gradient-to-r from-amber-400 to-red-600 hover:from-amber-300 hover:to-red-500 text-zinc-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {isFinalRaceOfSeason
                    ? 'ENTER OFF-SEASON (END SEASON)'
                    : 'Save & Continue to Next Race (Open Team HQ)'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

