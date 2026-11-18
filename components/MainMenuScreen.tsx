'use client';

import React, { useRef, useState } from 'react';
import {
  Play,
  PlusCircle,
  Zap,
  HardDrive,
  Trophy,
  Download,
  Upload,
  RotateCcw,
  Flag,
  Sliders,
  Wrench,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  Users,
  Shield,
  Gauge,
  Menu,
  X,
} from 'lucide-react';
import { useCareerStore } from '../store/useCareerStore';
import { useRaceStore } from '../store/useRaceStore';
import { F1_2026_CIRCUITS, INITIAL_DRIVERS, INITIAL_TEAMS } from '../constants/f1Data';
import { SessionPhase } from '../types/f1';
import { soundEngine } from '../utils/soundEffects';
import { CreateTeamScreen } from './CreateTeamScreen';

type ActiveMenuModal = 'NONE' | 'HUB' | 'NEW_CAREER' | 'CUSTOM_TEAM_BUILDER' | 'QUICK_RACE' | 'SAVE_DATA';

const TEAM_CARD_STYLES: Record<string, { bgHex: string; logo: string }> = {
  mercedes: { bgHex: '#006B60', logo: '/assets/Team-Logo/mercedes.png' },
  'red-bull': { bgHex: '#0A2240', logo: '/assets/Team-Logo/redbull.png' },
  ferrari: { bgHex: '#F00000', logo: '/assets/Team-Logo/ferrari.png' },
  mclaren: { bgHex: '#F47600', logo: '/assets/Team-Logo/mclaren.png' },
  alpine: { bgHex: '#F47AE6', logo: '/assets/Team-Logo/alpine.png' },
  rb: { bgHex: '#245BFF', logo: '/assets/Team-Logo/visa-cash-app.png' },
  audi: { bgHex: '#801800', logo: '/assets/Team-Logo/audi.png' },
  haas: { bgHex: '#B8B8B8', logo: '/assets/Team-Logo/haas.png' },
  williams: { bgHex: '#0B2A8F', logo: '/assets/Team-Logo/williams.png' },
  'aston-martin': { bgHex: '#116149', logo: '/assets/Team-Logo/aston-martin.png' },
  cadillac: { bgHex: '#080808', logo: '/assets/Team-Logo/cadillac.png' },
};

const formatShortDriverPair = (codes: string[]): string =>
  codes
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
    .join('-');

export const MainMenuScreen: React.FC = () => {
  const {
    isTeamCreated,
    teamName,
    teamColor,
    budget,
    seasonNumber,
    currentRoundIndex,
    seasonCalendar,
    driverMarket,
    driverStandings,
    constructorStandings,
    raceHistory,
    continueSavedCareer,
    startOfficialTeamCareer,
    exportSaveData,
    importSaveData,
    resetCareer,
  } = useCareerStore();

  const { startQuickRace } = useRaceStore();

  const [activeModal, setActiveModal] = useState<ActiveMenuModal>('NONE');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedOfficialTeamId, setSelectedOfficialTeamId] = useState<string>('');

  // Quick Race state (3-step wizard: TEAM -> CIRCUIT -> SETTINGS)
  const [quickStep, setQuickStep] = useState<'TEAM' | 'CIRCUIT' | 'SETTINGS'>('TEAM');
  const [quickCircuitId, setQuickCircuitId] = useState<string>('');
  const [quickTeamId, setQuickTeamId] = useState<string>('');
  const [quickRaceSessions, setQuickRaceSessions] = useState<{
    FP1: boolean;
    FP2: boolean;
    FP3: boolean;
    QUALIFYING: boolean;
    WARM_UP: boolean;
  }>({
    FP1: true,
    FP2: false,
    FP3: false,
    QUALIFYING: true,
    WARM_UP: false,
  });
  const [quickGpSettings, setQuickGpSettings] = useState({
    damage: true,
    safetyCar: true,
    dynamicWeather: true,
    tyreAllocation: true,
  });
  const [quickStartPhase, setQuickStartPhase] = useState<SessionPhase>('FREE_PRACTICE');

  // Save Manager feedback state
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentCircuit =
    seasonCalendar[Math.min(seasonCalendar.length - 1, Math.max(0, currentRoundIndex))] ??
    F1_2026_CIRCUITS[0];

  const activeTeamsCount = isTeamCreated ? constructorStandings.length : 11;
  const activeDriversCount = isTeamCreated ? driverStandings.length : 22;

  const savedPlayerDrivers = driverMarket.filter((d) => d.isPlayerControlled);

  // Jika pemain memilih membuat Custom Team baru dari menu Start New Career
  if (activeModal === 'CUSTOM_TEAM_BUILDER') {
    return (
      <div className="relative">
        <div className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                soundEngine.playStrategyClick();
                setActiveModal('NEW_CAREER');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-red-400" />
              <span>KEMBALI KE PILIHAN TIM F1 2026</span>
            </button>
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
              CUSTOM F1 TEAM CREATOR • SEASON 2026
            </span>
          </div>
        </div>
        <CreateTeamScreen />
      </div>
    );
  }

  const handleContinueCareer = () => {
    if (!isTeamCreated) return;
    soundEngine.playStrategyClick();
    soundEngine.playTeamRadioBeep();
    continueSavedCareer();
  };

  const handleStartOfficialTeam = (teamId?: string) => {
    const targetId = teamId || selectedOfficialTeamId || INITIAL_TEAMS[0].id;
    soundEngine.playStrategyClick();
    soundEngine.playTeamRadioBeep();
    startOfficialTeamCareer(targetId);
  };

  const handleLaunchQuickRace = () => {
    soundEngine.playStrategyClick();
    soundEngine.playTeamRadioBeep();
    const targetPhase: SessionPhase =
      quickRaceSessions.FP1 || quickRaceSessions.FP2 || quickRaceSessions.FP3
        ? 'FREE_PRACTICE'
        : quickRaceSessions.QUALIFYING
        ? 'QUALIFYING'
        : quickRaceSessions.WARM_UP
        ? 'PRE_RACE_STRATEGY'
        : 'RACE';
    const targetCircuit = quickCircuitId || F1_2026_CIRCUITS[0].id;
    const targetTeam = quickTeamId || INITIAL_TEAMS[0].id;
    startQuickRace(targetCircuit, targetTeam, targetPhase);
    if (!quickRaceSessions.FP1) {
      if (quickRaceSessions.FP2) {
        useRaceStore.setState({ practiceSession: 'FP2' });
      } else if (quickRaceSessions.FP3) {
        useRaceStore.setState({ practiceSession: 'FP3' });
      }
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result ?? '');
      const result = importSaveData(content);
      setSaveFeedback({
        type: result.success ? 'success' : 'error',
        message: result.message,
      });
      if (result.success) {
        soundEngine.playTeamRadioBeep();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectedOfficialTeam =
    INITIAL_TEAMS.find((t) => t.id === selectedOfficialTeamId) ?? INITIAL_TEAMS[0];
  const selectedOfficialDrivers = INITIAL_DRIVERS.filter(
    (d) => d.teamId === selectedOfficialTeam.id
  );

  const selectedQuickCircuit =
    F1_2026_CIRCUITS.find((c) => c.id === quickCircuitId) ?? F1_2026_CIRCUITS[0];
  const selectedQuickTeam =
    INITIAL_TEAMS.find((t) => t.id === quickTeamId) ?? INITIAL_TEAMS[0];
  const selectedQuickDrivers = INITIAL_DRIVERS.filter((d) => d.teamId === selectedQuickTeam.id);

  return (
    <div
      className="min-h-screen text-zinc-100 flex flex-col justify-between relative overflow-hidden selection:bg-red-600 selection:text-white"
      style={{
        background:
          activeModal === 'NONE'
            ? 'radial-gradient(ellipse 85% 80% at 35% 35%, #5c0606 0%, #240202 48%, #050505 100%)'
            : activeModal === 'HUB' || activeModal === 'NEW_CAREER' || activeModal === 'QUICK_RACE'
            ? 'radial-gradient(ellipse 80% 75% at 50% 48%, #5c0606 0%, #2a0303 52%, #050505 100%)'
            : '#09090b',
      }}
    >
      {/* Top Bar: Logo F1 Kiri + Menu Kanan */}
      <header className="relative z-30 w-full px-6 sm:px-12 pt-6 pb-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveModal('NONE');
              setIsMenuOpen(false);
            }}
            className="flex items-center cursor-pointer"
          >
            <img
              src="/assets/Logo/Formula_One_logo%20logo.png"
              alt="Formula 1"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                soundEngine.playStrategyClick();
                setIsMenuOpen((prev) => !prev);
              }}
              className="flex items-center gap-3 px-4 py-2 rounded border border-white/15 bg-black/25 hover:bg-white/10 text-zinc-100 text-xs font-medium transition cursor-pointer"
            >
              <span>Menu</span>
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto px-6 sm:px-12 flex flex-col justify-between">
        {activeModal === 'NONE' ? (
          <>
            <div className="flex-1 flex flex-col justify-center max-w-xl py-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.08]">
                Formula 1
                <br />
                Manager Game
              </h1>

              <p className="mt-5 text-sm text-zinc-300/80 max-w-sm leading-relaxed">
                A realistic Formula 1 manager game built by a programmer with the help of AI.
              </p>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playStrategyClick();
                    setActiveModal('HUB');
                  }}
                  className="px-8 py-3 rounded border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-white text-sm font-medium transition cursor-pointer"
                >
                  Let&apos;s Started
                </button>
              </div>
            </div>

            <div className="pb-6">
              <p className="text-[11px] text-zinc-400/75">
                Official data from the Formula 1® 2026 Season
              </p>
            </div>
          </>
        ) : activeModal === 'HUB' ? (
          <>
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              <div className="w-full max-w-4xl flex items-center justify-start mb-4">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playStrategyClick();
                    setActiveModal('NONE');
                  }}
                  className="px-4 py-2 rounded border border-white/15 bg-black/25 hover:bg-white/10 text-zinc-200 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              </div>
              <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Continue Carrer */}
                <button
                  type="button"
                  disabled={!isTeamCreated}
                  onClick={handleContinueCareer}
                  className={`group rounded-lg overflow-hidden border border-white/15 bg-[#2a0707]/60 text-left flex items-stretch h-[180px] sm:h-[192px] transition ${
                    isTeamCreated
                      ? 'hover:bg-[#3a0b0b]/75 hover:border-white/25 cursor-pointer'
                      : 'opacity-55 cursor-not-allowed'
                  }`}
                >
                  <div className="w-[34%] relative shrink-0 overflow-hidden bg-zinc-900">
                    <img
                      src="/assets/Menu/Continue-Carrer.png"
                      alt="Continue Carrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Play className="w-9 h-9 text-white stroke-[1.75]" />
                    </div>
                  </div>
                  <div className="flex-1 px-6 py-5 flex flex-col justify-center">
                    <div className="text-xs text-zinc-300/75 mb-1.5">
                      Resume Championship
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
                      Continue Carrer
                    </div>
                    <div className="text-xs text-zinc-300/75">
                      {isTeamCreated ? teamName : 'Team Name'}
                    </div>
                  </div>
                </button>

                {/* 2. Start New Carrer */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playStrategyClick();
                    setActiveModal('NEW_CAREER');
                  }}
                  className="group rounded-lg overflow-hidden border border-white/15 bg-[#2a0707]/60 hover:bg-[#3a0b0b]/75 hover:border-white/25 text-left flex items-stretch h-[180px] sm:h-[192px] transition cursor-pointer"
                >
                  <div className="w-[34%] relative shrink-0 overflow-hidden bg-zinc-900">
                    <img
                      src="/assets/Menu/Start-New-Carrer.png"
                      alt="Start New Carrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-zinc-950 font-bold text-2xl leading-none">
                        +
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 px-6 py-5 flex flex-col justify-center">
                    <div className="text-xs text-zinc-300/75 mb-1.5">
                      F1 2026 World Championship
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
                      Start New Carrer
                    </div>
                    <div className="text-xs text-zinc-300/75 leading-relaxed">
                      Choose 1 of the 11 Official F1 Teams or Create Your Custom Team
                    </div>
                  </div>
                </button>

                {/* 3. Quick Race */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playStrategyClick();
                    setQuickStep('TEAM');
                    setQuickTeamId('');
                    setQuickCircuitId('');
                    setActiveModal('QUICK_RACE');
                  }}
                  className="group rounded-lg overflow-hidden border border-white/15 bg-[#2a0707]/60 hover:bg-[#3a0b0b]/75 hover:border-white/25 text-left flex items-stretch h-[180px] sm:h-[192px] transition cursor-pointer"
                >
                  <div className="w-[34%] relative shrink-0 overflow-hidden bg-zinc-900">
                    <img
                      src="/assets/Menu/Quick-Race.png"
                      alt="Quick Race"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Flag className="w-9 h-9 text-white fill-white/90" />
                    </div>
                  </div>
                  <div className="flex-1 px-6 py-5 flex flex-col justify-center">
                    <div className="text-xs text-zinc-300/75 mb-1.5">
                      Single Grand Prix Mode
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
                      Quick Race
                    </div>
                    <div className="text-xs text-zinc-300/75 leading-relaxed">
                      Directly Select a 2026 F1 Circuit &amp; Team for a Single Race
                    </div>
                  </div>
                </button>

                {/* 4. Import/Export Data Carrer */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playStrategyClick();
                    setSaveFeedback(null);
                    setActiveModal('SAVE_DATA');
                  }}
                  className="group rounded-lg overflow-hidden border border-white/15 bg-[#2a0707]/60 hover:bg-[#3a0b0b]/75 hover:border-white/25 text-left flex items-stretch h-[180px] sm:h-[192px] transition cursor-pointer"
                >
                  <div className="w-[34%] relative shrink-0 overflow-hidden bg-zinc-900">
                    <img
                      src="/assets/Menu/Import-Export.png"
                      alt="Import/Export Data Carrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Download className="w-9 h-9 text-white stroke-[1.75]" />
                    </div>
                  </div>
                  <div className="flex-1 px-6 py-5 flex flex-col justify-center">
                    <div className="text-xs text-zinc-300/75 mb-1.5">
                      Backup &amp; Restore Data
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white leading-tight mb-2">
                      Import/Export Data Carrer
                    </div>
                    <div className="text-xs text-zinc-300/75 leading-relaxed">
                      Download career data or export and reset career
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="pb-6 text-center">
              <p className="text-[11px] text-zinc-400/75">
                Official data from the Formula 1® 2026 Season
              </p>
            </div>
          </>
        ) : activeModal === 'NEW_CAREER' ? (
          <>
            <div className="flex-1 flex flex-col justify-center py-4">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
                    START NEW CAREER • F1 2026 CHAMPIONSHIP
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-normal text-white leading-snug mt-1">
                    Choose an Official 2026 F1 Team
                    <br />
                    or Build a New Custom Team
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playStrategyClick();
                      setActiveModal('HUB');
                    }}
                    className="px-4 py-3 rounded border border-white/15 bg-black/25 hover:bg-white/10 text-zinc-200 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playStrategyClick();
                      setActiveModal('CUSTOM_TEAM_BUILDER');
                    }}
                    className="px-5 py-3 rounded border border-white/15 bg-black/25 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-3 text-left transition cursor-pointer"
                  >
                    <span className="w-6 h-6 rounded-full bg-white text-zinc-950 flex items-center justify-center font-bold text-base leading-none shrink-0">
                      +
                    </span>
                    <span className="leading-tight">
                      Create
                      <br />
                      Custom Team
                    </span>
                  </button>
                </div>
              </div>

              {/* Grid 11 Tim Resmi F1 2026 (4 + 4 + 3 centered) */}
              <div className="flex flex-wrap justify-center gap-3.5">
                {INITIAL_TEAMS.map((team) => {
                  const isSelected = team.id === selectedOfficialTeamId;
                  const teamDrivers = INITIAL_DRIVERS.filter((d) => d.teamId === team.id);
                  const styleSpec = TEAM_CARD_STYLES[team.id] ?? {
                    bgHex: team.colorHex,
                    logo: '',
                  };

                  return (
                    <div
                      key={team.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        soundEngine.playStrategyClick();
                        setSelectedOfficialTeamId(isSelected ? '' : team.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          soundEngine.playStrategyClick();
                          setSelectedOfficialTeamId(isSelected ? '' : team.id);
                        }
                      }}
                      style={{ backgroundColor: styleSpec.bgHex }}
                      className="relative w-full sm:w-[calc(50%-7px)] lg:w-[calc(25%-10.5px)] min-h-[120px] rounded-md p-3.5 text-left border border-white/15 hover:border-white/35 transition cursor-pointer flex flex-col justify-between overflow-hidden select-none"
                    >
                      {/* Top: Logo Kiri + PU & PERF Badges Kanan */}
                      <div className="flex items-start justify-between gap-2">
                        {styleSpec.logo ? (
                          <img
                            src={styleSpec.logo}
                            alt={team.name}
                            className="h-6 max-w-[115px] object-contain object-left"
                          />
                        ) : (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.colorHex }}
                          />
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="bg-white text-zinc-900 text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] whitespace-nowrap">
                            PU: {team.powerUnit}
                          </span>
                          <span className="bg-white text-zinc-900 text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] whitespace-nowrap">
                            PERF: {team.carPerformance}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Nama Tim */}
                      <div className="text-sm font-medium text-white leading-snug mt-2.5 pr-2">
                        {team.name}
                      </div>

                      {/* Bottom: Driver Codes */}
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-[11px] text-white/85">
                          {formatShortDriverPair(teamDrivers.map((d) => d.code))}
                        </span>
                      </div>

                      {/* Selected Overlay (Image 2) */}
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-0 bg-black/75 flex items-center justify-between px-4 z-10 cursor-default"
                        >
                          <div className="text-xs font-medium text-white leading-snug">
                            Start Carrer
                            <br />
                            With This Team?
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartOfficialTeam(team.id);
                            }}
                            className="px-3.5 py-1.5 rounded bg-[#146c43] hover:bg-[#198754] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start</span>
                          </button>

                          <span className="absolute bottom-2 right-2.5 bg-white text-zinc-950 text-[9px] font-bold px-2 py-0.5 rounded-[3px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                            Selected
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pb-6 text-center">
              <p className="text-[11px] text-zinc-400/75">
                Official data from the Formula 1® 2026 Season
              </p>
            </div>
          </>
        ) : activeModal === 'QUICK_RACE' ? (
          <>
            <div className="flex-1 flex flex-col justify-center py-4">
              {quickStep === 'TEAM' ? (
                <>
                  {/* Step 1: Choose Team */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
                        QUICK RACE WEEKEND - SINGLE GRAND PRIX
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-normal text-white leading-snug mt-1">
                        Choose an Official
                        <br />
                        2026 F1 Team
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playStrategyClick();
                          setActiveModal('HUB');
                        }}
                        className="px-5 py-2.5 rounded border border-white/15 bg-black/25 hover:bg-white/10 text-zinc-200 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        disabled={!quickTeamId}
                        onClick={() => {
                          soundEngine.playStrategyClick();
                          setQuickStep('CIRCUIT');
                        }}
                        className="px-10 py-2.5 rounded border border-white/25 bg-black/30 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium tracking-wider transition cursor-pointer"
                      >
                        NEXT
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3.5">
                    {INITIAL_TEAMS.map((team) => {
                      const isSelected = team.id === quickTeamId;
                      const teamDrivers = INITIAL_DRIVERS.filter((d) => d.teamId === team.id);
                      const styleSpec = TEAM_CARD_STYLES[team.id] ?? {
                        bgHex: team.colorHex,
                        logo: '',
                      };

                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playStrategyClick();
                            setQuickTeamId(team.id);
                          }}
                          style={{ backgroundColor: styleSpec.bgHex }}
                          className={`relative w-full sm:w-[calc(50%-7px)] lg:w-[calc(25%-10.5px)] min-h-[120px] rounded-md p-3.5 text-left border transition cursor-pointer flex flex-col justify-between overflow-hidden select-none ${
                            isSelected
                              ? 'border-white ring-1 ring-white/50'
                              : 'border-white/15 hover:border-white/35'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            {styleSpec.logo ? (
                              <img
                                src={styleSpec.logo}
                                alt={team.name}
                                className="h-6 max-w-[115px] object-contain object-left"
                              />
                            ) : (
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: team.colorHex }}
                              />
                            )}

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="bg-white text-zinc-900 text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] whitespace-nowrap">
                                PU: {team.powerUnit}
                              </span>
                              <span className="bg-white text-zinc-900 text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] whitespace-nowrap">
                                PERF: {team.carPerformance}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm font-medium text-white leading-snug mt-2.5 pr-2">
                            {team.name}
                          </div>

                          <div className="flex items-center justify-between mt-2.5">
                            <span className="text-[11px] text-white/85">
                              {formatShortDriverPair(teamDrivers.map((d) => d.code))}
                            </span>
                            {isSelected && (
                              <span className="bg-white text-zinc-950 text-[9px] font-bold px-2 py-0.5 rounded-[3px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                                Selected
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : quickStep === 'CIRCUIT' ? (
                <>
                  {/* Step 2: Choose Circuit */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
                        QUICK RACE WEEKEND - SINGLE GRAND PRIX
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-normal text-white leading-snug mt-1">
                        Choose an Official
                        <br />
                        2026 F1 Circuit
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playStrategyClick();
                          setQuickStep('TEAM');
                        }}
                        className="px-5 py-2.5 rounded border border-white/15 bg-black/25 hover:bg-white/10 text-zinc-200 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        disabled={!quickCircuitId}
                        onClick={() => {
                          soundEngine.playStrategyClick();
                          setQuickStep('SETTINGS');
                        }}
                        className="px-10 py-2.5 rounded border border-white/25 bg-black/30 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium tracking-wider transition cursor-pointer"
                      >
                        NEXT
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {F1_2026_CIRCUITS.map((c) => {
                      const isSelected = c.id === quickCircuitId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playStrategyClick();
                            setQuickCircuitId(c.id);
                          }}
                          className={`rounded-md p-3.5 border text-left transition cursor-pointer flex flex-col justify-between min-h-[84px] ${
                            isSelected
                              ? 'bg-[#360909]/80 border-white/60'
                              : 'bg-[#1a0404]/55 border-white/15 hover:border-white/35'
                          }`}
                        >
                          <div className="text-xs sm:text-[13px] font-medium text-white leading-snug">
                            {c.name}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] text-zinc-300/75">{c.country}</span>
                            {isSelected && (
                              <span className="bg-white text-zinc-950 text-[9px] font-bold px-2 py-0.5 rounded-[3px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                                Selected
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* Step 3: Select Starting Session & Setting */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
                        QUICK RACE WEEKEND - SINGLE GRAND PRIX
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-normal text-white leading-snug mt-1">
                        Select Starting
                        <br />
                        Session &amp; Setting
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playStrategyClick();
                          setQuickStep('CIRCUIT');
                        }}
                        className="px-5 py-2.5 rounded border border-white/15 bg-black/25 hover:bg-white/10 text-zinc-200 text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLaunchQuickRace}
                        className="px-10 py-2.5 rounded border border-white/25 bg-black/30 hover:bg-white/10 text-white text-xs font-medium transition cursor-pointer"
                      >
                        Start
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
                    {/* Left: Race Setting */}
                    <div>
                      <h3 className="text-lg font-normal text-white mb-4">Race Setting</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            { id: 'FP1', label: 'Free Practice 1' },
                            { id: 'QUALIFYING', label: 'Qualifying' },
                            { id: 'FP2', label: 'Free Practice 2' },
                            { id: 'WARM_UP', label: 'Warm-Up' },
                            { id: 'FP3', label: 'Free Practice 3' },
                          ] as const
                        ).map((opt) => {
                          const isChecked = quickRaceSessions[opt.id];
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playStrategyClick();
                                setQuickRaceSessions((prev) => ({
                                  ...prev,
                                  [opt.id]: !prev[opt.id],
                                }));
                              }}
                              className={`px-3.5 py-2.5 rounded border text-left flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                                isChecked
                                  ? 'bg-white/[0.08] border-white/40 text-white'
                                  : 'bg-black/20 border-white/15 text-zinc-200 hover:border-white/30'
                              }`}
                            >
                              <span>{opt.label}</span>
                              <span
                                className={`w-4 h-4 rounded-[3px] border flex items-center justify-center text-[10px] shrink-0 ${
                                  isChecked
                                    ? 'bg-white border-white text-zinc-950 font-bold'
                                    : 'border-white/35'
                                }`}
                              >
                                {isChecked ? '✓' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Grand Prix Settings */}
                    <div>
                      <h3 className="text-lg font-normal text-white mb-4">
                        Grand Prix Settings
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            { key: 'damage', label: 'Damage' },
                            { key: 'safetyCar', label: 'Safety Car' },
                            { key: 'dynamicWeather', label: 'Dynamic Weather' },
                            { key: 'tyreAllocation', label: 'Tyre Allocation' },
                          ] as const
                        ).map((opt) => {
                          const isChecked = quickGpSettings[opt.key];
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                soundEngine.playStrategyClick();
                                setQuickGpSettings((prev) => ({
                                  ...prev,
                                  [opt.key]: !prev[opt.key],
                                }));
                              }}
                              className={`px-3.5 py-2.5 rounded border text-left flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                                isChecked
                                  ? 'bg-white/[0.08] border-white/40 text-white'
                                  : 'bg-black/20 border-white/15 text-zinc-300 hover:border-white/30'
                              }`}
                            >
                              <span className="leading-tight">{opt.label}</span>
                              <span
                                className={`w-4 h-4 rounded-[3px] border flex items-center justify-center text-[10px] shrink-0 ${
                                  isChecked
                                    ? 'bg-white border-white text-zinc-950 font-bold'
                                    : 'border-white/35'
                                }`}
                              >
                                {isChecked ? '✓' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pb-6 text-center">
              <p className="text-[11px] text-zinc-400/75">
                Official data from the Formula 1® 2026 Season
              </p>
            </div>
          </>
        ) : (
          /* PANEL SUB-MENU 4: IMPORT / EXPORT SAVE DATA */
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-3xl mx-auto w-full flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                  LOCAL SAVE DATA MANAGER • JSON BACKUP & RESTORE
                </span>
                <h2 className="text-2xl font-extrabold text-white">
                  Import / Export Career Save Data
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playStrategyClick();
                  setActiveModal('HUB');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>

            {saveFeedback && (
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-mono ${
                  saveFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/15 border-red-500/40 text-red-300'
                }`}
              >
                {saveFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{saveFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export Save Data */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>Export Save Data (.JSON)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Unduh seluruh progres karier saat ini (Anggaran, Level R&D, Klasemen, dan Riwayat
                    Balapan) sebagai file backup di komputer Anda.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playStrategyClick();
                    exportSaveData();
                    setSaveFeedback({
                      type: 'success',
                      message: 'File backup .json berhasil diunduh ke komputer Anda.',
                    });
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>DOWNLOAD BACKUP JSON</span>
                </button>
              </div>

              {/* Import Save Data */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Import Save Data (.JSON)</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Pulihkan progres karier dari file JSON yang pernah Anda simpan sebelumnya.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJsonFile}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>PILIH FILE SAVE JSON</span>
                </button>
              </div>
            </div>

            {/* Reset Career Section */}
            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono font-bold uppercase text-red-300">
                  Hapus Save Data & Reset Karier
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Menghapus progres karier di localStorage dan mengembalikan ke awal musim 2026.
                </p>
              </div>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-mono text-xs font-bold uppercase cursor-pointer shrink-0"
                >
                  Reset Career
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetCareer();
                      setConfirmReset(false);
                      setSaveFeedback({
                        type: 'success',
                        message: 'Save data karier berhasil di-reset.',
                      });
                    }}
                    className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase cursor-pointer"
                  >
                    Ya, Hapus Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Driver Trio Hero Visual (exact crop & overlap matching Figma) */}
      {activeModal === 'NONE' && (
        <div className="pointer-events-none select-none absolute bottom-0 right-0 sm:right-4 lg:right-8 z-10 w-[340px] sm:w-[460px] lg:w-[540px] xl:w-[580px] h-[68vh] sm:h-[78vh] lg:h-[84vh] opacity-40 sm:opacity-100">
          <img
            src="/assets/Rider/Hamilton.png"
            alt="Lewis Hamilton"
            className="absolute left-[5%] bottom-[-52%] h-[132%] w-auto max-w-none object-contain object-bottom z-20"
          />
          <img
            src="/assets/Rider/Antonelli.png"
            alt="Kimi Antonelli"
            className="absolute left-[26%] bottom-[-48%] h-[142%] w-auto max-w-none object-contain object-bottom z-10"
          />
          <img
            src="/assets/Rider/Max.png"
            alt="Max Verstappen"
            className="absolute right-[2%] bottom-[-50%] h-[136%] w-auto max-w-none object-contain object-bottom z-20"
          />
        </div>
      )}

      {/* Footer Info (hidden on landing, hub, team select, and quick race screens so they match Figma cleanly) */}
      {activeModal !== 'NONE' && activeModal !== 'HUB' && activeModal !== 'NEW_CAREER' && activeModal !== 'QUICK_RACE' && (
        <footer className="relative z-10 w-full border-t border-zinc-900 bg-zinc-950 px-6 py-3 text-xs font-mono text-zinc-500">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>F1 2026 MOTORSPORT MANAGER</span>
            <span>COMPLETED RACES: {raceHistory.length}</span>
          </div>
        </footer>
      )}
    </div>
  );
};
