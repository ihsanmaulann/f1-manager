'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Newspaper,
  Gauge,
  TrendingUp,
  TrendingDown,
  Award,
  DollarSign,
  ArrowRight,
  Sparkles,
  UserMinus,
  UserPlus,
  Rocket,
  ShieldCheck,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import { useCareerStore } from '../store/useCareerStore';

const formatCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
};

export const OffSeasonModal: React.FC = () => {
  const {
    teamName,
    teamColor,
    budget,
    offSeasonReport,
    isOffSeasonModalOpen,
    startNewSeasonAfterOffSeason,
  } = useCareerStore();

  const [activeSection, setActiveSection] = useState<
    'ALL' | 'HONOURS' | 'SILLY_SEASON' | 'POWER_RANKINGS'
  >('ALL');

  if (!isOffSeasonModalOpen || !offSeasonReport) return null;

  const {
    completedSeason,
    nextSeason,
    wdcChampion,
    wccChampion,
    playerWccPosition,
    playerWccPoints,
    constructorPrizeMoneyEarned,
    transferNews,
    driverProgressions,
    powerRankings,
  } = offSeasonReport;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-950/70 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded bg-red-600 text-white font-extrabold">
                  FIA OFF-SEASON GALA & WINTER TESTING
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  SEASON {completedSeason} → SEASON {nextSeason}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
                {completedSeason} World Championship Honours, Silly Season & {nextSeason} Power Rankings
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewSeasonAfterOffSeason}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition cursor-pointer"
          >
            <Flag className="w-4 h-4" />
            <span>START NEW SEASON (YEAR {nextSeason})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* FILTER PILLS */}
        <div className="px-6 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Full Off-Season Report' },
              { id: 'HONOURS', label: '1. Champion Honours & Prize' },
              {
                id: 'SILLY_SEASON',
                label: `2. Silly Season Transfers (${transferNews.length})`,
              },
              { id: 'POWER_RANKINGS', label: '3. Pre-Season Power Rankings' },
            ].map((tab) => {
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveSection(
                      tab.id as 'ALL' | 'HONOURS' | 'SILLY_SEASON' | 'POWER_RANKINGS'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase transition cursor-pointer ${
                    active
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-zinc-400">New Season Team Budget:</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-extrabold">
              {formatCurrency(budget)}
            </span>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* SECTION 1: CHAMPION HONOURS & END-OF-SEASON PRIZE FUND */}
          {(activeSection === 'ALL' || activeSection === 'HONOURS') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono font-extrabold uppercase tracking-widest text-amber-400">
                  1. {completedSeason} FIA World Championship Honours & Prize Distribution
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* WDC Champion Card */}
                <div className="bg-gradient-to-br from-amber-500/15 via-zinc-900 to-zinc-950 border border-amber-500/40 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-zinc-950 font-mono text-[10px] font-extrabold uppercase">
                      {completedSeason} WDC WORLD CHAMPION
                    </span>
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-1.5 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: wdcChampion.teamColor }}
                    />
                    <div>
                      <div className="text-lg font-extrabold text-white">
                        {wdcChampion.name}{' '}
                        <span className="font-mono text-xs text-amber-300">
                          ({wdcChampion.code})
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400">{wdcChampion.teamName}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 font-mono text-xs">
                    <span className="text-zinc-400">Season Total:</span>
                    <span className="text-amber-300 font-bold">
                      {wdcChampion.points} PTS • {wdcChampion.wins} WINS
                    </span>
                  </div>
                </div>

                {/* WCC Champion Card */}
                <div className="bg-gradient-to-br from-sky-500/15 via-zinc-900 to-zinc-950 border border-sky-500/40 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-sky-400 text-zinc-950 font-mono text-[10px] font-extrabold uppercase">
                      {completedSeason} CONSTRUCTORS&apos; CHAMPION
                    </span>
                    <Award className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-1.5 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: wccChampion.colorHex }}
                    />
                    <div>
                      <div className="text-lg font-extrabold text-white">
                        {wccChampion.teamName}
                      </div>
                      <div className="text-xs text-zinc-400">
                        World Constructors&apos; Trophy Winner
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 font-mono text-xs">
                    <span className="text-zinc-400">Constructor Score:</span>
                    <span className="text-sky-300 font-bold">
                      {wccChampion.points} PTS • {wccChampion.wins} WINS
                    </span>
                  </div>
                </div>

                {/* Player Constructor Prize Payout Card */}
                <div className="bg-gradient-to-br from-emerald-500/15 via-zinc-900 to-zinc-950 border border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-400 text-zinc-950 font-mono text-[10px] font-extrabold uppercase">
                      YOUR WCC FINISH: P{playerWccPosition}
                    </span>
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-1.5 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: teamColor }}
                    />
                    <div>
                      <div className="text-base font-extrabold text-white">{teamName}</div>
                      <div className="text-xs font-mono text-emerald-300 mt-0.5">
                        +{formatCurrency(constructorPrizeMoneyEarned)} FIA WCC Prize Bonus
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800 font-mono text-xs">
                    <span className="text-zinc-400">Final Points: {playerWccPoints} PTS</span>
                    <span className="text-emerald-400 font-bold">CREDITED TO HQ</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: SILLY SEASON TRANSFER NEWS & DRIVER AGING */}
          {(activeSection === 'ALL' || activeSection === 'SILLY_SEASON') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Transfer Headlines (Left 7 Cols) */}
              <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-white">
                      2. Silly Season Transfer News & F1 Grid Shakeup
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded">
                    {transferNews.length} BREAKING HEADLINES
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {transferNews.map((item) => {
                    const badgeStyle =
                      item.type === 'RETIREMENT'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : item.type === 'BLOCKBUSTER_POACH'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : item.type === 'ROOKIE_PROMOTION'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40';

                    const badgeIcon =
                      item.type === 'RETIREMENT' ? (
                        <UserMinus className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      ) : item.type === 'BLOCKBUSTER_POACH' ? (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      );

                    return (
                      <div
                        key={item.id}
                        className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-3 flex items-start gap-3"
                      >
                        <div
                          className="w-1.5 h-12 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: item.teamColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-[9px] font-extrabold uppercase ${badgeStyle}`}
                            >
                              {badgeIcon}
                              <span>{item.type.replace('_', ' ')}</span>
                            </span>
                            <span className="font-mono text-[11px] text-zinc-400">
                              {item.fromTeam} →{' '}
                              <strong className="text-white">{item.toTeam}</strong>
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-white mt-1">
                            {item.headline}
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5">{item.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Driver Aging & Skill Progression (Right 5 Cols) */}
              <div className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-white">
                      Driver Aging & Skill Progression (Age +1)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    U24 SURGE / 36+ DECLINE
                  </span>
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {driverProgressions.slice(0, 16).map((prog) => {
                    const isPositive = prog.deltaPace > 0;
                    const isNegative = prog.deltaPace < 0;

                    return (
                      <div
                        key={prog.driverId}
                        className="bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-1 h-5 rounded-full shrink-0"
                            style={{ backgroundColor: prog.teamColor }}
                          />
                          <span className="font-bold text-white">{prog.code}</span>
                          <span className="text-zinc-300 truncate">{prog.name}</span>
                          <span className="text-[10px] text-zinc-500">({prog.age} yo)</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {prog.status === 'RETIRED' ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-extrabold">
                              RETIRED
                            </span>
                          ) : (
                            <>
                              <span className="text-zinc-400 text-[11px]">
                                Pace {prog.oldPace} →{' '}
                                <strong className="text-white">{prog.newPace}</strong>
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                  isPositive
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : isNegative
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {isPositive ? `+${prog.deltaPace}` : prog.deltaPace}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PRE-SEASON TESTING POWER RANKINGS */}
          {(activeSection === 'ALL' || activeSection === 'POWER_RANKINGS') && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs sm:text-sm font-mono font-extrabold uppercase tracking-wider text-white">
                    3. {nextSeason} Pre-Season Testing Power Rankings (Regulation Reset & R&D Shakeup)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  Sorted by New {nextSeason} Car Performance Index (80 - 99)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {powerRankings.map((item, idx) => {
                  const isGain = item.delta > 0;
                  const isDrop = item.delta < 0;
                  const barWidthPercent = Math.max(
                    15,
                    Math.min(100, ((item.newPerformance - 78) / 21) * 100)
                  );
                  const prevBarWidthPercent = Math.max(
                    15,
                    Math.min(100, ((item.previousPerformance - 78) / 21) * 100)
                  );

                  const philosophyBadge =
                    item.rdPhilosophy === 'CONSISTENT_GIANT'
                      ? {
                          label: 'CONSISTENT GIANT',
                          cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                          icon: ShieldCheck,
                        }
                      : item.rdPhilosophy === 'HIGH_RISK_VOLATILE'
                      ? {
                          label: 'HIGH-RISK VOLATILE',
                          cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                          icon: AlertTriangle,
                        }
                      : {
                          label: 'DEVELOPING CHALLENGER',
                          cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                          icon: Rocket,
                        };

                  const PhilIcon = philosophyBadge.icon;

                  return (
                    <div
                      key={item.teamId}
                      className={`rounded-xl border p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        item.isPlayerTeam
                          ? 'bg-red-950/25 border-red-500/50'
                          : 'bg-zinc-950/80 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-[270px]">
                        <span className="w-7 text-center font-mono text-xs font-extrabold text-zinc-400">
                          #{idx + 1}
                        </span>
                        <span
                          className="w-1.5 h-9 rounded-full shrink-0"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {item.teamName}
                            </span>
                            {item.isPlayerTeam && (
                              <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-extrabold uppercase">
                                YOUR TEAM
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold ${philosophyBadge.cls}`}
                            >
                              <PhilIcon className="w-2.5 h-2.5" />
                              <span>{philosophyBadge.label}</span>
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {item.statusLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Bar Comparison */}
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden relative border border-zinc-800">
                          {/* Ghost bar for previous season */}
                          <div
                            className="h-full bg-zinc-600/35 absolute top-0 left-0 rounded-full"
                            style={{ width: `${prevBarWidthPercent}%` }}
                          />
                          {/* Active bar for new season */}
                          <div
                            className="h-full rounded-full transition-all duration-500 relative"
                            style={{
                              width: `${barWidthPercent}%`,
                              backgroundColor: item.colorHex,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500">
                          <span>{completedSeason} Spec: {item.previousPerformance}</span>
                          <span>{nextSeason} Testing Spec: {item.newPerformance}</span>
                        </div>
                      </div>

                      {/* Score & Delta Badge */}
                      <div className="flex items-center justify-end gap-2.5 font-mono shrink-0 min-w-[140px]">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-white">
                            {item.newPerformance}{' '}
                            <span className="text-[10px] text-zinc-400 font-normal">OVR</span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                            isGain
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isDrop
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {isGain ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : isDrop ? (
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          ) : null}
                          <span>
                            {isGain ? `+${item.delta}` : item.delta === 0 ? '0' : item.delta}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER CTA */}
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-mono text-zinc-400">
            Seluruh poin klasemen WDC & WCC akan di-reset ke <strong className="text-white">0 PTS</strong> dan kalender dimulai kembali dari <strong className="text-amber-300">Round 1 — Australian Grand Prix (Melbourne)</strong>.
          </div>

          <button
            type="button"
            onClick={startNewSeasonAfterOffSeason}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
          >
            <Flag className="w-4 h-4" />
            <span>START NEW SEASON (YEAR {nextSeason}) →</span>
          </button>
        </div>
      </div>
    </div>
  );
};

