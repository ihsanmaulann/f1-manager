import { create } from 'zustand';
import {
  CarPartDamageMap,
  TeamRadioMessage,
  TeamRadioTriggerCategory,
  CarPhysicalPartType,
  CarSetup,
  CircuitInfo,
  DefendMode,
  DriverState,
  ERSMode,
  FlagStatus,
  MediaDayBuffs,
  MediaDayChoiceType,
  OvertakeAggression,
  PaceMode,
  PlayerLapTelemetryEntry,
  PracticeRunTelemetry,
  PracticeSessionType,
  PracticeStandingEntry,
  QualifyingDriverStageState,
  QualifyingStage,
  SectorPerformance,
  SessionPhase,
  SprintResultEntry,
  TyreAllocationMap,
  TyreCompound,
  WeatherForecastItem,
  WeatherTimelineEntry,
  WeatherType,
} from '../types/f1';
import {
  calculateSetupConfidence,
  CIRCUIT_OPTIMAL_SETUPS,
  DEFAULT_CAR_SETUP,
  DEFAULT_CIRCUIT,
  DEFAULT_WEEKEND_TYRE_ALLOCATION,
  ERS_MODE_MODIFIERS,
  EXTERNAL_DRIVERS_POOL,
  F1_2026_CIRCUITS,
  generateDriverOptimalSetup,
  generateWeatherTimeline,
  getCircuitActiveAeroZones,
  getCircuitFuelBurn2026,
  getStandardFuelLoad2026,
  INITIAL_DRIVERS,
  INITIAL_TEAMS,
  MAX_FUEL_LOAD_2026_KG,
  PACE_MODE_MODIFIERS,
  SPRINT_POINTS_2026,
  TYRE_SPECS,
  WEATHER_TRANSITION_CONFIG,
} from '../constants/f1Data';
import { soundEngine } from '../utils/soundEffects';

export type RaceStatus = 'IDLE' | 'RACING' | 'PAUSED' | 'FINISHED';
export type SimulationSpeed = 1 | 2 | 4;
export type RaceLogType = 'INFO' | 'PIT' | 'FASTEST_LAP' | 'INCIDENT';

export interface RaceLog {
  id: string;
  lap: number;
  message: string;
  type: RaceLogType;
}

export interface QualifyingResult {
  driverId: string;
  name: string;
  code: string;
  number: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  position: number;
  lapTime: number;
  gapToPole: number;
  sector1: number;
  sector2: number;
  sector3: number;
  setupConfidence: number;
  isPlayerControlled: boolean;
}

export interface RaceState {
  // 1. State Utama
  sessionPhase: SessionPhase;
  raceStatus: RaceStatus;
  simulationSpeed: SimulationSpeed;
  currentLap: number;
  totalLaps: number;
  weather: WeatherType;
  trackWetness: number; // 0 - 100
  /** Timeline cuaca pra-generate dari Lap 1 s/d Total Laps berdasarkan climateProfile sirkuit */
  weatherTimeline: WeatherTimelineEntry[];
  /** Window 10 lap ke depan dari weatherTimeline untuk tampilan radar UI */
  weatherForecast: WeatherForecastItem[];
  flagStatus: FlagStatus;
  drivers: DriverState[];
  raceLogs: RaceLog[];

  // State Pre-Race Free Practice, Car Setup, Qualifying & Strategy (Langkah 7, Upgrade 2 & Patch 3)
  carSetups: Record<string, CarSetup>;
  /** Preferensi idealSetup unik masing-masing pembalap berdasarkan gaya balapnya (Patch 1) */
  driverOptimalSetups: Record<string, CarSetup>;
  setupConfidences: Record<string, number>;
  /** Sisa waktu sesi Free Practice dalam menit (mulai dari 60 menit) */
  practiceMinutesRemaining: number;
  /** Sesi Free Practice aktif saat ini: FP1, FP2, atau FP3 (Patch 3) */
  practiceSession: PracticeSessionType;
  /** Sisa detik sesi Free Practice aktif (mulai dari 3600 detik = 60 menit) */
  practiceClockSeconds: number;
  /** Status loop simulasi lintasan 2D saat Free Practice */
  isPracticeSimulating: boolean;
  /** Akumulasi pengetahuan lintasan & setup pembalap dari FP1 -> FP2 -> FP3 (0 - 12%) */
  practiceKnowledge: Record<string, number>;
  /** Tabel klasemen waktu Free Practice ke-22 pembalap */
  practiceStandings: PracticeStandingEntry[];
  /** Riwayat 5-Lap Telemetry Run tiap pembalap player selama Free Practice */
  practiceRuns: Record<string, PracticeRunTelemetry[]>;
  /** Tahap Knockout Qualifying aktif: Q1 (18m), Q2 (15m), Q3 (12m) (Patch 3) */
  qualifyingStage: QualifyingStage;
  /** Sisa waktu tahap Qualifying aktif dalam detik (1080 / 900 / 720) */
  qualifyingClockSeconds: number;
  /** Status simulasi real-time di sesi Qualifying */
  isQualiSimulating: boolean;
  /** Menandakan apakah tahap Q1/Q2/Q3 saat ini telah selesai (waktu habis & grid eliminasi diputuskan) */
  qualifyingStageFinished: boolean;
  /** Status run (IN_GARAGE / OUT_LAP / FLYING_LAP / IN_LAP / ELIMINATED) & waktu tiap pembalap */
  qualifyingDriversState: Record<string, QualifyingDriverStageState>;
  qualifyingResults: QualifyingResult[];
  /** Pilihan kompon ban start (Starting Tyre Compound) untuk pembalap player di layar Pre-Race Strategy */
  preRaceStartingTyres: Record<string, TyreCompound>;
  /** Pilihan bahan bakar awal (kg) untuk pembalap player di layar Pre-Race Strategy */
  preRaceStartingFuel: Record<string, number>;
  /** Akurasi radar meteorologi tim untuk laporan cuaca Pre-Race (0 - 100%) */
  radarAccuracyPercent: number;
  /** Buff dan efek dari sesi Thursday Media Day Press Conference (Patch 2) */
  mediaDayBuffs: MediaDayBuffs;
  /** Menyimpan roster aktif (termasuk perubahan dari Bursa Transfer Pembalap di Langkah 9) */
  rosterDrivers: DriverState[];

  // Metadata tambahan untuk akurasi simulasi & informasi UI
  circuit: CircuitInfo;
  fastestLapDriverId: string | null;
  fastestLapTime: number;
  /** Menyimpan sisa waktu berhenti di pit (detik) untuk tiap driverId */
  pitRemainingTime: Record<string, number>;
  /** Menyimpan akumulasi waktu lap berjalan (detik) untuk tiap driverId */
  currentLapElapsed: Record<string, number>;
  /** Menyimpan sisa durasi bendera kuning dalam jumlah tick */
  flagRemainingTicks: number;
  /** Menyimpan lap berakhirnya periode Safety Car / VSC (3-5 lap) */
  flagEndLap: number | null;
  /** Riwayat telemetri balapan per-lap khusus pembalap tim player */
  playerLapTelemetry: Record<string, PlayerLapTelemetryEntry[]>;
  /** Alokasi set ban tersisa akhir pekan ini untuk setiap pembalap player */
  weekendTyreAllocation: Record<string, TyreAllocationMap>;
  /** Apakah Parc Fermé sudah terkunci (setelah Qualifying dimulai) */
  parcFermeLocked: boolean;
  /** Catatan pelanggaran Parc Fermé per driverId (memicu Pit Lane Start) */
  parcFermeBreached: Record<string, boolean>;
  /** Hasil Sprint Qualifying & Sprint Race (khusus 6 seri Sprint Weekend 2026) */
  sprintQualifyingResults: QualifyingResult[];
  sprintRaceResults: SprintResultEntry[];
  isSprintCompleted: boolean;
  playerPitCrewStopSeconds: number;
  playerPitCrewErrorPercent: number;
  teamRadioMessages: TeamRadioMessage[];
  activeTeamRadioPopup: TeamRadioMessage | null;

  // 2. Actions / Functions
  dismissTeamRadioPopup: () => void;
  startRace: () => void;
  pauseRace: () => void;
  setSimulationSpeed: (speed: SimulationSpeed) => void;
  resetRace: () => void;
  setDriverStrategy: (driverId: string, paceMode: PaceMode, ersMode: ERSMode) => void;
  setDriverTactics: (
    driverId: string,
    tactics: {
      overtakeAggression?: OvertakeAggression;
      defendMode?: DefendMode;
      letTeammatePass?: boolean;
      avoidHighRiskKerbs?: boolean;
    }
  ) => void;
  syncPitCrewAndMentalities: (
    estimatedStopSeconds: number,
    errorChancePercent: number,
    driverMentalities: Record<string, number>
  ) => void;
  applyGaragePartRepair: (
    driverId: string,
    partType: CarPhysicalPartType | 'ALL',
    triggerParcFermeBreach?: boolean
  ) => void;
  orderPitStop: (driverId: string, nextCompound: TyreCompound) => void;
  cancelPitStop: (driverId: string) => void;
  toggleRepairWingOnNextPit: (driverId: string, forceValue?: boolean) => void;
  retireCarToGarage: (driverId: string) => void;
  answerMediaDayQuestion: (
    questionIndex: number,
    choice: MediaDayChoiceType
  ) => { newlyAnswered: boolean; choice: MediaDayChoiceType };
  proceedFromMediaDayToFP: () => void;
  updateCarSetup: (driverId: string, setupUpdate: Partial<CarSetup>) => void;
  runFreePracticeStint: (
    driverId: string,
    tyreCompound?: TyreCompound
  ) => PracticeRunTelemetry | null;
  sendCarsOutPractice: (
    driverIds: string[],
    compoundByDriver?: Record<string, TyreCompound>
  ) => void;
  recallCarsPractice: (driverIds: string[]) => void;
  simulatePracticeFlyingLaps: (compoundByDriver?: Record<string, TyreCompound>) => void;
  togglePracticeSimulation: (running?: boolean) => void;
  tickPractice: () => void;
  advancePracticeSession: () => void;
  proceedToQualifying: () => void;
  initQualifyingSession: () => void;
  sendDriverOutQualifying: (driverId: string, tyreCompound?: TyreCompound) => void;
  toggleQualiSimulation: (running?: boolean) => void;
  tickQualifying: () => void;
  fastForwardQualiStage: () => void;
  advanceQualifyingStage: () => void;
  runQualifying: () => QualifyingResult[];
  proceedToPreRaceStrategy: () => void;
  applyGridPenalties: (car1Penalty: number, car2Penalty: number) => void;
  redFlagFreeTyreSwap: (driverId: string, compound: TyreCompound) => void;
  runSprintQualifying: () => QualifyingResult[];
  runSprintRace: (playerStartingTyres?: Record<string, TyreCompound>) => SprintResultEntry[];
  proceedFromSprintToQualifying: () => void;
  initializeStartingTyresForAI: () => void;
  setPreRaceDriverConfig: (
    driverId: string,
    startingTyre: TyreCompound,
    fuelLoadKg: number
  ) => void;
  proceedToGrid: () => void;
  setSessionPhase: (phase: SessionPhase) => void;
  applyPlayerUpgrades: (paceBonus: number, tyreMgmtBonus: number) => void;
  loadCircuit: (circuit: CircuitInfo, paceBonus?: number, tyreMgmtBonus?: number) => void;
  transferDriverInRaceStore: (
    targetDriverId: string,
    replacePlayerDriverId: string,
    paceBonus: number,
    tyreMgmtBonus: number,
    incomingOverride?: {
      name: string;
      code: string;
      number: number;
      basePace: number;
      tyreManagement: number;
    }
  ) => void;
  syncFromCareerState: (
    circuit: CircuitInfo,
    playerDriverIds: string[],
    paceBonus: number,
    tyreMgmtBonus: number,
    customTeamName?: string,
    customTeamColor?: string,
    targetPhase?: SessionPhase,
    driverStatsMap?: Record<string, { basePace: number; tyreManagement: number }>,
    teamPerformanceMap?: Record<string, number>,
    activeGridEntries?: Array<{
      id: string;
      name: string;
      code: string;
      number: number;
      age?: number;
      potential?: number;
      category?: DriverState['category'];
      teamId: string;
      teamName: string;
      teamColor: string;
      basePace: number;
      tyreManagement: number;
      isPlayerControlled: boolean;
    }>
  ) => void;
  startQuickRace: (
    circuitId: string,
    teamId: string,
    startingPhase?: SessionPhase
  ) => void;
  tick: () => void;
}

/** Durasi waktu simulasi dasar per 1 pemanggilan tick (dalam detik simulasi) */
const BASE_TICK_SECONDS = 1.0;

/** Penalti waktu lap per kg bahan bakar E-Fuel 2026 (detik/kg) */
const FUEL_WEIGHT_PENALTY_PER_KG = 0.042;

/** Durasi tambahan pit stop untuk memperbaiki sayap depan yang rusak (+4.5 detik) */
const WING_REPAIR_PIT_TIME_PENALTY = 4.5;

/** Map performa mobil berdasarkan teamId untuk perhitungan pace yang akurat (diperbarui setiap pergantian musim) */
let TEAM_PERFORMANCE_MAP: Record<string, number> = INITIAL_TEAMS.reduce(
  (acc, team) => {
    acc[team.id] = team.carPerformance;
    return acc;
  },
  {} as Record<string, number>
);

/** Map statistik dasar pembalap sebelum bonus R&D mobil player (diperbarui saat Driver Academy / Off-Season Aging) */
const CURRENT_DRIVER_BASE_STATS: Record<
  string,
  { basePace: number; tyreManagement: number }
> = {};
INITIAL_DRIVERS.forEach((d) => {
  CURRENT_DRIVER_BASE_STATS[d.id] = {
    basePace: d.basePace,
    tyreManagement: d.tyreManagement,
  };
});
EXTERNAL_DRIVERS_POOL.forEach((e) => {
  CURRENT_DRIVER_BASE_STATS[e.id] = {
    basePace: e.basePace,
    tyreManagement: e.tyreManagement,
  };
});

const isSlickTyre = (compound: TyreCompound): boolean =>
  compound === 'SOFT' || compound === 'MEDIUM' || compound === 'HARD';

/**
 * Mengambil window 10 lap ke depan dari weatherTimeline mulai dari currentLap.
 */
const sliceWeatherForecastWindow = (
  timeline: WeatherTimelineEntry[],
  fromLap: number
): WeatherForecastItem[] => {
  const upcoming = timeline.filter((entry) => entry.lap >= fromLap);
  if (upcoming.length >= 10) {
    return upcoming.slice(0, 10);
  }
  const padded = [...upcoming];
  const lastEntry =
    timeline[timeline.length - 1] ?? {
      lap: fromLap,
      weather: 'DRY' as WeatherType,
      rainProbability: 5,
      projectedWetness: 0,
    };
  while (padded.length < 10) {
    const nextLap = (padded[padded.length - 1]?.lap ?? fromLap) + 1;
    padded.push({
      ...lastEntry,
      lap: nextLap,
    });
  }
  return padded;
};

const createInitialDriverMaps = (drivers: DriverState[]) => {
  const pitRemainingTime: Record<string, number> = {};
  const currentLapElapsed: Record<string, number> = {};

  for (const d of drivers) {
    pitRemainingTime[d.id] = 0;
    currentLapElapsed[d.id] = d.gapToLeader;
  }

  return { pitRemainingTime, currentLapElapsed };
};

const createInitialTyreAllocation = (roster: DriverState[]): Record<string, TyreAllocationMap> => {
  const map: Record<string, TyreAllocationMap> = {};
  roster
    .filter((d) => d.isPlayerControlled)
    .forEach((d) => {
      map[d.id] = { ...DEFAULT_WEEKEND_TYRE_ALLOCATION };
    });
  return map;
};

const createInitialPlayerSetups = (
  circuit: CircuitInfo,
  roster: DriverState[] = INITIAL_DRIVERS,
  startWeather: WeatherType = 'DRY',
  startWetness = 0
) => {
  const carSetups: Record<string, CarSetup> = {};
  const driverOptimalSetups: Record<string, CarSetup> = {};
  const setupConfidences: Record<string, number> = {};
  const practiceRuns: Record<string, PracticeRunTelemetry[]> = {};
  const preRaceStartingTyres: Record<string, TyreCompound> = {};
  const preRaceStartingFuel: Record<string, number> = {};
  const defaultFuel = getStandardFuelLoad2026(circuit);
  const defaultStartTyre: TyreCompound =
    startWetness >= 55 || startWeather === 'HEAVY_RAIN'
      ? 'WET'
      : startWetness >= 20 || startWeather === 'LIGHT_RAIN'
      ? 'INTER'
      : 'MEDIUM';

  roster
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.number - b.number)
    .forEach((d, idx) => {
      const idealSetup = generateDriverOptimalSetup(circuit, d, idx);
      driverOptimalSetups[d.id] = idealSetup;
      const initialSetup = { ...DEFAULT_CAR_SETUP };
      carSetups[d.id] = initialSetup;
      setupConfidences[d.id] = Number(
        (calculateSetupConfidence(initialSetup, circuit, idealSetup) * 0.88).toFixed(1)
      );
      practiceRuns[d.id] = [];
      preRaceStartingTyres[d.id] = defaultStartTyre;
      preRaceStartingFuel[d.id] = defaultFuel;
    });

  return {
    carSetups,
    driverOptimalSetups,
    setupConfidences,
    practiceRuns,
    preRaceStartingTyres,
    preRaceStartingFuel,
  };
};

/**
 * Menginisialisasi kompon ban start untuk seluruh pembalap AI berdasarkan kondisi cuaca & kebasahan trek (Patch 1):
 * - Jika trackWetness >= 55% atau cuaca 'HEAVY_RAIN', 100% AI WAJIB start menggunakan ban 'WET'.
 * - Jika trackWetness antara 20% - 54% atau cuaca 'LIGHT_RAIN', 100% AI WAJIB start menggunakan ban 'INTER'.
 * - Jika trackWetness < 20%, AI memilih antara 'SOFT' atau 'MEDIUM' berdasarkan posisi grid.
 */
export const applyAIStartingTyres = (
  drivers: DriverState[],
  trackWetness: number,
  weather: WeatherType
): DriverState[] => {
  return drivers.map((d) => {
    if (d.isPlayerControlled) {
      return {
        ...d,
        usedCompounds: [d.tyreCompound],
      };
    }

    if (trackWetness >= 55 || weather === 'HEAVY_RAIN') {
      return {
        ...d,
        tyreCompound: 'WET',
        nextTyreCompound: 'INTER',
        usedCompounds: ['WET'],
      };
    }

    if (trackWetness >= 20 || weather === 'LIGHT_RAIN') {
      return {
        ...d,
        tyreCompound: 'INTER',
        nextTyreCompound: 'MEDIUM',
        usedCompounds: ['INTER'],
      };
    }

    const dryStartCompound: TyreCompound =
      d.position <= 10
        ? d.position % 2 === 1
          ? 'SOFT'
          : 'MEDIUM'
        : d.position % 3 === 0
        ? 'SOFT'
        : 'MEDIUM';

    return {
      ...d,
      tyreCompound: dryStartCompound,
      nextTyreCompound: dryStartCompound === 'SOFT' ? 'MEDIUM' : 'HARD',
      usedCompounds: [dryStartCompound],
    };
  });
};

const formatLapTime = (seconds: number): string => {
  if (seconds <= 0 || !Number.isFinite(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
};

const createLog = (lap: number, message: string, type: RaceLogType): RaceLog => ({
  id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
  lap,
  message,
  type,
});

/**
 * Memilih kompon ban terbaik untuk AI berdasarkan kondisi cuaca, ramalan cuaca terdekat, dan sisa lap balapan.
 */
const selectBestAICompound = (
  currentCompound: TyreCompound,
  trackWetness: number,
  weather: WeatherType,
  remainingLaps: number,
  usedCompounds: TyreCompound[] = [currentCompound]
): TyreCompound => {
  if (trackWetness >= 65 || weather === 'HEAVY_RAIN') {
    return 'WET';
  }
  if (trackWetness >= 28 || weather === 'LIGHT_RAIN') {
    return 'INTER';
  }

  const usedDry = new Set(usedCompounds.filter(isSlickTyre));
  const pickDifferentDry = (preferred: TyreCompound, fallback: TyreCompound): TyreCompound => {
    if (preferred !== currentCompound && !usedDry.has(preferred)) return preferred;
    if (fallback !== currentCompound && !usedDry.has(fallback)) return fallback;
    const unusedDry = (['MEDIUM', 'HARD', 'SOFT'] as TyreCompound[]).find(
      (c) => c !== currentCompound && !usedDry.has(c)
    );
    if (unusedDry) return unusedDry;
    return preferred !== currentCompound ? preferred : fallback;
  };

  if (remainingLaps <= 14) {
    return pickDifferentDry('SOFT', 'MEDIUM');
  }
  if (remainingLaps <= 26) {
    return pickDifferentDry('MEDIUM', 'HARD');
  }
  return pickDifferentDry('HARD', 'MEDIUM');
};

export const createZeroPartDamage = (): CarPartDamageMap => ({
  frontWing: 0,
  rearWing: 0,
  floor: 0,
  sidepods: 0,
  suspension: 0,
  chassis: 0,
});

export const getDriverPartDamage = (driver: Pick<DriverState, 'partDamage' | 'wingDamage'>): CarPartDamageMap => ({
  ...createZeroPartDamage(),
  ...(driver.partDamage ?? {}),
  frontWing: driver.partDamage?.frontWing ?? driver.wingDamage ?? 0,
});

export const computeTotalPartDamagePaceLoss = (partDamage: CarPartDamageMap): number => {
  const loss =
    (partDamage.frontWing / 100) * 3.2 +
    (partDamage.rearWing / 100) * 3.0 +
    (partDamage.floor / 100) * 4.2 +
    (partDamage.sidepods / 100) * 2.4 +
    (partDamage.suspension / 100) * 3.8 +
    (partDamage.chassis / 100) * 2.8;
  return Number(loss.toFixed(3));
};

const PART_DAMAGE_WEIGHTED_POOL: Array<{
  part: CarPhysicalPartType;
  label: string;
}> = [
  { part: 'frontWing', label: 'Front Wing Endplate' },
  { part: 'frontWing', label: 'Front Wing Mainplane' },
  { part: 'floor', label: 'Underfloor Venturi Edge' },
  { part: 'floor', label: 'Floor & Diffuser Strake' },
  { part: 'suspension', label: 'Suspension Wishbone' },
  { part: 'sidepods', label: 'Sidepod Cooling Louvres' },
  { part: 'rearWing', label: 'Rear Wing & Beam Wing' },
  { part: 'chassis', label: 'Monocoque Chassis' },
];

const rollRandomPartDamageIncident = (
  currentMap: CarPartDamageMap,
  severity: 'WEAR' | 'MINOR' | 'MEDIUM' | 'HEAVY'
): {
  nextMap: CarPartDamageMap;
  damagedPart: CarPhysicalPartType;
  damagedPartLabel: string;
  addedAmount: number;
} => {
  const nextMap = { ...currentMap };
  const picked =
    PART_DAMAGE_WEIGHTED_POOL[Math.floor(Math.random() * PART_DAMAGE_WEIGHTED_POOL.length)];
  const [minDmg, maxDmg] =
    severity === 'WEAR'
      ? [2, 6]
      : severity === 'MINOR'
      ? [10, 26]
      : severity === 'MEDIUM'
      ? [18, 42]
      : [30, 62];
  const addedAmount = Math.round(minDmg + Math.random() * (maxDmg - minDmg));
  nextMap[picked.part] = Math.min(100, (nextMap[picked.part] ?? 0) + addedAmount);

  // Kadang ikut menggores floor / suspension saat benturan sedang atau berat
  if ((severity === 'MEDIUM' || severity === 'HEAVY') && picked.part !== 'floor' && Math.random() < 0.45) {
    nextMap.floor = Math.min(100, (nextMap.floor ?? 0) + Math.round(addedAmount * 0.45));
  }

  return {
    nextMap,
    damagedPart: picked.part,
    damagedPartLabel: picked.label,
    addedAmount,
  };
};

/**
 * Menghitung estimasi waktu 1 lap penuh (detik) untuk seorang pembalap pada detik ini
 * berdasarkan atribut pembalap, mobil, setupConfidence, ban, multi-part damage, bahan bakar, cuaca, ERS, dan bendera.
 */
const calculateTargetLapTime = (
  driver: DriverState,
  circuit: CircuitInfo,
  trackWetness: number,
  flagStatus: FlagStatus,
  setupConfidence = 82,
  inOverrideZone = true
): number => {
  const tyreSpec = TYRE_SPECS[driver.tyreCompound];
  const paceMod = PACE_MODE_MODIFIERS[driver.paceMode];
  const ersMod = ERS_MODE_MODIFIERS[driver.ersMode];
  const carPerf = TEAM_PERFORMANCE_MAP[driver.teamId] ?? 88;

  // 1. Waktu dasar sirkuit
  let lapTime = circuit.baseLapTime;

  // 2. Pengaruh skill basePace pembalap (80-99) & performa mobil (80-99)
  const driverSkillDelta = (99 - driver.basePace) * 0.085;
  const carPerfDelta = (99 - carPerf) * 0.095;
  lapTime += driverSkillDelta + carPerfDelta;

  // 3. Bonus Setup Mobil (setupConfidence 0 - 100% memberikan bonus 0.0s hingga -0.8s per lap)
  const setupBonusSeconds = (Math.max(0, Math.min(100, setupConfidence)) / 100) * 0.8;
  lapTime -= setupBonusSeconds;

  // 4. Penalti Kerusakan Multi-Komponen (Front Wing, Rear Wing, Floor, Sidepods, Suspension, Chassis)
  const partDamageMap = getDriverPartDamage(driver);
  lapTime += computeTotalPartDamagePaceLoss(partDamageMap);

  // 5. Bonus grip ban dasar
  lapTime += tyreSpec.gripBonus;

  // 6. Penalti usia & keausan ban normal + TYRE CLIFF drastis jika tyreHealth < 30%
  const tyreWearLost = 100 - driver.tyreHealth;
  lapTime += tyreWearLost * 0.025;

  if (driver.tyreHealth < 30) {
    const cliffSeverity = (30 - driver.tyreHealth) / 30;
    const cliffPenalty = 4.5 + Math.pow(cliffSeverity, 1.6) * 12.0;
    lapTime += cliffPenalty;
  }

  // 7. Penalti ketidakcocokan ban dengan tingkat kebasahan trek (trackWetness)
  if (isSlickTyre(driver.tyreCompound) && trackWetness > 30) {
    const excessWetness = trackWetness - 30;
    const slickOnWetPenalty = 7.5 + excessWetness * 0.28;
    lapTime += slickOnWetPenalty;
  } else if (driver.tyreCompound === 'INTER') {
    if (trackWetness < 15) {
      lapTime += (15 - trackWetness) * 0.25;
    } else if (trackWetness > 65) {
      lapTime += (trackWetness - 65) * 0.3;
    } else {
      lapTime -= 2.2;
    }
  } else if (driver.tyreCompound === 'WET') {
    if (trackWetness < 55) {
      lapTime += (55 - trackWetness) * 0.22;
    } else {
      lapTime -= 4.8;
    }
  }

  // 8. Penalti perlambatan alami karena cuaca basah pada lintasan secara umum
  if (trackWetness > 0) {
    lapTime += (trackWetness / 100) * 9.5;
  }

  // 9. Pengaruh beban bahan bakar (Fuel Load)
  if (driver.fuelLoad > 0) {
    lapTime += driver.fuelLoad * FUEL_WEIGHT_PENALTY_PER_KG;
  } else {
    lapTime += 25.0;
  }

  // 10. Pengaruh Pace Mode & 2026 Active Aero (X/Z-Mode) & Manual Override Mode (350kW Overtake Boost <= 1.0s)
  lapTime += paceMod.lapTimeDelta;

  if (flagStatus === 'GREEN') {
    // Active Aero X-Mode (low drag di trek lurus untuk semua mobil)
    lapTime -= 0.22;
  }

  if (driver.ersMode === 'DEPLOY') {
    if (driver.ersBattery > 1) {
      const isOverrideBoostEligible =
        flagStatus === 'GREEN' &&
        driver.currentLap >= 2 &&
        driver.position > 1 &&
        driver.interval <= 1.0 &&
        inOverrideZone;
      lapTime += isOverrideBoostEligible ? -0.65 : -0.22;
    }
  } else {
    lapTime += ersMod.lapTimeDelta;
  }

  // 11. F1 Manager 24: Driver Mentality, Avoid High-Risk Kerbs & Aggressive Defend Tradeoff
  const mentalityMod = ((driver.mentality ?? 75) - 75) * -0.006;
  lapTime += mentalityMod;
  if (driver.avoidHighRiskKerbs) {
    lapTime += 0.12;
  }
  if (driver.defendMode === 'ALWAYS' && driver.interval <= 1.2) {
    lapTime += 0.07;
  }

  // 11. Pengaruh Flag Status (Yellow / VSC / Safety Car / Red Flag)
  // Saat SC atau VSC aktif, seluruh pembalap wajib mematuhi delta kecepatan FIA yang seragam
  // (abaikan keuntungan paceMode PUSH / ERS DEPLOY agar jarak aman & urutan terjaga)
  if (flagStatus === 'RED') {
    return Number((circuit.baseLapTime * 2.5).toFixed(3));
  }
  if (flagStatus === 'VSC') {
    const fuelEmptyPenalty = driver.fuelLoad <= 0 ? 25.0 : 0;
    const wetMismatchPenalty =
      isSlickTyre(driver.tyreCompound) && trackWetness > 45
        ? (trackWetness - 45) * 0.12
        : 0;
    return Number((circuit.baseLapTime * 1.38 + fuelEmptyPenalty + wetMismatchPenalty).toFixed(3));
  }
  if (flagStatus === 'SC') {
    const fuelEmptyPenalty = driver.fuelLoad <= 0 ? 25.0 : 0;
    return Number((circuit.baseLapTime * 1.55 + fuelEmptyPenalty).toFixed(3));
  }
  if (flagStatus === 'YELLOW') {
    lapTime *= 1.08;
  }

  return Math.max(circuit.baseLapTime * 0.85, lapTime);
};

const createDefaultMediaDayBuffs = (prevReputation = 78): MediaDayBuffs => ({
  qualyPaceBonusSeconds: 0,
  consistencyCrashReduction: 0,
  pitStopTimeReductionSeconds: 0,
  sponsorBonusEarned: 0,
  highExpectationCount: 0,
  teamReputation: prevReputation,
  answeredQuestions: {},
});

const QUALI_STAGE_DURATIONS: Record<QualifyingStage, number> = {
  Q1: 1080, // 18:00
  Q2: 900,  // 15:00
  Q3: 720,  // 12:00
};

const computeEffectiveConfidence = (sliderConfidence: number, trackKnowledge: number): number => {
  const weightedSlider = sliderConfidence * 0.88;
  const knowledgeBonus = Math.min(12, Math.max(0, trackKnowledge));
  return Math.min(100, Number((weightedSlider + knowledgeBonus).toFixed(1)));
};

const evaluateLapSectors = (
  lapTime: number,
  prevPB: [number, number, number] | undefined,
  overallBest: [number, number, number],
  explicitSectors?: [number, number, number]
): {
  sectors: [number, number, number];
  nextPB: [number, number, number];
  statuses: [SectorPerformance, SectorPerformance, SectorPerformance];
} => {
  const s1 =
    explicitSectors?.[0] ?? Number((lapTime * 0.32 + (Math.random() - 0.5) * 0.14).toFixed(3));
  const s2 =
    explicitSectors?.[1] ?? Number((lapTime * 0.36 + (Math.random() - 0.5) * 0.14).toFixed(3));
  const s3 = explicitSectors?.[2] ?? Number(Math.max(5, lapTime - s1 - s2).toFixed(3));
  const sectors: [number, number, number] = [s1, s2, s3];
  const basePB: [number, number, number] = prevPB ?? [Infinity, Infinity, Infinity];
  const nextPB: [number, number, number] = [...basePB] as [number, number, number];
  const statuses: [SectorPerformance, SectorPerformance, SectorPerformance] = [
    'NONE',
    'NONE',
    'NONE',
  ];

  for (let i = 0; i < 3; i++) {
    if (sectors[i] <= overallBest[i]) {
      statuses[i] = 'PURPLE';
      overallBest[i] = sectors[i];
      nextPB[i] = Math.min(nextPB[i], sectors[i]);
    } else if (sectors[i] <= nextPB[i]) {
      statuses[i] = 'GREEN';
      nextPB[i] = sectors[i];
    } else {
      statuses[i] = 'YELLOW';
    }
  }

  return { sectors, nextPB, statuses };
};

const refreshQualiSectorColors = (
  qStateMap: Record<string, QualifyingDriverStageState>
): Record<string, QualifyingDriverStageState> => {
  let minS1 = Infinity;
  let minS2 = Infinity;
  let minS3 = Infinity;
  Object.values(qStateMap).forEach((qs) => {
    if (qs.sector1 > 0 && qs.sector1 < minS1) minS1 = qs.sector1;
    if (qs.sector2 > 0 && qs.sector2 < minS2) minS2 = qs.sector2;
    if (qs.sector3 > 0 && qs.sector3 < minS3) minS3 = qs.sector3;
  });

  const out: Record<string, QualifyingDriverStageState> = {};
  Object.entries(qStateMap).forEach(([id, qs]) => {
    if (qs.sector1 <= 0 || qs.sector2 <= 0 || qs.sector3 <= 0) {
      out[id] = {
        ...qs,
        sectorStatuses: qs.sectorStatuses ?? ['NONE', 'NONE', 'NONE'],
      };
      return;
    }
    const prevPB = qs.personalBestSectors ?? [Infinity, Infinity, Infinity];
    const st: [SectorPerformance, SectorPerformance, SectorPerformance] = [
      qs.sector1 <= minS1 + 0.0005 ? 'PURPLE' : qs.sector1 <= prevPB[0] + 0.0005 ? 'GREEN' : 'YELLOW',
      qs.sector2 <= minS2 + 0.0005 ? 'PURPLE' : qs.sector2 <= prevPB[1] + 0.0005 ? 'GREEN' : 'YELLOW',
      qs.sector3 <= minS3 + 0.0005 ? 'PURPLE' : qs.sector3 <= prevPB[2] + 0.0005 ? 'GREEN' : 'YELLOW',
    ];
    out[id] = {
      ...qs,
      sectorStatuses: st,
      personalBestSectors: [
        Math.min(prevPB[0], qs.sector1),
        Math.min(prevPB[1], qs.sector2),
        Math.min(prevPB[2], qs.sector3),
      ],
    };
  });
  return out;
};

const createInitialPracticeKnowledge = (drivers: DriverState[]): Record<string, number> => {
  const map: Record<string, number> = {};
  drivers.forEach((d) => {
    map[d.id] = 0;
  });
  return map;
};

const createInitialPracticeStandings = (
  drivers: DriverState[],
  setupConfidences: Record<string, number>,
  trackWetness: number,
  weather: WeatherType
): PracticeStandingEntry[] => {
  const defaultTyre: TyreCompound =
    trackWetness >= 55 || weather === 'HEAVY_RAIN'
      ? 'WET'
      : trackWetness >= 20 || weather === 'LIGHT_RAIN'
      ? 'INTER'
      : 'MEDIUM';

  return drivers.map((d, idx) => ({
    driverId: d.id,
    name: d.name,
    code: d.code,
    number: d.number,
    teamId: d.teamId,
    teamName: d.teamName,
    teamColor: d.teamColor,
    position: idx + 1,
    bestLapTime: 0,
    gapToLeader: 0,
    lapsCompleted: 0,
    tyreCompound: d.isPlayerControlled
      ? defaultTyre
      : trackWetness >= 20 || weather !== 'DRY'
      ? defaultTyre
      : idx % 3 === 0
      ? 'SOFT'
      : idx % 3 === 1
      ? 'MEDIUM'
      : 'HARD',
    isOnTrack: false,
    setupConfidence: d.isPlayerControlled ? setupConfidences[d.id] ?? 70 : 82,
    isPlayerControlled: d.isPlayerControlled,
  }));
};

const sortPracticeStandings = (entries: PracticeStandingEntry[]): PracticeStandingEntry[] => {
  const timed = entries
    .filter((e) => e.bestLapTime > 0)
    .sort((a, b) => a.bestLapTime - b.bestLapTime);
  const untimed = entries.filter((e) => e.bestLapTime <= 0);
  const leaderTime = timed[0]?.bestLapTime ?? 0;

  let minS1 = Infinity;
  let minS2 = Infinity;
  let minS3 = Infinity;
  timed.forEach((e) => {
    if (e.personalBestSectors) {
      if (e.personalBestSectors[0] < minS1) minS1 = e.personalBestSectors[0];
      if (e.personalBestSectors[1] < minS2) minS2 = e.personalBestSectors[1];
      if (e.personalBestSectors[2] < minS3) minS3 = e.personalBestSectors[2];
    }
  });

  return [...timed, ...untimed].map((entry, idx) => {
    let statuses = entry.sectorStatuses;
    if (entry.bestLapTime > 0 && entry.personalBestSectors && statuses) {
      statuses = [
        entry.personalBestSectors[0] <= minS1 + 0.0005
          ? 'PURPLE'
          : statuses[0] === 'PURPLE'
          ? 'GREEN'
          : statuses[0],
        entry.personalBestSectors[1] <= minS2 + 0.0005
          ? 'PURPLE'
          : statuses[1] === 'PURPLE'
          ? 'GREEN'
          : statuses[1],
        entry.personalBestSectors[2] <= minS3 + 0.0005
          ? 'PURPLE'
          : statuses[2] === 'PURPLE'
          ? 'GREEN'
          : statuses[2],
      ];
    }
    return {
      ...entry,
      position: idx + 1,
      gapToLeader:
        entry.bestLapTime > 0 && leaderTime > 0
          ? idx === 0
            ? 0
            : Number((entry.bestLapTime - leaderTime).toFixed(3))
          : 0,
      sectorStatuses: statuses ?? ['NONE', 'NONE', 'NONE'],
    };
  });
};

const createInitialQualifyingDriversState = (
  drivers: DriverState[],
  trackWetness: number,
  weather: WeatherType
): Record<string, QualifyingDriverStageState> => {
  const defaultTyre: TyreCompound =
    trackWetness >= 55 || weather === 'HEAVY_RAIN'
      ? 'WET'
      : trackWetness >= 20 || weather === 'LIGHT_RAIN'
      ? 'INTER'
      : 'SOFT';

  const map: Record<string, QualifyingDriverStageState> = {};
  drivers.forEach((d) => {
    map[d.id] = {
      driverId: d.id,
      runPhase: 'IN_GARAGE',
      tyreCompound: defaultTyre,
      runsCompleted: 0,
      q1Time: 0,
      q2Time: 0,
      q3Time: 0,
      currentStageBestTime: 0,
      sector1: 0,
      sector2: 0,
      sector3: 0,
      trafficEncountered: false,
    };
  });
  return map;
};

const computeQualiFlyingLapTime = (
  driver: DriverState,
  circuit: CircuitInfo,
  tyreCompound: TyreCompound,
  trackWetness: number,
  setupConfidence: number,
  mediaDayQualyBonus: number,
  trafficEncountered: boolean
): { lapTime: number; sector1: number; sector2: number; sector3: number } => {
  const carPerf = TEAM_PERFORMANCE_MAP[driver.teamId] ?? 88;
  const driverSkillDelta = (99 - driver.basePace) * 0.082;
  const carPerfDelta = (99 - carPerf) * 0.092;
  const tyreSpec = TYRE_SPECS[tyreCompound];

  let lapTime =
    circuit.baseLapTime +
    driverSkillDelta +
    carPerfDelta -
    1.15 + // low qualifying fuel
    tyreSpec.gripBonus * 0.9;

  const setupTimeBonus = (Math.max(0, Math.min(100, setupConfidence)) / 100) * 0.8;
  lapTime -= setupTimeBonus;
  lapTime -= driver.isPlayerControlled ? mediaDayQualyBonus : 0;
  lapTime += computeTotalPartDamagePaceLoss(getDriverPartDamage(driver)) * 0.85;

  // Faktor kecocokan ban dengan kondisi lintasan saat Qualifying
  if (isSlickTyre(tyreCompound) && trackWetness > 25) {
    lapTime += 6.0 + (trackWetness - 25) * 0.25;
  } else if (tyreCompound === 'INTER') {
    if (trackWetness < 15) {
      lapTime += (15 - trackWetness) * 0.22;
    } else if (trackWetness > 65) {
      lapTime += (trackWetness - 65) * 0.26;
    } else {
      lapTime -= 1.8;
    }
  } else if (tyreCompound === 'WET') {
    if (trackWetness < 55) {
      lapTime += (55 - trackWetness) * 0.2;
    } else {
      lapTime -= 3.8;
    }
  }

  if (trackWetness > 0) {
    lapTime += (trackWetness / 100) * 8.5;
  }

  // Penalti traffic di lintasan jika terjebak mobil lambat pada TrackMap2D
  if (trafficEncountered) {
    lapTime += 0.34 + Math.random() * 0.28;
  }

  const executionJitter = (Math.random() - 0.5) * 0.28;
  const finalLap = Number(Math.max(circuit.baseLapTime * 0.85, lapTime + executionJitter).toFixed(3));
  const sector1 = Number((finalLap * 0.32 + (Math.random() - 0.5) * 0.04).toFixed(3));
  const sector2 = Number((finalLap * 0.36 + (Math.random() - 0.5) * 0.04).toFixed(3));
  const sector3 = Number((finalLap - sector1 - sector2).toFixed(3));

  return { lapTime: finalLap, sector1, sector2, sector3 };
};

const getSortedQualifyingClassification = (
  drivers: DriverState[],
  qStates: Record<string, QualifyingDriverStageState>,
  stage: QualifyingStage
) => {
  const eliminatedDrivers = drivers
    .filter((d) => qStates[d.id]?.runPhase === 'ELIMINATED')
    .sort(
      (a, b) =>
        (qStates[a.id]?.lockedGridPosition ?? 99) -
        (qStates[b.id]?.lockedGridPosition ?? 99)
    );

  const activeDrivers = drivers.filter((d) => qStates[d.id]?.runPhase !== 'ELIMINATED');
  const stageTimeOf = (id: string) => {
    const qs = qStates[id];
    if (!qs) return 0;
    if (stage === 'Q1') return qs.q1Time;
    if (stage === 'Q2') return qs.q2Time;
    return qs.q3Time;
  };
  const prevBestOf = (id: string) => {
    const qs = qStates[id];
    if (!qs) return 9999;
    return qs.q2Time > 0 ? qs.q2Time : qs.q1Time > 0 ? qs.q1Time : 9999;
  };

  const activeTimed = activeDrivers
    .filter((d) => stageTimeOf(d.id) > 0)
    .sort((a, b) => stageTimeOf(a.id) - stageTimeOf(b.id));
  const activeUntimed = activeDrivers
    .filter((d) => stageTimeOf(d.id) <= 0)
    .sort((a, b) => {
      const prevDiff = prevBestOf(a.id) - prevBestOf(b.id);
      if (Math.abs(prevDiff) > 0.001) return prevDiff;
      return b.basePace - a.basePace;
    });

  return [...activeTimed, ...activeUntimed, ...eliminatedDrivers];
};

const getDriverSurnameUpper = (fullName: string, code: string): string => {
  const parts = fullName.trim().split(/\s+/);
  return (parts[parts.length - 1] || code).toUpperCase();
};

const createTeamRadioExchange = (
  driver: DriverState,
  lap: number,
  sessionLabel: string,
  category: TeamRadioTriggerCategory,
  engineerMessage: string,
  driverMessage: string
): TeamRadioMessage => ({
  id: `radio-${driver.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  driverId: driver.id,
  driverName: driver.name,
  driverSurname: getDriverSurnameUpper(driver.name, driver.code),
  driverCode: driver.code,
  driverNumber: driver.number,
  teamId: driver.teamId,
  teamName: driver.teamName,
  teamColor: driver.teamColor,
  lap,
  sessionLabel,
  category,
  engineerMessage: engineerMessage.toUpperCase(),
  driverMessage: driverMessage.toUpperCase(),
  createdAt: Date.now(),
});

const buildPartDamageRadio = (
  driver: DriverState,
  lap: number,
  sessionLabel: string,
  partLabel: string,
  damagePct: number
): TeamRadioMessage => {
  const firstName = driver.name.split(' ')[0] || driver.code;
  return createTeamRadioExchange(
    driver,
    lap,
    sessionLabel,
    'DAMAGE',
    `${firstName}, telemetry shows ${partLabel} damage at ${damagePct}%. Watch the kerbs.`,
    `Heavy impact! ${partLabel} feels damaged, losing downforce in fast corners!`
  );
};

const pickLeadPlayerDriver = (drivers: DriverState[]): DriverState | undefined =>
  drivers
    .filter((d) => d.isPlayerControlled)
    .sort((a, b) => a.position - b.position)[0];

export const useRaceStore = create<RaceState>((set, get) => {
  const initialTimeline = generateWeatherTimeline(DEFAULT_CIRCUIT);
  const initialWeather = initialTimeline[0]?.weather ?? 'DRY';
  const initialWetness = initialTimeline[0]?.projectedWetness ?? 0;
  const initialForecast = sliceWeatherForecastWindow(initialTimeline, 1);
  const initialClonedDrivers = applyAIStartingTyres(
    INITIAL_DRIVERS.map((d) => ({ ...d })),
    initialWetness,
    initialWeather
  );
  const initialMaps = createInitialDriverMaps(initialClonedDrivers);
  const initialSetups = createInitialPlayerSetups(
    DEFAULT_CIRCUIT,
    initialClonedDrivers,
    initialWeather,
    initialWetness
  );
  const initialKnowledge = createInitialPracticeKnowledge(initialClonedDrivers);
  const initialPracticeStandings = createInitialPracticeStandings(
    initialClonedDrivers,
    initialSetups.setupConfidences,
    initialWetness,
    initialWeather
  );
  const initialQualiState = createInitialQualifyingDriversState(
    initialClonedDrivers,
    initialWetness,
    initialWeather
  );

  return {
    sessionPhase: 'MAIN_MENU',
    raceStatus: 'IDLE',
    simulationSpeed: 1,
    currentLap: 1,
    totalLaps: DEFAULT_CIRCUIT.totalLaps,
    weather: initialWeather,
    trackWetness: initialWetness,
    weatherTimeline: initialTimeline,
    weatherForecast: initialForecast,
    flagStatus: 'GREEN',
    drivers: initialClonedDrivers,
    raceLogs: [
      createLog(
        1,
        `Thursday Media Day Press Conference dibuka di ${DEFAULT_CIRCUIT.name}. Jawab 3 pertanyaan jurnalis F1 sebelum memasuki sesi Free Practice!`,
        'INFO'
      ),
    ],
    carSetups: initialSetups.carSetups,
    driverOptimalSetups: initialSetups.driverOptimalSetups,
    setupConfidences: initialSetups.setupConfidences,
    practiceMinutesRemaining: 60,
    practiceSession: 'FP1',
    practiceClockSeconds: 3600,
    isPracticeSimulating: false,
    practiceKnowledge: initialKnowledge,
    practiceStandings: initialPracticeStandings,
    practiceRuns: initialSetups.practiceRuns,
    qualifyingStage: 'Q1',
    qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
    isQualiSimulating: false,
    qualifyingStageFinished: false,
    qualifyingDriversState: initialQualiState,
    qualifyingResults: [],
    preRaceStartingTyres: initialSetups.preRaceStartingTyres,
    preRaceStartingFuel: initialSetups.preRaceStartingFuel,
    radarAccuracyPercent: 93,
    mediaDayBuffs: createDefaultMediaDayBuffs(78),
    rosterDrivers: initialClonedDrivers.map((d) => ({ ...d })),
    circuit: DEFAULT_CIRCUIT,
    fastestLapDriverId: null,
    fastestLapTime: Infinity,
    pitRemainingTime: initialMaps.pitRemainingTime,
    currentLapElapsed: initialMaps.currentLapElapsed,
    flagRemainingTicks: 0,
    flagEndLap: null,
    playerLapTelemetry: {},
    weekendTyreAllocation: createInitialTyreAllocation(initialClonedDrivers),
    parcFermeLocked: false,
    parcFermeBreached: {},
    sprintQualifyingResults: [],
    sprintRaceResults: [],
    isSprintCompleted: false,
    playerPitCrewStopSeconds: 2.38,
    playerPitCrewErrorPercent: 2.8,
    teamRadioMessages: [],
    activeTeamRadioPopup: null,

    dismissTeamRadioPopup: () => set({ activeTeamRadioPopup: null }),

    answerMediaDayQuestion: (questionIndex: number, choice: MediaDayChoiceType) => {
      const state = get();
      if (state.mediaDayBuffs.answeredQuestions[questionIndex]) {
        return {
          newlyAnswered: false,
          choice: state.mediaDayBuffs.answeredQuestions[questionIndex],
        };
      }

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      set((prev) => {
        const nextAnswered: Record<number, MediaDayChoiceType> = {
          ...prev.mediaDayBuffs.answeredQuestions,
          [questionIndex]: choice,
        };

        let qualyBonus = 0;
        let crashRed = 0;
        let pitReduction = 0;
        let sponsorCash = 0;
        let highExp = 0;

        Object.values(nextAnswered).forEach((ans) => {
          if (ans === 'CONFIDENT') {
            qualyBonus = Number((qualyBonus + 0.15).toFixed(2));
            highExp += 1;
          } else if (ans === 'HUMBLE') {
            crashRed = Number(Math.min(0.75, crashRed + 0.25).toFixed(2));
          } else if (ans === 'SPONSOR') {
            pitReduction = Number((pitReduction + 0.2).toFixed(1));
            sponsorCash += 250_000;
          }
        });

        const logMsg =
          choice === 'CONFIDENT'
            ? `PRESS CONFERENCE (Q${questionIndex + 1} - CONFIDENT): Morale pembalap meningkat! Bonus Pace +0.15s di Qualifying (Ekspektasi Podium/Top-6 aktif).`
            : choice === 'HUMBLE'
            ? `PRESS CONFERENCE (Q${questionIndex + 1} - HUMBLE): Mentalitas tim stabil! Consistency meningkat (-25% risiko crash/lock-up akhir pekan ini).`
            : `PRESS CONFERENCE (Q${questionIndex + 1} - PRAISE R&D & SPONSORS): Sponsor terkesan (+$250,000 instan) & semangat kru Pit meningkat (-0.2s durasi Pit Stop)!`;

        return {
          mediaDayBuffs: {
            ...prev.mediaDayBuffs,
            qualyPaceBonusSeconds: qualyBonus,
            consistencyCrashReduction: crashRed,
            pitStopTimeReductionSeconds: pitReduction,
            sponsorBonusEarned: sponsorCash,
            highExpectationCount: highExp,
            answeredQuestions: nextAnswered,
          },
          raceLogs: [createLog(1, logMsg, 'INFO'), ...prev.raceLogs],
        };
      });

      return { newlyAnswered: true, choice };
    },

    proceedFromMediaDayToFP: () => {
      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();
      set((prev) => {
        const parkedDrivers = prev.drivers.map((d) => ({
          ...d,
          isInPit: true,
          trackProgress: 0,
        }));
        const initialKnow = createInitialPracticeKnowledge(parkedDrivers);
        const initialStandings = createInitialPracticeStandings(
          parkedDrivers,
          prev.setupConfidences,
          prev.trackWetness,
          prev.weather
        );

        return {
          sessionPhase: 'FREE_PRACTICE',
          practiceSession: 'FP1',
          practiceClockSeconds: 3600,
          practiceMinutesRemaining: 60,
          isPracticeSimulating: false,
          practiceKnowledge: initialKnow,
          practiceStandings: initialStandings,
          drivers: parkedDrivers,
          raceLogs: [
            createLog(
              1,
              `Thursday Media Day selesai! Sesi Free Practice 1 (FP1 • 60 Menit) kini dibuka di ${prev.circuit.name}.`,
              'INFO'
            ),
            ...prev.raceLogs,
          ],
        };
      });
    },

    updateCarSetup: (driverId: string, setupUpdate: Partial<CarSetup>) => {
      set((state) => {
        const currentSetup = state.carSetups[driverId] ?? { ...DEFAULT_CAR_SETUP };
        const nextSetup: CarSetup = {
          frontWingAngle: Math.min(
            10,
            Math.max(1, setupUpdate.frontWingAngle ?? currentSetup.frontWingAngle)
          ),
          rearWingAngle: Math.min(
            10,
            Math.max(1, setupUpdate.rearWingAngle ?? currentSetup.rearWingAngle)
          ),
          suspensionStiffness: Math.min(
            10,
            Math.max(1, setupUpdate.suspensionStiffness ?? currentSetup.suspensionStiffness)
          ),
          brakeBias: Math.min(60, Math.max(50, setupUpdate.brakeBias ?? currentSetup.brakeBias)),
        };

        const driverIdeal = state.driverOptimalSetups[driverId];
        const sliderMatch = calculateSetupConfidence(nextSetup, state.circuit, driverIdeal);
        const knowledge = state.practiceKnowledge[driverId] ?? 0;
        const confidence = computeEffectiveConfidence(sliderMatch, knowledge);
        const isParcFermeBreach =
          state.parcFermeLocked && !state.parcFermeBreached[driverId];
        const targetDriver = state.drivers.find((d) => d.id === driverId);

        return {
          carSetups: {
            ...state.carSetups,
            [driverId]: nextSetup,
          },
          setupConfidences: {
            ...state.setupConfidences,
            [driverId]: confidence,
          },
          parcFermeBreached: state.parcFermeLocked
            ? { ...state.parcFermeBreached, [driverId]: true }
            : state.parcFermeBreached,
          practiceStandings: state.practiceStandings.map((entry) =>
            entry.driverId === driverId ? { ...entry, setupConfidence: confidence } : entry
          ),
          raceLogs: isParcFermeBreach
            ? [
                createLog(
                  1,
                  `PARC FERMÉ BREACH [${targetDriver?.code ?? driverId}]: Mengubah setup setelah kualifikasi terkunci! Mobil wajib start dari Pit Lane pada Race Day.`,
                  'INCIDENT'
                ),
                ...state.raceLogs,
              ]
            : state.raceLogs,
        };
      });
    },

    runFreePracticeStint: (driverId: string, tyreCompound: TyreCompound = 'MEDIUM') => {
      const state = get();
      if (state.practiceClockSeconds < 600 && state.practiceMinutesRemaining < 10) {
        return null;
      }

      const driver = state.drivers.find((d) => d.id === driverId);
      if (!driver) return null;

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      const { circuit } = state;
      const setup = state.carSetups[driverId] ?? { ...DEFAULT_CAR_SETUP };
      const optimal: CarSetup =
        state.driverOptimalSetups[driverId] ??
        circuit.optimalSetup ??
        CIRCUIT_OPTIMAL_SETUPS[circuit.id] ??
        CIRCUIT_OPTIMAL_SETUPS.australia;
      const sliderMatch = calculateSetupConfidence(setup, circuit, optimal);
      const nextKnowledge = Math.min(12, (state.practiceKnowledge[driverId] ?? 0) + 4);
      const confidence = computeEffectiveConfidence(sliderMatch, nextKnowledge);

      const parameterFeedback: PracticeRunTelemetry['parameterFeedback'] = {
        frontWing:
          setup.frontWingAngle === optimal.frontWingAngle
            ? 'OPTIMAL'
            : setup.frontWingAngle < optimal.frontWingAngle
            ? 'TOO_LOW'
            : 'TOO_HIGH',
        rearWing:
          setup.rearWingAngle === optimal.rearWingAngle
            ? 'OPTIMAL'
            : setup.rearWingAngle < optimal.rearWingAngle
            ? 'TOO_LOW'
            : 'TOO_HIGH',
        suspension:
          setup.suspensionStiffness === optimal.suspensionStiffness
            ? 'OPTIMAL'
            : setup.suspensionStiffness < optimal.suspensionStiffness
            ? 'TOO_SOFT'
            : 'TOO_STIFF',
        brakeBias:
          setup.brakeBias === optimal.brakeBias
            ? 'OPTIMAL'
            : setup.brakeBias < optimal.brakeBias
            ? 'TOO_REARWARD'
            : 'TOO_FORWARD',
      };

      const tyreSpec = TYRE_SPECS[tyreCompound];
      const driverTyreSkillFactor = 1 - ((driver.tyreManagement - 80) / 100) * 0.35;
      const tyreWearPerLap = Number(
        (tyreSpec.degradationRate * circuit.tyreWearMultiplier * driverTyreSkillFactor).toFixed(2)
      );
      const endingTyreHealth = Math.max(0, Number((100 - tyreWearPerLap * 5).toFixed(1)));
      const fuelBurnPerLap = getCircuitFuelBurn2026(circuit);

      const simLapTime = calculateTargetLapTime(
        {
          ...driver,
          tyreCompound,
          tyreHealth: 96,
          fuelLoad: 25,
          paceMode: 'PUSH',
          ersMode: 'DEPLOY',
        },
        circuit,
        state.trackWetness,
        'GREEN',
        confidence
      );

      const bestLapTime = Number((simLapTime - 0.15 + (Math.random() - 0.5) * 0.14).toFixed(3));
      const avgLapTime = Number((bestLapTime + 0.34 + tyreWearPerLap * 0.04).toFixed(3));

      const existingDriverRuns = state.practiceRuns[driverId] ?? [];
      const newRun: PracticeRunTelemetry = {
        id: `fp-${driverId}-${Date.now()}`,
        driverId,
        driverCode: driver.code,
        driverName: driver.name,
        runNumber: existingDriverRuns.length + 1,
        tyreCompound,
        lapsCompleted: 5,
        bestLapTime,
        avgLapTime,
        setupConfidence: confidence,
        tyreWearPerLap,
        endingTyreHealth,
        fuelBurnPerLap,
        setupSnapshot: { ...setup },
        parameterFeedback,
      };

      set((prev) => {
        const nextClock = Math.max(0, prev.practiceClockSeconds - 600);
        const updatedStandingsRaw = prev.practiceStandings.map((entry) => {
          if (entry.driverId === driverId) {
            const nextBest =
              entry.bestLapTime <= 0
                ? bestLapTime
                : Math.min(entry.bestLapTime, bestLapTime);
            const overallBest: [number, number, number] = [Infinity, Infinity, Infinity];
            prev.practiceStandings.forEach((p) => {
              if (p.personalBestSectors) {
                overallBest[0] = Math.min(overallBest[0], p.personalBestSectors[0]);
                overallBest[1] = Math.min(overallBest[1], p.personalBestSectors[1]);
                overallBest[2] = Math.min(overallBest[2], p.personalBestSectors[2]);
              }
            });
            const secEval = evaluateLapSectors(
              bestLapTime,
              entry.personalBestSectors,
              overallBest
            );
            return {
              ...entry,
              bestLapTime: nextBest,
              lapsCompleted: entry.lapsCompleted + 5,
              tyreCompound,
              setupConfidence: confidence,
              personalBestSectors: secEval.nextPB,
              sectorStatuses: secEval.statuses,
            };
          }
          return entry;
        });

        // Evaluasi keausan & risiko insiden kerusakan multi-komponen saat Free Practice Stint
        const currentDamage = getDriverPartDamage(driver);
        const isIncident = Math.random() < 0.18;
        const damageOutcome = isIncident
          ? rollRandomPartDamageIncident(currentDamage, 'MINOR')
          : rollRandomPartDamageIncident(currentDamage, 'WEAR');
        const nextDriversForPractice = prev.drivers.map((d) =>
          d.id === driverId
            ? {
                ...d,
                partDamage: damageOutcome.nextMap,
                wingDamage: damageOutcome.nextMap.frontWing,
              }
            : d
        );

        const incidentLogs: RaceLog[] = isIncident
          ? [
              createLog(
                1,
                `${prev.practiceSession} INCIDENT [${driver.code}]: Kerb strike / melebar merusak ${damageOutcome.damagedPartLabel} (+${damageOutcome.addedAmount}%)! Gunakan Spare Part di garasi jika tersedia.`,
                'INCIDENT'
              ),
            ]
          : [];

        const damageRadio =
          isIncident && driver.isPlayerControlled
            ? buildPartDamageRadio(
                driver,
                1,
                prev.practiceSession,
                damageOutcome.damagedPartLabel,
                damageOutcome.nextMap[damageOutcome.damagedPart]
              )
            : null;

        return {
          practiceClockSeconds: nextClock,
          practiceMinutesRemaining: Math.ceil(nextClock / 60),
          drivers: nextDriversForPractice,
          practiceKnowledge: {
            ...prev.practiceKnowledge,
            [driverId]: nextKnowledge,
          },
          setupConfidences: {
            ...prev.setupConfidences,
            [driverId]: confidence,
          },
          practiceStandings: sortPracticeStandings(updatedStandingsRaw),
          practiceRuns: {
            ...prev.practiceRuns,
            [driverId]: [newRun, ...(prev.practiceRuns[driverId] ?? [])],
          },
          teamRadioMessages: damageRadio
            ? [damageRadio, ...prev.teamRadioMessages].slice(0, 60)
            : prev.teamRadioMessages,
          activeTeamRadioPopup: damageRadio ?? prev.activeTeamRadioPopup,
          raceLogs: [
            ...incidentLogs,
            createLog(
              1,
              `${prev.practiceSession} 5-LAP RUN [${driver.code}]: Best ${formatLapTime(
                bestLapTime
              )} (${tyreCompound}) • Setup Confidence: ${confidence.toFixed(
                1
              )}% • Tyre Wear: ${tyreWearPerLap}%/lap.`,
              'INFO'
            ),
            ...prev.raceLogs,
          ],
        };
      });

      return newRun;
    },

    sendCarsOutPractice: (
      driverIds: string[],
      compoundByDriver?: Record<string, TyreCompound>
    ) => {
      const state = get();
      if (state.practiceClockSeconds <= 0) return;

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      set((prev) => {
        const idSet = new Set(driverIds);
        const nextDrivers = prev.drivers.map((d, idx) => {
          if (idSet.has(d.id)) {
            const chosenCompound = compoundByDriver?.[d.id] ?? d.tyreCompound;
            return {
              ...d,
              isInPit: false,
              tyreCompound: chosenCompound,
              trackProgress: d.isInPit ? Number(((idx * 7 + 4) % 18).toFixed(2)) : d.trackProgress,
            };
          }
          // Kirim beberapa mobil AI ikut mengitari trek agar peta 2D realistis
          if (!d.isPlayerControlled && d.isInPit && idx % 2 === 0) {
            return {
              ...d,
              isInPit: false,
              trackProgress: Number(((idx * 9 + 15) % 90).toFixed(2)),
            };
          }
          return d;
        });

        const nextStandings = prev.practiceStandings.map((entry) => {
          const matchedDriver = nextDrivers.find((d) => d.id === entry.driverId);
          return matchedDriver
            ? {
                ...entry,
                isOnTrack: !matchedDriver.isInPit,
                tyreCompound: matchedDriver.tyreCompound,
              }
            : entry;
        });

        const sentPlayerDrivers = nextDrivers.filter(
          (d) => d.isPlayerControlled && idSet.has(d.id)
        );
        const trackOutRadios = sentPlayerDrivers.map((d) => {
          const firstName = d.name.split(' ')[0] || d.code;
          return createTeamRadioExchange(
            d,
            1,
            prev.practiceSession,
            'TRACK_OUT',
            `${firstName}, green light at pit exit, track clear for ${prev.practiceSession} on ${d.tyreCompound}s.`,
            `Rolling out pit lane now, warming up the ${d.tyreCompound}s and checking balance.`
          );
        });

        return {
          isPracticeSimulating: true,
          drivers: nextDrivers,
          practiceStandings: nextStandings,
          teamRadioMessages:
            trackOutRadios.length > 0
              ? [...trackOutRadios, ...prev.teamRadioMessages].slice(0, 60)
              : prev.teamRadioMessages,
          activeTeamRadioPopup: trackOutRadios[0] ?? prev.activeTeamRadioPopup,
        };
      });
    },

    recallCarsPractice: (driverIds: string[]) => {
      soundEngine.playStrategyClick();
      const idSet = new Set(driverIds);
      set((prev) => ({
        drivers: prev.drivers.map((d) =>
          idSet.has(d.id) ? { ...d, isInPit: true, trackProgress: 0 } : d
        ),
        practiceStandings: prev.practiceStandings.map((entry) =>
          idSet.has(entry.driverId) ? { ...entry, isOnTrack: false } : entry
        ),
      }));
    },

    simulatePracticeFlyingLaps: (compoundByDriver?: Record<string, TyreCompound>) => {
      const state = get();
      if (state.practiceClockSeconds <= 0) return;

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      const { circuit, drivers, carSetups, driverOptimalSetups, practiceKnowledge, trackWetness, weather } = state;

      // 1. Jalankan 5-Lap Telemetry Run untuk tiap pembalap player (atau minimal simulasi flying laps jika clock < 600s)
      const nextKnowledge = { ...practiceKnowledge };
      const nextConfidences = { ...state.setupConfidences };
      const nextRuns = { ...state.practiceRuns };
      const playerLogs: RaceLog[] = [];
      const playerRadios: TeamRadioMessage[] = [];

      const nextStandingsRaw = state.practiceStandings.map((entry, idx) => {
        const driver = drivers.find((d) => d.id === entry.driverId);
        if (!driver) return entry;

        const chosenCompound: TyreCompound = driver.isPlayerControlled
          ? compoundByDriver?.[driver.id] ?? entry.tyreCompound
          : trackWetness >= 55 || weather === 'HEAVY_RAIN'
          ? 'WET'
          : trackWetness >= 20 || weather === 'LIGHT_RAIN'
          ? 'INTER'
          : idx % 3 === 0
          ? 'SOFT'
          : idx % 3 === 1
          ? 'MEDIUM'
          : 'HARD';

        let driverConf = entry.setupConfidence;

        if (driver.isPlayerControlled) {
          const setup = carSetups[driver.id] ?? { ...DEFAULT_CAR_SETUP };
          const optimal =
            driverOptimalSetups[driver.id] ??
            circuit.optimalSetup ??
            CIRCUIT_OPTIMAL_SETUPS[circuit.id] ??
            CIRCUIT_OPTIMAL_SETUPS.australia;
          const sliderMatch = calculateSetupConfidence(setup, circuit, optimal);
          const updatedKnow = Math.min(12, (nextKnowledge[driver.id] ?? 0) + 4);
          nextKnowledge[driver.id] = updatedKnow;
          driverConf = computeEffectiveConfidence(sliderMatch, updatedKnow);
          nextConfidences[driver.id] = driverConf;

          const parameterFeedback: PracticeRunTelemetry['parameterFeedback'] = {
            frontWing:
              setup.frontWingAngle === optimal.frontWingAngle
                ? 'OPTIMAL'
                : setup.frontWingAngle < optimal.frontWingAngle
                ? 'TOO_LOW'
                : 'TOO_HIGH',
            rearWing:
              setup.rearWingAngle === optimal.rearWingAngle
                ? 'OPTIMAL'
                : setup.rearWingAngle < optimal.rearWingAngle
                ? 'TOO_LOW'
                : 'TOO_HIGH',
            suspension:
              setup.suspensionStiffness === optimal.suspensionStiffness
                ? 'OPTIMAL'
                : setup.suspensionStiffness < optimal.suspensionStiffness
                ? 'TOO_SOFT'
                : 'TOO_STIFF',
            brakeBias:
              setup.brakeBias === optimal.brakeBias
                ? 'OPTIMAL'
                : setup.brakeBias < optimal.brakeBias
                ? 'TOO_REARWARD'
                : 'TOO_FORWARD',
          };

          const tyreSpec = TYRE_SPECS[chosenCompound];
          const driverTyreSkillFactor = 1 - ((driver.tyreManagement - 80) / 100) * 0.35;
          const tyreWearPerLap = Number(
            (tyreSpec.degradationRate * circuit.tyreWearMultiplier * driverTyreSkillFactor).toFixed(2)
          );
          const endingTyreHealth = Math.max(0, Number((100 - tyreWearPerLap * 5).toFixed(1)));
          const fuelBurnPerLap = getCircuitFuelBurn2026(circuit);

          const simLap = calculateTargetLapTime(
            {
              ...driver,
              tyreCompound: chosenCompound,
              tyreHealth: 96,
              fuelLoad: 25,
              paceMode: 'PUSH',
              ersMode: 'DEPLOY',
            },
            circuit,
            trackWetness,
            'GREEN',
            driverConf
          );
          const lapTime = Number((simLap - 0.16 + (Math.random() - 0.5) * 0.14).toFixed(3));
          const avgLapTime = Number((lapTime + 0.35 + tyreWearPerLap * 0.04).toFixed(3));

          const existing = nextRuns[driver.id] ?? [];
          const newRun: PracticeRunTelemetry = {
            id: `fp-${driver.id}-${Date.now()}-${idx}`,
            driverId: driver.id,
            driverCode: driver.code,
            driverName: driver.name,
            runNumber: existing.length + 1,
            tyreCompound: chosenCompound,
            lapsCompleted: 5,
            bestLapTime: lapTime,
            avgLapTime,
            setupConfidence: driverConf,
            tyreWearPerLap,
            endingTyreHealth,
            fuelBurnPerLap,
            setupSnapshot: { ...setup },
            parameterFeedback,
          };
          nextRuns[driver.id] = [newRun, ...existing];

          playerLogs.push(
            createLog(
              1,
              `${state.practiceSession} FLYING LAPS [${driver.code}]: Best ${formatLapTime(
                lapTime
              )} (${chosenCompound}) • Setup Confidence: ${driverConf.toFixed(1)}%.`,
              'INFO'
            )
          );

          const bestSoFar =
            entry.bestLapTime <= 0 ? lapTime : Math.min(entry.bestLapTime, lapTime);
          const secEval = evaluateLapSectors(
            lapTime,
            entry.personalBestSectors,
            [Infinity, Infinity, Infinity]
          );
          return {
            ...entry,
            bestLapTime: bestSoFar,
            lapsCompleted: entry.lapsCompleted + 5,
            tyreCompound: chosenCompound,
            isOnTrack: true,
            setupConfidence: driverConf,
            personalBestSectors: secEval.nextPB,
            sectorStatuses: secEval.statuses,
          };
        }

        // Simulasi flying lap untuk AI pada FP1/FP2/FP3
        const aiConf = Number((80 + ((driver.basePace - 80) / 19) * 14).toFixed(1));
        const aiLap = calculateTargetLapTime(
          {
            ...driver,
            tyreCompound: chosenCompound,
            tyreHealth: 96,
            fuelLoad: 28,
            paceMode: state.practiceSession === 'FP3' ? 'PUSH' : 'STANDARD',
            ersMode: state.practiceSession === 'FP3' ? 'DEPLOY' : 'NEUTRAL',
          },
          circuit,
          trackWetness,
          'GREEN',
          aiConf
        );
        const aiBest = Number((aiLap - 0.1 + (Math.random() - 0.5) * 0.35).toFixed(3));
        const nextBest = entry.bestLapTime <= 0 ? aiBest : Math.min(entry.bestLapTime, aiBest);
        const addedLaps = 4 + Math.floor(Math.random() * 4);
        const aiSecEval = evaluateLapSectors(
          aiBest,
          entry.personalBestSectors,
          [Infinity, Infinity, Infinity]
        );

        return {
          ...entry,
          bestLapTime: nextBest,
          lapsCompleted: entry.lapsCompleted + addedLaps,
          tyreCompound: chosenCompound,
          isOnTrack: idx % 2 === 0,
          personalBestSectors: aiSecEval.nextPB,
          sectorStatuses: aiSecEval.statuses,
        };
      });

      const nextClock = Math.max(0, state.practiceClockSeconds - 600);
      const updatedDrivers = drivers.map((d, idx) => {
        const standing = nextStandingsRaw.find((s) => s.driverId === d.id);
        const shouldBeOnTrack = nextClock > 0 && (d.isPlayerControlled || idx % 2 === 0);
        let nextDamage = getDriverPartDamage(d);
        if (Math.random() < (d.isPlayerControlled ? 0.16 : 0.08)) {
          const outcome = rollRandomPartDamageIncident(nextDamage, 'MINOR');
          nextDamage = outcome.nextMap;
          if (d.isPlayerControlled) {
            playerLogs.push(
              createLog(
                1,
                `${state.practiceSession} INCIDENT [${d.code}]: Kerb strike merusak ${outcome.damagedPartLabel} (+${outcome.addedAmount}%)!`,
                'INCIDENT'
              )
            );
            playerRadios.push(
              buildPartDamageRadio(
                d,
                1,
                state.practiceSession,
                outcome.damagedPartLabel,
                nextDamage[outcome.damagedPart]
              )
            );
          }
        }
        return {
          ...d,
          partDamage: nextDamage,
          wingDamage: nextDamage.frontWing,
          tyreCompound: standing?.tyreCompound ?? d.tyreCompound,
          isInPit: !shouldBeOnTrack,
          trackProgress: shouldBeOnTrack
            ? Number((((d.trackProgress || idx * 7.5) + 12) % 100).toFixed(2))
            : 0,
        };
      });

      const sortedPracticeStandings = sortPracticeStandings(nextStandingsRaw);
      if (nextClock <= 0) {
        const bestPlayerStanding = sortedPracticeStandings.find((s) => s.isPlayerControlled);
        const leadPlayer =
          updatedDrivers.find((d) => d.id === bestPlayerStanding?.driverId) ??
          pickLeadPlayerDriver(updatedDrivers);
        if (leadPlayer) {
          const firstName = leadPlayer.name.split(' ')[0] || leadPlayer.code;
          const posIdx = sortedPracticeStandings.findIndex((s) => s.driverId === leadPlayer.id);
          const posLabel = posIdx >= 0 ? `P${posIdx + 1}` : 'data collected';
          const conf = nextConfidences[leadPlayer.id] ?? 75;
          playerRadios.unshift(
            createTeamRadioExchange(
              leadPlayer,
              1,
              state.practiceSession,
              'SESSION_FINISH',
              `Chequered flag in ${state.practiceSession}, ${firstName}. ${posLabel}, box now for debrief.`,
              conf >= 80
                ? `Copy! Balance felt really sharp today, happy with the setup direction.`
                : `Understood, bringing it in. Still a few corners where we can dial in balance.`
            )
          );
        }
      }

      set((prev) => ({
        practiceClockSeconds: nextClock,
        practiceMinutesRemaining: Math.ceil(nextClock / 60),
        isPracticeSimulating: nextClock > 0,
        practiceKnowledge: nextKnowledge,
        setupConfidences: nextConfidences,
        practiceRuns: nextRuns,
        practiceStandings: sortedPracticeStandings,
        drivers: updatedDrivers,
        teamRadioMessages:
          playerRadios.length > 0
            ? [...playerRadios, ...prev.teamRadioMessages].slice(0, 60)
            : prev.teamRadioMessages,
        activeTeamRadioPopup: playerRadios[0] ?? prev.activeTeamRadioPopup,
        raceLogs: [...playerLogs, ...prev.raceLogs].slice(0, 150),
      }));
    },

    togglePracticeSimulation: (running?: boolean) => {
      set((prev) => {
        const target = running !== undefined ? running : !prev.isPracticeSimulating;
        if (target && prev.practiceClockSeconds <= 0) return prev;
        return { isPracticeSimulating: target };
      });
    },

    tickPractice: () => {
      const state = get();
      if (!state.isPracticeSimulating || state.sessionPhase !== 'FREE_PRACTICE') return;

      if (state.practiceClockSeconds <= 0) {
        soundEngine.playTeamRadioBeep();
        set((prev) => ({
          isPracticeSimulating: false,
          drivers: prev.drivers.map((d) => ({ ...d, isInPit: true, trackProgress: 0 })),
          practiceStandings: prev.practiceStandings.map((s) => ({ ...s, isOnTrack: false })),
        }));
        return;
      }

      const nextClock = Math.max(0, state.practiceClockSeconds - 15);
      const { circuit, trackWetness, weather, carSetups, driverOptimalSetups } = state;
      const nextKnowledge = { ...state.practiceKnowledge };
      const nextConfidences = { ...state.setupConfidences };
      const lapMap: Record<string, PracticeStandingEntry> = {};
      state.practiceStandings.forEach((s) => {
        lapMap[s.driverId] = { ...s };
      });

      const practiceLogs: RaceLog[] = [];
      const practiceRadios: TeamRadioMessage[] = [];
      const updatedDrivers = state.drivers.map((d, idx) => {
        const standing = lapMap[d.id];
        let isInPit = d.isInPit;
        let trackProgress = d.trackProgress;

        // AI secara organik keluar/masuk garasi agar peta 2D hidup
        if (!d.isPlayerControlled) {
          if (isInPit && Math.random() < 0.045) {
            isInPit = false;
            trackProgress = 2;
          } else if (!isInPit && trackProgress > 95 && Math.random() < 0.14) {
            isInPit = true;
            trackProgress = 0;
          }
        }

        if (isInPit) {
          if (standing) standing.isOnTrack = false;
          return { ...d, isInPit: true, trackProgress: 0 };
        }

        const speedStep = 4.2 + ((d.basePace - 80) / 19) * 0.75 + (idx % 3) * 0.08;
        const nextProgress = trackProgress + speedStep;

        if (nextProgress >= 100) {
          const wrappedProgress = Number((nextProgress - 100).toFixed(2));
          let driverConf = standing?.setupConfidence ?? 82;

          if (d.isPlayerControlled) {
            const setup = carSetups[d.id] ?? { ...DEFAULT_CAR_SETUP };
            const optimal =
              driverOptimalSetups[d.id] ??
              circuit.optimalSetup ??
              CIRCUIT_OPTIMAL_SETUPS[circuit.id] ??
              CIRCUIT_OPTIMAL_SETUPS.australia;
            const sliderMatch = calculateSetupConfidence(setup, circuit, optimal);
            const updatedKnow = Math.min(12, (nextKnowledge[d.id] ?? 0) + 1.2);
            nextKnowledge[d.id] = updatedKnow;
            driverConf = computeEffectiveConfidence(sliderMatch, updatedKnow);
            nextConfidences[d.id] = driverConf;
          }

          const lapTarget = calculateTargetLapTime(
            {
              ...d,
              tyreCompound: standing?.tyreCompound ?? d.tyreCompound,
              tyreHealth: 95,
              fuelLoad: 28,
              paceMode: state.practiceSession === 'FP3' ? 'PUSH' : 'STANDARD',
              ersMode: 'NEUTRAL',
            },
            circuit,
            trackWetness,
            'GREEN',
            driverConf
          );
          const completedLapTime = Number((lapTarget - 0.1 + (Math.random() - 0.5) * 0.25).toFixed(3));

          let nextPartDamage = getDriverPartDamage(d);
          if (Math.random() < (d.isPlayerControlled ? 0.04 : 0.015)) {
            const outcome = rollRandomPartDamageIncident(nextPartDamage, 'MINOR');
            nextPartDamage = outcome.nextMap;
            if (d.isPlayerControlled) {
              soundEngine.playTeamRadioBeep();
              practiceLogs.push(
                createLog(
                  1,
                  `${state.practiceSession} INCIDENT [${d.code}]: Terjadi benturan kerb/gravel — ${outcome.damagedPartLabel} (+${outcome.addedAmount}%)!`,
                  'INCIDENT'
                )
              );
              practiceRadios.push(
                buildPartDamageRadio(
                  d,
                  1,
                  state.practiceSession,
                  outcome.damagedPartLabel,
                  nextPartDamage[outcome.damagedPart]
                )
              );
            }
          }

          if (standing) {
            const overallBest: [number, number, number] = [Infinity, Infinity, Infinity];
            Object.values(lapMap).forEach((p) => {
              if (p.personalBestSectors) {
                overallBest[0] = Math.min(overallBest[0], p.personalBestSectors[0]);
                overallBest[1] = Math.min(overallBest[1], p.personalBestSectors[1]);
                overallBest[2] = Math.min(overallBest[2], p.personalBestSectors[2]);
              }
            });
            const secEval = evaluateLapSectors(
              completedLapTime,
              standing.personalBestSectors,
              overallBest
            );
            standing.lapsCompleted += 1;
            standing.setupConfidence = driverConf;
            standing.isOnTrack = true;
            standing.personalBestSectors = secEval.nextPB;
            standing.sectorStatuses = secEval.statuses;
            if (standing.bestLapTime <= 0 || completedLapTime < standing.bestLapTime) {
              standing.bestLapTime = completedLapTime;
            }
          }

          return {
            ...d,
            partDamage: nextPartDamage,
            wingDamage: nextPartDamage.frontWing,
            trackProgress: wrappedProgress,
            isInPit: false,
            tyreCompound: standing?.tyreCompound ?? d.tyreCompound,
          };
        }

        if (standing) standing.isOnTrack = true;
        return {
          ...d,
          trackProgress: Number(nextProgress.toFixed(2)),
          isInPit: false,
          tyreCompound: standing?.tyreCompound ?? d.tyreCompound,
        };
      });

      const finishedClock = nextClock <= 0;
      const finalizedDrivers = finishedClock
        ? updatedDrivers.map((d) => ({ ...d, isInPit: true, trackProgress: 0 }))
        : updatedDrivers;
      const finalStandingsList = sortPracticeStandings(
        Object.values(lapMap).map((s) => (finishedClock ? { ...s, isOnTrack: false } : s))
      );

      // Pastikan AI punya ban sesuai cuaca
      const adjustedStandings = finalStandingsList.map((s) => {
        if (!s.isPlayerControlled && trackWetness >= 55 && weather === 'HEAVY_RAIN') {
          return { ...s, tyreCompound: 'WET' as TyreCompound };
        }
        return s;
      });

      if (finishedClock) {
        soundEngine.playTeamRadioBeep();
        const bestPlayerStanding = adjustedStandings.find((s) => s.isPlayerControlled);
        const leadPlayer =
          finalizedDrivers.find((d) => d.id === bestPlayerStanding?.driverId) ??
          pickLeadPlayerDriver(finalizedDrivers);
        if (leadPlayer) {
          const firstName = leadPlayer.name.split(' ')[0] || leadPlayer.code;
          const posIdx = adjustedStandings.findIndex((s) => s.driverId === leadPlayer.id);
          const posLabel = posIdx >= 0 ? `P${posIdx + 1}` : 'session complete';
          const conf = nextConfidences[leadPlayer.id] ?? 75;
          practiceRadios.unshift(
            createTeamRadioExchange(
              leadPlayer,
              1,
              state.practiceSession,
              'SESSION_FINISH',
              `That is the chequered flag in ${state.practiceSession}, ${firstName}. ${posLabel}, box now.`,
              conf >= 80
                ? `Copy that! Strong run, the car feels well balanced.`
                : `Understood, boxing now. Let's fine-tune the setup before the next session.`
            )
          );
        }
      }

      set((prev) => ({
        practiceClockSeconds: nextClock,
        practiceMinutesRemaining: Math.ceil(nextClock / 60),
        isPracticeSimulating: !finishedClock,
        practiceKnowledge: nextKnowledge,
        setupConfidences: nextConfidences,
        practiceStandings: adjustedStandings,
        drivers: finalizedDrivers,
        teamRadioMessages:
          practiceRadios.length > 0
            ? [...practiceRadios, ...prev.teamRadioMessages].slice(0, 60)
            : prev.teamRadioMessages,
        activeTeamRadioPopup: practiceRadios[0] ?? prev.activeTeamRadioPopup,
        raceLogs:
          practiceLogs.length > 0
            ? [...practiceLogs, ...prev.raceLogs].slice(0, 150)
            : prev.raceLogs,
      }));
    },

    advancePracticeSession: () => {
      const state = get();
      if (state.practiceSession === 'FP3' || state.circuit.isSprintWeekend) {
        get().proceedToQualifying();
        return;
      }

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();
      const nextSession: PracticeSessionType = state.practiceSession === 'FP1' ? 'FP2' : 'FP3';

      set((prev) => {
        const leadPlayer = pickLeadPlayerDriver(prev.drivers);
        const finishRadio = leadPlayer
          ? createTeamRadioExchange(
              leadPlayer,
              1,
              prev.practiceSession,
              'SESSION_FINISH',
              `${prev.practiceSession} complete, ${leadPlayer.name.split(' ')[0] || leadPlayer.code}. Good programme — shifting data to ${nextSession}.`,
              `Copy that, let's check the tyre deg and balance before heading back out in ${nextSession}.`
            )
          : null;

        return {
          practiceSession: nextSession,
          practiceClockSeconds: 3600,
          practiceMinutesRemaining: 60,
          isPracticeSimulating: false,
          drivers: prev.drivers.map((d) => ({ ...d, isInPit: true, trackProgress: 0 })),
          practiceStandings: prev.practiceStandings.map((s) => ({ ...s, isOnTrack: false })),
          teamRadioMessages: finishRadio
            ? [finishRadio, ...prev.teamRadioMessages].slice(0, 60)
            : prev.teamRadioMessages,
          activeTeamRadioPopup: finishRadio ?? prev.activeTeamRadioPopup,
          raceLogs: [
            createLog(
              1,
              `Sesi ${prev.practiceSession} selesai! Setup Confidence & pengetahuan lintasan dibawa ke ${nextSession} (60 Menit).`,
              'INFO'
            ),
            ...prev.raceLogs,
          ],
        };
      });
    },

    initQualifyingSession: () => {
      set((prev) => {
        const parkedDrivers = prev.drivers.map((d) => ({
          ...d,
          isInPit: true,
          trackProgress: 0,
        }));
        const qStates = createInitialQualifyingDriversState(
          parkedDrivers,
          prev.trackWetness,
          prev.weather
        );
        return {
          qualifyingStage: 'Q1',
          qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
          isQualiSimulating: false,
          qualifyingStageFinished: false,
          qualifyingDriversState: qStates,
          qualifyingResults: [],
          drivers: parkedDrivers,
        };
      });
    },

    proceedToQualifying: () => {
      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();
      set((prev) => {
        const parkedDrivers = prev.drivers.map((d) => ({
          ...d,
          isInPit: true,
          trackProgress: 0,
        }));
        const leadPlayer = pickLeadPlayerDriver(parkedDrivers);
        const fpDoneRadio =
          leadPlayer && prev.practiceClockSeconds > 0
            ? createTeamRadioExchange(
                leadPlayer,
                1,
                prev.practiceSession,
                'SESSION_FINISH',
                `${prev.practiceSession} done, ${leadPlayer.name.split(' ')[0] || leadPlayer.code}. Parc Fermé kicks in next — locking in the setup now.`,
                `Copy, car feels good for qualifying runs. Ready to push when green.`
              )
            : null;
        const nextRadioList = fpDoneRadio
          ? [fpDoneRadio, ...prev.teamRadioMessages].slice(0, 60)
          : prev.teamRadioMessages;
        const nextPopup = fpDoneRadio ?? prev.activeTeamRadioPopup;

        // Jika seri adalah Sprint Weekend 2026 & Sprint belum selesai, masuk ke SPRINT_QUALIFYING dulu
        if (prev.circuit.isSprintWeekend && !prev.isSprintCompleted) {
          return {
            sessionPhase: 'SPRINT_QUALIFYING',
            isPracticeSimulating: false,
            parcFermeLocked: true,
            drivers: parkedDrivers,
            teamRadioMessages: nextRadioList,
            activeTeamRadioPopup: nextPopup,
            raceLogs: [
              createLog(
                1,
                `FP1 Sprint Weekend selesai! Memasuki SPRINT QUALIFYING (SQ1/SQ2/SQ3) di ${prev.circuit.name}.`,
                'INFO'
              ),
              ...prev.raceLogs,
            ],
          };
        }

        const qStates = createInitialQualifyingDriversState(
          parkedDrivers,
          prev.trackWetness,
          prev.weather
        );

        return {
          sessionPhase: 'QUALIFYING',
          isPracticeSimulating: false,
          parcFermeLocked: true,
          qualifyingStage: 'Q1',
          qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
          isQualiSimulating: false,
          qualifyingStageFinished: false,
          qualifyingDriversState: qStates,
          qualifyingResults: [],
          drivers: parkedDrivers,
          teamRadioMessages: nextRadioList,
          activeTeamRadioPopup: nextPopup,
          raceLogs: [
            createLog(
              1,
              `Free Practice selesai! Parc Fermé aktif — Knockout Qualifying Q1 (18:00 • ${prev.drivers.length} Mobil, Top 16 Lolos ke Q2) di ${prev.circuit.name}.`,
              'INFO'
            ),
            ...prev.raceLogs,
          ],
        };
      });
    },

    runSprintQualifying: () => {
      const state = get();
      const { circuit, drivers, setupConfidences, mediaDayBuffs, trackWetness, weather } = state;
      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      const sprintTyre: TyreCompound =
        trackWetness >= 55 || weather === 'HEAVY_RAIN'
          ? 'WET'
          : trackWetness >= 20 || weather === 'LIGHT_RAIN'
          ? 'INTER'
          : 'SOFT';

      const sprintQualiLogs: RaceLog[] = [];
      const driversAfterSq = drivers.map((d) => {
        const curMap = getDriverPartDamage(d);
        if (Math.random() < (d.isPlayerControlled ? 0.14 : 0.08)) {
          const outcome = rollRandomPartDamageIncident(curMap, 'MINOR');
          if (d.isPlayerControlled) {
            sprintQualiLogs.push(
              createLog(
                1,
                `SPRINT QUALIFYING INCIDENT [${d.code}]: Kerb strike merusak ${outcome.damagedPartLabel} (+${outcome.addedAmount}%)!`,
                'INCIDENT'
              )
            );
          }
          return {
            ...d,
            partDamage: outcome.nextMap,
            wingDamage: outcome.nextMap.frontWing,
          };
        }
        return d;
      });

      const raw = driversAfterSq.map((d) => {
        const conf = d.isPlayerControlled
          ? setupConfidences[d.id] ?? 75
          : Number((80 + ((d.basePace - 80) / 19) * 14).toFixed(1));
        const lap = computeQualiFlyingLapTime(
          d,
          circuit,
          sprintTyre,
          trackWetness,
          conf,
          mediaDayBuffs.qualyPaceBonusSeconds,
          false
        );
        return {
          driverId: d.id,
          name: d.name,
          code: d.code,
          number: d.number,
          teamId: d.teamId,
          teamName: d.teamName,
          teamColor: d.teamColor,
          position: 0,
          lapTime: lap.lapTime,
          gapToPole: 0,
          sector1: lap.sector1,
          sector2: lap.sector2,
          sector3: lap.sector3,
          setupConfidence: conf,
          isPlayerControlled: d.isPlayerControlled,
        };
      });

      raw.sort((a, b) => a.lapTime - b.lapTime);
      const pole = raw[0]?.lapTime ?? circuit.baseLapTime;
      const results: QualifyingResult[] = raw.map((r, idx) => ({
        ...r,
        position: idx + 1,
        gapToPole: idx === 0 ? 0 : Number((r.lapTime - pole).toFixed(3)),
      }));

      set((prev) => ({
        sessionPhase: 'SPRINT_RACE',
        drivers: driversAfterSq,
        sprintQualifyingResults: results,
        raceLogs: [
          ...sprintQualiLogs,
          createLog(
            1,
            `SPRINT QUALIFYING (SQ3): ${results[0]?.name} (${results[0]?.code}) meraih Sprint Pole (${formatLapTime(
              pole
            )})!`,
            'FASTEST_LAP'
          ),
          ...prev.raceLogs,
        ],
      }));

      return results;
    },

    runSprintRace: (playerStartingTyres?: Record<string, TyreCompound>) => {
      const state = get();
      if (state.sprintQualifyingResults.length === 0) {
        get().runSprintQualifying();
      }
      const latest = get();
      const { circuit, drivers, sprintQualifyingResults, setupConfidences, trackWetness, weather } = latest;
      const sprintLaps = Math.max(12, Math.min(24, Math.round(100 / Math.max(3, circuit.lengthKm))));

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      const sprintRaceLogs: RaceLog[] = [];
      const sprintRadios: TeamRadioMessage[] = [];
      const driversAfterSprint = drivers.map((d) => {
        const curMap = getDriverPartDamage(d);
        if (Math.random() < (d.isPlayerControlled ? 0.18 : 0.1)) {
          const outcome = rollRandomPartDamageIncident(curMap, 'MINOR');
          if (d.isPlayerControlled) {
            sprintRaceLogs.push(
              createLog(
                sprintLaps,
                `SPRINT INCIDENT [${d.code}]: Kontak di lintasan merusak ${outcome.damagedPartLabel} (+${outcome.addedAmount}%)!`,
                'INCIDENT'
              )
            );
            sprintRadios.push(
              buildPartDamageRadio(
                d,
                sprintLaps,
                'SPRINT',
                outcome.damagedPartLabel,
                outcome.nextMap[outcome.damagedPart]
              )
            );
          }
          return {
            ...d,
            partDamage: outcome.nextMap,
            wingDamage: outcome.nextMap.frontWing,
          };
        }
        return d;
      });

      const scored = sprintQualifyingResults.map((q) => {
        const d = driversAfterSprint.find((dr) => dr.id === q.driverId)!;
        const chosenTyre: TyreCompound = d.isPlayerControlled
          ? playerStartingTyres?.[d.id] ??
            (trackWetness >= 55 || weather === 'HEAVY_RAIN'
              ? 'WET'
              : trackWetness >= 20 || weather === 'LIGHT_RAIN'
              ? 'INTER'
              : 'MEDIUM')
          : trackWetness >= 55 || weather === 'HEAVY_RAIN'
          ? 'WET'
          : trackWetness >= 20 || weather === 'LIGHT_RAIN'
          ? 'INTER'
          : q.position <= 10
          ? 'MEDIUM'
          : 'SOFT';

        const conf = d.isPlayerControlled ? setupConfidences[d.id] ?? 78 : 82;
        const avgLap = calculateTargetLapTime(
          { ...d, tyreCompound: chosenTyre, tyreHealth: 85, fuelLoad: 24, paceMode: 'PUSH', ersMode: 'NEUTRAL' },
          circuit,
          trackWetness,
          'GREEN',
          conf,
          true
        );
        const gridDelay = (q.position - 1) * 0.35;
        const raceJitter = (Math.random() - 0.5) * 4.2;
        const totalSprintTime = avgLap * sprintLaps + gridDelay + raceJitter;
        return { d, chosenTyre, totalSprintTime };
      });

      scored.sort((a, b) => a.totalSprintTime - b.totalSprintTime);
      const winnerTime = scored[0]?.totalSprintTime ?? 0;

      const sprintResults: SprintResultEntry[] = scored.map((item, idx) => {
        const pos = idx + 1;
        const pts = pos <= SPRINT_POINTS_2026.length ? SPRINT_POINTS_2026[pos - 1] : 0;
        return {
          driverId: item.d.id,
          name: item.d.name,
          code: item.d.code,
          number: item.d.number,
          teamId: item.d.teamId,
          teamName: item.d.teamName,
          teamColor: item.d.teamColor,
          position: pos,
          gapToLeader: pos === 1 ? 0 : Number((item.totalSprintTime - winnerTime).toFixed(3)),
          pointsAwarded: pts,
          tyreCompound: item.chosenTyre,
          isPlayerControlled: item.d.isPlayerControlled,
        };
      });

      const winner = sprintResults[0];
      const bestPlayerSprint = sprintResults.find((r) => r.isPlayerControlled);
      const leadSprintDriver = bestPlayerSprint
        ? driversAfterSprint.find((d) => d.id === bestPlayerSprint.driverId)
        : pickLeadPlayerDriver(driversAfterSprint);
      if (leadSprintDriver && bestPlayerSprint) {
        const firstName = leadSprintDriver.name.split(' ')[0] || leadSprintDriver.code;
        sprintRadios.unshift(
          createTeamRadioExchange(
            leadSprintDriver,
            sprintLaps,
            'SPRINT',
            'SESSION_FINISH',
            bestPlayerSprint.position <= 3
              ? `Podium P${bestPlayerSprint.position} in the Sprint, ${firstName}! Great points and clean pace.`
              : `Sprint chequered flag, P${bestPlayerSprint.position} at the line ${firstName}. Focus shifts to GP Qualifying now.`,
            bestPlayerSprint.position <= 8
              ? `Good battle out there! We learned a lot about the tyres for the main race.`
              : `Tough sprint in traffic. Let's adjust for Main Qualifying and fight back.`
          )
        );
      }

      set((prev) => ({
        drivers: driversAfterSprint,
        sprintRaceResults: sprintResults,
        isSprintCompleted: true,
        teamRadioMessages:
          sprintRadios.length > 0
            ? [...sprintRadios, ...prev.teamRadioMessages].slice(0, 60)
            : prev.teamRadioMessages,
        activeTeamRadioPopup: sprintRadios[0] ?? prev.activeTeamRadioPopup,
        raceLogs: [
          ...sprintRaceLogs,
          createLog(
            sprintLaps,
            `SPRINT RACE (${sprintLaps} Laps) SELESAI! ${winner.name} (${winner.code}) menang (+8 pts). Top 8 mendapat poin Kejuaraan Dunia 2026!`,
            'FASTEST_LAP'
          ),
          ...prev.raceLogs,
        ],
      }));

      return sprintResults;
    },

    proceedFromSprintToQualifying: () => {
      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();
      set((prev) => {
        const parkedDrivers = prev.drivers.map((d) => ({
          ...d,
          isInPit: true,
          trackProgress: 0,
        }));
        const qStates = createInitialQualifyingDriversState(
          parkedDrivers,
          prev.trackWetness,
          prev.weather
        );
        return {
          sessionPhase: 'QUALIFYING',
          parcFermeLocked: true,
          qualifyingStage: 'Q1',
          qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
          isQualiSimulating: false,
          qualifyingStageFinished: false,
          qualifyingDriversState: qStates,
          qualifyingResults: [],
          drivers: parkedDrivers,
          raceLogs: [
            createLog(
              1,
              `Memasuki Main GP Qualifying (Q1/Q2/Q3) di ${prev.circuit.name}.`,
              'INFO'
            ),
            ...prev.raceLogs,
          ],
        };
      });
    },

    applyGridPenalties: (car1Penalty: number, car2Penalty: number) => {
      set((prev) => {
        const playerIds = prev.drivers
          .filter((d) => d.isPlayerControlled)
          .sort((a, b) => a.number - b.number)
          .map((d) => d.id);
        return {
          drivers: prev.drivers.map((d) => {
            if (d.id === playerIds[0]) {
              return { ...d, gridPenaltyPositions: car1Penalty };
            }
            if (d.id === playerIds[1]) {
              return { ...d, gridPenaltyPositions: car2Penalty };
            }
            return d;
          }),
        };
      });
    },

    redFlagFreeTyreSwap: (driverId: string, compound: TyreCompound) => {
      set((prev) => {
        if (prev.flagStatus !== 'RED') return prev;
        const target = prev.drivers.find((d) => d.id === driverId);
        if (!target || !target.isPlayerControlled || target.status !== 'RUNNING') return prev;
        soundEngine.playStrategyClick();
        return {
          drivers: prev.drivers.map((d) => {
            if (d.id !== driverId) return d;
            const prevUsed = d.usedCompounds ?? [d.tyreCompound];
            const nextUsed = prevUsed.includes(compound) ? prevUsed : [...prevUsed, compound];
            return {
              ...d,
              tyreCompound: compound,
              usedCompounds: nextUsed,
              tyreHealth: 100,
              tyreAge: 0,
              wingDamage: 0,
              partDamage: {
                ...getDriverPartDamage(d),
                frontWing: 0,
              },
              boxThisLap: false,
            };
          }),
          raceLogs: [
            createLog(
              prev.currentLap,
              `RED FLAG FREE SERVICE [${target.code}]: Ganti ban gratis ke ${compound} & perbaikan penuh di pit lane!`,
              'PIT'
            ),
            ...prev.raceLogs,
          ],
        };
      });
    },

    sendDriverOutQualifying: (driverId: string, tyreCompound?: TyreCompound) => {
      const state = get();
      if (state.qualifyingStageFinished || state.qualifyingClockSeconds <= 0) return;

      const driverQ = state.qualifyingDriversState[driverId];
      if (!driverQ || driverQ.runPhase !== 'IN_GARAGE') return;

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      const chosenTyre = tyreCompound ?? driverQ.tyreCompound;

      set((prev) => {
        const currentAlloc = prev.weekendTyreAllocation[driverId] ?? {
          ...DEFAULT_WEEKEND_TYRE_ALLOCATION,
        };
        const nextAlloc: TyreAllocationMap = {
          ...currentAlloc,
          [chosenTyre]: Math.max(0, (currentAlloc[chosenTyre] ?? 0) - 1),
        };

        const targetDriver = prev.drivers.find((d) => d.id === driverId);
        const qualiOutRadio =
          targetDriver && targetDriver.isPlayerControlled
            ? createTeamRadioExchange(
                targetDriver,
                1,
                prev.qualifyingStage,
                'TRACK_OUT',
                `${targetDriver.name.split(' ')[0] || targetDriver.code}, green light in pit lane — track gap looks clean on ${chosenTyre}s.`,
                `Leaving the garage now, getting the tyres up to temperature for ${prev.qualifyingStage}.`
              )
            : null;

        return {
          isQualiSimulating: true,
          parcFermeLocked: true,
          weekendTyreAllocation: {
            ...prev.weekendTyreAllocation,
            [driverId]: nextAlloc,
          },
          drivers: prev.drivers.map((d) =>
            d.id === driverId
              ? { ...d, isInPit: false, trackProgress: 1.5, tyreCompound: chosenTyre }
              : d
          ),
          qualifyingDriversState: {
            ...prev.qualifyingDriversState,
            [driverId]: {
              ...prev.qualifyingDriversState[driverId],
              runPhase: 'OUT_LAP',
              tyreCompound: chosenTyre,
              trafficEncountered: false,
            },
          },
          teamRadioMessages: qualiOutRadio
            ? [qualiOutRadio, ...prev.teamRadioMessages].slice(0, 60)
            : prev.teamRadioMessages,
          activeTeamRadioPopup: qualiOutRadio ?? prev.activeTeamRadioPopup,
          raceLogs: [
            createLog(
              1,
              `${prev.qualifyingStage} PIT EXIT: ${
                targetDriver?.code ?? driverId
              } keluar garasi menggunakan ban ${chosenTyre} (${Math.floor(
                prev.qualifyingClockSeconds / 60
              )}:${String(prev.qualifyingClockSeconds % 60).padStart(2, '0')} tersisa).`,
              'INFO'
            ),
            ...prev.raceLogs,
          ].slice(0, 150),
        };
      });
    },

    toggleQualiSimulation: (running?: boolean) => {
      set((prev) => {
        if (prev.qualifyingStageFinished) return prev;
        const nextVal = running !== undefined ? running : !prev.isQualiSimulating;
        return { isQualiSimulating: nextVal };
      });
    },

    tickQualifying: () => {
      const state = get();
      if (
        !state.isQualiSimulating ||
        state.sessionPhase !== 'QUALIFYING' ||
        state.qualifyingStageFinished
      ) {
        return;
      }

      const stage = state.qualifyingStage;
      const totalDuration = QUALI_STAGE_DURATIONS[stage];
      const nextClock = Math.max(0, state.qualifyingClockSeconds - 7);
      const elapsedRatio = 1 - state.qualifyingClockSeconds / totalDuration;

      const {
        circuit,
        drivers,
        setupConfidences,
        mediaDayBuffs,
        trackWetness,
        weather,
        qualifyingDriversState,
      } = state;

      const nextQState: Record<string, QualifyingDriverStageState> = {};
      Object.entries(qualifyingDriversState).forEach(([k, v]) => {
        nextQState[k] = { ...v };
      });

      const newLogs: RaceLog[] = [];
      const newRadios: TeamRadioMessage[] = [];

      // 1. Kelola peluncuran AI secara bergelombang agar ada traffic realistis di TrackMap2D
      drivers.forEach((d, idx) => {
        const qs = nextQState[d.id];
        if (!qs || d.isPlayerControlled || qs.runPhase !== 'IN_GARAGE') return;

        if (state.qualifyingClockSeconds > 110) {
          const defaultAITyre: TyreCompound =
            trackWetness >= 55 || weather === 'HEAVY_RAIN'
              ? 'WET'
              : trackWetness >= 20 || weather === 'LIGHT_RAIN'
              ? 'INTER'
              : 'SOFT';

          // Wave 1 (awal sesi) & Wave 2 (banker akhir sesi)
          const wave1Ready =
            qs.runsCompleted === 0 && elapsedRatio >= 0.05 + (idx % 6) * 0.035;
          const wave2Ready =
            qs.runsCompleted === 1 &&
            elapsedRatio >= 0.56 + (idx % 7) * 0.035 &&
            state.qualifyingClockSeconds >= 135;

          if (wave1Ready || wave2Ready) {
            qs.runPhase = 'OUT_LAP';
            qs.tyreCompound = defaultAITyre;
            qs.trafficEncountered = false;
          }
        }
      });

      // 2. Majukan posisi seluruh mobil yang sedang berada di lintasan (OUT_LAP -> FLYING_LAP -> IN_LAP)
      let anyFlyingStillOnTrack = false;

      const updatedDrivers = drivers.map((d) => {
        const qs = nextQState[d.id];
        if (!qs || qs.runPhase === 'ELIMINATED') {
          return { ...d, isInPit: true, trackProgress: 0 };
        }

        if (qs.runPhase === 'IN_GARAGE') {
          return { ...d, isInPit: true, trackProgress: 0 };
        }

        // Jika newly launched OUT_LAP baru saja dimulai dari tick AI di atas
        if (d.isInPit && qs.runPhase === 'OUT_LAP') {
          return {
            ...d,
            isInPit: false,
            trackProgress: 1.5,
            tyreCompound: qs.tyreCompound,
          };
        }

        // Deteksi traffic saat mobil dalam fase FLYING_LAP
        if (qs.runPhase === 'FLYING_LAP') {
          const blockedByTraffic = drivers.some((other) => {
            if (other.id === d.id || other.isInPit) return false;
            const otherQ = nextQState[other.id];
            if (!otherQ || otherQ.runPhase === 'ELIMINATED' || otherQ.runPhase === 'IN_GARAGE') {
              return false;
            }
            const aheadGap = (other.trackProgress - d.trackProgress + 100) % 100;
            // Mobil di depan berada pada jarak 0.4% - 4.2% (dirty air / terhalang di tikungan)
            return aheadGap > 0.4 && aheadGap < 4.2;
          });
          if (blockedByTraffic) {
            qs.trafficEncountered = true;
          }
        }

        const step =
          qs.runPhase === 'FLYING_LAP'
            ? 5.8 + ((d.basePace - 80) / 19) * 0.65
            : qs.runPhase === 'OUT_LAP'
            ? 5.1
            : 5.4;

        const nextProgress = d.trackProgress + step;

        if (nextProgress >= 100) {
          const wrapped = Number((nextProgress - 100).toFixed(2));
          if (qs.runPhase === 'OUT_LAP') {
            // Jika waktu sudah habis (0:00), mobil yang baru selesai OUT_LAP batal flying lap
            if (nextClock <= 0) {
              qs.runPhase = 'IN_GARAGE';
              return { ...d, isInPit: true, trackProgress: 0 };
            }
            qs.runPhase = 'FLYING_LAP';
            qs.trafficEncountered = false;
            anyFlyingStillOnTrack = true;
            return { ...d, isInPit: false, trackProgress: wrapped };
          }

          if (qs.runPhase === 'FLYING_LAP') {
            const driverConf = d.isPlayerControlled
              ? setupConfidences[d.id] ?? 75
              : Number((80 + ((d.basePace - 80) / 19) * 14).toFixed(1));
            const lapData = computeQualiFlyingLapTime(
              d,
              circuit,
              qs.tyreCompound,
              trackWetness,
              driverConf,
              mediaDayBuffs.qualyPaceBonusSeconds,
              qs.trafficEncountered
            );

            let qualUpdatedMap = getDriverPartDamage(d);
            let damageTimeCost = 0;
            if (Math.random() < (d.isPlayerControlled ? 0.14 : 0.08)) {
              const outcome = rollRandomPartDamageIncident(qualUpdatedMap, 'MINOR');
              qualUpdatedMap = outcome.nextMap;
              damageTimeCost = Number((0.75 + Math.random() * 1.1).toFixed(3));
              newLogs.push(
                createLog(
                  1,
                  `[QUALIFYING DAMAGE] ${d.code} melebar ke kerb / barrier pada ${stage} — ${outcome.damagedPartLabel} (+${outcome.addedAmount}%)!`,
                  'INCIDENT'
                )
              );
              if (d.isPlayerControlled) {
                newRadios.push(
                  buildPartDamageRadio(
                    d,
                    1,
                    stage,
                    outcome.damagedPartLabel,
                    qualUpdatedMap[outcome.damagedPart]
                  )
                );
              }
            }
            const effectiveQualTime = Number((lapData.lapTime + damageTimeCost).toFixed(3));

            qs.runsCompleted += 1;
            const prevBest =
              stage === 'Q1' ? qs.q1Time : stage === 'Q2' ? qs.q2Time : qs.q3Time;

            if (prevBest <= 0 || effectiveQualTime < prevBest) {
              if (stage === 'Q1') qs.q1Time = effectiveQualTime;
              if (stage === 'Q2') qs.q2Time = effectiveQualTime;
              if (stage === 'Q3') qs.q3Time = effectiveQualTime;
              qs.currentStageBestTime = effectiveQualTime;
              qs.sector1 = lapData.sector1;
              qs.sector2 = lapData.sector2;
              qs.sector3 = lapData.sector3;
            }

            if (d.isPlayerControlled) {
              newLogs.push(
                createLog(
                  1,
                  `${stage} FLYING LAP [${d.code}]: ${formatLapTime(effectiveQualTime)} (${
                    qs.tyreCompound
                  })${qs.trafficEncountered ? ' — TERKENA TRAFFIC!' : ' — CLEAN AIR!'}`,
                  qs.trafficEncountered ? 'INCIDENT' : 'FASTEST_LAP'
                )
              );
            }

            qs.runPhase = 'IN_LAP';
            return {
              ...d,
              partDamage: qualUpdatedMap,
              wingDamage: qualUpdatedMap.frontWing,
              isInPit: false,
              trackProgress: wrapped,
            };
          }

          // IN_LAP selesai -> kembali ke IN_GARAGE
          qs.runPhase = 'IN_GARAGE';
          return { ...d, isInPit: true, trackProgress: 0 };
        }

        if (qs.runPhase === 'FLYING_LAP') {
          anyFlyingStillOnTrack = true;
        }

        return { ...d, isInPit: false, trackProgress: Number(nextProgress.toFixed(2)) };
      });

      // 3. Jika jam mencapai 0:00 dan tidak ada mobil yang sedang FLYING_LAP, selesaikan tahap Q1/Q2/Q3!
      if (nextClock <= 0 && !anyFlyingStillOnTrack) {
        const activeDrivers = updatedDrivers.filter((d) => nextQState[d.id].runPhase !== 'ELIMINATED');
        activeDrivers.forEach((d) => {
          const qs = nextQState[d.id];
          const existingTime =
            stage === 'Q1' ? qs.q1Time : stage === 'Q2' ? qs.q2Time : qs.q3Time;
          if (existingTime <= 0) {
            const driverConf = d.isPlayerControlled
              ? setupConfidences[d.id] ?? 75
              : Number((80 + ((d.basePace - 80) / 19) * 14).toFixed(1));
            const fallbackLap = computeQualiFlyingLapTime(
              d,
              circuit,
              qs.tyreCompound,
              trackWetness,
              driverConf,
              mediaDayBuffs.qualyPaceBonusSeconds,
              false
            );
            if (stage === 'Q1') qs.q1Time = fallbackLap.lapTime;
            if (stage === 'Q2') qs.q2Time = fallbackLap.lapTime;
            if (stage === 'Q3') qs.q3Time = fallbackLap.lapTime;
            qs.currentStageBestTime = fallbackLap.lapTime;
            qs.sector1 = fallbackLap.sector1;
            qs.sector2 = fallbackLap.sector2;
            qs.sector3 = fallbackLap.sector3;
            qs.runsCompleted += 1;
          }
          qs.runPhase = 'IN_GARAGE';
        });

        // Evaluasi eliminasi atau finalisasi grid
        const stageTimeOf = (id: string) =>
          stage === 'Q1'
            ? nextQState[id].q1Time
            : stage === 'Q2'
            ? nextQState[id].q2Time
            : nextQState[id].q3Time;
        const sortedActive = [...activeDrivers].sort(
          (a, b) => stageTimeOf(a.id) - stageTimeOf(b.id)
        );

        let finalQualiResults: QualifyingResult[] = [];
        let finalDrivers = updatedDrivers.map((d) => ({ ...d, isInPit: true, trackProgress: 0 }));

        if (stage === 'Q1') {
          const eliminated = sortedActive.slice(16); // P17 - P22
          eliminated.forEach((d, idx) => {
            nextQState[d.id].runPhase = 'ELIMINATED';
            nextQState[d.id].eliminatedIn = 'Q1';
            nextQState[d.id].lockedGridPosition = 17 + idx;
          });
          newLogs.push(
            createLog(
              1,
              `Q1 CHEQUERED FLAG! Top 16 lolos ke Q2. Tereliminasi (P17-P${updatedDrivers.length}): ${eliminated
                .map((e) => e.code)
                .join(', ')}.`,
              'INFO'
            )
          );
        } else if (stage === 'Q2') {
          const eliminated = sortedActive.slice(10); // P11 - P16
          eliminated.forEach((d, idx) => {
            nextQState[d.id].runPhase = 'ELIMINATED';
            nextQState[d.id].eliminatedIn = 'Q2';
            nextQState[d.id].lockedGridPosition = 11 + idx;
          });
          newLogs.push(
            createLog(
              1,
              `Q2 CHEQUERED FLAG! Top 10 Shootout Q3 siap. Tereliminasi (P11-P16): ${eliminated
                .map((e) => e.code)
                .join(', ')}.`,
              'INFO'
            )
          );
        } else {
          // Q3 selesai -> Kunci seluruh Grid P1 - P22!
          sortedActive.forEach((d, idx) => {
            nextQState[d.id].lockedGridPosition = idx + 1;
          });
          const fullOrder = [...updatedDrivers].sort(
            (a, b) =>
              (nextQState[a.id].lockedGridPosition ?? 99) -
              (nextQState[b.id].lockedGridPosition ?? 99)
          );
          const poleTime =
            nextQState[fullOrder[0]?.id]?.q3Time ||
            nextQState[fullOrder[0]?.id]?.currentStageBestTime ||
            circuit.baseLapTime;

          finalQualiResults = fullOrder.map((d, idx) => {
            const qs = nextQState[d.id];
            const bestOverall = qs.q3Time > 0 ? qs.q3Time : qs.q2Time > 0 ? qs.q2Time : qs.q1Time;
            const pos = idx + 1;
            return {
              driverId: d.id,
              name: d.name,
              code: d.code,
              number: d.number,
              teamId: d.teamId,
              teamName: d.teamName,
              teamColor: d.teamColor,
              position: pos,
              lapTime: bestOverall,
              gapToPole: pos === 1 ? 0 : Number((bestOverall - poleTime).toFixed(3)),
              sector1: qs.sector1,
              sector2: qs.sector2,
              sector3: qs.sector3,
              setupConfidence: d.isPlayerControlled ? setupConfidences[d.id] ?? 75 : 85,
              isPlayerControlled: d.isPlayerControlled,
            };
          });

          const startWeather = state.weatherTimeline[0]?.weather ?? state.weather;
          const startWetness = state.weatherTimeline[0]?.projectedWetness ?? state.trackWetness;

          const gridRaw: DriverState[] = finalQualiResults.map((qRes) => {
            const orig = finalDrivers.find((d) => d.id === qRes.driverId)!;
            const gridPosition = qRes.position;
            return {
              ...orig,
              position: gridPosition,
              currentLap: 1,
              trackProgress: Math.max(0, Number((2.2 - (gridPosition - 1) * 0.1).toFixed(2))),
              totalTimeElapsed: 0,
              gapToLeader: Number(((gridPosition - 1) * 0.25).toFixed(3)),
              interval: gridPosition === 1 ? 0 : 0.25,
              lastLapTime: 0,
              bestLapTime: 0,
              tyreCompound:
                gridPosition <= 10
                  ? gridPosition % 2 === 1
                    ? 'SOFT'
                    : 'MEDIUM'
                  : gridPosition % 3 === 0
                  ? 'SOFT'
                  : 'MEDIUM',
              tyreHealth: 100,
              tyreAge: 0,
              ersBattery: 100,
              paceMode: 'STANDARD',
              ersMode: 'NEUTRAL',
              isInPit: true,
              boxThisLap: false,
              pitStopsCount: 0,
              wingDamage: orig.wingDamage ?? 0,
              partDamage: getDriverPartDamage(orig),
              repairWingOnNextPit: false,
              status: 'RUNNING',
            };
          });
          finalDrivers = applyAIStartingTyres(gridRaw, startWetness, startWeather);
          const poleWinner = finalQualiResults[0];
          newLogs.push(
            createLog(
              1,
              `Q3 RESULT: ${poleWinner.name} (${poleWinner.code}) meraih POLE POSITION dengan waktu ${formatLapTime(
                poleWinner.lapTime
              )}!`,
              'FASTEST_LAP'
            )
          );
        }

        if (newLogs.length > 0 || newRadios.length > 0) soundEngine.playTeamRadioBeep();
        const leadPlayerQ = pickLeadPlayerDriver(finalDrivers);
        if (leadPlayerQ) {
          const firstName = leadPlayerQ.name.split(' ')[0] || leadPlayerQ.code;
          if (stage === 'Q1' || stage === 'Q2') {
            const posIdx = sortedActive.findIndex((d) => d.id === leadPlayerQ.id);
            const passed = nextQState[leadPlayerQ.id]?.runPhase !== 'ELIMINATED';
            newRadios.unshift(
              createTeamRadioExchange(
                leadPlayerQ,
                1,
                stage,
                'SESSION_FINISH',
                passed
                  ? `${stage} chequered flag! You are through in P${posIdx + 1}, ${firstName}. Box to reset.`
                  : `${stage} is over ${firstName}, unfortunately we didn't make the cut today.`,
                passed
                  ? `Copy! Track is gripping up, let's build on this for the next session.`
                  : `We didn't have the rear grip on that final sector. Frustrating.`
              )
            );
          } else {
            const bestPlayerRes = finalQualiResults.find((r) => r.isPlayerControlled);
            const qDriver = bestPlayerRes
              ? finalDrivers.find((d) => d.id === bestPlayerRes.driverId) ?? leadPlayerQ
              : leadPlayerQ;
            const pPos = bestPlayerRes?.position ?? 10;
            const qFirst = qDriver.name.split(' ')[0] || qDriver.code;
            newRadios.unshift(
              createTeamRadioExchange(
                qDriver,
                1,
                'Q3',
                'SESSION_FINISH',
                pPos === 1
                  ? `POLE POSITION ${qFirst.toUpperCase()}! Mega lap, P1 for tomorrow!`
                  : `Qualifying finished, P${pPos} for the grid tomorrow ${qFirst}.`,
                pPos === 1
                  ? `YES! Front row locked in, the car felt electric on that last sector!`
                  : `Gave it everything out there. Good starting spot to race from tomorrow.`
              )
            );
          }
        }
        const coloredQState = refreshQualiSectorColors(nextQState);

        set({
          qualifyingClockSeconds: 0,
          isQualiSimulating: false,
          qualifyingStageFinished: true,
          qualifyingDriversState: coloredQState,
          qualifyingResults:
            finalQualiResults.length > 0 ? finalQualiResults : state.qualifyingResults,
          drivers: finalDrivers,
          teamRadioMessages:
            newRadios.length > 0
              ? [...newRadios, ...state.teamRadioMessages].slice(0, 60)
              : state.teamRadioMessages,
          activeTeamRadioPopup: newRadios[0] ?? state.activeTeamRadioPopup,
          raceLogs: [...newLogs, ...state.raceLogs].slice(0, 150),
        });
        return;
      }

      if (newLogs.length > 0 || newRadios.length > 0) soundEngine.playTeamRadioBeep();
      const coloredQState = refreshQualiSectorColors(nextQState);

      set({
        qualifyingClockSeconds: nextClock,
        qualifyingDriversState: coloredQState,
        drivers: updatedDrivers,
        teamRadioMessages:
          newRadios.length > 0
            ? [...newRadios, ...state.teamRadioMessages].slice(0, 60)
            : state.teamRadioMessages,
        activeTeamRadioPopup: newRadios[0] ?? state.activeTeamRadioPopup,
        raceLogs: [...newLogs, ...state.raceLogs].slice(0, 150),
      });
    },

    fastForwardQualiStage: () => {
      const state = get();
      if (state.qualifyingStageFinished) return;

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      const stage = state.qualifyingStage;
      const {
        circuit,
        drivers,
        setupConfidences,
        mediaDayBuffs,
        trackWetness,
        qualifyingDriversState,
      } = state;

      const nextQState: Record<string, QualifyingDriverStageState> = {};
      Object.entries(qualifyingDriversState).forEach(([k, v]) => {
        nextQState[k] = { ...v };
      });

      const activeDrivers = drivers.filter((d) => nextQState[d.id]?.runPhase !== 'ELIMINATED');
      activeDrivers.forEach((d) => {
        const qs = nextQState[d.id];
        const currentBest = stage === 'Q1' ? qs.q1Time : stage === 'Q2' ? qs.q2Time : qs.q3Time;
        const driverConf = d.isPlayerControlled
          ? setupConfidences[d.id] ?? 75
          : Number((80 + ((d.basePace - 80) / 19) * 14).toFixed(1));

        // Jika belum punya waktu atau baru 1 run, jalankan banker/final lap bersih
        if (currentBest <= 0 || qs.runsCompleted < 2) {
          const lapData = computeQualiFlyingLapTime(
            d,
            circuit,
            qs.tyreCompound,
            trackWetness,
            driverConf,
            mediaDayBuffs.qualyPaceBonusSeconds,
            false
          );
          if (currentBest <= 0 || lapData.lapTime < currentBest) {
            if (stage === 'Q1') qs.q1Time = lapData.lapTime;
            if (stage === 'Q2') qs.q2Time = lapData.lapTime;
            if (stage === 'Q3') qs.q3Time = lapData.lapTime;
            qs.currentStageBestTime = lapData.lapTime;
            qs.sector1 = lapData.sector1;
            qs.sector2 = lapData.sector2;
            qs.sector3 = lapData.sector3;
          }
          qs.runsCompleted += 1;
        }
        qs.runPhase = 'IN_GARAGE';
      });

      const stageTimeOf = (id: string) =>
        stage === 'Q1'
          ? nextQState[id].q1Time
          : stage === 'Q2'
          ? nextQState[id].q2Time
          : nextQState[id].q3Time;
      const sortedActive = [...activeDrivers].sort((a, b) => stageTimeOf(a.id) - stageTimeOf(b.id));

      let finalQualiResults: QualifyingResult[] = state.qualifyingResults;
      let finalDrivers = drivers.map((d) => ({ ...d, isInPit: true, trackProgress: 0 }));
      let summaryLog: RaceLog;

      if (stage === 'Q1') {
        const eliminated = sortedActive.slice(16);
        eliminated.forEach((d, idx) => {
          nextQState[d.id].runPhase = 'ELIMINATED';
          nextQState[d.id].eliminatedIn = 'Q1';
          nextQState[d.id].lockedGridPosition = 17 + idx;
        });
        summaryLog = createLog(
          1,
          `Q1 SELESAI! Top 16 melaju ke Q2. Tereliminasi (P17-P${drivers.length}): ${eliminated
            .map((e) => e.code)
            .join(', ')}.`,
          'INFO'
        );
      } else if (stage === 'Q2') {
        const eliminated = sortedActive.slice(10);
        eliminated.forEach((d, idx) => {
          nextQState[d.id].runPhase = 'ELIMINATED';
          nextQState[d.id].eliminatedIn = 'Q2';
          nextQState[d.id].lockedGridPosition = 11 + idx;
        });
        summaryLog = createLog(
          1,
          `Q2 SELESAI! Top 10 Shootout Q3 terkunci. Tereliminasi (P11-P16): ${eliminated
            .map((e) => e.code)
            .join(', ')}.`,
          'INFO'
        );
      } else {
        sortedActive.forEach((d, idx) => {
          nextQState[d.id].lockedGridPosition = idx + 1;
        });
        const fullOrder = [...drivers].sort(
          (a, b) =>
            (nextQState[a.id].lockedGridPosition ?? 99) -
            (nextQState[b.id].lockedGridPosition ?? 99)
        );
        const poleTime =
          nextQState[fullOrder[0]?.id]?.q3Time ||
          nextQState[fullOrder[0]?.id]?.currentStageBestTime ||
          circuit.baseLapTime;

        finalQualiResults = fullOrder.map((d, idx) => {
          const qs = nextQState[d.id];
          const bestOverall = qs.q3Time > 0 ? qs.q3Time : qs.q2Time > 0 ? qs.q2Time : qs.q1Time;
          const pos = idx + 1;
          return {
            driverId: d.id,
            name: d.name,
            code: d.code,
            number: d.number,
            teamId: d.teamId,
            teamName: d.teamName,
            teamColor: d.teamColor,
            position: pos,
            lapTime: bestOverall,
            gapToPole: pos === 1 ? 0 : Number((bestOverall - poleTime).toFixed(3)),
            sector1: qs.sector1,
            sector2: qs.sector2,
            sector3: qs.sector3,
            setupConfidence: d.isPlayerControlled ? setupConfidences[d.id] ?? 75 : 85,
            isPlayerControlled: d.isPlayerControlled,
          };
        });

        const startWeather = state.weatherTimeline[0]?.weather ?? state.weather;
        const startWetness = state.weatherTimeline[0]?.projectedWetness ?? state.trackWetness;

        const gridRaw: DriverState[] = finalQualiResults.map((qRes) => {
          const orig = finalDrivers.find((d) => d.id === qRes.driverId)!;
          const gridPosition = qRes.position;
          return {
            ...orig,
            position: gridPosition,
            currentLap: 1,
            trackProgress: Math.max(0, Number((2.2 - (gridPosition - 1) * 0.1).toFixed(2))),
            totalTimeElapsed: 0,
            gapToLeader: Number(((gridPosition - 1) * 0.25).toFixed(3)),
            interval: gridPosition === 1 ? 0 : 0.25,
            lastLapTime: 0,
            bestLapTime: 0,
            tyreCompound:
              gridPosition <= 10
                ? gridPosition % 2 === 1
                  ? 'SOFT'
                  : 'MEDIUM'
                : gridPosition % 3 === 0
                ? 'SOFT'
                : 'MEDIUM',
            tyreHealth: 100,
            tyreAge: 0,
            ersBattery: 100,
            paceMode: 'STANDARD',
            ersMode: 'NEUTRAL',
            isInPit: true,
            boxThisLap: false,
            pitStopsCount: 0,
            wingDamage: orig.wingDamage ?? 0,
            partDamage: getDriverPartDamage(orig),
            repairWingOnNextPit: false,
            status: 'RUNNING',
          };
        });
        finalDrivers = applyAIStartingTyres(gridRaw, startWetness, startWeather);
        const poleWinner = finalQualiResults[0];
        summaryLog = createLog(
          1,
          `Q3 RESULT: ${poleWinner.name} (${poleWinner.code}) meraih POLE POSITION dengan waktu ${formatLapTime(
            poleWinner.lapTime
          )}!`,
          'FASTEST_LAP'
        );
      }

      soundEngine.playTeamRadioBeep();
      const leadPlayerFF = pickLeadPlayerDriver(finalDrivers);
      let ffRadio: TeamRadioMessage | null = null;
      if (leadPlayerFF) {
        const firstName = leadPlayerFF.name.split(' ')[0] || leadPlayerFF.code;
        if (stage === 'Q1' || stage === 'Q2') {
          const passed = nextQState[leadPlayerFF.id]?.runPhase !== 'ELIMINATED';
          const posIdx = sortedActive.findIndex((d) => d.id === leadPlayerFF.id);
          ffRadio = createTeamRadioExchange(
            leadPlayerFF,
            1,
            stage,
            'SESSION_FINISH',
            passed
              ? `${stage} complete! P${posIdx + 1}, safely through to the next shootout.`
              : `${stage} finished, ${firstName}. Knocked out just outside the cut-off.`,
            passed
              ? `Good lap in clean air. Ready to step it up in the next segment.`
              : `Missed the window with traffic. We'll race hard from there.`
          );
        } else {
          const bestPlayerRes = finalQualiResults.find((r) => r.isPlayerControlled);
          const qDriver = bestPlayerRes
            ? finalDrivers.find((d) => d.id === bestPlayerRes.driverId) ?? leadPlayerFF
            : leadPlayerFF;
          const pPos = bestPlayerRes?.position ?? 10;
          const qFirst = qDriver.name.split(' ')[0] || qDriver.code;
          ffRadio = createTeamRadioExchange(
            qDriver,
            1,
            'Q3',
            'SESSION_FINISH',
            pPos === 1
              ? `POLE POSITION ${qFirst.toUpperCase()}! P1 secured for tomorrow!`
              : `Qualifying done, starting P${pPos} tomorrow ${qFirst}.`,
            pPos === 1
              ? `YES TEAM! What a lap — the balance was spot on!`
              : `Left nothing on the table. Ready for strategy prep now.`
          );
        }
      }

      const coloredQState = refreshQualiSectorColors(nextQState);
      set((prev) => ({
        qualifyingClockSeconds: 0,
        isQualiSimulating: false,
        qualifyingStageFinished: true,
        qualifyingDriversState: coloredQState,
        qualifyingResults: finalQualiResults,
        drivers: finalDrivers,
        teamRadioMessages: ffRadio
          ? [ffRadio, ...prev.teamRadioMessages].slice(0, 60)
          : prev.teamRadioMessages,
        activeTeamRadioPopup: ffRadio ?? prev.activeTeamRadioPopup,
        raceLogs: [summaryLog, ...prev.raceLogs].slice(0, 150),
      }));
    },

    advanceQualifyingStage: () => {
      const state = get();
      if (state.qualifyingStage === 'Q3') {
        get().proceedToPreRaceStrategy();
        return;
      }

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      const nextStage: QualifyingStage = state.qualifyingStage === 'Q1' ? 'Q2' : 'Q3';
      const nextDuration = QUALI_STAGE_DURATIONS[nextStage];

      set((prev) => {
        const nextQState: Record<string, QualifyingDriverStageState> = {};
        Object.entries(prev.qualifyingDriversState).forEach(([id, qs]) => {
          nextQState[id] =
            qs.runPhase === 'ELIMINATED'
              ? { ...qs }
              : {
                  ...qs,
                  runPhase: 'IN_GARAGE',
                  runsCompleted: 0,
                  currentStageBestTime: 0,
                  trafficEncountered: false,
                  sectorStatuses: ['NONE', 'NONE', 'NONE'],
                  personalBestSectors: undefined,
                };
        });

        return {
          qualifyingStage: nextStage,
          qualifyingClockSeconds: nextDuration,
          isQualiSimulating: false,
          qualifyingStageFinished: false,
          qualifyingDriversState: nextQState,
          drivers: prev.drivers.map((d) => ({ ...d, isInPit: true, trackProgress: 0 })),
          raceLogs: [
            createLog(
              1,
              `${nextStage} DIMULAI (${Math.floor(nextDuration / 60)}:00 • ${
                nextStage === 'Q2' ? '16 Mobil Aktif' : 'Top 10 Pole Shootout'
              })!`,
              'INFO'
            ),
            ...prev.raceLogs,
          ].slice(0, 150),
        };
      });
    },

    runQualifying: () => {
      const state = get();
      const { circuit, drivers, setupConfidences, mediaDayBuffs } = state;

      const rawResults = drivers.map((driver) => {
        const carPerf = TEAM_PERFORMANCE_MAP[driver.teamId] ?? 88;
        const driverSkillDelta = (99 - driver.basePace) * 0.082;
        const carPerfDelta = (99 - carPerf) * 0.092;

        const confidence = driver.isPlayerControlled
          ? setupConfidences[driver.id] ?? 70
          : Number((78 + ((driver.basePace - 80) / 19) * 14 + (Math.random() * 4 - 2)).toFixed(1));

        const setupTimeBonus = (confidence / 100) * 0.8;
        const mediaDayQualyBonus = driver.isPlayerControlled
          ? mediaDayBuffs.qualyPaceBonusSeconds
          : 0;
        const qualiExecutionJitter = (Math.random() - 0.5) * 0.36;

        const flyingLapTime = Number(
          (
            circuit.baseLapTime +
            driverSkillDelta +
            carPerfDelta -
            1.35 -
            0.85 -
            setupTimeBonus -
            mediaDayQualyBonus +
            qualiExecutionJitter
          ).toFixed(3)
        );

        const s1 = Number((flyingLapTime * 0.32 + (Math.random() - 0.5) * 0.04).toFixed(3));
        const s2 = Number((flyingLapTime * 0.36 + (Math.random() - 0.5) * 0.04).toFixed(3));
        const s3 = Number((flyingLapTime - s1 - s2).toFixed(3));

        return {
          driverId: driver.id,
          name: driver.name,
          code: driver.code,
          number: driver.number,
          teamId: driver.teamId,
          teamName: driver.teamName,
          teamColor: driver.teamColor,
          position: 0,
          lapTime: flyingLapTime,
          gapToPole: 0,
          sector1: s1,
          sector2: s2,
          sector3: s3,
          setupConfidence: confidence,
          isPlayerControlled: driver.isPlayerControlled,
        };
      });

      rawResults.sort((a, b) => a.lapTime - b.lapTime);
      const poleTime = rawResults[0]?.lapTime ?? circuit.baseLapTime;

      const finalQualiResults: QualifyingResult[] = rawResults.map((res, index) => ({
        ...res,
        position: index + 1,
        gapToPole: index === 0 ? 0 : Number((res.lapTime - poleTime).toFixed(3)),
      }));

      const nextQState: Record<string, QualifyingDriverStageState> = {};
      finalQualiResults.forEach((res) => {
        nextQState[res.driverId] = {
          driverId: res.driverId,
          runPhase: res.position > 10 ? 'ELIMINATED' : 'IN_GARAGE',
          tyreCompound: 'SOFT',
          runsCompleted: 2,
          q1Time: Number((res.lapTime + 0.35).toFixed(3)),
          q2Time: res.position <= 16 ? Number((res.lapTime + 0.16).toFixed(3)) : 0,
          q3Time: res.position <= 10 ? res.lapTime : 0,
          currentStageBestTime: res.lapTime,
          sector1: res.sector1,
          sector2: res.sector2,
          sector3: res.sector3,
          trafficEncountered: false,
          eliminatedIn: res.position > 16 ? 'Q1' : res.position > 10 ? 'Q2' : undefined,
          lockedGridPosition: res.position,
        };
      });

      const startWeather = state.weatherTimeline[0]?.weather ?? state.weather;
      const startWetness = state.weatherTimeline[0]?.projectedWetness ?? state.trackWetness;

      const rawGridDrivers: DriverState[] = finalQualiResults.map((qRes) => {
        const originalDriver = drivers.find((d) => d.id === qRes.driverId)!;
        const gridPosition = qRes.position;
        const gridTimeOffset = (gridPosition - 1) * 0.25;

        const startingTyre: TyreCompound =
          gridPosition <= 10
            ? gridPosition % 2 === 1
              ? 'SOFT'
              : 'MEDIUM'
            : gridPosition % 3 === 0
            ? 'SOFT'
            : 'MEDIUM';

        return {
          ...originalDriver,
          position: gridPosition,
          currentLap: 1,
          trackProgress: Math.max(0, Number((2.2 - (gridPosition - 1) * 0.1).toFixed(2))),
          totalTimeElapsed: 0,
          gapToLeader: Number(gridTimeOffset.toFixed(3)),
          interval: gridPosition === 1 ? 0 : 0.25,
          lastLapTime: 0,
          bestLapTime: 0,
          tyreCompound: startingTyre,
          tyreHealth: 100,
          tyreAge: 0,
          ersBattery: 100,
          paceMode: 'STANDARD',
          ersMode: 'NEUTRAL',
          isInPit: false,
          boxThisLap: false,
          pitStopsCount: 0,
          wingDamage: originalDriver.wingDamage ?? 0,
          partDamage: getDriverPartDamage(originalDriver),
          repairWingOnNextPit: false,
          status: 'RUNNING',
        };
      });

      const gridOrderedDrivers = applyAIStartingTyres(
        rawGridDrivers,
        startWetness,
        startWeather
      );

      const freshMaps = createInitialDriverMaps(gridOrderedDrivers);
      const poleWinner = finalQualiResults[0];
      const defaultFuel = getStandardFuelLoad2026(circuit);

      const nextStartingTyres = { ...state.preRaceStartingTyres };
      const nextStartingFuel = { ...state.preRaceStartingFuel };

      gridOrderedDrivers
        .filter((d) => d.isPlayerControlled)
        .forEach((d) => {
          nextStartingTyres[d.id] =
            startWetness >= 55 || startWeather === 'HEAVY_RAIN'
              ? 'WET'
              : startWetness >= 20 || startWeather === 'LIGHT_RAIN'
              ? 'INTER'
              : d.tyreCompound;
          nextStartingFuel[d.id] = defaultFuel;
        });

      set((prev) => {
        const bestPlayerRes = finalQualiResults.find((r) => r.isPlayerControlled);
        const qDriver = bestPlayerRes
          ? gridOrderedDrivers.find((d) => d.id === bestPlayerRes.driverId)
          : pickLeadPlayerDriver(gridOrderedDrivers);
        const qualiRadio =
          prev.sessionPhase === 'QUALIFYING' && qDriver && bestPlayerRes
            ? createTeamRadioExchange(
                qDriver,
                1,
                'QUALI',
                'SESSION_FINISH',
                bestPlayerRes.position === 1
                  ? `POLE POSITION ${(qDriver.name.split(' ')[0] || qDriver.code).toUpperCase()}! P1 for Sunday!`
                  : `Qualifying over — starting P${bestPlayerRes.position} for the Grand Prix.`,
                bestPlayerRes.position <= 3
                  ? `Front of the grid! Car felt hooked up all session.`
                  : `We'll tune race pace strategy tonight and fight forward tomorrow.`
              )
            : null;

        return {
          qualifyingStage: 'Q3',
          qualifyingClockSeconds: 0,
          isQualiSimulating: false,
          qualifyingStageFinished: true,
          qualifyingDriversState: refreshQualiSectorColors(nextQState),
          qualifyingResults: finalQualiResults,
          drivers: gridOrderedDrivers,
          preRaceStartingTyres: nextStartingTyres,
          preRaceStartingFuel: nextStartingFuel,
          pitRemainingTime: freshMaps.pitRemainingTime,
          currentLapElapsed: freshMaps.currentLapElapsed,
          teamRadioMessages: qualiRadio
            ? [qualiRadio, ...prev.teamRadioMessages].slice(0, 60)
            : prev.teamRadioMessages,
          activeTeamRadioPopup: qualiRadio ?? prev.activeTeamRadioPopup,
          raceLogs: [
            createLog(
              1,
              `QUALIFYING RESULT: ${poleWinner.name} (${poleWinner.code}) meraih POLE POSITION dengan waktu ${formatLapTime(
                poleWinner.lapTime
              )}!`,
              'FASTEST_LAP'
            ),
            ...prev.raceLogs,
          ],
        };
      });

      return finalQualiResults;
    },

    proceedToPreRaceStrategy: () => {
      let state = get();
      if (state.qualifyingResults.length === 0) {
        // Jika pemain sudah memulai Q1/Q2 (misal tereliminasi di Q1/Q2) lalu langsung klik Proceed,
        // selesaikan sisa tahap kualifikasi secara berurutan agar hasil Q1/Q2 tetap terjaga!
        const hasAnyQualiTime = Object.values(state.qualifyingDriversState).some(
          (qs) => qs.q1Time > 0 || qs.q2Time > 0
        );
        if (hasAnyQualiTime) {
          let guard = 0;
          while (get().qualifyingResults.length === 0 && guard < 6) {
            guard += 1;
            const cur = get();
            if (!cur.qualifyingStageFinished) {
              cur.fastForwardQualiStage();
            } else if (cur.qualifyingStage !== 'Q3') {
              cur.advanceQualifyingStage();
            } else {
              cur.runQualifying();
              break;
            }
          }
        } else {
          state.runQualifying();
        }
      }
      soundEngine.playStrategyClick();

      set((prev) => {
        const syncedDrivers = applyAIStartingTyres(
          prev.drivers.map((d) => ({
            ...d,
            isInPit: false,
            trackProgress: Math.max(0, Number((2.2 - (d.position - 1) * 0.1).toFixed(2))),
          })),
          prev.trackWetness,
          prev.weather
        );
        const updatedPreRaceTyres = { ...prev.preRaceStartingTyres };
        syncedDrivers
          .filter((d) => d.isPlayerControlled)
          .forEach((d) => {
            if (prev.trackWetness >= 55 || prev.weather === 'HEAVY_RAIN') {
              updatedPreRaceTyres[d.id] = 'WET';
            } else if (prev.trackWetness >= 20 || prev.weather === 'LIGHT_RAIN') {
              updatedPreRaceTyres[d.id] = 'INTER';
            }
          });

        return {
          sessionPhase: 'PRE_RACE_STRATEGY',
          raceStatus: 'IDLE',
          isPracticeSimulating: false,
          isQualiSimulating: false,
          drivers: syncedDrivers,
          preRaceStartingTyres: updatedPreRaceTyres,
          raceLogs: [
            createLog(
              1,
              `Kualifikasi selesai (Grid P1-P${prev.drivers.length} terkunci). Pilih Starting Tyre Compound & Beban Bahan Bakar di Pre-Race Strategy!`,
              'INFO'
            ),
            ...prev.raceLogs,
          ],
        };
      });
    },

    initializeStartingTyresForAI: () => {
      set((prev) => {
        const syncedDrivers = applyAIStartingTyres(
          prev.drivers,
          prev.trackWetness,
          prev.weather
        );
        const updatedPreRaceTyres = { ...prev.preRaceStartingTyres };
        syncedDrivers
          .filter((d) => d.isPlayerControlled)
          .forEach((d) => {
            if (prev.trackWetness >= 55 || prev.weather === 'HEAVY_RAIN') {
              updatedPreRaceTyres[d.id] = 'WET';
            } else if (prev.trackWetness >= 20 || prev.weather === 'LIGHT_RAIN') {
              updatedPreRaceTyres[d.id] = 'INTER';
            }
          });

        return {
          drivers: syncedDrivers,
          preRaceStartingTyres: updatedPreRaceTyres,
        };
      });
    },

    setPreRaceDriverConfig: (
      driverId: string,
      startingTyre: TyreCompound,
      fuelLoadKg: number
    ) => {
      soundEngine.playStrategyClick();
      const clampedFuel = Math.max(
        45,
        Math.min(MAX_FUEL_LOAD_2026_KG, Number(fuelLoadKg.toFixed(1)))
      );

      set((state) => ({
        preRaceStartingTyres: {
          ...state.preRaceStartingTyres,
          [driverId]: startingTyre,
        },
        preRaceStartingFuel: {
          ...state.preRaceStartingFuel,
          [driverId]: clampedFuel,
        },
        drivers: state.drivers.map((d) =>
          d.id === driverId
            ? {
                ...d,
                tyreCompound: startingTyre,
                usedCompounds: [startingTyre],
                fuelLoad: clampedFuel,
                nextTyreCompound:
                  startingTyre === 'SOFT'
                    ? 'HARD'
                    : startingTyre === 'MEDIUM'
                    ? 'HARD'
                    : 'MEDIUM',
              }
            : d
        ),
      }));
    },

    proceedToGrid: () => {
      const state = get();
      if (state.qualifyingResults.length === 0) {
        get().runQualifying();
      }
      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      set((prev) => {
        const aiPreparedDrivers = applyAIStartingTyres(
          prev.drivers,
          prev.trackWetness,
          prev.weather
        );
        const configuredRaw = aiPreparedDrivers.map((d) => {
          if (!d.isPlayerControlled) return d;
          const chosenTyre = prev.preRaceStartingTyres[d.id] ?? d.tyreCompound;
          const chosenFuel = prev.preRaceStartingFuel[d.id] ?? d.fuelLoad;
          return {
            ...d,
            tyreCompound: chosenTyre,
            usedCompounds: [chosenTyre],
            fuelLoad: chosenFuel,
          };
        });

        // Terapkan Grid Penalty (PU/Gearbox) & Pelanggaran Parc Fermé (Start dari Pit Lane)
        const hasAnyPenalty = configuredRaw.some(
          (d) => (d.gridPenaltyPositions ?? 0) > 0 || prev.parcFermeBreached[d.id]
        );
        let configuredDrivers = configuredRaw;
        const penaltyLogs: RaceLog[] = [];

        if (hasAnyPenalty) {
          const ordered = [...configuredRaw].sort((a, b) => {
            const pitA = prev.parcFermeBreached[a.id] ? 1000 : 0;
            const pitB = prev.parcFermeBreached[b.id] ? 1000 : 0;
            const effA = a.position + (a.gridPenaltyPositions ?? 0) + pitA;
            const effB = b.position + (b.gridPenaltyPositions ?? 0) + pitB;
            if (effA !== effB) return effA - effB;
            return a.position - b.position;
          });

          configuredDrivers = ordered.map((d, idx) => {
            const newPos = idx + 1;
            const isPitStart = Boolean(prev.parcFermeBreached[d.id]);
            if (isPitStart) {
              penaltyLogs.push(
                createLog(
                  1,
                  `PIT LANE START [${d.code}]: Memulai balapan dari ujung Pit Lane (P${newPos}) akibat pelanggaran Parc Fermé.`,
                  'INCIDENT'
                )
              );
            } else if ((d.gridPenaltyPositions ?? 0) > 0) {
              penaltyLogs.push(
                createLog(
                  1,
                  `GRID PENALTY [${d.code}]: Turun +${d.gridPenaltyPositions} grid ke P${newPos} akibat pergantian komponen Power Unit/Gearbox.`,
                  'INCIDENT'
                )
              );
            }
            return {
              ...d,
              position: newPos,
              trackProgress: isPitStart
                ? 0
                : Math.max(0, Number((2.2 - (newPos - 1) * 0.1).toFixed(2))),
              gapToLeader: isPitStart
                ? Number(((newPos - 1) * 0.25 + 3.0).toFixed(3))
                : Number(((newPos - 1) * 0.25).toFixed(3)),
              interval: newPos === 1 ? 0 : isPitStart ? 3.0 : 0.25,
            };
          });
        }

        // Kurangi alokasi ban akhir pekan untuk ban start pembalap player
        const nextAlloc = { ...prev.weekendTyreAllocation };
        configuredDrivers
          .filter((d) => d.isPlayerControlled)
          .forEach((d) => {
            const cur = nextAlloc[d.id] ?? { ...DEFAULT_WEEKEND_TYRE_ALLOCATION };
            nextAlloc[d.id] = {
              ...cur,
              [d.tyreCompound]: Math.max(0, (cur[d.tyreCompound] ?? 0) - 1),
            };
          });

        return {
          sessionPhase: 'RACE',
          raceStatus: 'IDLE',
          drivers: configuredDrivers,
          weekendTyreAllocation: nextAlloc,
          playerLapTelemetry: {},
          raceLogs: [
            ...penaltyLogs,
            createLog(
              1,
              `Seluruh ${configuredDrivers.length} pembalap telah menempati posisi Starting Grid di ${prev.circuit.name}. Tekan START RACE untuk memulai!`,
              'INFO'
            ),
            ...prev.raceLogs,
          ],
        };
      });
    },

    setSessionPhase: (phase: SessionPhase) => {
      const state = get();
      if (phase === 'FREE_PRACTICE') {
        const hasStandings = state.practiceStandings.length === state.drivers.length;
        set({
          sessionPhase: phase,
          isQualiSimulating: false,
          ...(hasStandings
            ? {}
            : {
                practiceSession: 'FP1',
                practiceClockSeconds: 3600,
                practiceMinutesRemaining: 60,
                isPracticeSimulating: false,
                practiceStandings: createInitialPracticeStandings(
                  state.drivers,
                  state.setupConfidences,
                  state.trackWetness,
                  state.weather
                ),
                drivers: state.drivers.map((d) => ({ ...d, isInPit: true, trackProgress: 0 })),
              }),
        });
        return;
      }
      if (phase === 'QUALIFYING') {
        const hasQualiMap =
          Object.keys(state.qualifyingDriversState).length === state.drivers.length;
        set({
          sessionPhase: phase,
          isPracticeSimulating: false,
          ...(hasQualiMap
            ? {}
            : {
                qualifyingStage: 'Q1',
                qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
                isQualiSimulating: false,
                qualifyingStageFinished: false,
                qualifyingDriversState: createInitialQualifyingDriversState(
                  state.drivers,
                  state.trackWetness,
                  state.weather
                ),
                drivers: state.drivers.map((d) => ({ ...d, isInPit: true, trackProgress: 0 })),
              }),
        });
        return;
      }
      if (phase === 'PRE_RACE_STRATEGY' || phase === 'RACE') {
        get().initializeStartingTyresForAI();
      }
      set({
        sessionPhase: phase,
        isPracticeSimulating: false,
        isQualiSimulating: false,
      });
    },

    startRace: () => {
      const { raceStatus, currentLap } = get();
      if (raceStatus === 'FINISHED') return;

      soundEngine.playStrategyClick();
      soundEngine.playTeamRadioBeep();

      set((state) => ({
        sessionPhase: 'RACE',
        raceStatus: 'RACING',
        drivers:
          state.raceStatus === 'IDLE' && currentLap === 1
            ? applyAIStartingTyres(state.drivers, state.trackWetness, state.weather)
            : state.drivers,
        raceLogs:
          state.raceStatus === 'IDLE'
            ? [
                createLog(
                  currentLap,
                  'LIGHTS OUT AND AWAY WE GO! Balapan resmi dimulai!',
                  'INFO'
                ),
                ...state.raceLogs,
              ]
            : state.raceLogs,
      }));
    },

    pauseRace: () => {
      const { raceStatus } = get();
      if (raceStatus === 'RACING') {
        soundEngine.playStrategyClick();
        set({ raceStatus: 'PAUSED' });
      }
    },

    setSimulationSpeed: (speed: SimulationSpeed) => {
      soundEngine.playStrategyClick();
      set({ simulationSpeed: speed });
    },

    resetRace: () => {
      const currentCircuit = get().circuit;
      const baseRoster = get().rosterDrivers;
      const freshTimeline = generateWeatherTimeline(currentCircuit);
      const startWeather = freshTimeline[0]?.weather ?? 'DRY';
      const startWetness = freshTimeline[0]?.projectedWetness ?? 0;
      const freshForecast = sliceWeatherForecastWindow(freshTimeline, 1);

      const rawDrivers = baseRoster.map((d) => ({
        ...d,
        fuelLoad: getStandardFuelLoad2026(currentCircuit),
        wingDamage: 0,
        repairWingOnNextPit: false,
        status: 'RUNNING' as const,
      }));
      const freshDrivers = applyAIStartingTyres(rawDrivers, startWetness, startWeather);
      const freshMaps = createInitialDriverMaps(freshDrivers);
      const freshConfigs = createInitialPlayerSetups(
        currentCircuit,
        freshDrivers,
        startWeather,
        startWetness
      );
      const freshKnowledge = createInitialPracticeKnowledge(freshDrivers);
      const freshPracticeStandings = createInitialPracticeStandings(
        freshDrivers,
        freshConfigs.setupConfidences,
        startWetness,
        startWeather
      );
      const freshQualiState = createInitialQualifyingDriversState(
        freshDrivers,
        startWetness,
        startWeather
      );

      set({
        sessionPhase: 'MEDIA_DAY',
        raceStatus: 'IDLE',
        simulationSpeed: 1,
        currentLap: 1,
        totalLaps: currentCircuit.totalLaps,
        weather: startWeather,
        trackWetness: startWetness,
        weatherTimeline: freshTimeline,
        weatherForecast: freshForecast,
        flagStatus: 'GREEN',
        drivers: freshDrivers,
        driverOptimalSetups: freshConfigs.driverOptimalSetups,
        setupConfidences: freshConfigs.setupConfidences,
        practiceMinutesRemaining: 60,
        practiceSession: 'FP1',
        practiceClockSeconds: 3600,
        isPracticeSimulating: false,
        practiceKnowledge: freshKnowledge,
        practiceStandings: freshPracticeStandings,
        practiceRuns: freshConfigs.practiceRuns,
        qualifyingStage: 'Q1',
        qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
        isQualiSimulating: false,
        qualifyingStageFinished: false,
        qualifyingDriversState: freshQualiState,
        preRaceStartingTyres: freshConfigs.preRaceStartingTyres,
        preRaceStartingFuel: freshConfigs.preRaceStartingFuel,
        radarAccuracyPercent: Math.round(88 + Math.random() * 9),
        mediaDayBuffs: createDefaultMediaDayBuffs(get().mediaDayBuffs.teamReputation),
        qualifyingResults: [],
        raceLogs: [
          createLog(
            1,
            `Sesi direset ke Thursday Media Day Press Conference di ${currentCircuit.name} (${currentCircuit.totalLaps} Lap • Profil Iklim: ${currentCircuit.climateProfile}).`,
            'INFO'
          ),
        ],
        fastestLapDriverId: null,
        fastestLapTime: Infinity,
        pitRemainingTime: freshMaps.pitRemainingTime,
        currentLapElapsed: freshMaps.currentLapElapsed,
        flagRemainingTicks: 0,
        flagEndLap: null,
        playerLapTelemetry: {},
        weekendTyreAllocation: createInitialTyreAllocation(freshDrivers),
        parcFermeLocked: false,
        parcFermeBreached: {},
        sprintQualifyingResults: [],
        sprintRaceResults: [],
        isSprintCompleted: false,
        teamRadioMessages: [],
        activeTeamRadioPopup: null,
      });
    },

    applyPlayerUpgrades: (paceBonus: number, tyreMgmtBonus: number) => {
      set((state) => {
        const updateDriverStats = (driver: DriverState): DriverState => {
          if (!driver.isPlayerControlled) return driver;
          const trackedBase = CURRENT_DRIVER_BASE_STATS[driver.id];
          const seed = INITIAL_DRIVERS.find((d) => d.id === driver.id);
          const baseSeedPace = trackedBase?.basePace ?? seed?.basePace ?? driver.basePace;
          const baseSeedTyre =
            trackedBase?.tyreManagement ?? seed?.tyreManagement ?? driver.tyreManagement;

          return {
            ...driver,
            basePace: Math.min(99, Number((baseSeedPace + paceBonus).toFixed(1))),
            tyreManagement: Math.min(99, Number((baseSeedTyre + tyreMgmtBonus).toFixed(1))),
          };
        };

        return {
          drivers: state.drivers.map(updateDriverStats),
          rosterDrivers: state.rosterDrivers.map(updateDriverStats),
        };
      });
    },

    loadCircuit: (circuit: CircuitInfo, paceBonus = 0, tyreMgmtBonus = 0) => {
      const baseRoster = get().rosterDrivers;
      const rawDrivers = baseRoster.map((d) => {
        const isPlayer = d.isPlayerControlled;
        const trackedBase = CURRENT_DRIVER_BASE_STATS[d.id];
        const seed = INITIAL_DRIVERS.find((s) => s.id === d.id);
        const rawPace = trackedBase?.basePace ?? seed?.basePace ?? d.basePace;
        const rawTyre = trackedBase?.tyreManagement ?? seed?.tyreManagement ?? d.tyreManagement;

        return {
          ...d,
          basePace: isPlayer
            ? Math.min(99, Number((rawPace + paceBonus).toFixed(1)))
            : rawPace,
          tyreManagement: isPlayer
            ? Math.min(99, Number((rawTyre + tyreMgmtBonus).toFixed(1)))
            : rawTyre,
          fuelLoad: getStandardFuelLoad2026(circuit),
          wingDamage: 0,
          repairWingOnNextPit: false,
          status: 'RUNNING' as const,
        };
      });

      const freshTimeline = generateWeatherTimeline(circuit);
      const startWeather = freshTimeline[0]?.weather ?? 'DRY';
      const startWetness = freshTimeline[0]?.projectedWetness ?? 0;
      const freshForecast = sliceWeatherForecastWindow(freshTimeline, 1);

      const freshDrivers = applyAIStartingTyres(rawDrivers, startWetness, startWeather);
      const freshMaps = createInitialDriverMaps(freshDrivers);
      const freshConfigs = createInitialPlayerSetups(
        circuit,
        freshDrivers,
        startWeather,
        startWetness
      );
      const currentSetups = get().carSetups;
      const recalculatedConfidences: Record<string, number> = {};

      freshDrivers
        .filter((d) => d.isPlayerControlled)
        .forEach((d) => {
          const setup = currentSetups[d.id] ?? { ...DEFAULT_CAR_SETUP };
          const driverOptimal = freshConfigs.driverOptimalSetups[d.id];
          recalculatedConfidences[d.id] = computeEffectiveConfidence(
            calculateSetupConfidence(setup, circuit, driverOptimal),
            0
          );
        });
      const freshKnowledge = createInitialPracticeKnowledge(freshDrivers);
      const freshPracticeStandings = createInitialPracticeStandings(
        freshDrivers,
        recalculatedConfidences,
        startWetness,
        startWeather
      );
      const freshQualiState = createInitialQualifyingDriversState(
        freshDrivers,
        startWetness,
        startWeather
      );

      set({
        circuit,
        sessionPhase: 'MEDIA_DAY',
        raceStatus: 'IDLE',
        simulationSpeed: 1,
        currentLap: 1,
        totalLaps: circuit.totalLaps,
        weather: startWeather,
        trackWetness: startWetness,
        weatherTimeline: freshTimeline,
        weatherForecast: freshForecast,
        flagStatus: 'GREEN',
        drivers: freshDrivers,
        driverOptimalSetups: freshConfigs.driverOptimalSetups,
        setupConfidences: recalculatedConfidences,
        practiceMinutesRemaining: 60,
        practiceSession: 'FP1',
        practiceClockSeconds: 3600,
        isPracticeSimulating: false,
        practiceKnowledge: freshKnowledge,
        practiceStandings: freshPracticeStandings,
        practiceRuns: freshConfigs.practiceRuns,
        qualifyingStage: 'Q1',
        qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
        isQualiSimulating: false,
        qualifyingStageFinished: false,
        qualifyingDriversState: freshQualiState,
        preRaceStartingTyres: freshConfigs.preRaceStartingTyres,
        preRaceStartingFuel: freshConfigs.preRaceStartingFuel,
        radarAccuracyPercent: Math.round(88 + Math.random() * 9),
        mediaDayBuffs: createDefaultMediaDayBuffs(get().mediaDayBuffs.teamReputation),
        qualifyingResults: [],
        raceLogs: [
          createLog(
            1,
            `Selamat datang di ${circuit.name} (${circuit.country} • Iklim: ${circuit.climateProfile}) — Sesi Thursday Media Day Press Conference dimulai!`,
            'INFO'
          ),
        ],
        fastestLapDriverId: null,
        fastestLapTime: Infinity,
        pitRemainingTime: freshMaps.pitRemainingTime,
        currentLapElapsed: freshMaps.currentLapElapsed,
        flagRemainingTicks: 0,
        flagEndLap: null,
        playerLapTelemetry: {},
        weekendTyreAllocation: createInitialTyreAllocation(freshDrivers),
        parcFermeLocked: false,
        parcFermeBreached: {},
        sprintQualifyingResults: [],
        sprintRaceResults: [],
        isSprintCompleted: false,
        teamRadioMessages: [],
        activeTeamRadioPopup: null,
      });
    },

    transferDriverInRaceStore: (
      targetDriverId: string,
      replacePlayerDriverId: string,
      paceBonus: number,
      tyreMgmtBonus: number,
      incomingOverride
    ) => {
      set((state) => {
        const outgoing = state.rosterDrivers.find((d) => d.id === replacePlayerDriverId);
        if (!outgoing) return state;

        const existingIncomingOnGrid = state.rosterDrivers.find((d) => d.id === targetDriverId);
        const externalCandidate = EXTERNAL_DRIVERS_POOL.find((e) => e.id === targetDriverId);

        const playerTeamInfo = {
          teamId: outgoing.teamId,
          teamName: outgoing.teamName,
          teamColor: outgoing.teamColor,
        };

        // KASUS A: Pembalap baru berasal dari Academy / IndyCar / WEC / Reserve (di luar 22 mobil grid saat ini)
        if (!existingIncomingOnGrid && (externalCandidate || incomingOverride)) {
          const rawName = incomingOverride?.name ?? externalCandidate!.name;
          const rawCode = incomingOverride?.code ?? externalCandidate!.code;
          const rawNumber = incomingOverride?.number ?? externalCandidate!.number;
          const rawPace = incomingOverride?.basePace ?? externalCandidate!.basePace;
          const rawTyre = incomingOverride?.tyreManagement ?? externalCandidate!.tyreManagement;

          const replaceMapper = (d: DriverState): DriverState => {
            if (d.id === replacePlayerDriverId) {
              return {
                ...d,
                id: targetDriverId,
                name: rawName,
                code: rawCode,
                number: rawNumber,
                teamId: playerTeamInfo.teamId,
                teamName: playerTeamInfo.teamName,
                teamColor: playerTeamInfo.teamColor,
                isPlayerControlled: true,
                basePace: Math.min(99, Number((rawPace + paceBonus).toFixed(1))),
                tyreManagement: Math.min(99, Number((rawTyre + tyreMgmtBonus).toFixed(1))),
              };
            }
            return d;
          };

          const nextRoster = state.rosterDrivers.map(replaceMapper);
          const nextDrivers = state.drivers.map(replaceMapper);

          const inheritedSetup = state.carSetups[replacePlayerDriverId] ?? {
            ...DEFAULT_CAR_SETUP,
          };
          const nextCarSetups = { ...state.carSetups };
          delete nextCarSetups[replacePlayerDriverId];
          nextCarSetups[targetDriverId] = inheritedSetup;

          const playerDriversNow = nextDrivers.filter((d) => d.isPlayerControlled);
          const slotIdx = Math.max(
            0,
            playerDriversNow.findIndex((d) => d.id === targetDriverId)
          );
          const newOptimal = generateDriverOptimalSetup(
            state.circuit,
            { id: targetDriverId, basePace: rawPace, tyreManagement: rawTyre },
            slotIdx
          );
          const nextOptimalSetups = { ...state.driverOptimalSetups };
          delete nextOptimalSetups[replacePlayerDriverId];
          nextOptimalSetups[targetDriverId] = newOptimal;

          const nextConfidences = { ...state.setupConfidences };
          delete nextConfidences[replacePlayerDriverId];
          nextConfidences[targetDriverId] = calculateSetupConfidence(
            inheritedSetup,
            state.circuit,
            newOptimal
          );

          const nextPracticeRuns = { ...state.practiceRuns };
          delete nextPracticeRuns[replacePlayerDriverId];
          nextPracticeRuns[targetDriverId] = [];

          const nextLapTelemetry = { ...state.playerLapTelemetry };
          delete nextLapTelemetry[replacePlayerDriverId];
          nextLapTelemetry[targetDriverId] = [];

          const nextStartingTyres = { ...state.preRaceStartingTyres };
          nextStartingTyres[targetDriverId] =
            nextStartingTyres[replacePlayerDriverId] ?? 'MEDIUM';
          delete nextStartingTyres[replacePlayerDriverId];

          const nextStartingFuel = { ...state.preRaceStartingFuel };
          nextStartingFuel[targetDriverId] =
            nextStartingFuel[replacePlayerDriverId] ?? outgoing.fuelLoad;
          delete nextStartingFuel[replacePlayerDriverId];

          return {
            rosterDrivers: nextRoster,
            drivers: nextDrivers,
            carSetups: nextCarSetups,
            driverOptimalSetups: nextOptimalSetups,
            setupConfidences: nextConfidences,
            practiceRuns: nextPracticeRuns,
            playerLapTelemetry: nextLapTelemetry,
            preRaceStartingTyres: nextStartingTyres,
            preRaceStartingFuel: nextStartingFuel,
            raceLogs: [
              createLog(
                state.currentLap,
                `BREAKING NEWS: ${rawName} (${rawCode}) resmi dipromosikan ke kursi utama ${playerTeamInfo.teamName} menggantikan ${outgoing.name} (kini berstatus Free Agent / Reserve)!`,
                'INFO'
              ),
              ...state.raceLogs,
            ],
          };
        }

        // KASUS B: Pembalap baru berasal dari tim F1 AI lain yang ada di grid
        if (!existingIncomingOnGrid) return state;

        const aiTeamInfo = {
          teamId: existingIncomingOnGrid.teamId,
          teamName: existingIncomingOnGrid.teamName,
          teamColor: existingIncomingOnGrid.teamColor,
        };

        const incomingSeed = INITIAL_DRIVERS.find((s) => s.id === existingIncomingOnGrid.id);
        const outgoingSeed = INITIAL_DRIVERS.find((s) => s.id === outgoing.id);

        const swapMapper = (d: DriverState): DriverState => {
          if (d.id === targetDriverId) {
            const rawPace =
              incomingOverride?.basePace ??
              (incomingSeed ? incomingSeed.basePace : d.basePace);
            const rawTyre =
              incomingOverride?.tyreManagement ??
              (incomingSeed ? incomingSeed.tyreManagement : d.tyreManagement);
            return {
              ...d,
              teamId: playerTeamInfo.teamId,
              teamName: playerTeamInfo.teamName,
              teamColor: playerTeamInfo.teamColor,
              isPlayerControlled: true,
              basePace: Math.min(99, Number((rawPace + paceBonus).toFixed(1))),
              tyreManagement: Math.min(99, Number((rawTyre + tyreMgmtBonus).toFixed(1))),
            };
          }
          if (d.id === replacePlayerDriverId) {
            return {
              ...d,
              teamId: aiTeamInfo.teamId,
              teamName: aiTeamInfo.teamName,
              teamColor: aiTeamInfo.teamColor,
              isPlayerControlled: false,
              basePace: outgoingSeed ? outgoingSeed.basePace : d.basePace,
              tyreManagement: outgoingSeed ? outgoingSeed.tyreManagement : d.tyreManagement,
            };
          }
          return d;
        };

        const nextRoster = state.rosterDrivers.map(swapMapper);
        const nextDrivers = state.drivers.map(swapMapper);

        // Pindahkan konfigurasi setup mobil dari pembalap lama ke pembalap baru
        const inheritedSetup = state.carSetups[replacePlayerDriverId] ?? {
          ...DEFAULT_CAR_SETUP,
        };
        const nextCarSetups = { ...state.carSetups };
        delete nextCarSetups[replacePlayerDriverId];
        nextCarSetups[targetDriverId] = inheritedSetup;

        const playerDriversNow = nextDrivers.filter((d) => d.isPlayerControlled);
        const slotIdx = Math.max(
          0,
          playerDriversNow.findIndex((d) => d.id === targetDriverId)
        );
        const newOptimal = generateDriverOptimalSetup(
          state.circuit,
          {
            id: targetDriverId,
            basePace: existingIncomingOnGrid.basePace,
            tyreManagement: existingIncomingOnGrid.tyreManagement,
          },
          slotIdx
        );
        const nextOptimalSetups = { ...state.driverOptimalSetups };
        delete nextOptimalSetups[replacePlayerDriverId];
        nextOptimalSetups[targetDriverId] = newOptimal;

        const nextConfidences = { ...state.setupConfidences };
        delete nextConfidences[replacePlayerDriverId];
        nextConfidences[targetDriverId] = calculateSetupConfidence(
          inheritedSetup,
          state.circuit,
          newOptimal
        );

        return {
          rosterDrivers: nextRoster,
          drivers: nextDrivers,
          carSetups: nextCarSetups,
          driverOptimalSetups: nextOptimalSetups,
          setupConfidences: nextConfidences,
          raceLogs: [
            createLog(
              state.currentLap,
              `BREAKING NEWS: ${existingIncomingOnGrid.name} (${existingIncomingOnGrid.code}) resmi direkrut ke ${playerTeamInfo.teamName} menggantikan ${outgoing.name}!`,
              'INFO'
            ),
            ...state.raceLogs,
          ],
        };
      });
    },

    syncFromCareerState: (
      circuit: CircuitInfo,
      playerDriverIds: string[],
      paceBonus: number,
      tyreMgmtBonus: number,
      customTeamName?: string,
      customTeamColor?: string,
      targetPhase: SessionPhase = 'MEDIA_DAY',
      driverStatsMap?: Record<string, { basePace: number; tyreManagement: number }>,
      teamPerformanceMap?: Record<string, number>,
      activeGridEntries?: Array<{
        id: string;
        name: string;
        code: string;
        number: number;
        age?: number;
        potential?: number;
        category?: DriverState['category'];
        teamId: string;
        teamName: string;
        teamColor: string;
        basePace: number;
        tyreManagement: number;
        isPlayerControlled: boolean;
      }>
    ) => {
      if (teamPerformanceMap) {
        TEAM_PERFORMANCE_MAP = { ...TEAM_PERFORMANCE_MAP, ...teamPerformanceMap };
      }
      if (driverStatsMap) {
        Object.entries(driverStatsMap).forEach(([id, st]) => {
          CURRENT_DRIVER_BASE_STATS[id] = {
            basePace: st.basePace,
            tyreManagement: st.tyreManagement,
          };
        });
      }

      const matchedOfficialTeam = INITIAL_TEAMS.find(
        (t) =>
          customTeamName &&
          t.name.toLowerCase() === customTeamName.trim().toLowerCase()
      );
      const isCustomExpansionTeam =
        !matchedOfficialTeam &&
        Boolean(customTeamName) &&
        Boolean(
          activeGridEntries?.some(
            (e) => e.isPlayerControlled && e.teamId === 'custom-team'
          )
        );
      const playerTeam =
        matchedOfficialTeam ??
        INITIAL_TEAMS.find((t) => t.isPlayerTeam) ??
        INITIAL_TEAMS[0];
      const playerTeamId = isCustomExpansionTeam ? 'custom-team' : playerTeam.id;
      const activeTeamName = customTeamName || playerTeam.name;
      const activeTeamColor = customTeamColor || playerTeam.colorHex;

      let rebuiltRoster: DriverState[] = [];

      if (activeGridEntries && activeGridEntries.length > 0) {
        // Urutkan grid berdasarkan kombinasi performa tim & basePace pembalap
        const sortedEntries = [...activeGridEntries].sort((a, b) => {
          const perfA = (TEAM_PERFORMANCE_MAP[a.teamId] ?? 88) * 0.55 + a.basePace * 0.45;
          const perfB = (TEAM_PERFORMANCE_MAP[b.teamId] ?? 88) * 0.55 + b.basePace * 0.45;
          return perfB - perfA;
        });

        rebuiltRoster = sortedEntries.map((entry, idx) => {
          const pos = idx + 1;
          const isPlayer = entry.isPlayerControlled || playerDriverIds.includes(entry.id);
          CURRENT_DRIVER_BASE_STATS[entry.id] = {
            basePace: entry.basePace,
            tyreManagement: entry.tyreManagement,
          };

          const startingTyre: TyreCompound =
            pos <= 10 ? 'MEDIUM' : pos % 3 === 0 ? 'HARD' : 'MEDIUM';

          return {
            id: entry.id,
            name: entry.name,
            code: entry.code,
            number: entry.number,
            age: entry.age,
            potential: entry.potential,
            category: entry.category ?? 'F1_GRID',
            teamId: isPlayer ? playerTeamId : entry.teamId,
            teamName: isPlayer ? activeTeamName : entry.teamName,
            teamColor: isPlayer ? activeTeamColor : entry.teamColor,
            basePace: isPlayer
              ? Math.min(99, Number((entry.basePace + paceBonus).toFixed(1)))
              : entry.basePace,
            tyreManagement: isPlayer
              ? Math.min(99, Number((entry.tyreManagement + tyreMgmtBonus).toFixed(1)))
              : entry.tyreManagement,
            position: pos,
            currentLap: 1,
            trackProgress: Math.max(0, Number((2.2 - (pos - 1) * 0.1).toFixed(2))),
            totalTimeElapsed: 0,
            gapToLeader: Number(((pos - 1) * 0.25).toFixed(3)),
            interval: pos === 1 ? 0 : 0.25,
            lastLapTime: 0,
            bestLapTime: 0,
            tyreCompound: startingTyre,
            tyreHealth: 100,
            tyreAge: 0,
            ersBattery: 100,
            fuelLoad: getStandardFuelLoad2026(circuit),
            paceMode: 'STANDARD',
            ersMode: 'NEUTRAL',
            isInPit: false,
            boxThisLap: false,
            nextTyreCompound: startingTyre === 'MEDIUM' ? 'HARD' : 'MEDIUM',
            pitStopsCount: 0,
            wingDamage: 0,
            repairWingOnNextPit: false,
            status: 'RUNNING' as const,
            isPlayerControlled: isPlayer,
          };
        });
      } else {
        const defaultPlayerSeeds = INITIAL_DRIVERS.filter(
          (d) => d.teamId === playerTeam.id
        );
        const newlySignedIds = playerDriverIds.filter(
          (id) => !defaultPlayerSeeds.some((dp) => dp.id === id)
        );
        const replacedDefaultSeeds = defaultPlayerSeeds.filter(
          (dp) => !playerDriverIds.includes(dp.id)
        );

        rebuiltRoster = INITIAL_DRIVERS.map((seed) => {
          const isNowPlayer = playerDriverIds.includes(seed.id);

          if (isNowPlayer) {
            const baseP = driverStatsMap?.[seed.id]?.basePace ?? seed.basePace;
            const baseT = driverStatsMap?.[seed.id]?.tyreManagement ?? seed.tyreManagement;
            CURRENT_DRIVER_BASE_STATS[seed.id] = {
              basePace: baseP,
              tyreManagement: baseT,
            };
            return {
              ...seed,
              teamId: playerTeam.id,
              teamName: activeTeamName,
              teamColor: activeTeamColor,
              isPlayerControlled: true,
              basePace: Math.min(99, Number((baseP + paceBonus).toFixed(1))),
              tyreManagement: Math.min(99, Number((baseT + tyreMgmtBonus).toFixed(1))),
              fuelLoad: getStandardFuelLoad2026(circuit),
              wingDamage: 0,
              repairWingOnNextPit: false,
              status: 'RUNNING' as const,
            };
          }

          // Jika pembalap ini adalah eks-pembalap Player yang telah digantikan
          const replacedIndex = replacedDefaultSeeds.findIndex((r) => r.id === seed.id);
          if (replacedIndex !== -1 && newlySignedIds[replacedIndex]) {
            const signedId = newlySignedIds[replacedIndex];
            const incomingF1Seed = INITIAL_DRIVERS.find((s) => s.id === signedId);
            const incomingExternal = EXTERNAL_DRIVERS_POOL.find((e) => e.id === signedId);

            // Jika penggantinya berasal dari EXTERNAL_DRIVERS_POOL (Academy / IndyCar / WEC / Reserve),
            // maka slot mobil tim Player ini diisi oleh pembalap eksternal tersebut!
            if (!incomingF1Seed && incomingExternal) {
              const baseP =
                driverStatsMap?.[incomingExternal.id]?.basePace ?? incomingExternal.basePace;
              const baseT =
                driverStatsMap?.[incomingExternal.id]?.tyreManagement ??
                incomingExternal.tyreManagement;
              CURRENT_DRIVER_BASE_STATS[incomingExternal.id] = {
                basePace: baseP,
                tyreManagement: baseT,
              };

              return {
                ...seed,
                id: incomingExternal.id,
                name: incomingExternal.name,
                code: incomingExternal.code,
                number: incomingExternal.number,
                age: incomingExternal.age,
                potential: incomingExternal.potential,
                category: incomingExternal.category,
                teamId: playerTeam.id,
                teamName: activeTeamName,
                teamColor: activeTeamColor,
                isPlayerControlled: true,
                basePace: Math.min(99, Number((baseP + paceBonus).toFixed(1))),
                tyreManagement: Math.min(99, Number((baseT + tyreMgmtBonus).toFixed(1))),
                fuelLoad: getStandardFuelLoad2026(circuit),
                wingDamage: 0,
                repairWingOnNextPit: false,
                status: 'RUNNING' as const,
              };
            }

            if (incomingF1Seed) {
              return {
                ...seed,
                teamId: incomingF1Seed.teamId,
                teamName: incomingF1Seed.teamName,
                teamColor: incomingF1Seed.teamColor,
                isPlayerControlled: false,
                fuelLoad: getStandardFuelLoad2026(circuit),
                wingDamage: 0,
                repairWingOnNextPit: false,
                status: 'RUNNING' as const,
              };
            }
          }

          return {
            ...seed,
            isPlayerControlled: false,
            fuelLoad: getStandardFuelLoad2026(circuit),
            wingDamage: 0,
            repairWingOnNextPit: false,
            status: 'RUNNING' as const,
          };
        });
      }

      const freshTimeline = generateWeatherTimeline(circuit);
      const startWeather = freshTimeline[0]?.weather ?? 'DRY';
      const startWetness = freshTimeline[0]?.projectedWetness ?? 0;
      const freshForecast = sliceWeatherForecastWindow(freshTimeline, 1);

      const weatherAwareRoster = applyAIStartingTyres(
        rebuiltRoster,
        startWetness,
        startWeather
      );
      const freshMaps = createInitialDriverMaps(weatherAwareRoster);
      const freshConfigs = createInitialPlayerSetups(
        circuit,
        weatherAwareRoster,
        startWeather,
        startWetness
      );
      const careerKnowledge = createInitialPracticeKnowledge(weatherAwareRoster);
      const careerPracticeStandings = createInitialPracticeStandings(
        weatherAwareRoster,
        freshConfigs.setupConfidences,
        startWetness,
        startWeather
      );
      const careerQualiState = createInitialQualifyingDriversState(
        weatherAwareRoster,
        startWetness,
        startWeather
      );

      set({
        circuit,
        sessionPhase: targetPhase,
        raceStatus: 'IDLE',
        simulationSpeed: 1,
        currentLap: 1,
        totalLaps: circuit.totalLaps,
        weather: startWeather,
        trackWetness: startWetness,
        weatherTimeline: freshTimeline,
        weatherForecast: freshForecast,
        flagStatus: 'GREEN',
        rosterDrivers: weatherAwareRoster,
        drivers: weatherAwareRoster.map((d) => ({ ...d })),
        carSetups: freshConfigs.carSetups,
        driverOptimalSetups: freshConfigs.driverOptimalSetups,
        setupConfidences: freshConfigs.setupConfidences,
        practiceMinutesRemaining: 60,
        practiceSession: 'FP1',
        practiceClockSeconds: 3600,
        isPracticeSimulating: false,
        practiceKnowledge: careerKnowledge,
        practiceStandings: careerPracticeStandings,
        practiceRuns: freshConfigs.practiceRuns,
        qualifyingStage: 'Q1',
        qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
        isQualiSimulating: false,
        qualifyingStageFinished: false,
        qualifyingDriversState: careerQualiState,
        preRaceStartingTyres: freshConfigs.preRaceStartingTyres,
        preRaceStartingFuel: freshConfigs.preRaceStartingFuel,
        radarAccuracyPercent: Math.round(88 + Math.random() * 9),
        mediaDayBuffs: createDefaultMediaDayBuffs(get().mediaDayBuffs?.teamReputation ?? 78),
        qualifyingResults: [],
        pitRemainingTime: freshMaps.pitRemainingTime,
        currentLapElapsed: freshMaps.currentLapElapsed,
        fastestLapDriverId: null,
        fastestLapTime: Infinity,
        flagRemainingTicks: 0,
        flagEndLap: null,
        playerLapTelemetry: {},
        weekendTyreAllocation: createInitialTyreAllocation(weatherAwareRoster),
        parcFermeLocked: false,
        parcFermeBreached: {},
        sprintQualifyingResults: [],
        sprintRaceResults: [],
        isSprintCompleted: false,
        teamRadioMessages: [],
        activeTeamRadioPopup: null,
        raceLogs: [
          createLog(
            1,
            `Data karier ${activeTeamName} siap di ${circuit.name} (${circuit.totalLaps} Lap).`,
            'INFO'
          ),
        ],
      });
    },

    startQuickRace: (
      circuitId: string,
      teamId: string,
      startingPhase: SessionPhase = 'MEDIA_DAY'
    ) => {
      soundEngine.playStrategyClick();
      const targetCircuit =
        F1_2026_CIRCUITS.find((c) => c.id === circuitId) ?? DEFAULT_CIRCUIT;
      const targetTeam =
        INITIAL_TEAMS.find((t) => t.id === teamId) ?? INITIAL_TEAMS[0];

      const rawRoster: DriverState[] = INITIAL_DRIVERS.map((seed) => ({
        ...seed,
        isPlayerControlled: seed.teamId === targetTeam.id,
        fuelLoad: getStandardFuelLoad2026(targetCircuit),
        wingDamage: 0,
        repairWingOnNextPit: false,
        status: 'RUNNING' as const,
      }));

      const freshTimeline = generateWeatherTimeline(targetCircuit);
      const startWeather = freshTimeline[0]?.weather ?? 'DRY';
      const startWetness = freshTimeline[0]?.projectedWetness ?? 0;
      const freshForecast = sliceWeatherForecastWindow(freshTimeline, 1);

      const quickRoster = applyAIStartingTyres(rawRoster, startWetness, startWeather);
      const freshMaps = createInitialDriverMaps(quickRoster);
      const freshConfigs = createInitialPlayerSetups(
        targetCircuit,
        quickRoster,
        startWeather,
        startWetness
      );
      const quickKnowledge = createInitialPracticeKnowledge(quickRoster);
      const quickPracticeStandings = createInitialPracticeStandings(
        quickRoster,
        freshConfigs.setupConfidences,
        startWetness,
        startWeather
      );
      const quickQualiState = createInitialQualifyingDriversState(
        quickRoster,
        startWetness,
        startWeather
      );

      set({
        circuit: targetCircuit,
        sessionPhase: startingPhase,
        raceStatus: 'IDLE',
        simulationSpeed: 1,
        currentLap: 1,
        totalLaps: targetCircuit.totalLaps,
        weather: startWeather,
        trackWetness: startWetness,
        weatherTimeline: freshTimeline,
        weatherForecast: freshForecast,
        flagStatus: 'GREEN',
        rosterDrivers: quickRoster,
        drivers: quickRoster.map((d) => ({ ...d })),
        carSetups: freshConfigs.carSetups,
        driverOptimalSetups: freshConfigs.driverOptimalSetups,
        setupConfidences: freshConfigs.setupConfidences,
        practiceMinutesRemaining: 60,
        practiceSession: 'FP1',
        practiceClockSeconds: 3600,
        isPracticeSimulating: false,
        practiceKnowledge: quickKnowledge,
        practiceStandings: quickPracticeStandings,
        practiceRuns: freshConfigs.practiceRuns,
        qualifyingStage: 'Q1',
        qualifyingClockSeconds: QUALI_STAGE_DURATIONS.Q1,
        isQualiSimulating: false,
        qualifyingStageFinished: false,
        qualifyingDriversState: quickQualiState,
        preRaceStartingTyres: freshConfigs.preRaceStartingTyres,
        preRaceStartingFuel: freshConfigs.preRaceStartingFuel,
        radarAccuracyPercent: Math.round(89 + Math.random() * 8),
        mediaDayBuffs: createDefaultMediaDayBuffs(get().mediaDayBuffs?.teamReputation ?? 78),
        qualifyingResults: [],
        pitRemainingTime: freshMaps.pitRemainingTime,
        currentLapElapsed: freshMaps.currentLapElapsed,
        fastestLapDriverId: null,
        fastestLapTime: Infinity,
        flagRemainingTicks: 0,
        flagEndLap: null,
        playerLapTelemetry: {},
        weekendTyreAllocation: createInitialTyreAllocation(quickRoster),
        parcFermeLocked: false,
        parcFermeBreached: {},
        sprintQualifyingResults: [],
        sprintRaceResults: [],
        isSprintCompleted: false,
        teamRadioMessages: [],
        activeTeamRadioPopup: null,
        raceLogs: [
          createLog(
            1,
            `QUICK RACE WEEKEND: ${targetTeam.name} siap berlaga di ${targetCircuit.name} (${targetCircuit.totalLaps} Lap).`,
            'INFO'
          ),
        ],
      });

      if (startingPhase === 'PRE_RACE_STRATEGY') {
        get().proceedToPreRaceStrategy();
      } else if (startingPhase === 'RACE') {
        get().runQualifying();
        get().proceedToGrid();
      }
    },

    setDriverStrategy: (driverId: string, paceMode: PaceMode, ersMode: ERSMode) => {
      soundEngine.playTeamRadioBeep();
      set((state) => {
        const target = state.drivers.find((d) => d.id === driverId);
        let stratRadio: TeamRadioMessage | null = null;
        if (target && target.status === 'RUNNING' && target.isPlayerControlled) {
          const firstName = target.name.split(' ')[0] || target.code;
          const isPush = paceMode === 'PUSH' || ersMode === 'DEPLOY';
          const isSave = paceMode === 'CONSERVE' || ersMode === 'HARVEST';
          stratRadio = createTeamRadioExchange(
            target,
            state.currentLap,
            state.sessionPhase === 'RACE' ? `LAP ${state.currentLap}` : state.sessionPhase,
            'STRATEGY',
            `${firstName}, switch to ${paceMode} pace and ${ersMode} ERS mode now.`,
            isPush
              ? `Copy, going ${paceMode} with ${ersMode} ERS. Pushing hard now!`
              : isSave
              ? `Understood, managing the tyres on ${paceMode} and recovering energy.`
              : `Loud and clear, switching engine modes to ${paceMode} / ${ersMode}.`
          );
        }

        return {
          drivers: state.drivers.map((driver) =>
            driver.id === driverId && driver.status === 'RUNNING'
              ? {
                  ...driver,
                  paceMode,
                  ersMode,
                }
              : driver
          ),
          teamRadioMessages: stratRadio
            ? [stratRadio, ...state.teamRadioMessages].slice(0, 60)
            : state.teamRadioMessages,
          activeTeamRadioPopup: stratRadio ?? state.activeTeamRadioPopup,
        };
      });
    },

    setDriverTactics: (driverId, tactics) => {
      soundEngine.playTeamRadioBeep();
      set((state) => {
        const target = state.drivers.find((d) => d.id === driverId);
        let tacticsRadio: TeamRadioMessage | null = null;
        if (target && target.isPlayerControlled) {
          const firstName = target.name.split(' ')[0] || target.code;
          let engMsg = `${firstName}, update racecraft — overtake ${
            tactics.overtakeAggression ?? target.overtakeAggression ?? 'MEDIUM'
          }, defend ${tactics.defendMode ?? target.defendMode ?? 'MEDIUM'}.`;
          let drvMsg = `Copy that, adjusting fighting approach on track now.`;

          if (tactics.letTeammatePass === true) {
            engMsg = `${firstName}, swap cars into Turn 1 — teammate is on a different strategy.`;
            drvMsg = `Copy, lifting and letting the other car through cleanly.`;
          } else if (tactics.letTeammatePass === false && target.letTeammatePass) {
            engMsg = `${firstName}, you are free to race now. Hold position and push.`;
            drvMsg = `Understood, back to normal racing pace.`;
          } else if (tactics.avoidHighRiskKerbs !== undefined) {
            engMsg = tactics.avoidHighRiskKerbs
              ? `${firstName}, stay off all high kerbs to protect the floor and tyres.`
              : `${firstName}, track limits clear, you can use the exit kerbs again.`;
            drvMsg = tactics.avoidHighRiskKerbs
              ? `Copy, keeping it off the kerbs from this lap.`
              : `Copy! Attacking the apex and exit kerbs now.`;
          }

          tacticsRadio = createTeamRadioExchange(
            target,
            state.currentLap,
            `LAP ${state.currentLap}`,
            'TACTICS',
            engMsg,
            drvMsg
          );
        }

        return {
          drivers: state.drivers.map((driver) =>
            driver.id === driverId
              ? {
                  ...driver,
                  ...tactics,
                }
              : driver
          ),
          teamRadioMessages: tacticsRadio
            ? [tacticsRadio, ...state.teamRadioMessages].slice(0, 60)
            : state.teamRadioMessages,
          activeTeamRadioPopup: tacticsRadio ?? state.activeTeamRadioPopup,
        };
      });
    },

    syncPitCrewAndMentalities: (estimatedStopSeconds, errorChancePercent, driverMentalities) => {
      set((state) => ({
        playerPitCrewStopSeconds: estimatedStopSeconds,
        playerPitCrewErrorPercent: errorChancePercent,
        drivers: state.drivers.map((d) =>
          d.isPlayerControlled && driverMentalities[d.id] !== undefined
            ? { ...d, mentality: driverMentalities[d.id] }
            : d
        ),
        rosterDrivers: state.rosterDrivers.map((d) =>
          d.isPlayerControlled && driverMentalities[d.id] !== undefined
            ? { ...d, mentality: driverMentalities[d.id] }
            : d
        ),
      }));
    },

    applyGaragePartRepair: (driverId, partType, triggerParcFermeBreach = false) => {
      soundEngine.playStrategyClick();
      set((state) => {
        const nextBreached = { ...state.parcFermeBreached };
        if (triggerParcFermeBreach && state.parcFermeLocked) {
          nextBreached[driverId] = true;
        }
        const updateDriver = (d: DriverState): DriverState => {
          if (d.id !== driverId) return d;
          const curMap = getDriverPartDamage(d);
          const nextMap =
            partType === 'ALL'
              ? createZeroPartDamage()
              : { ...curMap, [partType]: 0 };
          return {
            ...d,
            partDamage: nextMap,
            wingDamage: nextMap.frontWing,
          };
        };
        return {
          drivers: state.drivers.map(updateDriver),
          parcFermeBreached: nextBreached,
        };
      });
    },

    orderPitStop: (driverId: string, nextCompound: TyreCompound) => {
      soundEngine.playTeamRadioBeep();
      set((state) => {
        const target = state.drivers.find((d) => d.id === driverId);
        if (!target || target.status !== 'RUNNING') return state;

        const updatedDrivers = state.drivers.map((driver) =>
          driver.id === driverId
            ? {
                ...driver,
                boxThisLap: true,
                nextTyreCompound: nextCompound,
              }
            : driver
        );

        const willRepairWing = target.repairWingOnNextPit && target.wingDamage > 0;
        const firstName = target.name.split(' ')[0] || target.code;

        const pitRadio = target.isPlayerControlled
          ? createTeamRadioExchange(
              target,
              state.currentLap,
              `LAP ${state.currentLap}`,
              'PIT_CALL',
              `Box, box ${firstName}! Box this lap for ${nextCompound}${
                willRepairWing ? ' plus front wing change' : ''
              }, confirm.`,
              `Box, box, copy! Coming in for ${nextCompound}s${
                willRepairWing ? ', nose change needed' : ''
              }.`
            )
          : null;

        const newLog = createLog(
          state.currentLap,
          `Radio Tim [${target.code}]: "Box, box! Siapkan ban ${nextCompound}${
            willRepairWing
              ? ' + ganti Front Wing baru (+4.5s)'
              : target.wingDamage > 0
              ? ' (Tanpa ganti Front Wing — Fast Stop)'
              : ''
          } di akhir lap ini."`,
          'PIT'
        );

        return {
          drivers: updatedDrivers,
          teamRadioMessages: pitRadio
            ? [pitRadio, ...state.teamRadioMessages].slice(0, 60)
            : state.teamRadioMessages,
          activeTeamRadioPopup: pitRadio ?? state.activeTeamRadioPopup,
          raceLogs: [newLog, ...state.raceLogs].slice(0, 150),
        };
      });
    },

    cancelPitStop: (driverId: string) => {
      soundEngine.playTeamRadioBeep();
      set((state) => {
        const target = state.drivers.find((d) => d.id === driverId && !d.isInPit);
        const stayOutRadio =
          target && target.isPlayerControlled
            ? createTeamRadioExchange(
                target,
                state.currentLap,
                `LAP ${state.currentLap}`,
                'PIT_CALL',
                `Stay out, stay out ${target.name.split(' ')[0] || target.code}! Abort box, stay on track!`,
                `Stay out, copy! Pushing to extend this stint.`
              )
            : null;

        return {
          drivers: state.drivers.map((driver) =>
            driver.id === driverId && !driver.isInPit
              ? {
                  ...driver,
                  boxThisLap: false,
                }
              : driver
          ),
          teamRadioMessages: stayOutRadio
            ? [stayOutRadio, ...state.teamRadioMessages].slice(0, 60)
            : state.teamRadioMessages,
          activeTeamRadioPopup: stayOutRadio ?? state.activeTeamRadioPopup,
        };
      });
    },

    toggleRepairWingOnNextPit: (driverId: string, forceValue?: boolean) => {
      soundEngine.playStrategyClick();
      set((state) => ({
        drivers: state.drivers.map((driver) =>
          driver.id === driverId && driver.status === 'RUNNING'
            ? {
                ...driver,
                repairWingOnNextPit:
                  typeof forceValue === 'boolean' ? forceValue : !driver.repairWingOnNextPit,
              }
            : driver
        ),
      }));
    },

    retireCarToGarage: (driverId: string) => {
      soundEngine.playTeamRadioBeep();
      set((state) => {
        const target = state.drivers.find((d) => d.id === driverId);
        if (!target || target.status !== 'RUNNING') return state;

        const updatedDrivers = state.drivers.map((driver) =>
          driver.id === driverId
            ? {
                ...driver,
                isInPit: false,
                boxThisLap: false,
                status: 'RETIRED' as const,
              }
            : driver
        );

        const newLog = createLog(
          state.currentLap,
          `RETIRE CAR TO GARAGE [${target.code}]: ${target.name} memensiunkan mobil secara sukarela ke garasi untuk mengamankan sasis & mesin (Hemat 75% biaya perbaikan HQ, tanpa memicu Safety Car).`,
          'INFO'
        );

        return {
          drivers: updatedDrivers,
          raceLogs: [newLog, ...state.raceLogs].slice(0, 150),
        };
      });
    },

    tick: () => {
      const state = get();
      if (state.raceStatus !== 'RACING') return;

      const dt = BASE_TICK_SECONDS;
      const { circuit, totalLaps, setupConfidences } = state;

      let nextWeather: WeatherType = state.weather;
      let nextTrackWetness: number = state.trackWetness;
      let nextWeatherForecast: WeatherForecastItem[] = [...state.weatherForecast];
      let nextFlagStatus: FlagStatus = state.flagStatus;
      let nextFlagRemainingTicks: number = state.flagRemainingTicks;
      let nextFlagEndLap: number | null = state.flagEndLap;
      let nextFastestLapTime: number = state.fastestLapTime;
      let nextFastestLapDriverId: string | null = state.fastestLapDriverId;
      const newLogs: RaceLog[] = [];
      const newRadios: TeamRadioMessage[] = [];

      // --- 0. Update trackWetness (0 - 100) dengan Inersia Natural ---
      // Batas perubahan per lap: maksimal +1.5% per lap saat hujan, atau mengering -1.0% per lap saat DRY.
      const approxLapDurationSeconds = Math.max(60, circuit.baseLapTime);
      const maxGainPerTick =
        (WEATHER_TRANSITION_CONFIG.maxWetnessGainPerLap * dt) / approxLapDurationSeconds;
      const dryingRatePerTick =
        (WEATHER_TRANSITION_CONFIG.maxDryingRatePerLap * dt) / approxLapDurationSeconds;

      if (nextWeather === 'DRY') {
        nextTrackWetness = Math.max(0, Number((nextTrackWetness - dryingRatePerTick).toFixed(3)));
      } else if (nextWeather === 'LIGHT_RAIN') {
        const targetWet = 55;
        if (nextTrackWetness < targetWet) {
          nextTrackWetness = Math.min(
            targetWet,
            Number((nextTrackWetness + maxGainPerTick * 0.85).toFixed(3))
          );
        } else {
          nextTrackWetness = Math.max(
            targetWet,
            Number((nextTrackWetness - dryingRatePerTick * 0.4).toFixed(3))
          );
        }
      } else if (nextWeather === 'HEAVY_RAIN') {
        nextTrackWetness = Math.min(
          100,
          Number((nextTrackWetness + maxGainPerTick).toFixed(3))
        );
      }

      // Manajemen durasi Yellow Flag & Red Flag berbasis tick
      let redFlagJustEnded = false;
      if (nextFlagStatus === 'YELLOW') {
        nextFlagRemainingTicks -= 1;
        if (nextFlagRemainingTicks <= 0) {
          nextFlagStatus = 'GREEN';
          nextFlagRemainingTicks = 0;
          newLogs.push(
            createLog(
              state.currentLap,
              'GREEN FLAG! Sektor kembali aman, balapan dilanjutkan.',
              'INFO'
            )
          );
        }
      } else if (nextFlagStatus === 'RED') {
        nextFlagRemainingTicks -= 1;
        if (nextFlagRemainingTicks <= 0) {
          nextFlagStatus = 'GREEN';
          nextFlagRemainingTicks = 0;
          redFlagJustEnded = true;
          newLogs.push(
            createLog(
              state.currentLap,
              'RED FLAG RESTART — GREEN FLAG! Seluruh mobil dilepas kembali dari Pit Lane!',
              'INFO'
            )
          );
        }
      }

      const nextPitRemainingTime = { ...state.pitRemainingTime };
      const nextCurrentLapElapsed = { ...state.currentLapElapsed };
      const nextPlayerLapTelemetry: Record<string, PlayerLapTelemetryEntry[]> = {
        ...state.playerLapTelemetry,
      };
      const lapCompletedThisTickDriverIds: string[] = [];

      // Hitung efektivitas Pit Loss saat ini (Cheap Pit Stop saat SC / VSC aktif!)
      const currentPitLossMultiplier =
        nextFlagStatus === 'SC' ? 0.45 : nextFlagStatus === 'VSC' ? 0.62 : 1.0;

      // --- 1. Update Setiap Pembalap ---
      const raceOverallBestSectors: [number, number, number] = [Infinity, Infinity, Infinity];
      state.drivers.forEach((d) => {
        if (d.personalBestSectors) {
          raceOverallBestSectors[0] = Math.min(raceOverallBestSectors[0], d.personalBestSectors[0]);
          raceOverallBestSectors[1] = Math.min(raceOverallBestSectors[1], d.personalBestSectors[1]);
          raceOverallBestSectors[2] = Math.min(raceOverallBestSectors[2], d.personalBestSectors[2]);
        }
      });

      const raceLeader = state.drivers.find((d) => d.status === 'RUNNING');
      const raceLeaderTotalDist = raceLeader
        ? raceLeader.currentLap * 100 + raceLeader.trackProgress
        : 0;
      const activeAeroZones = getCircuitActiveAeroZones(circuit);

      const updatedDrivers: DriverState[] = state.drivers.map((driver) => {
        // Jika pembalap sudah DNF / RETIRED atau sudah menyelesaikan seluruh lap balapan, bekukan progresnya
        if (driver.status !== 'RUNNING' || driver.currentLap > totalLaps) {
          return driver;
        }

        // Saat Red Flag aktif, mobil ditahan di pit lane (kecuali jika baru saja restart)
        if (nextFlagStatus === 'RED') {
          return {
            ...driver,
            totalTimeElapsed: Number((driver.totalTimeElapsed + dt).toFixed(3)),
            isInPit: true,
          };
        }

        if (redFlagJustEnded && driver.isInPit && (nextPitRemainingTime[driver.id] ?? 0) <= 0) {
          // Pastikan mobil langsung keluar saat Red Flag Restart
          driver = { ...driver, isInPit: false };
        }

        let {
          currentLap,
          trackProgress,
          totalTimeElapsed,
          lastLapTime,
          bestLapTime,
          tyreCompound,
          usedCompounds,
          tyreHealth,
          tyreAge,
          ersBattery,
          fuelLoad,
          paceMode,
          ersMode,
          isInPit,
          boxThisLap,
          nextTyreCompound,
          pitStopsCount,
          wingDamage,
          repairWingOnNextPit,
          status,
          sectorStatuses,
          personalBestSectors,
          timePenaltySeconds,
        } = driver;
        let partDamage = getDriverPartDamage(driver);
        usedCompounds = usedCompounds ?? [tyreCompound];
        timePenaltySeconds = timePenaltySeconds ?? 0;

        totalTimeElapsed = Number((totalTimeElapsed + dt).toFixed(3));
        nextCurrentLapElapsed[driver.id] = Number(
          ((nextCurrentLapElapsed[driver.id] ?? 0) + dt).toFixed(3)
        );

        let activeTimeRemaining = dt;

        // A. Jika mobil sedang ditahan di dalam Pit Lane (isInPit === true)
        if (isInPit) {
          const remainingPit = (nextPitRemainingTime[driver.id] ?? 0) - dt;
          if (remainingPit > 0) {
            nextPitRemainingTime[driver.id] = Number(remainingPit.toFixed(3));
            return {
              ...driver,
              totalTimeElapsed,
              isInPit: true,
            };
          } else {
            // Selesai menjalani waktu pit stop -> ganti ban baru, dan perbaiki wingDamage ke 0 HANYA JIKA repairWingOnNextPit === true
            activeTimeRemaining = Math.abs(remainingPit);
            nextPitRemainingTime[driver.id] = 0;
            const hadWingRepair = repairWingOnNextPit && wingDamage > 0;
            tyreCompound = nextTyreCompound;
            tyreHealth = 100;
            tyreAge = 0;
            if (!usedCompounds.includes(tyreCompound)) {
              usedCompounds = [...usedCompounds, tyreCompound];
            }
            if (hadWingRepair) {
              wingDamage = 0;
              partDamage = { ...partDamage, frontWing: 0 };
              repairWingOnNextPit = false;
            }
            pitStopsCount += 1;
            isInPit = false;
            boxThisLap = false;

            if (driver.isPlayerControlled) {
              soundEngine.playTeamRadioBeep();
              const firstName = driver.name.split(' ')[0] || driver.code;
              newRadios.push(
                createTeamRadioExchange(
                  driver,
                  currentLap,
                  `LAP ${currentLap}`,
                  'PIT_EXIT',
                  `Clean release ${firstName}! Warm up the ${tyreCompound}s carefully${
                    hadWingRepair ? ', new front wing fitted' : ''
                  }.`,
                  `Out cleanly! ${tyreCompound} feels sharp, pushing into Turn 1 now.`
                )
              );
            }

            newLogs.push(
              createLog(
                currentLap,
                `${driver.name} (${driver.code}) keluar dari pit dengan ban ${tyreCompound} baru${
                  hadWingRepair
                    ? ' + Front Wing baru (0% Damage)'
                    : wingDamage > 0
                    ? ` (Fast Stop — Wing Damage tetap ${wingDamage}%)`
                    : ''
                } (Stop #${pitStopsCount}).`,
                'PIT'
              )
            );
          }
        }

        // B. Hitung target waktu lap & kecepatan kemajuan trackProgress (% per detik)
        const driverSetupConfidence = driver.isPlayerControlled
          ? setupConfidences[driver.id] ?? 75
          : 82;

        const inOverrideZone = activeAeroZones.some(
          ([zoneStart, zoneEnd]) => trackProgress >= zoneStart && trackProgress <= zoneEnd
        );

        let targetLapTime = calculateTargetLapTime(
          {
            ...driver,
            tyreCompound,
            tyreHealth,
            ersBattery,
            fuelLoad,
            paceMode,
            ersMode,
            wingDamage,
            partDamage,
          },
          circuit,
          nextTrackWetness,
          nextFlagStatus,
          driverSetupConfidence,
          inOverrideZone
        );

        // Aturan Blue Flag: Mobil yang sudah tertinggal >= 1 lap wajib memberi jalan
        if (nextFlagStatus === 'GREEN' && raceLeaderTotalDist > 0) {
          const myTotalDist = currentLap * 100 + trackProgress;
          if (raceLeaderTotalDist - myTotalDist >= 92) {
            targetLapTime += 0.35;
          }
        }

        // C. Evaluasi Probabilitas Insiden (Minor Incident / Front Wing Damage vs Major Crash DNF)
        // Hanya dievaluasi saat GREEN FLAG dan setelah Lap 1 bagian awal
        if (nextFlagStatus === 'GREEN' && (currentLap > 1 || trackProgress > 25)) {
          let incidentProb = 0.00022; // Probabilitas dasar per pembalap per tick
          if (paceMode === 'PUSH') incidentProb *= 2.1;
          if (paceMode === 'CONSERVE') incidentProb *= 0.55;
          if (tyreHealth < 32) incidentProb *= 2.4;
          if (isSlickTyre(tyreCompound) && nextTrackWetness > 28) incidentProb *= 3.8;
          if (nextTrackWetness > 65) incidentProb *= 1.75;
          if (wingDamage > 40) incidentProb *= 1.65;
          if (driver.isPlayerControlled && state.mediaDayBuffs.consistencyCrashReduction > 0) {
            incidentProb *= Math.max(0.25, 1 - state.mediaDayBuffs.consistencyCrashReduction);
          }
          if (driver.avoidHighRiskKerbs) {
            incidentProb *= 0.5;
          }

          if (Math.random() < incidentProb) {
            const severityRoll = Math.random();

            if (severityRoll < 0.78) {
              // a. MINOR INCIDENT: Lock-up / melebar ke gravel / senggolan sayap depan
              const timeLostSeconds = Number((3.0 + Math.random() * 2.0).toFixed(1)); // Kehilangan 3 - 5 detik
              const progressLost = (timeLostSeconds / targetLapTime) * 100;
              trackProgress = Math.max(0, trackProgress - progressLost);

              const outcome = rollRandomPartDamageIncident(partDamage, 'MEDIUM');
              partDamage = outcome.nextMap;
              wingDamage = partDamage.frontWing;

              // Tambah keausan ban sedikit akibat flat-spot lock-up & kibarkan Local Yellow Flag singkat
              tyreHealth = Math.max(0, Number((tyreHealth - 4.5).toFixed(2)));
              if (nextFlagStatus === 'GREEN') {
                nextFlagStatus = 'YELLOW';
                nextFlagRemainingTicks = 12;
              }

              // 30% peluang FIA Stewards menjatuhkan penalti waktu +5s (Causing a Collision / Track Limits)
              const gotFiveSecPenalty = Math.random() < 0.3;
              if (gotFiveSecPenalty) {
                timePenaltySeconds += 5;
              }

              newLogs.push(
                createLog(
                  currentLap,
                  `YELLOW FLAG (MINOR INCIDENT): ${driver.name} (${driver.code}) mengalami kontak! Kehilangan ${timeLostSeconds}s, ${outcome.damagedPartLabel} (+${outcome.addedAmount}% -> ${partDamage[outcome.damagedPart]}%)${
                    gotFiveSecPenalty ? ' + PENALTI FIA +5.0s' : ''
                  }.`,
                  'INCIDENT'
                )
              );
              if (driver.isPlayerControlled) {
                newRadios.push(
                  buildPartDamageRadio(
                    driver,
                    currentLap,
                    `LAP ${currentLap}`,
                    outcome.damagedPartLabel,
                    partDamage[outcome.damagedPart]
                  )
                );
              }
            } else {
              // b. MAJOR CRASH (DNF): Memicu RED FLAG (20%), Safety Car (55%), atau VSC (25%)
              isInPit = false;
              boxThisLap = false;

              const flagRoll = Math.random();
              const triggerRedFlag = flagRoll < 0.2;
              const triggerSC = !triggerRedFlag && flagRoll < 0.75;
              const scDurationLaps = Math.floor(3 + Math.random() * 3); // 3, 4, atau 5 lap

              if (triggerRedFlag) {
                nextFlagStatus = 'RED';
                nextFlagRemainingTicks = 10;
                nextFlagEndLap = null;
              } else {
                nextFlagStatus = triggerSC ? 'SC' : 'VSC';
                nextFlagEndLap = Math.min(totalLaps, currentLap + scDurationLaps);
              }

              newLogs.push(
                createLog(
                  currentLap,
                  `MAJOR CRASH (DNF): ${driver.name} (${driver.code}) mengalami kecelakaan keras! ${
                    triggerRedFlag
                      ? 'RED FLAG DIKIBARKAN — balapan dihentikan sementara & ganti ban gratis di pit lane!'
                      : `${triggerSC ? 'SAFETY CAR (SC)' : 'VIRTUAL SAFETY CAR (VSC)'} diterjunkan selama ${scDurationLaps} lap — dilarang menyalip & wajib jaga jarak aman!`
                  }`,
                  'INCIDENT'
                )
              );
              if (driver.isPlayerControlled) {
                const firstName = driver.name.split(' ')[0] || driver.code;
                newRadios.push(
                  createTeamRadioExchange(
                    driver,
                    currentLap,
                    `LAP ${currentLap}`,
                    'DAMAGE',
                    `${firstName}, are you okay?! Heavy crash — switch engine off immediately.`,
                    `I'm okay... hit the barrier hard. Sorry guys, the car is finished.`
                  )
                );
              }

              return {
                ...driver,
                totalTimeElapsed,
                isInPit: false,
                boxThisLap: false,
                status: 'DNF',
                dnfReason: 'CRASH',
              };
            }
          }

          // C2. Evaluasi Kegagalan Mekanis (Mechanical DNF: Power Unit / MGU-K / Gearbox)
          let mechProb = 0.000045;
          if (paceMode === 'PUSH') mechProb *= 1.9;
          if (ersMode === 'DEPLOY') mechProb *= 1.4;
          if (driver.avoidHighRiskKerbs) mechProb *= 0.5;
          if (Math.random() < mechProb) {
            const reasons = [
              'MGU-K Power Loss',
              'Power Unit ICE Failure',
              'Gearbox Hydraulic Leak',
            ];
            const reason = reasons[Math.floor(Math.random() * reasons.length)];
            if (nextFlagStatus === 'GREEN') {
              nextFlagStatus = 'VSC';
              nextFlagEndLap = Math.min(totalLaps, currentLap + 2);
            }
            newLogs.push(
              createLog(
                currentLap,
                `MECHANICAL DNF: ${driver.name} (${driver.code}) berhenti di pinggir trek akibat ${reason}! VSC diaktifkan.`,
                'INCIDENT'
              )
            );
            if (driver.isPlayerControlled) {
              const firstName = driver.name.split(' ')[0] || driver.code;
              newRadios.push(
                createTeamRadioExchange(
                  driver,
                  currentLap,
                  `LAP ${currentLap}`,
                  'DAMAGE',
                  `${firstName}, stop the car safely — critical failure: ${reason}.`,
                  `No drive! Switching off at the escape road, gutting end to the race.`
                )
              );
            }
            return {
              ...driver,
              totalTimeElapsed,
              isInPit: false,
              boxThisLap: false,
              status: 'DNF',
              dnfReason: reason,
            };
          }
        }

        const microJitter =
          nextFlagStatus === 'SC' || nextFlagStatus === 'VSC'
            ? 1.0
            : 1 + (Math.random() - 0.5) * 0.003;
        const progressRatePerSec = (100 / targetLapTime) * microJitter;
        const progressDelta = progressRatePerSec * activeTimeRemaining;
        const lapFraction = progressDelta / 100;

        trackProgress += progressDelta;

        // D. Kurangi tyreHealth, kurangi fuelLoad, dan ubah ersBattery
        const tyreSpec = TYRE_SPECS[tyreCompound];
        const paceMod = PACE_MODE_MODIFIERS[paceMode];
        const ersMod = ERS_MODE_MODIFIERS[ersMode];

        const managementFactor = 1 - ((driver.tyreManagement - 80) / 20) * 0.22;

        let weatherWearPenalty = 1.0;
        if ((tyreCompound === 'INTER' || tyreCompound === 'WET') && nextTrackWetness < 18) {
          weatherWearPenalty = 1.85;
        }

        const kerbWearFactor = driver.avoidHighRiskKerbs ? 0.88 : 1.0;
        const damageTyreFactor =
          1 + (((partDamage.suspension ?? 0) + (partDamage.floor ?? 0)) / 200) * 0.45;
        const wearThisTick =
          tyreSpec.degradationRate *
          circuit.tyreWearMultiplier *
          paceMod.tyreWearMultiplier *
          managementFactor *
          weatherWearPenalty *
          kerbWearFactor *
          damageTyreFactor *
          lapFraction;

        tyreHealth = Math.max(0, Number((tyreHealth - wearThisTick).toFixed(2)));

        const flagFuelFactor =
          nextFlagStatus === 'SC' ? 0.45 : nextFlagStatus === 'VSC' ? 0.65 : 1.0;
        const fuelBurnedThisTick =
          getCircuitFuelBurn2026(circuit) *
          paceMod.fuelBurnMultiplier *
          flagFuelFactor *
          lapFraction;

        fuelLoad = Math.max(0, Number((fuelLoad - fuelBurnedThisTick).toFixed(2)));

        const ersChangeThisTick = ersMod.batteryDeltaPerLap * lapFraction;
        ersBattery = Math.min(100, Math.max(0, Number((ersBattery + ersChangeThisTick).toFixed(1))));

        if (ersBattery <= 0 && ersMode === 'DEPLOY') {
          ersMode = 'NEUTRAL';
        }

        // E. Logika AI Otomatis (untuk pembalap non-Player)
        const remainingLaps = totalLaps - currentLap;
        if (!driver.isPlayerControlled && !isInPit) {
          const needsWetTyres = isSlickTyre(tyreCompound) && nextTrackWetness > 30;
          const needsExtremeWet = tyreCompound === 'INTER' && nextTrackWetness > 72;
          const needsDryTyres =
            (tyreCompound === 'INTER' || tyreCompound === 'WET') &&
            nextTrackWetness < 16 &&
            nextWeather === 'DRY';

          const hasUsedWetOrInter = usedCompounds.some((c) => c === 'INTER' || c === 'WET');
          const usedDryCount = usedCompounds.filter(isSlickTyre).length;
          const needsMandatorySecondDry =
            !hasUsedWetOrInter &&
            usedDryCount < 2 &&
            nextTrackWetness < 20 &&
            remainingLaps <= 14 &&
            remainingLaps >= 2 &&
            pitStopsCount === 0;

          const tyreCritical = tyreHealth < 28;
          const severeWingDamage = wingDamage >= 35;
          // AI juga memanfaatkan "Cheap Pit Stop" saat Safety Car jika ban sudah < 52% atau sayap rusak
          const opportunisticSCPit =
            (nextFlagStatus === 'SC' || nextFlagStatus === 'VSC') &&
            (tyreHealth < 52 || wingDamage >= 20) &&
            tyreAge >= 6;

          if (
            !boxThisLap &&
            remainingLaps >= 2 &&
            (tyreCritical ||
              severeWingDamage ||
              opportunisticSCPit ||
              needsWetTyres ||
              needsExtremeWet ||
              needsDryTyres ||
              needsMandatorySecondDry)
          ) {
            boxThisLap = true;
            if (wingDamage >= 30) {
              repairWingOnNextPit = true;
            }
            nextTyreCompound = selectBestAICompound(
              tyreCompound,
              nextTrackWetness,
              nextWeather,
              remainingLaps,
              usedCompounds
            );
          }

          if (ersBattery < 18 || nextFlagStatus !== 'GREEN') {
            ersMode = 'HARVEST';
          } else if (ersBattery > 78 && nextFlagStatus === 'GREEN') {
            ersMode = 'DEPLOY';
          } else if (ersBattery > 40 && ersMode === 'HARVEST') {
            ersMode = 'NEUTRAL';
          }

          if (tyreHealth < 38 || nextFlagStatus !== 'GREEN' || wingDamage > 40) {
            paceMode = 'CONSERVE';
          } else if (tyreHealth > 68 && remainingLaps <= 10) {
            paceMode = 'PUSH';
          } else {
            paceMode = 'STANDARD';
          }
        }

        // F. Saat melewati garis start/finish (trackProgress >= 100)
        if (trackProgress >= 100) {
          const overshootProgress = trackProgress - 100;
          const overshootTime = progressRatePerSec > 0 ? overshootProgress / progressRatePerSec : 0;

          const completedLapTime = Number(
            Math.max(
              circuit.baseLapTime * 0.8,
              (nextCurrentLapElapsed[driver.id] ?? targetLapTime) - overshootTime
            ).toFixed(3)
          );

          lastLapTime = completedLapTime;
          if (bestLapTime === 0 || completedLapTime < bestLapTime) {
            bestLapTime = completedLapTime;
          }

          const lapSectorEval = evaluateLapSectors(
            completedLapTime,
            personalBestSectors,
            raceOverallBestSectors
          );
          personalBestSectors = lapSectorEval.nextPB;
          sectorStatuses = lapSectorEval.statuses;

          if (completedLapTime < nextFastestLapTime && nextFlagStatus === 'GREEN') {
            nextFastestLapTime = completedLapTime;
            nextFastestLapDriverId = driver.id;
            newLogs.push(
              createLog(
                currentLap,
                `FASTEST LAP! ${driver.name} (${driver.code}) mencetak waktu tercepat ${formatLapTime(
                  completedLapTime
                )} di Lap ${currentLap}!`,
                'FASTEST_LAP'
              )
            );
          }

          const finishedLapNumber = currentLap;
          if (driver.isPlayerControlled) {
            const existingLaps = nextPlayerLapTelemetry[driver.id] ?? [];
            if (!existingLaps.some((entry) => entry.lap === finishedLapNumber)) {
              lapCompletedThisTickDriverIds.push(driver.id);
              nextPlayerLapTelemetry[driver.id] = [
                ...existingLaps,
                {
                  driverId: driver.id,
                  driverCode: driver.code,
                  driverName: driver.name,
                  teamColor: driver.teamColor,
                  lap: finishedLapNumber,
                  lapTime: completedLapTime,
                  position: driver.position,
                  gapToLeader: driver.gapToLeader,
                  tyreCompound,
                  tyreHealth,
                  tyreAge: tyreAge + 1,
                  fuelLoad,
                  ersBattery,
                  paceMode,
                  ersMode,
                  flagStatus: nextFlagStatus,
                  weather: nextWeather,
                  pitInLap: boxThisLap && finishedLapNumber < totalLaps,
                  sectorStatuses: lapSectorEval.statuses,
                },
              ];
            }
          }
          currentLap += 1;
          tyreAge += 1;

          nextCurrentLapElapsed[driver.id] = Number(overshootTime.toFixed(3));

          // Cek apakah pembalap masuk Pit di akhir lap ini
          if (boxThisLap && finishedLapNumber < totalLaps) {
            isInPit = true;
            trackProgress = 0;

            // Untuk AI, jika wingDamage >= 30%, otomatis aktifkan repairWingOnNextPit
            if (!driver.isPlayerControlled && wingDamage >= 30) {
              repairWingOnNextPit = true;
            }

            // Hanya tambahkan +4.5s jika repairWingOnNextPit === true dan memang ada wingDamage > 0
            const willRepairWing = repairWingOnNextPit && wingDamage > 0;

            const effectiveBasePitLoss = Number(
              (circuit.pitLossTime * currentPitLossMultiplier).toFixed(1)
            );
            const wingRepairPenalty = willRepairWing ? WING_REPAIR_PIT_TIME_PENALTY : 0;
            const mediaDayCrewBonus = driver.isPlayerControlled
              ? state.mediaDayBuffs.pitStopTimeReductionSeconds
              : 0;
            const pitCrewDelta = driver.isPlayerControlled
              ? state.playerPitCrewStopSeconds - 2.38
              : 0;
            const hadPitCrewError =
              driver.isPlayerControlled &&
              Math.random() < (state.playerPitCrewErrorPercent ?? 2.8) / 100;
            const pitErrorPenalty = hadPitCrewError ? 2.2 : 0;
            const totalPitDuration = Number(
              Math.max(
                6.0,
                effectiveBasePitLoss +
                  wingRepairPenalty -
                  mediaDayCrewBonus +
                  pitCrewDelta +
                  pitErrorPenalty
              ).toFixed(1)
            );

            nextPitRemainingTime[driver.id] = totalPitDuration;

            newLogs.push(
              createLog(
                finishedLapNumber,
                `PIT STOP: ${driver.name} (${driver.code}) masuk pit untuk ban ${nextTyreCompound}${
                  hadPitCrewError ? ' [PIT CREW ERROR +2.2s!]' : ''
                }${
                  willRepairWing
                    ? ` + perbaikan Front Wing (+${WING_REPAIR_PIT_TIME_PENALTY}s)`
                    : wingDamage > 0
                    ? ' (Fast Stop tanpa perbaikan sayap)'
                    : ''
                }${
                  nextFlagStatus === 'SC' || nextFlagStatus === 'VSC'
                    ? ` [CHEAP PIT STOP ${totalPitDuration}s]`
                    : ` (${totalPitDuration}s)`
                }.`,
                hadPitCrewError ? 'INCIDENT' : 'PIT'
              )
            );
          } else {
            trackProgress = Number(overshootProgress.toFixed(3));
          }
        } else {
          trackProgress = Number(trackProgress.toFixed(3));
        }

        return {
          ...driver,
          currentLap,
          trackProgress,
          totalTimeElapsed,
          lastLapTime,
          bestLapTime,
          tyreCompound,
          usedCompounds,
          tyreHealth,
          tyreAge,
          ersBattery,
          fuelLoad,
          paceMode,
          ersMode,
          isInPit,
          boxThisLap,
          nextTyreCompound,
          pitStopsCount,
          wingDamage,
          partDamage,
          repairWingOnNextPit,
          status,
          sectorStatuses,
          personalBestSectors,
          timePenaltySeconds,
        };
      });

      // --- 2. Efek Safety Car (SC) & VSC: Dilarang Overtake di Lintasan & Jaga Jarak Aman ---
      const secondsPerPercent = circuit.baseLapTime / 100;
      const scSafeSpacingSeconds = 0.65; // Jarak aman antrean di belakang Safety Car
      const vscSafeSpacingSeconds = 0.85; // Jarak aman minimum di bawah Virtual Safety Car
      const scTargetProgressSpacing = scSafeSpacingSeconds / secondsPerPercent;
      const vscMinProgressSpacing = vscSafeSpacingSeconds / secondsPerPercent;

      let sortedDrivers: DriverState[];

      if (nextFlagStatus === 'SC' || nextFlagStatus === 'VSC') {
        const prevInPitById = new Map(state.drivers.map((d) => [d.id, d.isInPit]));

        // Pembalap yang sudah aktif di lintasan menjaga urutan posisinya (DILARANG MENYALIP di SC/VSC)
        const stayingOnTrack = updatedDrivers
          .filter((d) => d.status === 'RUNNING' && !d.isInPit && !prevInPitById.get(d.id))
          .sort((a, b) => a.position - b.position);

        // Mobil yang baru saja keluar dari pit masuk ke antrean lintasan sesuai posisi fisiknya saat pit exit
        const justExitedPit = updatedDrivers
          .filter((d) => d.status === 'RUNNING' && !d.isInPit && Boolean(prevInPitById.get(d.id)))
          .sort(
            (a, b) => b.currentLap * 100 + b.trackProgress - (a.currentLap * 100 + a.trackProgress)
          );

        const onTrackRunning = [...stayingOnTrack];
        justExitedPit.forEach((pitCar) => {
          const pitCarDist = pitCar.currentLap * 100 + pitCar.trackProgress;
          const insertIdx = onTrackRunning.findIndex(
            (other) => other.currentLap * 100 + other.trackProgress < pitCarDist
          );
          if (insertIdx === -1) {
            onTrackRunning.push(pitCar);
          } else {
            onTrackRunning.splice(insertIdx, 0, pitCar);
          }
        });

        const inPitRunning = updatedDrivers
          .filter((d) => d.status === 'RUNNING' && d.isInPit)
          .sort((a, b) => {
            const distA = a.currentLap * 100 + a.trackProgress;
            const distB = b.currentLap * 100 + b.trackProgress;
            return distB - distA;
          });

        const outDrivers = updatedDrivers
          .filter((d) => d.status !== 'RUNNING')
          .sort((a, b) => a.position - b.position);

        // Terapkan larangan menyalip & penjagaan jarak aman untuk setiap mobil di lintasan
        for (let i = 1; i < onTrackRunning.length; i++) {
          const carAhead = onTrackRunning[i - 1];
          const carCurrent = onTrackRunning[i];

          const aheadTotalDist = carAhead.currentLap * 100 + carAhead.trackProgress;
          const currentTotalDist = carCurrent.currentLap * 100 + carCurrent.trackProgress;
          const safeSpacing =
            nextFlagStatus === 'SC' ? scTargetProgressSpacing : vscMinProgressSpacing;
          const maxAllowedDist = aheadTotalDist - safeSpacing;
          const minSameLapFloor = carCurrent.currentLap * 100;

          let adjustedDist = currentTotalDist;
          if (currentTotalDist > maxAllowedDist) {
            // DILARANG MENYALIP & WAJIB JAGA JARAK AMAN: tahan di belakang mobil depan minimal safeSpacing
            adjustedDist =
              maxAllowedDist >= minSameLapFloor
                ? maxAllowedDist
                : Math.max(minSameLapFloor, aheadTotalDist - 0.02);
          } else if (nextFlagStatus === 'SC') {
            // Khusus full Safety Car: rombongan di belakang perlahan merapat ke antrean (bunching up), tetap berhenti di jarak aman
            const maxCatchUpStep = (0.55 / secondsPerPercent) * dt;
            const gapToQueue = maxAllowedDist - currentTotalDist;
            adjustedDist =
              currentTotalDist + Math.min(gapToQueue, Math.max(gapToQueue * 0.12, maxCatchUpStep));
            // Jika mobil berencana masuk pit di akhir lap ini, tahan tepat sebelum garis pit entry agar pit stop tetap terpicu normal
            if (carCurrent.boxThisLap && adjustedDist >= minSameLapFloor + 100) {
              adjustedDist = minSameLapFloor + 99.99;
            }
          } else {
            // Khusus VSC: pertahankan gap balap saat ini (tidak bunching up seperti SC)
            adjustedDist = currentTotalDist;
          }

          const newLap = Math.max(1, Math.floor(adjustedDist / 100));
          const newProgress = Number(Math.max(0, adjustedDist - newLap * 100).toFixed(3));

          onTrackRunning[i] = {
            ...carCurrent,
            currentLap: newLap,
            trackProgress: newProgress,
          };
        }

        // Gabungkan onTrackRunning (urutan terkunci tanpa overtake) & inPitRunning (mobil di pit boleh dilewati)
        const allRunning: DriverState[] = [];
        let pitIdx = 0;
        for (const trackCar of onTrackRunning) {
          const trackDist = trackCar.currentLap * 100 + trackCar.trackProgress;
          while (
            pitIdx < inPitRunning.length &&
            inPitRunning[pitIdx].currentLap * 100 + inPitRunning[pitIdx].trackProgress > trackDist
          ) {
            allRunning.push(inPitRunning[pitIdx]);
            pitIdx += 1;
          }
          allRunning.push(trackCar);
        }
        while (pitIdx < inPitRunning.length) {
          allRunning.push(inPitRunning[pitIdx]);
          pitIdx += 1;
        }

        sortedDrivers = [...allRunning, ...outDrivers];
      } else {
        // F1M24: Team Orders (Let Teammate Pass) & Overtake Aggression / Defend Mode
        let greenAdjusted = [...updatedDrivers];
        if (nextFlagStatus === 'GREEN') {
          const preSorted = [...greenAdjusted].sort((a, b) => {
            if ((a.status === 'RUNNING') !== (b.status === 'RUNNING')) {
              return a.status === 'RUNNING' ? -1 : 1;
            }
            return b.currentLap * 100 + b.trackProgress - (a.currentLap * 100 + a.trackProgress);
          });

          const distAdjustments: Record<string, number> = {};
          const clearLetPassIds = new Set<string>();

          for (let i = 1; i < preSorted.length; i++) {
            const front = preSorted[i - 1];
            const back = preSorted[i];
            if (front.status !== 'RUNNING' || back.status !== 'RUNNING' || front.isInPit || back.isInPit) {
              continue;
            }
            const frontDist = front.currentLap * 100 + front.trackProgress;
            const backDist = back.currentLap * 100 + back.trackProgress;
            const gapSec = Math.max(0, (frontDist - backDist) * secondsPerPercent);

            // Team Order: letTeammatePass within 3.0s
            if (front.isPlayerControlled && back.isPlayerControlled && front.letTeammatePass && gapSec <= 3.0) {
              const targetFront = Math.max(0, back.trackProgress - 0.35);
              const targetBack = Math.min(99.9, front.trackProgress + 0.35);
              distAdjustments[front.id] = targetFront - front.trackProgress;
              distAdjustments[back.id] = targetBack - back.trackProgress;
              clearLetPassIds.add(front.id);
              newLogs.push(
                createLog(
                  front.currentLap,
                  `[TEAM ORDER] ${front.code} memberi jalan kepada rekan setimnya ${back.code}.`,
                  'INFO'
                )
              );
              soundEngine.playTeamRadioBeep();
              continue;
            }

            // Overtake Aggression vs Defend Mode battle modifier inside 0.45s battle range
            if (gapSec <= 0.45) {
              const atk = back.overtakeAggression ?? 'MEDIUM';
              const def = front.defendMode ?? 'NORMAL';
              let battleShift = 0;
              if (atk === 'HIGH') battleShift += 0.08;
              else if (atk === 'LOW') battleShift -= 0.07;

              if (def === 'ALWAYS') battleShift -= 0.09;
              else if (def === 'PASSIVE') battleShift += 0.07;

              if (Math.abs(battleShift) > 0.01) {
                distAdjustments[back.id] = (distAdjustments[back.id] ?? 0) + battleShift;
              }
            }
          }

          if (Object.keys(distAdjustments).length > 0 || clearLetPassIds.size > 0) {
            greenAdjusted = greenAdjusted.map((d) => {
              const shift = distAdjustments[d.id] ?? 0;
              const nextProg =
                shift !== 0
                  ? Number(Math.max(0, Math.min(99.95, d.trackProgress + shift)).toFixed(3))
                  : d.trackProgress;
              return {
                ...d,
                trackProgress: nextProg,
                letTeammatePass: clearLetPassIds.has(d.id) ? false : d.letTeammatePass,
              };
            });
          }
        }

        // Urutkan normal: RUNNING selalu di atas RETIRED/DNF, lalu berdasarkan jarak tempuh terjauh
        sortedDrivers = greenAdjusted.sort((a, b) => {
          if ((a.status === 'RUNNING') !== (b.status === 'RUNNING')) {
            return a.status === 'RUNNING' ? -1 : 1;
          }
          const distA = a.currentLap * 100 + a.trackProgress;
          const distB = b.currentLap * 100 + b.trackProgress;
          if (Math.abs(distB - distA) > 0.0001) {
            return distB - distA;
          }
          return a.totalTimeElapsed - b.totalTimeElapsed;
        });
      }

      // --- 3. Kalkulasi Ulang Position, gapToLeader, dan interval ---
      const leader = sortedDrivers[0];
      const leaderTotalProgress = leader.currentLap * 100 + leader.trackProgress;

      const positionedDrivers: DriverState[] = sortedDrivers.map((driver, index) => {
        const position = index + 1;
        if (index === 0 || driver.status !== 'RUNNING') {
          return {
            ...driver,
            position,
            gapToLeader: 0,
            interval: 0,
          };
        }

        const carAhead = sortedDrivers[index - 1];
        const driverTotalProgress = driver.currentLap * 100 + driver.trackProgress;
        const aheadTotalProgress = carAhead.currentLap * 100 + carAhead.trackProgress;

        const progressDiffLeader = Math.max(0, leaderTotalProgress - driverTotalProgress);
        const progressDiffAhead = Math.max(0, aheadTotalProgress - driverTotalProgress);

        const gapToLeader = Number((progressDiffLeader * secondsPerPercent).toFixed(3));
        const interval = Number((progressDiffAhead * secondsPerPercent).toFixed(3));

        return {
          ...driver,
          position,
          gapToLeader,
          interval,
        };
      });

      // --- 4. Evaluasi Pergantian Lap Global dari Pre-Generated weatherTimeline & Akhir Periode SC/VSC ---
      const previousGlobalLap = state.currentLap;
      const leaderLap = Math.min(totalLaps, positionedDrivers[0]?.currentLap ?? state.currentLap);

      if (leaderLap > previousGlobalLap) {
        // Ambil kondisi cuaca untuk lap ini dari weatherTimeline yang telah di-generate sebelum balapan
        const timelineForThisLap =
          state.weatherTimeline.find((entry) => entry.lap === leaderLap) ??
          nextWeatherForecast.find((f) => f.lap === leaderLap);

        if (timelineForThisLap && timelineForThisLap.weather !== nextWeather) {
          nextWeather = timelineForThisLap.weather;
          const weatherMsg =
            nextWeather === 'HEAVY_RAIN'
              ? 'CUACA MEMBURUK: Front hujan deras (Heavy Rain) tiba di sirkuit!'
              : nextWeather === 'LIGHT_RAIN'
              ? 'LAPORAN CUACA: Front hujan ringan (Light Rain) mulai membasahi lintasan (+1.5%/lap maks).'
              : 'LAPORAN CUACA: Front hujan berlalu, lintasan mulai mengering perlahan (-1.0%/lap).';
          newLogs.push(
            createLog(
              leaderLap,
              weatherMsg,
              nextWeather === 'HEAVY_RAIN' ? 'INCIDENT' : 'INFO'
            )
          );
        }

        // Geser window Weather Forecast agar selalu menampilkan 10 lap ke depan dari weatherTimeline
        nextWeatherForecast = sliceWeatherForecastWindow(state.weatherTimeline, leaderLap + 1);

        // Cek apakah periode Safety Car / VSC (3-5 lap) sudah selesai
        if (
          (nextFlagStatus === 'SC' || nextFlagStatus === 'VSC') &&
          nextFlagEndLap !== null &&
          leaderLap >= nextFlagEndLap
        ) {
          const endedFlagLabel =
            nextFlagStatus === 'SC' ? 'SAFETY CAR IN THIS LAP' : 'VSC ENDING';
          nextFlagStatus = 'GREEN';
          nextFlagEndLap = null;
          newLogs.push(
            createLog(
              leaderLap,
              `${endedFlagLabel} — GREEN FLAG! Balapan kembali dilanjutkan dengan kecepatan penuh!`,
              'INFO'
            )
          );
        }
      }

      // --- 5. Evaluasi Status Selesai Balapan (FINISHED / POST_RACE) & Penalti FIA 2 Kompon Kering ---
      const isRaceFinished = (positionedDrivers[0]?.currentLap ?? 1) > totalLaps;

      let finalDrivers = positionedDrivers;
      let nextRaceStatus: RaceStatus = state.raceStatus;
      let nextSessionPhase: SessionPhase = state.sessionPhase;
      let nextMediaDayBuffs: MediaDayBuffs = state.mediaDayBuffs;

      if (isRaceFinished) {
        const twoCompoundPenaltySeconds = 30.0;
        const penaltyProgressByDriverId: Record<string, number> = {};

        const adjustedForRules = positionedDrivers.map((d) => {
          if (d.status !== 'RUNNING') return d;
          let totalPenSec = d.timePenaltySeconds ?? 0;
          const used = d.usedCompounds ?? [d.tyreCompound];
          const usedWet = used.some((c) => c === 'INTER' || c === 'WET');
          const dryCount = new Set(used.filter(isSlickTyre)).size;
          if (!usedWet && dryCount < 2) {
            totalPenSec += twoCompoundPenaltySeconds;
            newLogs.push(
              createLog(
                totalLaps,
                `FIA STEWARDS PENALTY (+30.0s): ${d.name} (${d.code}) dijatuhi penalti +30 detik karena gagal menggunakan minimal 2 kompon ban kering (Slick) berbeda di balapan kering!`,
                'INCIDENT'
              )
            );
          }
          if (totalPenSec > 0) {
            penaltyProgressByDriverId[d.id] = totalPenSec / secondsPerPercent;
          }
          return d;
        });

        if (Object.keys(penaltyProgressByDriverId).length > 0) {
          const resorted = [...adjustedForRules].sort((a, b) => {
            if ((a.status === 'RUNNING') !== (b.status === 'RUNNING')) {
              return a.status === 'RUNNING' ? -1 : 1;
            }
            const effA =
              a.currentLap * 100 +
              a.trackProgress -
              (penaltyProgressByDriverId[a.id] ?? 0);
            const effB =
              b.currentLap * 100 +
              b.trackProgress -
              (penaltyProgressByDriverId[b.id] ?? 0);
            if (Math.abs(effB - effA) > 0.0001) return effB - effA;
            return a.totalTimeElapsed - b.totalTimeElapsed;
          });

          const newLeader = resorted[0];
          const newLeaderEff =
            newLeader.currentLap * 100 +
            newLeader.trackProgress -
            (penaltyProgressByDriverId[newLeader.id] ?? 0);

          finalDrivers = resorted.map((d, idx) => {
            const position = idx + 1;
            if (idx === 0 || d.status !== 'RUNNING') {
              return { ...d, position, gapToLeader: 0, interval: 0 };
            }
            const carAhead = resorted[idx - 1];
            const effD =
              d.currentLap * 100 +
              d.trackProgress -
              (penaltyProgressByDriverId[d.id] ?? 0);
            const effAhead =
              carAhead.currentLap * 100 +
              carAhead.trackProgress -
              (penaltyProgressByDriverId[carAhead.id] ?? 0);
            return {
              ...d,
              position,
              gapToLeader: Number((Math.max(0, newLeaderEff - effD) * secondsPerPercent).toFixed(3)),
              interval: Number((Math.max(0, effAhead - effD) * secondsPerPercent).toFixed(3)),
            };
          });
        }

        nextRaceStatus = 'FINISHED';
        nextSessionPhase = 'POST_RACE';
        soundEngine.playTeamRadioBeep();
        const leadPlayerFinish = pickLeadPlayerDriver(finalDrivers);
        if (leadPlayerFinish) {
          const firstName = leadPlayerFinish.name.split(' ')[0] || leadPlayerFinish.code;
          const fPos = leadPlayerFinish.position;
          const finishEng =
            fPos === 1
              ? `GET IN THERE ${firstName.toUpperCase()}! P1! WHAT A RACE WIN IN ${circuit.name.toUpperCase()}!`
              : fPos <= 3
              ? `PODIUM FINISH P${fPos}, ${firstName.toUpperCase()}! BRILLIANT DRIVE TODAY!`
              : fPos <= 10
              ? `Thank you ${firstName}. P${fPos} at the flag, solid championship points.`
              : `Thank you ${firstName}. A bit unlucky with timing today, P${fPos} at the line.`;
          const finishDrv =
            fPos === 1
              ? `YES TEAM! Mega calls on pit wall and unbelievable pace — thank you everyone!`
              : fPos <= 3
              ? `P${fPos}! Everything clicked on strategy today, well done everyone!`
              : fPos <= 10
              ? `Cheers guys, gave it everything out there for solid points.`
              : `We lost time earlier and that cost us positions. Let's analyse and come back stronger.`;
          newRadios.unshift(
            createTeamRadioExchange(
              leadPlayerFinish,
              totalLaps,
              'FINISH',
              'RACE_FINISH',
              finishEng,
              finishDrv
            )
          );
        }
        const winner = finalDrivers[0];
        const p2 = finalDrivers[1];
        const p3 = finalDrivers[2];
        newLogs.push(
          createLog(
            totalLaps,
            `CHECKERED FLAG! ${winner.name} (${winner.teamName}) memenangkan balapan di ${circuit.name}! Podium: 1. ${winner.code}, 2. ${p2.code}, 3. ${p3.code}.`,
            'INFO'
          )
        );

        // Evaluasi Ekspektasi Media Day (Confident / Aggressive Answers) terhadap Reputasi Tim
        if (state.mediaDayBuffs.highExpectationCount > 0) {
          const bestPlayerFinish = Math.min(
            ...finalDrivers
              .filter((d) => d.isPlayerControlled)
              .map((d) => d.position)
          );
          if (bestPlayerFinish <= 6) {
            const repGain = state.mediaDayBuffs.highExpectationCount * 4;
            const newRep = Math.min(100, state.mediaDayBuffs.teamReputation + repGain);
            nextMediaDayBuffs = {
              ...state.mediaDayBuffs,
              teamReputation: newRep,
            };
            newLogs.push(
              createLog(
                totalLaps,
                `MEDIA VERDICT: Janji percaya diri saat Press Conference terbukti (Finis P${bestPlayerFinish})! Reputasi Tim naik +${repGain}% menjadi ${newRep}%.`,
                'INFO'
              )
            );
          } else {
            const repLoss = state.mediaDayBuffs.highExpectationCount * 5;
            const newRep = Math.max(20, state.mediaDayBuffs.teamReputation - repLoss);
            nextMediaDayBuffs = {
              ...state.mediaDayBuffs,
              teamReputation: newRep,
            };
            newLogs.push(
              createLog(
                totalLaps,
                `MEDIA BACKLASH: Gagal memenuhi ekspektasi tinggi Press Conference (Finis Terbaik P${bestPlayerFinish}). Reputasi Tim turun -${repLoss}% menjadi ${newRep}%.`,
                'INCIDENT'
              )
            );
          }
        }
      } else if (newLogs.length > 0) {
        // Bunyikan alarm jika ada insiden / Safety Car, atau bunyikan Beep Radio F1 jika ada pit stop / cuaca / fastest lap
        const hasIncident = newLogs.some((l) => l.type === 'INCIDENT');
        const hasRadioEvent = newLogs.some(
          (l) => l.type === 'PIT' || l.type === 'FASTEST_LAP' || l.type === 'INFO'
        );

        if (hasIncident || (nextFlagStatus !== state.flagStatus && nextFlagStatus !== 'GREEN')) {
          soundEngine.playSafetyCarAlarm();
        } else if (hasRadioEvent) {
          soundEngine.playTeamRadioBeep();
        }
      }

      if (lapCompletedThisTickDriverIds.length > 0) {
        lapCompletedThisTickDriverIds.forEach((dId) => {
          const liveDriver = finalDrivers.find((fd) => fd.id === dId);
          const entries = nextPlayerLapTelemetry[dId];
          if (liveDriver && entries && entries.length > 0) {
            const updatedEntries = [...entries];
            const lastIdx = updatedEntries.length - 1;
            updatedEntries[lastIdx] = {
              ...updatedEntries[lastIdx],
              position: liveDriver.position,
              gapToLeader: liveDriver.gapToLeader,
            };
            nextPlayerLapTelemetry[dId] = updatedEntries;
          }
        });
      }

      set({
        drivers: finalDrivers,
        playerLapTelemetry: nextPlayerLapTelemetry,
        currentLap: leaderLap,
        weather: nextWeather,
        trackWetness: nextTrackWetness,
        weatherForecast: nextWeatherForecast,
        flagStatus: nextFlagStatus,
        flagRemainingTicks: nextFlagRemainingTicks,
        flagEndLap: nextFlagEndLap,
        fastestLapTime: nextFastestLapTime,
        fastestLapDriverId: nextFastestLapDriverId,
        pitRemainingTime: nextPitRemainingTime,
        currentLapElapsed: nextCurrentLapElapsed,
        mediaDayBuffs: nextMediaDayBuffs,
        raceStatus: nextRaceStatus,
        sessionPhase: nextSessionPhase,
        teamRadioMessages:
          newRadios.length > 0
            ? [...newRadios, ...state.teamRadioMessages].slice(0, 60)
            : state.teamRadioMessages,
        activeTeamRadioPopup: newRadios[0] ?? state.activeTeamRadioPopup,
        raceLogs: [...newLogs.reverse(), ...state.raceLogs].slice(0, 150),
      });
    },
  };
});
