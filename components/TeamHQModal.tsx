'use client';

import React, { useRef, useState } from 'react';
import {
  Building2,
  Trophy,
  Wrench,
  Calendar,
  DollarSign,
  Wind,
  Cpu,
  ShieldCheck,
  Layers,
  ArrowUpCircle,
  CheckCircle2,
  X,
  Sparkles,
  Award,
  Flag,
  Briefcase,
  UserPlus,
  Target,
  AlertCircle,
  Download,
  Upload,
  RotateCcw,
  Lock,
  Play,
} from 'lucide-react';
import {
  useCareerStore,
  CarPartName,
  FacilityType,
  PART_MANUFACTURE_SPECS,
  PitCrewTrainingFocus,
  StaffRole,
  getUpgradeCostForLevel,
  calculateBonusesFromParts,
  SPONSOR_OFFERS,
  ClaimPrizeResult,
} from '../store/useCareerStore';
import {
  computeTotalPartDamagePaceLoss,
  getDriverPartDamage,
  useRaceStore,
} from '../store/useRaceStore';
import { CarPhysicalPartType } from '../types/f1';

const WAREHOUSE_PART_KEYS: CarPhysicalPartType[] = [
  'frontWing',
  'rearWing',
  'floor',
  'sidepods',
  'suspension',
  'chassis',
];
import {
  COST_CAP_LIMIT_2026,
  GEARBOX_SEASON_LIMIT_2026,
  PU_SEASON_LIMIT_2026,
  ROOKIE_FP1_TARGET_PER_CAR,
} from '../constants/f1Data';

interface TeamHQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HQTab = 'RD_UPGRADES' | 'STAFF_FACILITIES' | 'SPONSORS' | 'DRIVER_MARKET' | 'STANDINGS' | 'CALENDAR';

const PART_METADATA: Array<{
  key: CarPartName;
  title: string;
  department: string;
  description: string;
  statImpact: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}> = [
  {
    key: 'aerodynamics',
    title: 'Aerodynamics & Downforce',
    department: 'Wind Tunnel & CFD Division',
    description:
      'Optimasi sayap depan, lantai venturi, dan diffuser untuk kecepatan menikung maksimal.',
    statImpact: '+0.45 Base Pace / Level',
    icon: Wind,
    accentClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  },
  {
    key: 'powertrain',
    title: 'Power Unit & ERS MGU-K',
    department: 'Maranello Engine Department',
    description:
      'Peningkatan efisiensi pembakaran ICE dan pengiriman tenaga elektrik di lintasan lurus.',
    statImpact: '+0.45 Base Pace / Level',
    icon: Cpu,
    accentClass: 'text-red-400 border-red-500/30 bg-red-500/10',
  },
  {
    key: 'chassis',
    title: 'Lightweight Monocoque Chassis',
    department: 'Composite & Suspension Lab',
    description:
      'Reduksi bobot sasis serat karbon dan keseimbangan distribusi berat untuk kelincahan & keawetan ban.',
    statImpact: '+0.25 Pace & +0.35 Tyre Mgmt / Level',
    icon: Layers,
    accentClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    key: 'durability',
    title: 'Tyre Thermal & Brake Cooling',
    department: 'Thermal Reliability Division',
    description:
      'Kontrol temperatur permukaan ban untuk menekan laju degradasi kompon di stint panjang.',
    statImpact: '+0.65 Tyre Management / Level',
    icon: ShieldCheck,
    accentClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
];

const formatCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
};

export const TeamHQModal: React.FC<TeamHQModalProps> = ({ isOpen, onClose }) => {
  const {
    teamName,
    budget,
    seasonNumber,
    currentRoundIndex,
    seasonCalendar,
    carParts,
    driverStandings,
    constructorStandings,
    raceHistory,
    selectedSponsorId,
    driverMarket,
    isSeasonCompleted,
    seasonRdSpending,
    carPowerUnits,
    rookieFp1Completed,
    staffRoster,
    facilities,
    pitCrew,
    atrState,
    nextSeasonResearch,
    boardState,
    driverMentalities,
    affiliateFocuses,
    pendingPoachOffer,
    sparePartsInventory,
    upgradeCarPart,
    replacePowerUnitComponent,
    manageStaff,
    manageFacility,
    setPitCrewTraining,
    developPartWithAtr,
    investNextSeasonResearch,
    manufactureSparePart,
    fitAllDamagedPartsForDriver,
    setAffiliateFocus,
    resolvePoachOffer,
    selectSponsor,
    signToDriverAcademy,
    signDriverFromMarket,
    finishRaceAndClaimPrize,
    advanceToNextSeason,
    selectRoundCircuit,
    resetCareer,
    exportSaveData,
    importSaveData,
  } = useCareerStore();

  const { raceStatus, drivers } = useRaceStore();
  const [activeTab, setActiveTab] = useState<HQTab>('RD_UPGRADES');
  const [scoutingFilter, setScoutingFilter] = useState<
    'ALL' | 'F1_GRID' | 'F2_F3' | 'INDYCAR' | 'WEC_RESERVE' | 'MY_ACADEMY'
  >('ALL');
  const [lastClaimSummary, setLastClaimSummary] = useState<ClaimPrizeResult | null>(null);
  const [hqNotice, setHqNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [transferSeatId, setTransferSeatId] = useState<string>('');
  const [transferNotice, setTransferNotice] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveManagerNotice, setSaveManagerNotice] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(carParts);
  const currentCircuit = seasonCalendar[currentRoundIndex];
  const playerDrivers = drivers
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.number - b.number);

  const playerMarketDrivers = driverMarket
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.number - b.number);

  const playerAcademyDrivers = driverMarket
    .filter((d) => d.isInPlayerAcademy && !d.isPlayerControlled)
    .sort((a, b) => b.potential - a.potential || b.basePace - a.basePace);

  const aiMarketDrivers = driverMarket
    .filter((d) => !d.isPlayerControlled)
    .sort((a, b) => b.basePace - a.basePace || b.potential - a.potential);

  const filteredMarketDrivers = aiMarketDrivers.filter((d) => {
    if (scoutingFilter === 'F1_GRID') return d.category === 'F1_GRID';
    if (scoutingFilter === 'F2_F3')
      return d.category === 'F2_ACADEMY' || d.category === 'F3_ACADEMY';
    if (scoutingFilter === 'INDYCAR') return d.category === 'INDYCAR';
    if (scoutingFilter === 'WEC_RESERVE')
      return d.category === 'WEC_HYPERCAR' || d.category === 'RESERVE';
    if (scoutingFilter === 'MY_ACADEMY') return d.isInPlayerAcademy;
    return true;
  });

  const activeSeatToReplace =
    transferSeatId && playerMarketDrivers.some((d) => d.id === transferSeatId)
      ? transferSeatId
      : playerMarketDrivers[1]?.id ?? playerMarketDrivers[0]?.id ?? '';

  const activeSponsor =
    SPONSOR_OFFERS.find((s) => s.id === selectedSponsorId) ?? SPONSOR_OFFERS[1];

  const isFinalRound = currentRoundIndex + 1 >= seasonCalendar.length;

  const handleClaimPrizeAndAdvance = () => {
    const result = finishRaceAndClaimPrize();
    if (result) {
      setLastClaimSummary(result);
      if (result.isEndOfSeason) {
        advanceToNextSeason();
      }
    }
  };

  const handleEnterOffSeason = () => {
    if (raceStatus === 'FINISHED' && !isSeasonCompleted) {
      finishRaceAndClaimPrize();
    }
    advanceToNextSeason();
  };

  const handleSignDriver = (targetDriverId: string) => {
    if (!activeSeatToReplace) return;
    const res = signDriverFromMarket(targetDriverId, activeSeatToReplace);
    setTransferNotice(res);
  };

  const handleSignToAcademy = (targetDriverId: string) => {
    const res = signToDriverAcademy(targetDriverId);
    setTransferNotice(res);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const res = importSaveData(content);
        setSaveManagerNotice(res);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetCareer = () => {
    resetCareer();
    setSaveManagerNotice({
      success: true,
      message: 'Karier berhasil direset ke awal Musim 2026 (Round 1 — Monza).',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* TOP HEADER MODAL */}
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-red-600 text-white font-bold">
                  TEAM HQ
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  SEASON {seasonNumber} • ROUND {currentRoundIndex + 1} / {seasonCalendar.length}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {teamName} — Factory, Sponsors & Driver Market
              </h2>
            </div>
          </div>

          {/* Indikator Budget, Menu Save Manager, & Tombol Tutup */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Menu Save Manager (Export .json, Import, New Career Reset) */}
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl p-1.5">
              <button
                type="button"
                onClick={() => {
                  exportSaveData();
                  setSaveManagerNotice({
                    success: true,
                    message: 'File backup karier (.json) berhasil diunduh ke komputer Anda.',
                  });
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 font-mono text-[10px] font-bold uppercase transition cursor-pointer"
                title="Unduh Backup Save (.json)"
              >
                <Download className="w-3 h-3 text-sky-400" />
                <span>Export Save (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 font-mono text-[10px] font-bold uppercase transition cursor-pointer"
                title="Unggah File Save (.json)"
              >
                <Upload className="w-3 h-3 text-emerald-400" />
                <span>Import Save</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleResetCareer}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 font-mono text-[10px] font-bold uppercase transition cursor-pointer"
                title="Hapus Save & Mulai Karier Baru"
              >
                <RotateCcw className="w-3 h-3" />
                <span>New Career (Reset)</span>
              </button>
            </div>

            <div className="bg-zinc-950 border border-emerald-500/40 rounded-xl px-4 py-1.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-zinc-400">
                  Available Team Budget
                </div>
                <div className="font-mono text-base sm:text-lg font-extrabold text-emerald-400">
                  {formatCurrency(budget)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition cursor-pointer"
              title="Kembali ke Pit Wall"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NOTIFIKASI SAVE MANAGER */}
        {saveManagerNotice && (
          <div
            className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 font-mono text-xs ${
              saveManagerNotice.success
                ? 'bg-sky-950/60 border-sky-500/40 text-sky-200'
                : 'bg-red-950/60 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveManagerNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveManagerNotice(null)}
              className="text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* BANNER KLAIM HADIAH ATAU OFF-SEASON JIKA BALAPAN SELESAI / MUSIM BERAKHIR */}
        {(raceStatus === 'FINISHED' || isSeasonCompleted) && (
          <div className="bg-gradient-to-r from-amber-500/20 via-red-600/20 to-zinc-900 border-b border-amber-500/40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-amber-400 shrink-0 animate-bounce" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  {isFinalRound || isSeasonCompleted
                    ? `Season ${seasonNumber} Finale Completed at ${currentCircuit.name}!`
                    : `Race Finished at ${currentCircuit.name}!`}
                </h3>
                <p className="text-xs text-zinc-300 font-mono">
                  Hasil Tim: {playerDrivers[0]?.code} (P{playerDrivers[0]?.position}) &{' '}
                  {playerDrivers[1]?.code} (P{playerDrivers[1]?.position}) • Sponsor Aktif:{' '}
                  <strong>{activeSponsor.name}</strong>
                </p>
              </div>
            </div>

            {isFinalRound || isSeasonCompleted ? (
              <button
                type="button"
                onClick={handleEnterOffSeason}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 hover:from-amber-300 hover:to-red-400 text-zinc-950 font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
              >
                ENTER OFF-SEASON (END SEASON {seasonNumber}) →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClaimPrizeAndAdvance}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
              >
                Claim Prize, Evaluate Sponsor & Next GP →
              </button>
            )}
          </div>
        )}

        {/* NOTIFIKASI RINGKASAN KLAIM HADIAH & EVALUASI SPONSOR */}
        {lastClaimSummary && (
          <div className="bg-emerald-950/70 border-b border-emerald-500/40 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-mono text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                FIA Prize: <strong>+{formatCurrency(lastClaimSummary.prizeMoney)}</strong> |
                Sponsor Upfront: <strong>+{formatCurrency(lastClaimSummary.sponsorUpfront)}</strong>{' '}
                | Target Bonus:{' '}
                <strong
                  className={
                    lastClaimSummary.sponsorObjectiveMet ? 'text-emerald-300' : 'text-zinc-400'
                  }
                >
                  {lastClaimSummary.sponsorObjectiveMet
                    ? `+${formatCurrency(lastClaimSummary.sponsorBonus)} (ACHIEVED!)`
                    : '$0.00M (MISSED)'}
                </strong>{' '}
                | Gaji Pembalap: <strong>-{formatCurrency(lastClaimSummary.salariesPaid)}</strong>{' '}
                → Net: <strong>+{formatCurrency(lastClaimSummary.netIncome)}</strong>!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastClaimSummary(null)}
              className="text-xs text-emerald-400 hover:underline font-mono cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="px-6 pt-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('RD_UPGRADES')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                activeTab === 'RD_UPGRADES'
                  ? 'border-red-500 text-white bg-zinc-800/50 rounded-t-lg'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-red-400" />
              <span>R&D &amp; Research</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('STAFF_FACILITIES')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                activeTab === 'STAFF_FACILITIES'
                  ? 'border-red-500 text-white bg-zinc-800/50 rounded-t-lg'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Staff, Pit Crew &amp; HQ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SPONSORS')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                activeTab === 'SPONSORS'
                  ? 'border-red-500 text-white bg-zinc-800/50 rounded-t-lg'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sponsors & Objectives</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DRIVER_MARKET')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                activeTab === 'DRIVER_MARKET'
                  ? 'border-red-500 text-white bg-zinc-800/50 rounded-t-lg'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-purple-400" />
              <span>Scouting & Academy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('STANDINGS')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                activeTab === 'STANDINGS'
                  ? 'border-red-500 text-white bg-zinc-800/50 rounded-t-lg'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Standings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CALENDAR')}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                activeTab === 'CALENDAR'
                  ? 'border-red-500 text-white bg-zinc-800/50 rounded-t-lg'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Calendar ({seasonCalendar.length} GP)</span>
            </button>
          </div>

          {/* Ringkasan Bonus Aktif */}
          <div className="flex items-center gap-2 pb-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              Pace: <strong className="text-emerald-400">+{paceBonus}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              Tyre Mgmt: <strong className="text-sky-400">+{tyreMgmtBonus}</strong>
            </span>
          </div>
        </div>

        {/* ISI TAB */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: R&D CAR UPGRADES */}
          {activeTab === 'RD_UPGRADES' && (
            <div className="space-y-5">
              {/* FIA 2026 Cost Cap & Rookie FP1 Compliance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-zinc-200 uppercase">
                      FIA 2026 Cost Cap (R&amp;D)
                    </span>
                    <span
                      className={`font-extrabold ${
                        seasonRdSpending >= COST_CAP_LIMIT_2026
                          ? 'text-red-400'
                          : seasonRdSpending >= COST_CAP_LIMIT_2026 * 0.85
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                      }`}
                    >
                      ${(seasonRdSpending / 1_000_000).toFixed(1)}M / $
                      {(COST_CAP_LIMIT_2026 / 1_000_000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full transition-all ${
                        seasonRdSpending >= COST_CAP_LIMIT_2026
                          ? 'bg-red-500'
                          : seasonRdSpending >= COST_CAP_LIMIT_2026 * 0.85
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (seasonRdSpending / COST_CAP_LIMIT_2026) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500">
                    Upgrade R&amp;D akan terkunci otomatis jika menyentuh batas $215.0M.
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-zinc-200 uppercase">
                      Rookie FP1 Obligation
                    </span>
                    <span className="text-sky-300 font-bold">
                      Target: {ROOKIE_FP1_TARGET_PER_CAR}x / Car
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                      <span className="text-zinc-400">Car #1</span>
                      <span
                        className={
                          rookieFp1Completed.car1 >= ROOKIE_FP1_TARGET_PER_CAR
                            ? 'text-emerald-400 font-extrabold'
                            : 'text-amber-300 font-extrabold'
                        }
                      >
                        {rookieFp1Completed.car1}/{ROOKIE_FP1_TARGET_PER_CAR}
                      </span>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                      <span className="text-zinc-400">Car #2</span>
                      <span
                        className={
                          rookieFp1Completed.car2 >= ROOKIE_FP1_TARGET_PER_CAR
                            ? 'text-emerald-400 font-extrabold'
                            : 'text-amber-300 font-extrabold'
                        }
                      >
                        {rookieFp1Completed.car2}/{ROOKIE_FP1_TARGET_PER_CAR}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500">
                    Jalankan Rookie di layar FP1 untuk memenuhi kuota &amp; hindari denda $2M/slot.
                  </p>
                </div>
              </div>

              {/* 2026 Power Unit & Gearbox Pool (4 Units / Season) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold uppercase text-zinc-200">
                    2026 Power Unit &amp; Gearbox Season Pool (Limit: {PU_SEASON_LIMIT_2026} PU / {GEARBOX_SEASON_LIMIT_2026} GB)
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    Melebihi batas = +10 Grid (ICE/MGU-K) atau +5 Grid (Gearbox) di balapan berikutnya
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['car1', 'car2'] as const).map((slot, idx) => {
                    const pu = carPowerUnits[slot];
                    const items: Array<{
                      key: 'ICE' | 'MGUK' | 'GEARBOX';
                      label: string;
                      used: number;
                      limit: number;
                      wear: number;
                      penalty: number;
                    }> = [
                      {
                        key: 'ICE',
                        label: 'ICE (V6)',
                        used: pu.iceUsed,
                        limit: PU_SEASON_LIMIT_2026,
                        wear: pu.iceWear,
                        penalty: 10,
                      },
                      {
                        key: 'MGUK',
                        label: 'MGU-K (350kW)',
                        used: pu.mgukUsed,
                        limit: PU_SEASON_LIMIT_2026,
                        wear: pu.mgukWear,
                        penalty: 10,
                      },
                      {
                        key: 'GEARBOX',
                        label: 'Gearbox',
                        used: pu.gearboxUsed,
                        limit: GEARBOX_SEASON_LIMIT_2026,
                        wear: pu.gearboxWear,
                        penalty: 5,
                      },
                    ];

                    return (
                      <div
                        key={slot}
                        className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between font-mono text-xs">
                          <span className="font-bold text-white">
                            CAR #{idx + 1} POWERTRAIN
                          </span>
                          {pu.pendingGridPenalty > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-extrabold">
                              PENDING +{pu.pendingGridPenalty} GRID
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {items.map((it) => {
                            const willPenalize = it.used >= it.limit;
                            return (
                              <div
                                key={it.key}
                                className="flex items-center justify-between gap-2 font-mono text-[11px]"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-zinc-300 font-bold">
                                      {it.label}{' '}
                                      <span className="text-zinc-500">
                                        ({it.used}/{it.limit})
                                      </span>
                                    </span>
                                    <span
                                      className={
                                        it.wear >= 75
                                          ? 'text-red-400 font-bold'
                                          : it.wear >= 45
                                          ? 'text-amber-300 font-bold'
                                          : 'text-emerald-400'
                                      }
                                    >
                                      {it.wear.toFixed(0)}% Wear
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                    <div
                                      className={
                                        it.wear >= 75
                                          ? 'h-full bg-red-500'
                                          : it.wear >= 45
                                          ? 'h-full bg-amber-400'
                                          : 'h-full bg-emerald-500'
                                      }
                                      style={{ width: `${Math.min(100, it.wear)}%` }}
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => replacePowerUnitComponent(slot, it.key)}
                                  className={`px-2 py-1 rounded border text-[10px] font-bold transition cursor-pointer shrink-0 ${
                                    willPenalize
                                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                                      : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-emerald-400'
                                  }`}
                                >
                                  {willPenalize ? `New (+${it.penalty}G)` : 'New (Free)'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerDrivers.map((d) => (
                  <div
                    key={d.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-1.5 h-10 rounded-full bg-red-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                            #{d.number} {d.code}
                          </span>
                          <h4 className="font-bold text-white text-sm">{d.name}</h4>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          Active Car Spec Applied for Next Race
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 font-mono">
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 uppercase">Effective Pace</div>
                        <div className="text-base font-extrabold text-emerald-400">
                          {d.basePace}{' '}
                          <span className="text-[10px] font-normal text-zinc-500">/ 99</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 uppercase">Tyre Mgmt</div>
                        <div className="text-base font-extrabold text-sky-400">
                          {d.tyreManagement}{' '}
                          <span className="text-[10px] font-normal text-zinc-500">/ 99</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PART_METADATA.map((part) => {
                  const currentLevel = carParts[part.key];
                  const isMaxed = currentLevel >= 10;
                  const upgradeCost = getUpgradeCostForLevel(currentLevel);
                  const canAfford = budget >= upgradeCost && !isMaxed;
                  const Icon = part.icon;

                  return (
                    <div
                      key={part.key}
                      className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-zinc-700 transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${part.accentClass}`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                                {part.department}
                              </span>
                              <h3 className="text-base font-bold text-white">{part.title}</h3>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 font-mono text-xs font-extrabold text-zinc-200">
                            LVL {currentLevel} / 10
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {part.description}
                        </p>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> {part.statImpact}
                            </span>
                            <span className="text-zinc-500">{currentLevel * 10}% Developed</span>
                          </div>
                          <div className="grid grid-cols-10 gap-1">
                            {Array.from({ length: 10 }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-2 rounded-sm transition-all ${
                                  idx < currentLevel ? 'bg-red-500' : 'bg-zinc-800'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <div className="font-mono">
                          <span className="text-[10px] uppercase text-zinc-500 block">
                            Upgrade Cost
                          </span>
                          <span
                            className={`text-sm font-extrabold ${
                              isMaxed
                                ? 'text-zinc-500'
                                : canAfford
                                ? 'text-white'
                                : 'text-red-400'
                            }`}
                          >
                            {isMaxed ? 'MAX LEVEL' : formatCurrency(upgradeCost)}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => upgradeCarPart(part.key, upgradeCost)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed ${
                            isMaxed
                              ? 'bg-zinc-800 text-zinc-500'
                              : canAfford
                              ? 'bg-red-600 hover:bg-red-500 text-white'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                          }`}
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>
                            {isMaxed
                              ? 'Fully Upgraded'
                              : canAfford
                              ? `Upgrade to Lvl ${currentLevel + 1}`
                              : 'Insufficient Funds'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* F1M24: ATR QUOTA (WIND TUNNEL / CFD), INTENSIVE DEV & NEXT-SEASON RESEARCH */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold uppercase text-zinc-200">
                      ATR Testing Pool &amp; Next-Season Car Research (F1 Manager 24)
                    </span>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Alokasi jam Wind Tunnel &amp; CFD di-reset tiap 4 seri sesuai posisi klasemen konstruktor.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-sky-300 font-bold">
                      Wind Tunnel: {atrState.windTunnelHours}/{atrState.maxWindTunnelHours}h
                    </span>
                    <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-300 font-bold">
                      CFD: {atrState.cfdHours}/{atrState.maxCfdHours}h
                    </span>
                    <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                      Reset: R{atrState.nextResetRound}
                    </span>
                  </div>
                </div>

                {hqNotice && (
                  <div
                    className={`px-3.5 py-2.5 rounded-lg border font-mono text-xs flex items-center justify-between ${
                      hqNotice.success
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-950/60 border-red-500/40 text-red-200'
                    }`}
                  >
                    <span>{hqNotice.message}</span>
                    <button
                      type="button"
                      onClick={() => setHqNotice(null)}
                      className="underline text-[11px] cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                  {PART_METADATA.map((part) => {
                    const researchPct = nextSeasonResearch[part.key] ?? 0;
                    const currentLvl = carParts[part.key];
                    return (
                      <div
                        key={`f1m24-${part.key}`}
                        className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-white">
                            <span className="capitalize">{part.key}</span>
                            <span className="text-zinc-400">Lv.{currentLvl}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                            <span>Next-Year Research</span>
                            <span className="text-amber-300 font-bold">{researchPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${researchPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-1">
                          <button
                            type="button"
                            disabled={currentLvl >= 10}
                            onClick={() =>
                              setHqNotice(developPartWithAtr(part.key, 'INTENSIVE', true))
                            }
                            className="w-full py-1.5 px-2 rounded border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 text-sky-200 text-[10px] font-bold cursor-pointer"
                          >
                            Intensive + ATR (8h WT)
                          </button>
                          <button
                            type="button"
                            disabled={researchPct >= 100}
                            onClick={() => setHqNotice(investNextSeasonResearch(part.key))}
                            className="w-full py-1.5 px-2 rounded border border-zinc-700 bg-zinc-900 hover:border-amber-400 disabled:opacity-40 text-zinc-200 text-[10px] font-bold cursor-pointer"
                          >
                            Next-Season Research ($2.0M)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spare Parts Warehouse & Emergency Manufacturing (F1 Manager 24) */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      F1 Manager 24 • Parts Warehouse &amp; Manufacturing
                    </div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      Spare Car Parts Stock &amp; Repairs
                    </h3>
                  </div>

                  {playerDrivers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      {playerDrivers.map((pd) => {
                        const pdDmg = getDriverPartDamage(pd);
                        const pdPaceLoss = computeTotalPartDamagePaceLoss(pdDmg);
                        const damagedCount = WAREHOUSE_PART_KEYS.filter(
                          (k) => (pdDmg[k] ?? 0) > 0
                        ).length;

                        return (
                          <div
                            key={`wh-drv-${pd.id}`}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800"
                          >
                            <span className="font-bold text-zinc-200">{pd.code}</span>
                            <span
                              className={
                                pdPaceLoss > 0
                                  ? 'text-red-400 font-bold'
                                  : 'text-emerald-400'
                              }
                            >
                              {pdPaceLoss > 0
                                ? `+${pdPaceLoss.toFixed(2)}s`
                                : '100% OK'}
                            </span>
                            {damagedCount > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setHqNotice(fitAllDamagedPartsForDriver(pd.id))
                                }
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Fit All ({damagedCount})
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
                  {WAREHOUSE_PART_KEYS.map((key) => {
                    const spec = PART_MANUFACTURE_SPECS[key];
                    const stock = sparePartsInventory[key] ?? 0;

                    return (
                      <div
                        key={`wh-part-${key}`}
                        className="rounded-lg bg-zinc-950 border border-zinc-800 p-3.5 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-zinc-500 uppercase">
                              {spec.shortCode}
                            </div>
                            <div className="text-xs font-bold text-white">{spec.label}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded border text-xs font-extrabold ${
                              stock === 0
                                ? 'bg-red-500/15 border-red-500/40 text-red-300'
                                : stock === 1
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            }`}
                          >
                            {stock} in Stock
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            disabled={budget < spec.normalCost}
                            onClick={() =>
                              setHqNotice(manufactureSparePart(key, false))
                            }
                            className="py-1.5 px-2 rounded border border-zinc-700 bg-zinc-900 hover:border-emerald-400 disabled:opacity-40 text-zinc-200 text-[10px] font-bold cursor-pointer"
                          >
                            +1 Standard ({formatCurrency(spec.normalCost)})
                          </button>
                          <button
                            type="button"
                            disabled={budget < spec.emergencyCost}
                            onClick={() =>
                              setHqNotice(manufactureSparePart(key, true))
                            }
                            className="py-1.5 px-2 rounded border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 text-amber-200 text-[10px] font-bold cursor-pointer"
                          >
                            +1 Emergency ({formatCurrency(spec.emergencyCost)})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1b: F1 MANAGER 24 — STAFF, PIT CREW, FACILITIES & BOARD */}
          {activeTab === 'STAFF_FACILITIES' && (
            <div className="space-y-5 font-mono">
              {hqNotice && (
                <div
                  className={`px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    hqNotice.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/60 border-red-500/40 text-red-200'
                  }`}
                >
                  <span>{hqNotice.message}</span>
                  <button
                    type="button"
                    onClick={() => setHqNotice(null)}
                    className="underline text-[11px] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Board Confidence & Rival Poaching Alert */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white uppercase">
                      Board Confidence &amp; Season Target
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-amber-300 font-bold">
                      Target: P{boardState.targetWccPosition} WCC
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Origin: {boardState.originPreset}</span>
                    <span className="text-emerald-400 font-extrabold">
                      Confidence: {boardState.confidence}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={
                        boardState.confidence >= 65
                          ? 'h-full bg-emerald-500'
                          : boardState.confidence >= 40
                          ? 'h-full bg-amber-400'
                          : 'h-full bg-red-500'
                      }
                      style={{ width: `${boardState.confidence}%` }}
                    />
                  </div>
                </div>

                {pendingPoachOffer ? (
                  <div className="bg-red-950/35 border border-red-500/50 rounded-xl p-4 flex flex-col justify-between gap-2">
                    <div className="text-xs font-bold text-red-200 uppercase">
                      Rival Contract Poaching Alert!
                    </div>
                    <p className="text-[11px] text-zinc-200">
                      <strong>{pendingPoachOffer.rivalTeamName}</strong> mengajukan kontrak kepada{' '}
                      <strong>{pendingPoachOffer.driverName}</strong> (Buyout:{' '}
                      {formatCurrency(pendingPoachOffer.buyoutOffer)}).
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHqNotice(resolvePoachOffer('COUNTER'))}
                        className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Counter-Offer ($0.85M Keep)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHqNotice(resolvePoachOffer('RELEASE'))}
                        className="flex-1 py-1.5 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold cursor-pointer"
                      >
                        Release (+{formatCurrency(pendingPoachOffer.buyoutOffer)})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-2">
                    <span className="text-xs font-bold text-white uppercase">
                      Driver &amp; Staff Mentality Hub
                    </span>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {drivers
                        .filter((d) => d.isPlayerControlled)
                        .map((pd) => {
                          const m = driverMentalities[pd.id] ?? pd.mentality ?? 75;
                          return (
                            <span
                              key={pd.id}
                              className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-200"
                            >
                              {pd.code}: <strong className="text-emerald-400">{m}%</strong>
                            </span>
                          );
                        })}
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      Tidak ada tawaran pembajakan kontrak aktif saat ini.
                    </span>
                  </div>
                )}
              </div>

              {/* Key Technical & Race Engineering Staff */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-white uppercase">
                  Key Team Staff &amp; Race Engineers (5 Positions)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.keys(staffRoster) as StaffRole[]).map((roleKey) => {
                    const st = staffRoster[roleKey];
                    return (
                      <div
                        key={roleKey}
                        className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500">{st.roleLabel}</div>
                          <div className="text-sm font-bold text-white mt-0.5">{st.name}</div>
                          <div className="flex items-center justify-between text-[11px] mt-1.5 text-zinc-300">
                            <span>
                              Rating: <strong className="text-emerald-400">{st.rating}</strong>
                            </span>
                            <span>
                              Mentality: <strong className="text-sky-400">{st.mentality}%</strong>
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            Salary: ${(st.salary / 1000).toFixed(0)}k / race
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHqNotice(manageStaff(roleKey, 'TRAIN'))}
                            className="py-1.5 px-2 rounded border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 text-[10px] font-bold cursor-pointer"
                          >
                            Train ($0.75M)
                          </button>
                          <button
                            type="button"
                            onClick={() => setHqNotice(manageStaff(roleKey, 'REPLACE'))}
                            className="py-1.5 px-2 rounded border border-zinc-700 bg-zinc-900 hover:border-zinc-500 text-zinc-200 text-[10px] font-bold cursor-pointer"
                          >
                            Scouting ($1.5M)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pit Crew Training Center */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white uppercase">
                    Pit Crew Training &amp; Fatigue Management
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400 font-bold">
                      Est. Stop: {pitCrew.estimatedStopSeconds.toFixed(2)}s
                    </span>
                    <span
                      className={
                        pitCrew.fatigue >= 65
                          ? 'text-red-400 font-bold'
                          : 'text-amber-300 font-bold'
                      }
                    >
                      Fatigue: {pitCrew.fatigue}%
                    </span>
                    <span className="text-zinc-400">
                      Error Risk: {pitCrew.errorChancePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'BALANCED', label: 'Balanced' },
                      { id: 'TYRE_CHANGE', label: 'Tyre Gun Drills' },
                      { id: 'JACK_RELEASE', label: 'Jack & Release' },
                      { id: 'WING_REPAIR', label: 'Wing Repair' },
                      { id: 'REST', label: 'Rest & Recovery' },
                    ] as Array<{ id: PitCrewTrainingFocus; label: string }>
                  ).map((f) => {
                    const active = pitCrew.trainingFocus === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setPitCrewTraining(f.id)}
                        className={`py-2 px-2.5 rounded border text-[11px] font-bold transition cursor-pointer ${
                          active
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* HQ Facilities (Upgrade & Refurbish) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-white uppercase">
                  HQ Facilities (Level 1–5 &amp; Refurbishment)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(facilities) as FacilityType[]).map((ft) => {
                    const fac = facilities[ft];
                    return (
                      <div
                        key={ft}
                        className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{fac.name}</span>
                            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-amber-300 font-bold">
                              LV.{fac.level}/5
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1">{fac.effectText}</p>
                          <div className="mt-2 flex items-center justify-between text-[10px]">
                            <span className="text-zinc-500">Condition</span>
                            <span
                              className={
                                fac.condition >= 75
                                  ? 'text-emerald-400 font-bold'
                                  : fac.condition >= 50
                                  ? 'text-amber-300 font-bold'
                                  : 'text-red-400 font-bold'
                              }
                            >
                              {fac.condition}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-1">
                            <div
                              className={
                                fac.condition >= 75 ? 'h-full bg-emerald-500' : 'h-full bg-amber-400'
                              }
                              style={{ width: `${fac.condition}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            disabled={fac.level >= 5}
                            onClick={() => setHqNotice(manageFacility(ft, 'UPGRADE'))}
                            className="py-1.5 px-2 rounded bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-[10px] font-bold cursor-pointer"
                          >
                            {fac.level >= 5
                              ? 'Max Level'
                              : `Upgrade (${formatCurrency(fac.upgradeCost)})`}
                          </button>
                          <button
                            type="button"
                            disabled={fac.condition >= 100}
                            onClick={() => setHqNotice(manageFacility(ft, 'REFURBISH'))}
                            className="py-1.5 px-2 rounded border border-zinc-700 bg-zinc-900 hover:border-sky-400 disabled:opacity-40 text-zinc-200 text-[10px] font-bold cursor-pointer"
                          >
                            Refurbish ({formatCurrency(fac.refurbishCost)})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SISTEM SPONSOR & TARGET BALAPAN (SPONSOR OBJECTIVES) */}
          {activeTab === 'SPONSORS' && (
            <div className="space-y-5">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Select Official Race Weekend Title Sponsor
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Pilih 1 dari 3 kontrak sponsor sebelum balapan dimulai. Pencapaian target akan dievaluasi otomatis saat Anda mengklaim hasil balapan.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 font-mono text-xs text-emerald-300 font-bold">
                  Active Contract: {activeSponsor.name}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SPONSOR_OFFERS.map((offer) => {
                  const isSelected = offer.id === selectedSponsorId;
                  const maxPotential = offer.upfrontPayout + offer.objectiveBonus;

                  return (
                    <div
                      key={offer.id}
                      className={`rounded-xl border p-5 flex flex-col justify-between gap-4 transition ${
                        isSelected
                          ? 'bg-zinc-900 border-emerald-500'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className="px-2.5 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase border"
                            style={{
                              color: offer.accentColor,
                              borderColor: `${offer.accentColor}55`,
                              backgroundColor: `${offer.accentColor}15`,
                            }}
                          >
                            {offer.category}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-emerald-400 font-mono text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4" /> ACTIVE
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-base font-extrabold text-white">{offer.name}</h4>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            {offer.tagline}
                          </p>
                        </div>

                        {/* Rincian Pembayaran */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Guaranteed Upfront:</span>
                            <span className="text-white font-bold">
                              +{formatCurrency(offer.upfrontPayout)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Objective Bonus:</span>
                            <span className="text-emerald-400 font-bold">
                              +{formatCurrency(offer.objectiveBonus)}
                            </span>
                          </div>
                          <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between">
                            <span className="text-zinc-300 font-bold">Max Payout / GP:</span>
                            <span className="text-amber-300 font-extrabold">
                              {formatCurrency(maxPotential)}
                            </span>
                          </div>
                        </div>

                        {/* Syarat Target */}
                        <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-zinc-400 font-bold">
                            <Target className="w-3.5 h-3.5 text-red-400" />
                            <span>Target Objective</span>
                          </div>
                          <p className="text-xs text-zinc-200 font-medium leading-snug">
                            {offer.objectiveDescription}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSelected || raceStatus === 'RACING'}
                        onClick={() => selectSponsor(offer.id)}
                        className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed ${
                          isSelected
                            ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        {isSelected ? 'Contract Signed & Active' : 'Sign Sponsor Contract'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BURSA TRANSFER & DRIVER ACADEMY (SCOUTING & ACADEMY) */}
          {activeTab === 'DRIVER_MARKET' && (
            <div className="space-y-5">
              {/* Panel Kursi Tim Saat Ini & Pemilih Kursi yang Akan Diganti */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Current {teamName} Main F1 Lineup & Seat Selector
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Pilih kursi pembalap utama yang ingin digantikan saat melakukan promosi dari Driver Academy atau rekrutmen luar.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {playerMarketDrivers.map((pd) => {
                    const isSelectedSeat = activeSeatToReplace === pd.id;
                    return (
                      <button
                        key={pd.id}
                        type="button"
                        onClick={() => setTransferSeatId(pd.id)}
                        className={`px-3.5 py-2 rounded-xl border font-mono text-xs flex items-center gap-2.5 transition cursor-pointer ${
                          isSelectedSeat
                            ? 'bg-red-600/25 border-red-500 text-white'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-[10px]">
                          #{pd.number} {pd.code}
                        </span>
                        <div className="text-left">
                          <div className="font-bold text-white">
                            {pd.name}{' '}
                            <span className="text-[10px] text-zinc-400 font-normal">
                              ({pd.age} yo)
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Pace {pd.basePace} • Tyre {pd.tyreManagement} • Pot {pd.potential} •{' '}
                            {formatCurrency(pd.salaryPerRace)}/GP
                          </div>
                        </div>
                        {isSelectedSeat && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-zinc-950 font-extrabold uppercase">
                            SEAT TO REPLACE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Panel My Driver Academy (F2 / F3 Youngster Development) */}
              <div className="bg-gradient-to-r from-sky-950/50 via-zinc-900 to-zinc-900 border border-sky-500/30 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      {teamName} Junior Driver Academy ({playerAcademyDrivers.length} Enrolled)
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/30 px-2.5 py-0.5 rounded-lg">
                    Auto-Growth: +0.8 Base Pace & +0.8 Tyre Mgmt setiap Grand Prix selesai (hingga batas Potential)
                  </span>
                </div>

                {playerAcademyDrivers.length === 0 ? (
                  <p className="text-xs text-zinc-400 font-mono">
                    Belum ada pembalap muda di Driver Academy Anda. Rekrut talenta muda dari tab{' '}
                    <strong className="text-sky-300">F2/F3 Youngsters</strong> dengan biaya murah untuk dibina setiap balapan dan dipromosikan secara GRATIS ke kursi utama F1!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {playerAcademyDrivers.map((acad) => (
                      <div
                        key={acad.id}
                        className="bg-zinc-950 border border-sky-500/40 rounded-xl p-3 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-[10px] font-bold">
                                {acad.code} #{acad.number}
                              </span>
                              <span className="font-bold text-white text-xs">{acad.name}</span>
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              Age {acad.age} • {acad.teamName}
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold">
                            POT {acad.potential}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-zinc-900/80 rounded-lg p-2 font-mono text-[11px]">
                          <div>
                            <span className="text-zinc-500 block text-[9px] uppercase">
                              Base Pace
                            </span>
                            <span className="text-emerald-400 font-bold">{acad.basePace}</span>
                            <span className="text-zinc-500 text-[10px]"> / {acad.potential}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[9px] uppercase">
                              Tyre Mgmt
                            </span>
                            <span className="text-sky-400 font-bold">{acad.tyreManagement}</span>
                            <span className="text-zinc-500 text-[10px]"> / {acad.potential}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                          {(['CAR_DEVELOPMENT', 'MARKETABILITY'] as const).map((focusKey) => {
                            const active =
                              (affiliateFocuses[acad.id] ?? 'CAR_DEVELOPMENT') === focusKey;
                            return (
                              <button
                                key={focusKey}
                                type="button"
                                onClick={() => setAffiliateFocus(acad.id, focusKey)}
                                className={`py-1 px-1.5 rounded border font-bold cursor-pointer ${
                                  active
                                    ? 'bg-purple-600 border-purple-500 text-white'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                {focusKey === 'CAR_DEVELOPMENT'
                                  ? 'Car Dev (+R&D)'
                                  : 'Market (+$150k)'}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          disabled={raceStatus === 'RACING'}
                          onClick={() => handleSignDriver(acad.id)}
                          className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-mono text-[11px] font-extrabold uppercase tracking-wider transition cursor-pointer"
                        >
                          Promote to Main F1 Seat ($0 FREE)
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifikasi Transfer / Academy */}
              {transferNotice && (
                <div
                  className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 font-mono text-xs ${
                    transferNotice.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/60 border-red-500/40 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{transferNotice.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransferNotice(null)}
                    className="underline text-[11px] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Filter Kategori Scouting */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'ALL', label: `All Candidates (${aiMarketDrivers.length})` },
                    {
                      id: 'F1_GRID',
                      label: `F1 Grid (${
                        aiMarketDrivers.filter((d) => d.category === 'F1_GRID').length
                      })`,
                    },
                    {
                      id: 'F2_F3',
                      label: `F2/F3 Youngsters (${
                        aiMarketDrivers.filter(
                          (d) => d.category === 'F2_ACADEMY' || d.category === 'F3_ACADEMY'
                        ).length
                      })`,
                    },
                    {
                      id: 'INDYCAR',
                      label: `IndyCar (${
                        aiMarketDrivers.filter((d) => d.category === 'INDYCAR').length
                      })`,
                    },
                    {
                      id: 'WEC_RESERVE',
                      label: `WEC & Reserves (${
                        aiMarketDrivers.filter(
                          (d) => d.category === 'WEC_HYPERCAR' || d.category === 'RESERVE'
                        ).length
                      })`,
                    },
                    {
                      id: 'MY_ACADEMY',
                      label: `My Academy (${playerAcademyDrivers.length})`,
                    },
                  ].map((tab) => {
                    const active = scoutingFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          setScoutingFilter(
                            tab.id as
                              | 'ALL'
                              | 'F1_GRID'
                              | 'F2_F3'
                              | 'INDYCAR'
                              | 'WEC_RESERVE'
                              | 'MY_ACADEMY'
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase transition cursor-pointer ${
                          active
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <span className="text-[11px] font-mono text-zinc-400">
                  Target Seat to Replace:{' '}
                  <strong className="text-red-400">
                    {playerMarketDrivers.find((d) => d.id === activeSeatToReplace)?.name}
                  </strong>
                </span>
              </div>

              {/* Tabel Scouting & Bursa Transfer */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[430px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-[10px] uppercase text-zinc-400">
                        <th className="py-2.5 pl-4 pr-2">Driver</th>
                        <th className="py-2.5 px-2 text-center">Age</th>
                        <th className="py-2.5 px-2">Category & Series</th>
                        <th className="py-2.5 px-2 text-center">Base Pace</th>
                        <th className="py-2.5 px-2 text-center">Tyre Mgmt</th>
                        <th className="py-2.5 px-2 text-center">Potential</th>
                        <th className="py-2.5 px-2 text-right">Salary / GP</th>
                        <th className="py-2.5 px-2 text-right">Buyout / Academy Fee</th>
                        <th className="py-2.5 pl-2 pr-4 text-right">Recruitment Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredMarketDrivers.map((candidate) => {
                        const isJuniorCategory =
                          candidate.category === 'F2_ACADEMY' ||
                          candidate.category === 'F3_ACADEMY';
                        const academyFee =
                          candidate.academyCost ?? Math.round(candidate.buyoutCost * 0.45);
                        const effectiveBuyout = candidate.isInPlayerAcademy
                          ? 0
                          : candidate.buyoutCost;
                        const canAffordMain =
                          budget >= effectiveBuyout && raceStatus !== 'RACING';
                        const canAffordAcademy =
                          isJuniorCategory &&
                          !candidate.isInPlayerAcademy &&
                          budget >= academyFee &&
                          raceStatus !== 'RACING';

                        const categoryBadgeClass =
                          candidate.category === 'F1_GRID'
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : candidate.category === 'F2_ACADEMY'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                            : candidate.category === 'F3_ACADEMY'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            : candidate.category === 'INDYCAR'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : candidate.category === 'WEC_HYPERCAR'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                        return (
                          <tr
                            key={candidate.id}
                            className={`transition-colors ${
                              candidate.isInPlayerAcademy
                                ? 'bg-sky-950/25 hover:bg-sky-950/40'
                                : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            <td className="py-2.5 pl-4 pr-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-1 h-5 rounded-full shrink-0"
                                  style={{ backgroundColor: candidate.teamColor }}
                                />
                                <span className="font-mono font-bold text-white">
                                  {candidate.code}
                                </span>
                                <span className="text-zinc-200 font-medium">
                                  {candidate.name}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-500">
                                  #{candidate.number}
                                </span>
                                {candidate.isInPlayerAcademy && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500 text-zinc-950 font-mono text-[9px] font-extrabold uppercase">
                                    IN ACADEMY
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-2 text-center font-mono text-zinc-300">
                              {candidate.age}
                            </td>

                            <td className="py-2.5 px-2">
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className={`inline-block w-fit px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold uppercase ${categoryBadgeClass}`}
                                >
                                  {candidate.category.replace('_', ' ')}
                                </span>
                                <span className="text-zinc-400 text-[10px]">
                                  {candidate.teamName}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-2 text-center font-mono">
                              <span
                                className={`px-2 py-0.5 rounded font-bold ${
                                  candidate.basePace >= 92
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-zinc-800 text-zinc-200'
                                }`}
                              >
                                {candidate.basePace}
                              </span>
                            </td>

                            <td className="py-2.5 px-2 text-center font-mono">
                              <span
                                className={`px-2 py-0.5 rounded font-bold ${
                                  candidate.tyreManagement >= 91
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                    : 'bg-zinc-800 text-zinc-200'
                                }`}
                              >
                                {candidate.tyreManagement}
                              </span>
                            </td>

                            <td className="py-2.5 px-2 text-center font-mono">
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                                {candidate.potential}
                              </span>
                            </td>

                            <td className="py-2.5 px-2 text-right font-mono text-zinc-300">
                              {formatCurrency(candidate.salaryPerRace)}
                            </td>

                            <td className="py-2.5 px-2 text-right font-mono">
                              {candidate.isInPlayerAcademy ? (
                                <span className="text-emerald-400 font-bold">FREE PROMOTION</span>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span
                                    className={`font-bold ${
                                      budget >= candidate.buyoutCost
                                        ? 'text-amber-300'
                                        : 'text-red-400'
                                    }`}
                                  >
                                    Buyout: {formatCurrency(candidate.buyoutCost)}
                                  </span>
                                  {isJuniorCategory && (
                                    <span className="text-[10px] text-sky-400">
                                      Academy: {formatCurrency(academyFee)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 pl-2 pr-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isJuniorCategory && !candidate.isInPlayerAcademy && (
                                  <button
                                    type="button"
                                    disabled={!canAffordAcademy}
                                    onClick={() => handleSignToAcademy(candidate.id)}
                                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed ${
                                      canAffordAcademy
                                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                                        : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                                    }`}
                                    title="Rekrut ke Driver Academy (+0.8 skill setiap GP)"
                                  >
                                    Sign to Academy
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={!canAffordMain}
                                  onClick={() => handleSignDriver(candidate.id)}
                                  className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed ${
                                    candidate.isInPlayerAcademy
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                      : canAffordMain
                                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                      : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                                  }`}
                                >
                                  {candidate.isInPlayerAcademy
                                    ? 'Promote (FREE)'
                                    : canAffordMain
                                    ? 'Sign Main Driver'
                                    : 'Insufficient Funds'}
                                </button>
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

          {/* TAB 4: CHAMPIONSHIP STANDINGS (WDC & WCC) */}
          {activeTab === 'STANDINGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      World Drivers&apos; Championship (WDC)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {driverStandings.length} DRIVERS
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-[10px] uppercase text-zinc-400">
                        <th className="py-2 pl-3 pr-2 w-10 text-center">Pos</th>
                        <th className="py-2 px-2">Driver</th>
                        <th className="py-2 px-2">Team</th>
                        <th className="py-2 px-2 text-center">Wins</th>
                        <th className="py-2 px-2 text-center">Podiums</th>
                        <th className="py-2 pl-2 pr-4 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {driverStandings.map((d, idx) => (
                        <tr
                          key={d.driverId}
                          className={
                            d.isPlayerControlled
                              ? 'bg-red-950/30 hover:bg-red-950/45'
                              : 'hover:bg-zinc-800/40'
                          }
                        >
                          <td className="py-2 pl-3 pr-2 font-mono font-bold text-center text-zinc-300">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-1 h-4 rounded-full"
                                style={{ backgroundColor: d.teamColor }}
                              />
                              <span className="font-mono font-bold text-white">{d.code}</span>
                              <span className="text-zinc-300">{d.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-zinc-400 text-[11px]">{d.teamName}</td>
                          <td className="py-2 px-2 text-center font-mono text-zinc-300">
                            {d.wins}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-zinc-300">
                            {d.podiums}
                          </td>
                          <td className="py-2 pl-2 pr-4 text-right font-mono font-extrabold text-amber-300">
                            {d.points} PTS
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-red-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Constructors&apos; Championship (WCC)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {constructorStandings.length} TEAMS
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-[10px] uppercase text-zinc-400">
                        <th className="py-2 pl-3 pr-2 w-10 text-center">Pos</th>
                        <th className="py-2 px-2">Constructor</th>
                        <th className="py-2 px-2 text-center">Wins</th>
                        <th className="py-2 pl-2 pr-4 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {constructorStandings.map((t, idx) => (
                        <tr
                          key={t.teamId}
                          className={
                            t.isPlayerTeam
                              ? 'bg-red-950/30 hover:bg-red-950/45'
                              : 'hover:bg-zinc-800/40'
                          }
                        >
                          <td className="py-2.5 pl-3 pr-2 font-mono font-bold text-center text-zinc-300">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-1.5 h-5 rounded-full"
                                style={{ backgroundColor: t.colorHex }}
                              />
                              <span className="font-semibold text-white">{t.teamName}</span>
                              {t.isPlayerTeam && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-red-600/30 text-red-300 border border-red-500/40">
                                  HQ
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-zinc-300">
                            {t.wins}
                          </td>
                          <td className="py-2.5 pl-2 pr-4 text-right font-mono font-extrabold text-amber-300">
                            {t.points} PTS
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KALENDER MUSIM 24 SIRKUIT & RIWAYAT BALAPAN */}
          {activeTab === 'CALENDAR' && (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                      Season {seasonNumber} Official {seasonCalendar.length}-Round Sequential Calendar
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Kalender berjalan berurutan dari Seri 1 hingga Seri 24. Hanya seri berstatus <strong className="text-red-400">NEXT RACE</strong> yang dapat dimulai.
                    </p>
                  </div>
                  {(isFinalRound || isSeasonCompleted) && (
                    <button
                      type="button"
                      onClick={handleEnterOffSeason}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 hover:from-amber-300 hover:to-red-400 text-zinc-950 font-mono text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
                    >
                      ENTER OFF-SEASON (END SEASON {seasonNumber}) →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {seasonCalendar.map((circuitItem, idx) => {
                    const isCompleted = idx < currentRoundIndex;
                    const isNextRace = idx === currentRoundIndex && !isSeasonCompleted;
                    const isLocked = idx > currentRoundIndex;
                    const completedEntry = raceHistory.find(
                      (h) => h.round === idx + 1 || h.circuitId === circuitItem.id
                    );

                    return (
                      <div
                        key={circuitItem.id}
                        className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                          isNextRace
                            ? 'bg-red-950/35 border-red-500'
                            : isCompleted
                            ? 'bg-emerald-950/15 border-emerald-800/50'
                            : 'bg-zinc-900/40 border-zinc-800/60 opacity-55 select-none'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded border font-bold ${
                                isNextRace
                                  ? 'bg-red-950/80 text-red-300 border-red-700/60'
                                  : isCompleted
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                  : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                              }`}
                            >
                              R{String(idx + 1).padStart(2, '0')}
                            </span>

                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> COMPLETED
                              </span>
                            )}
                            {isNextRace && (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-300 font-extrabold uppercase flex items-center gap-1 animate-pulse">
                                <Flag className="w-3 h-3" /> NEXT RACE
                              </span>
                            )}
                            {isLocked && (
                              <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/70 text-zinc-500 font-bold uppercase flex items-center gap-1">
                                <Lock className="w-3 h-3" /> LOCKED
                              </span>
                            )}
                          </div>

                          <h4
                            className={`font-bold text-xs leading-snug ${
                              isLocked ? 'text-zinc-500' : 'text-white'
                            }`}
                          >
                            {circuitItem.name}
                          </h4>
                          <span className="text-[10px] text-zinc-400">
                            {circuitItem.country} • {circuitItem.climateProfile}
                          </span>

                          {isCompleted && (
                            <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-zinc-950/85 border border-emerald-800/40 text-[10px] font-mono flex items-center justify-between">
                              <span className="text-zinc-400">Winner:</span>
                              <span className="text-emerald-400 font-bold">
                                🏆 {completedEntry ? `${completedEntry.winnerName} (${completedEntry.winnerCode})` : 'Completed'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                            <span>{circuitItem.totalLaps} Laps</span>
                            <span>Pit Loss: {circuitItem.pitLossTime}s</span>
                          </div>

                          {isNextRace ? (
                            <button
                              type="button"
                              onClick={() => {
                                selectRoundCircuit(idx);
                                onClose();
                              }}
                              className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              START RACE WEEKEND
                            </button>
                          ) : isCompleted ? (
                            <button
                              type="button"
                              disabled
                              className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-not-allowed"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />
                              RACE COMPLETED
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="w-full py-1.5 px-3 rounded-lg bg-zinc-950/80 border border-zinc-800/70 text-zinc-600 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-not-allowed"
                            >
                              <Lock className="w-3 h-3" />
                              LOCKED (FINISH R{String(currentRoundIndex + 1).padStart(2, '0')})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {raceHistory.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
                    Completed Grand Prix Financial & Sporting Log
                  </h3>
                  <div className="space-y-2">
                    {raceHistory.map((item, i) => (
                      <div
                        key={`${item.round}-${i}`}
                        className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 font-bold text-zinc-300">
                            ROUND {item.round}
                          </span>
                          <div>
                            <div className="font-bold text-white">{item.circuitName}</div>
                            <div className="text-[10px] text-zinc-400">
                              Winner: {item.winnerName} ({item.winnerTeam}) • Sponsor:{' '}
                              {item.sponsorName} (
                              {item.sponsorObjectiveMet ? 'Target Met' : 'Target Missed'})
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-zinc-300">
                            {item.playerDriver1Result.code}:{' '}
                            <strong>P{item.playerDriver1Result.position}</strong>
                          </span>
                          <span className="text-zinc-300">
                            {item.playerDriver2Result.code}:{' '}
                            <strong>P{item.playerDriver2Result.position}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                            Prize: +{formatCurrency(item.prizeMoneyEarned)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold">
                            Sponsor: +{formatCurrency(item.sponsorPayoutEarned)}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-300">
                            Salaries: -{formatCurrency(item.salariesPaid)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="px-6 py-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-mono">
            Next Session: <strong className="text-white">{currentCircuit.name}</strong> • Active
            Sponsor: <strong className="text-emerald-400">{activeSponsor.name}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Return to Pit Wall Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
