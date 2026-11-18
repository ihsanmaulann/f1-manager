import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  CarPartDamageMap,
  CarPhysicalPartType,
  CarPowerUnitState,
  CircuitInfo,
  DriverCategory,
  DriverStatus,
  RDPhilosophy,
  SparePartsInventoryMap,
  SprintResultEntry,
} from '../types/f1';
import {
  CIRCUIT_OPTIMAL_SETUPS,
  COST_CAP_LIMIT_2026,
  EXTERNAL_DRIVERS_POOL,
  F1_2026_CIRCUITS,
  GEARBOX_SEASON_LIMIT_2026,
  INITIAL_DRIVERS,
  INITIAL_TEAMS,
  PU_SEASON_LIMIT_2026,
  ROOKIE_FP1_TARGET_PER_CAR,
  SPRINT_POINTS_2026,
} from '../constants/f1Data';
import { getDriverPartDamage, useRaceStore } from './useRaceStore';

export const CAREER_STORAGE_KEY = 'f1-manager-career-save';

/** ID khusus untuk Tim Kustom ke-12 yang ditambahkan oleh pemain (tanpa menghapus 11 tim resmi F1) */
export const CUSTOM_TEAM_ID = 'custom-team';

/** Modal awal pendirian tim baru ($42.0 Juta) untuk membeli kontrak Mesin + 2 Pembalap + sisa kas R&D */
export const INITIAL_CREATION_BUDGET = 42_000_000;

export type CarPartName = 'aerodynamics' | 'chassis' | 'powertrain' | 'durability';

export type SponsorTier = 'CONSERVATIVE' | 'BALANCED' | 'HIGH_RISK';

export type EngineSupplierId = 'mercedes' | 'rbpt' | 'ferrari' | 'audi' | 'honda';

export interface EngineSupplierSpec {
  id: EngineSupplierId;
  name: string;
  codeName: string;
  manufacturer: string;
  customerTeams: string[];
  description: string;
  cost: number; // Harga kontrak musim (USD)
  powerBonus: number; // Bonus tambahan ke basePace pembalap
  efficiencyBonus: number; // Bonus tambahan ke tyreManagement / efisiensi
  accentColor: string;
}

export const ENGINE_SUPPLIERS: EngineSupplierSpec[] = [
  {
    id: 'mercedes',
    name: '1. Mercedes-AMG High Performance Powertrains',
    codeName: 'M17 E-Performance 2026',
    manufacturer: 'Mercedes HPP Brixworth',
    customerTeams: ['Mercedes', 'McLaren', 'Alpine', 'Williams'],
    description:
      'Power Unit #1 di grid 2026 (Tim: Mercedes, McLaren, Alpine, Williams) dengan tenaga puncak tertinggi & efisiensi hibrida MGU-K terbaik.',
    cost: 11_000_000,
    powerBonus: 1.35,
    efficiencyBonus: 0.95,
    accentColor: '#27F4D2',
  },
  {
    id: 'rbpt',
    name: '2. Red Bull Ford Powertrains (RBPT)',
    codeName: 'RBPT-Ford DM01 2026',
    manufacturer: 'Red Bull Powertrains Milton Keynes',
    customerTeams: ['Red Bull Racing', 'Visa Cash App RB'],
    description:
      'Power Unit #2 di grid 2026 (Tim: Red Bull, Visa Cash App RB) dengan akselerasi keluar tikungan agresif dan sistem Override Boost kuat.',
    cost: 10_500_000,
    powerBonus: 1.2,
    efficiencyBonus: 0.8,
    accentColor: '#3671C6',
  },
  {
    id: 'ferrari',
    name: '3. Ferrari Maranello Powertrain',
    codeName: 'Tipo 067/26 V6 Turbo Hybrid',
    manufacturer: 'Scuderia Ferrari Maranello',
    customerTeams: ['Ferrari', 'Haas', 'Cadillac'],
    description:
      'Power Unit #3 di grid 2026 (Tim: Ferrari, Haas, Cadillac) dengan torsi putaran atas eksplosif di trek lurus cepat.',
    cost: 10_000_000,
    powerBonus: 1.1,
    efficiencyBonus: 0.7,
    accentColor: '#E80020',
  },
  {
    id: 'audi',
    name: '4. Audi Formula 1 Powertrain',
    codeName: 'AFR 26 Hybrid',
    manufacturer: 'Audi Formula Racing Neuburg',
    customerTeams: ['Audi Revolut F1 Team'],
    description:
      'Power Unit #4 pabrikan Jerman baru di 2026 (Tim: Audi) dengan rasio harga dan performa kompetitif serta efisiensi bahan bakar modern.',
    cost: 8_000_000,
    powerBonus: 0.75,
    efficiencyBonus: 0.65,
    accentColor: '#F50537',
  },
  {
    id: 'honda',
    name: '5. Honda Racing HRC Power Unit',
    codeName: 'RA626H E-Tech Hybrid',
    manufacturer: 'Honda Racing Sakura',
    customerTeams: ['Aston Martin Aramco'],
    description:
      'Power Unit #5 eksklusif (Tim: Aston Martin) dengan reliabilitas tinggi serta harga kontrak hemat untuk menyisakan kas R&D sasis.',
    cost: 7_000_000,
    powerBonus: 0.6,
    efficiencyBonus: 0.6,
    accentColor: '#229971',
  },
];

export interface SponsorOffer {
  id: string;
  tier: SponsorTier;
  name: string;
  category: string;
  tagline: string;
  upfrontPayout: number;
  objectiveBonus: number;
  objectiveDescription: string;
  accentColor: string;
}

export interface DriverMarketEntry {
  id: string;
  name: string;
  code: string;
  number: number;
  age: number;
  potential: number;
  category: DriverCategory;
  teamId: string;
  teamName: string;
  teamColor: string;
  basePace: number;
  tyreManagement: number;
  salaryPerRace: number;
  buyoutCost: number;
  marketValue: number;
  salary: number;
  academyCost?: number;
  isInPlayerAcademy?: boolean;
  isOnF1Grid?: boolean;
  isPlayerControlled: boolean;
}

export interface CarPartsState {
  aerodynamics: number;
  chassis: number;
  powertrain: number;
  durability: number;
}

export interface DriverStanding {
  driverId: string;
  name: string;
  code: string;
  number: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  points: number;
  wins: number;
  podiums: number;
  isPlayerControlled: boolean;
}

export interface ConstructorStanding {
  teamId: string;
  teamName: string;
  colorHex: string;
  points: number;
  wins: number;
  podiums: number;
  isPlayerTeam: boolean;
}

export interface RaceHistoryEntry {
  round: number;
  circuitId: string;
  circuitName: string;
  country: string;
  winnerName: string;
  winnerCode: string;
  winnerTeam: string;
  playerDriver1Result: { code: string; position: number; points: number };
  playerDriver2Result: { code: string; position: number; points: number };
  prizeMoneyEarned: number;
  sponsorName: string;
  sponsorPayoutEarned: number;
  sponsorObjectiveMet: boolean;
  salariesPaid: number;
  repairCostPaid: number;
}

export const SPONSOR_OFFERS: SponsorOffer[] = [
  {
    id: 'sponsor-conservative',
    tier: 'CONSERVATIVE',
    name: 'Santander Global FinTech',
    category: 'Conservative Sponsor',
    tagline: 'Pendanaan stabil berisiko rendah untuk pengembangan R&D jangka panjang.',
    upfrontPayout: 3_200_000,
    objectiveBonus: 600_000,
    objectiveDescription: 'Minimal 1 pembalap tim finis balapan tanpa DNF (Classified Finish).',
    accentColor: '#38BDF8',
  },
  {
    id: 'sponsor-balanced',
    tier: 'BALANCED',
    name: 'Puma Motorsport Pro',
    category: 'Balanced Sponsor',
    tagline: 'Keseimbangan ideal antara uang kehadiran tetap dan insentif zona poin.',
    upfrontPayout: 1_800_000,
    objectiveBonus: 2_600_000,
    objectiveDescription: 'Minimal salah satu pembalap tim berhasil finis di Top 10 (Zona Poin).',
    accentColor: '#10B981',
  },
  {
    id: 'sponsor-high-risk',
    tier: 'HIGH_RISK',
    name: 'Richard Mille Apex Chrono',
    category: 'High-Risk Sponsor',
    tagline: 'Kontrak prestisius berorientasi kemenangan dengan bonus podium raksasa.',
    upfrontPayout: 750_000,
    objectiveBonus: 6_000_000,
    objectiveDescription:
      'Salah satu pembalap tim berhasil finis Podium (Top 3) ATAU mencetak Fastest Lap.',
    accentColor: '#A855F7',
  },
];

export const F1_POINTS_SYSTEM: number[] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const SEASON_CALENDAR: CircuitInfo[] = F1_2026_CIRCUITS;

export interface ClaimPrizeResult {
  prizeMoney: number;
  sponsorUpfront: number;
  sponsorBonus: number;
  sponsorObjectiveMet: boolean;
  salariesPaid: number;
  repairCostPaid: number;
  netIncome: number;
  playerPointsEarned: number;
  nextCircuit: CircuitInfo;
  isEndOfSeason?: boolean;
}

export interface OffSeasonTransferNewsItem {
  id: string;
  type: 'RETIREMENT' | 'BLOCKBUSTER_POACH' | 'ROOKIE_PROMOTION' | 'CONTRACT_SWAP';
  headline: string;
  details: string;
  driverName: string;
  driverCode: string;
  fromTeam: string;
  toTeam: string;
  teamColor: string;
}

export interface OffSeasonPowerRankingItem {
  teamId: string;
  teamName: string;
  colorHex: string;
  rdPhilosophy: RDPhilosophy;
  previousPerformance: number;
  newPerformance: number;
  delta: number;
  statusLabel: string;
  isPlayerTeam: boolean;
}

export interface OffSeasonDriverProgressionItem {
  driverId: string;
  name: string;
  code: string;
  age: number;
  teamName: string;
  teamColor: string;
  oldPace: number;
  newPace: number;
  oldTyre: number;
  newTyre: number;
  deltaPace: number;
  status: 'YOUNGSTER_GROWTH' | 'VETERAN_DECLINE' | 'RETIRED' | 'PRIME_HOLD';
}

export interface OffSeasonReport {
  completedSeason: number;
  nextSeason: number;
  wdcChampion: {
    name: string;
    code: string;
    teamName: string;
    teamColor: string;
    points: number;
    wins: number;
  };
  wccChampion: {
    teamName: string;
    colorHex: string;
    points: number;
    wins: number;
  };
  playerWccPosition: number;
  playerWccPoints: number;
  constructorPrizeMoneyEarned: number;
  transferNews: OffSeasonTransferNewsItem[];
  driverProgressions: OffSeasonDriverProgressionItem[];
  powerRankings: OffSeasonPowerRankingItem[];
}

export type StaffRole =
  | 'TECHNICAL_CHIEF'
  | 'HEAD_OF_AERO'
  | 'SPORTING_DIRECTOR'
  | 'RACE_ENGINEER_1'
  | 'RACE_ENGINEER_2';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  roleLabel: string;
  rating: number;
  mentality: number;
  salary: number;
  level: number;
}

export type FacilityType =
  | 'DESIGN_CENTRE'
  | 'WIND_TUNNEL'
  | 'RACE_SIMULATOR'
  | 'HOSPITALITY';

export interface FacilityState {
  type: FacilityType;
  name: string;
  level: number;
  condition: number;
  upgradeCost: number;
  refurbishCost: number;
  effectText: string;
}

export type PitCrewTrainingFocus =
  | 'BALANCED'
  | 'TYRE_CHANGE'
  | 'JACK_RELEASE'
  | 'WING_REPAIR'
  | 'REST';

export interface PitCrewState {
  trainingFocus: PitCrewTrainingFocus;
  estimatedStopSeconds: number;
  fatigue: number;
  errorChancePercent: number;
}

export interface AtrState {
  windTunnelHours: number;
  cfdHours: number;
  maxWindTunnelHours: number;
  maxCfdHours: number;
  nextResetRound: number;
}

export interface NextSeasonResearchState {
  aerodynamics: number;
  chassis: number;
  powertrain: number;
  durability: number;
}

export type TeamOriginPreset =
  | 'NEWCOMER'
  | 'TECHNICAL_BREAKTHROUGH'
  | 'AUTOMOTIVE_GIANT'
  | 'CONTENDER';

export interface BoardState {
  originPreset: TeamOriginPreset;
  targetWccPosition: number;
  confidence: number;
  seasonExpectationLabel: string;
}

export interface PoachOffer {
  driverId: string;
  driverName: string;
  rivalTeamName: string;
  rivalSalaryOffer: number;
  buyoutOffer: number;
}

export const TEAM_ORIGIN_PRESETS: Array<{
  id: TeamOriginPreset;
  label: string;
  desc: string;
  budgetDelta: number;
  startLevel: number;
  targetWcc: number;
}> = [
  {
    id: 'NEWCOMER',
    label: 'F1 Newcomer',
    desc: 'Modal awal standar, ekspektasi board ringan (Target P10 WCC).',
    budgetDelta: 0,
    startLevel: 1,
    targetWcc: 10,
  },
  {
    id: 'TECHNICAL_BREAKTHROUGH',
    label: 'Technical Breakthrough',
    desc: 'Start Level 2 Aero & Chassis (+R&D awal), target P7 WCC.',
    budgetDelta: -2_000_000,
    startLevel: 2,
    targetWcc: 7,
  },
  {
    id: 'AUTOMOTIVE_GIANT',
    label: 'Automotive Giant',
    desc: 'Tambahan modal pabrik +$8M, ekspektasi tinggi (Target P5 WCC).',
    budgetDelta: 8_000_000,
    startLevel: 2,
    targetWcc: 5,
  },
  {
    id: 'CONTENDER',
    label: 'Championship Contender',
    desc: 'Paket mobil Level 3, modal +$5M, tekanan board sangat tinggi (Target P2 WCC).',
    budgetDelta: 5_000_000,
    startLevel: 3,
    targetWcc: 2,
  },
];

export const PART_MANUFACTURE_SPECS: Record<
  CarPhysicalPartType,
  { label: string; shortCode: string; normalCost: number; emergencyCost: number; initialStock: number }
> = {
  frontWing: { label: 'Front Wing', shortCode: 'FW', normalCost: 250_000, emergencyCost: 400_000, initialStock: 4 },
  rearWing: { label: 'Rear Wing', shortCode: 'RW', normalCost: 220_000, emergencyCost: 350_000, initialStock: 3 },
  floor: { label: 'Underfloor', shortCode: 'FLR', normalCost: 450_000, emergencyCost: 700_000, initialStock: 3 },
  sidepods: { label: 'Sidepods', shortCode: 'SDP', normalCost: 300_000, emergencyCost: 480_000, initialStock: 3 },
  suspension: { label: 'Suspension', shortCode: 'SUS', normalCost: 280_000, emergencyCost: 450_000, initialStock: 4 },
  chassis: { label: 'Chassis', shortCode: 'CHS', normalCost: 850_000, emergencyCost: 1_300_000, initialStock: 2 },
};

export const createInitialSparePartsInventory = (): SparePartsInventoryMap => ({
  frontWing: PART_MANUFACTURE_SPECS.frontWing.initialStock,
  rearWing: PART_MANUFACTURE_SPECS.rearWing.initialStock,
  floor: PART_MANUFACTURE_SPECS.floor.initialStock,
  sidepods: PART_MANUFACTURE_SPECS.sidepods.initialStock,
  suspension: PART_MANUFACTURE_SPECS.suspension.initialStock,
  chassis: PART_MANUFACTURE_SPECS.chassis.initialStock,
});

export interface CareerSavePayload {
  version: number;
  exportedAt: string;
  isTeamCreated: boolean;
  teamName: string;
  teamColor: string;
  engineSupplierId: EngineSupplierId;
  budget: number;
  seasonNumber: number;
  currentRoundIndex: number;
  carParts: CarPartsState;
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  raceHistory: RaceHistoryEntry[];
  selectedSponsorId: string;
  driverMarket: DriverMarketEntry[];
  teamPerformances?: Record<string, number>;
}

export interface CareerState {
  // 1. State Identitas Tim & Karir (Langkah 6 - 11)
  isTeamCreated: boolean;
  teamName: string;
  teamColor: string;
  engineSupplierId: EngineSupplierId;
  budget: number;
  seasonNumber: number;
  currentRoundIndex: number;
  seasonCalendar: CircuitInfo[];
  carParts: CarPartsState;
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  raceHistory: RaceHistoryEntry[];
  hasClaimedCurrentRace: boolean;

  // 2. State Sponsor, Bursa Transfer & Off-Season (Upgrade 5 & 6)
  selectedSponsorId: string;
  driverMarket: DriverMarketEntry[];
  teamPerformances: Record<string, number>;
  isSeasonCompleted: boolean;
  offSeasonReport: OffSeasonReport | null;
  isOffSeasonModalOpen: boolean;

  // 2b. Regulasi F1 2026: Cost Cap, Power Unit Pool, Rookie FP1 & Sprint Points
  seasonRdSpending: number;
  carPowerUnits: { car1: CarPowerUnitState; car2: CarPowerUnitState };
  rookieFp1Completed: { car1: number; car2: number };
  rookieFp1UsedThisRound: boolean;
  sprintPointsAwardedRound: number | null;

  // 2c. F1 Manager 24 Systems: Staff, Facilities, Pit Crew, ATR, Research, Board, Mentality & Poaching
  staffRoster: Record<StaffRole, StaffMember>;
  facilities: Record<FacilityType, FacilityState>;
  pitCrew: PitCrewState;
  atrState: AtrState;
  nextSeasonResearch: NextSeasonResearchState;
  boardState: BoardState;
  driverMentalities: Record<string, number>;
  affiliateFocuses: Record<string, 'CAR_DEVELOPMENT' | 'MARKETABILITY'>;
  pendingPoachOffer: PoachOffer | null;
  sparePartsInventory: SparePartsInventoryMap;

  // 3. Actions
  createCustomTeam: (params: {
    teamName: string;
    teamColor: string;
    engineSupplierId: EngineSupplierId;
    selectedDriverIds: [string, string];
    originPreset?: TeamOriginPreset;
  }) => { success: boolean; message: string };
  startOfficialTeamCareer: (teamId: string) => { success: boolean; message: string };
  continueSavedCareer: () => void;
  grantMediaDaySponsorBonus: (amount: number) => void;
  upgradeCarPart: (partName: CarPartName, cost: number) => boolean;
  selectSponsor: (sponsorId: string) => void;
  signToDriverAcademy: (driverId: string) => { success: boolean; message: string };
  signDriverFromMarket: (
    targetDriverId: string,
    replacePlayerDriverId: string
  ) => { success: boolean; message: string };
  finishRaceAndClaimPrize: () => ClaimPrizeResult | null;
  advanceToNextSeason: () => OffSeasonReport;
  startNewSeasonAfterOffSeason: () => void;
  closeOffSeasonModal: () => void;
  getCarUpgradeBonuses: () => { paceBonus: number; tyreMgmtBonus: number };
  selectRoundCircuit: (roundIndex: number) => void;
  replacePowerUnitComponent: (
    carSlot: 'car1' | 'car2',
    component: 'ICE' | 'MGUK' | 'GEARBOX'
  ) => { success: boolean; message: string; gridPenaltyAdded: number };
  clearPendingGridPenalties: () => void;
  completeRookieFp1: (
    carSlot: 'car1' | 'car2',
    rookieDriverId?: string
  ) => { success: boolean; message: string };
  awardSprintPoints: (results: SprintResultEntry[]) => boolean;

  // 3b. F1 Manager 24 Actions
  manageStaff: (
    role: StaffRole,
    action: 'TRAIN' | 'REPLACE'
  ) => { success: boolean; message: string };
  manageFacility: (
    type: FacilityType,
    action: 'UPGRADE' | 'REFURBISH'
  ) => { success: boolean; message: string };
  setPitCrewTraining: (focus: PitCrewTrainingFocus) => void;
  developPartWithAtr: (
    partName: CarPartName,
    mode: 'NORMAL' | 'INTENSIVE' | 'RUSHED',
    useAtrBoost: boolean
  ) => { success: boolean; message: string };
  investNextSeasonResearch: (
    partName: CarPartName
  ) => { success: boolean; message: string };
  setAffiliateFocus: (
    driverId: string,
    focus: 'CAR_DEVELOPMENT' | 'MARKETABILITY'
  ) => void;
  resolvePoachOffer: (
    decision: 'COUNTER' | 'RELEASE'
  ) => { success: boolean; message: string };
  manufactureSparePart: (
    partType: CarPhysicalPartType,
    isEmergency?: boolean
  ) => { success: boolean; message: string };
  fitSparePartToDriverCar: (
    driverId: string,
    partType: CarPhysicalPartType
  ) => { success: boolean; message: string };
  fitAllDamagedPartsForDriver: (
    driverId: string
  ) => { success: boolean; message: string };

  // 4. Local Save Manager Actions
  resetCareer: () => void;
  exportSaveData: () => void;
  importSaveData: (jsonString: string) => { success: boolean; message: string };
}

/** Menghitung total bonus basePace & tyreManagement dari level R&D mobil + Mesin Pemasok */
export const calculateBonusesFromParts = (
  parts: CarPartsState,
  engineSupplierId: EngineSupplierId = 'ferrari'
) => {
  const aeroLvl = parts.aerodynamics - 1;
  const chassisLvl = parts.chassis - 1;
  const powerLvl = parts.powertrain - 1;
  const duraLvl = parts.durability - 1;

  const engineSpec =
    ENGINE_SUPPLIERS.find((e) => e.id === engineSupplierId) ?? ENGINE_SUPPLIERS[0];

  const paceBonus = Number(
    (aeroLvl * 0.45 + powerLvl * 0.45 + chassisLvl * 0.25 + engineSpec.powerBonus).toFixed(2)
  );
  const tyreMgmtBonus = Number(
    (duraLvl * 0.65 + chassisLvl * 0.35 + engineSpec.efficiencyBonus).toFixed(2)
  );

  return { paceBonus, tyreMgmtBonus };
};

export const getUpgradeCostForLevel = (currentLevel: number): number => {
  return Math.round((3_500_000 + (currentLevel - 1) * 1_850_000) / 100_000) * 100_000;
};

/**
 * Menghitung biaya perbaikan mobil pasca-balapan:
 * - Mobil DNF (Major Crash): $650,000 + biaya sayap ($8,500 per 1% wingDamage).
 * - Mobil RETIRED (Voluntary Garage Retirement): Hemat 75% biaya perbaikan sasis/sayap!
 * - Mobil RUNNING dengan kerusakan sayap: $8,500 per 1% wingDamage.
 */
export const calculatePlayerRepairCost = (
  playerDrivers: Array<{ wingDamage: number; partDamage?: CarPartDamageMap; status: DriverStatus }>
): number => {
  let totalRepair = 0;
  for (const pd of playerDrivers) {
    const pdMap = pd.partDamage;
    const totalDmgPct = pdMap
      ? (pdMap.frontWing ?? 0) +
        (pdMap.rearWing ?? 0) +
        (pdMap.floor ?? 0) +
        (pdMap.sidepods ?? 0) +
        (pdMap.suspension ?? 0) +
        (pdMap.chassis ?? 0)
      : pd.wingDamage;
    const rawDamageCost = totalDmgPct > 0 ? Math.round(totalDmgPct * 7_500) : 0;

    if (pd.status === 'DNF') {
      totalRepair += 650_000 + rawDamageCost;
    } else if (pd.status === 'RETIRED') {
      // Pensiun sukarela ke garasi menyelamatkan sasis & mesin (hemat 75% dari potensi kerusakan/aus)
      const baseGarageService = 160_000 + rawDamageCost;
      totalRepair += Math.round(baseGarageService * 0.25);
    } else {
      totalRepair += rawDamageCost;
    }
  }
  return totalRepair;
};

export const createInitialDriverMarket = (): DriverMarketEntry[] => {
  const f1GridEntries: DriverMarketEntry[] = INITIAL_DRIVERS.map((d) => {
    const overallRating = d.basePace * 0.65 + d.tyreManagement * 0.35;
    const ratingAbove80 = Math.max(1, overallRating - 80);

    const salaryPerRace =
      Math.round((200_000 + Math.pow(ratingAbove80, 1.55) * 16_500) / 25_000) * 25_000;

    // Harga kontrak pembalap F1 berkisar $3.5M (rookie) s/d $20.5M (juara dunia)
    const buyoutCost =
      Math.round((3_200_000 + Math.pow(ratingAbove80, 1.65) * 135_000) / 100_000) * 100_000;

    return {
      id: d.id,
      name: d.name,
      code: d.code,
      number: d.number,
      age: d.age ?? 25,
      potential: d.potential ?? Math.min(99, d.basePace + 3),
      category: 'F1_GRID' as DriverCategory,
      teamId: d.teamId,
      teamName: d.teamName,
      teamColor: d.teamColor,
      basePace: d.basePace,
      tyreManagement: d.tyreManagement,
      salaryPerRace,
      buyoutCost,
      marketValue: buyoutCost,
      salary: salaryPerRace,
      isInPlayerAcademy: false,
      isOnF1Grid: true,
      isPlayerControlled: d.isPlayerControlled,
    };
  });

  const externalEntries: DriverMarketEntry[] = EXTERNAL_DRIVERS_POOL.map((ext) => ({
    id: ext.id,
    name: ext.name,
    code: ext.code,
    number: ext.number,
    age: ext.age,
    potential: ext.potential,
    category: ext.category,
    teamId: `ext-${ext.category.toLowerCase()}`,
    teamName: ext.currentSeriesTeam,
    teamColor: ext.teamColor,
    basePace: ext.basePace,
    tyreManagement: ext.tyreManagement,
    salaryPerRace: ext.salary,
    buyoutCost: ext.marketValue,
    marketValue: ext.marketValue,
    salary: ext.salary,
    academyCost: ext.academyCost ?? Math.round(ext.marketValue * 0.35),
    isInPlayerAcademy: false,
    isOnF1Grid: false,
    isPlayerControlled: false,
  }));

  return [...f1GridEntries, ...externalEntries];
};

const createInitialDriverStandings = (): DriverStanding[] =>
  INITIAL_DRIVERS.map((d) => ({
    driverId: d.id,
    name: d.name,
    code: d.code,
    number: d.number,
    teamId: d.teamId,
    teamName: d.teamName,
    teamColor: d.teamColor,
    points: 0,
    wins: 0,
    podiums: 0,
    isPlayerControlled: d.isPlayerControlled,
  }));

const createInitialConstructorStandings = (): ConstructorStanding[] =>
  INITIAL_TEAMS.map((t) => ({
    teamId: t.id,
    teamName: t.name,
    colorHex: t.colorHex,
    points: 0,
    wins: 0,
    podiums: 0,
    isPlayerTeam: t.isPlayerTeam,
  }));

const createInitialTeamPerformances = (): Record<string, number> =>
  INITIAL_TEAMS.reduce((acc, t) => {
    acc[t.id] = t.carPerformance;
    return acc;
  }, {} as Record<string, number>);

const WCC_PRIZE_POOL_BY_POSITION: number[] = [
  28_000_000, // P1 WCC
  24_000_000, // P2
  21_000_000, // P3
  18_500_000, // P4
  16_500_000, // P5
  15_000_000, // P6
  13_500_000, // P7
  12_000_000, // P8
  11_000_000, // P9
  10_000_000, // P10
  9_000_000,  // P11
  8_000_000,  // P12 (12th Expansion Team)
];

const randomIntBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const createInitialCarPowerUnits = (): { car1: CarPowerUnitState; car2: CarPowerUnitState } => ({
  car1: {
    iceUsed: 1,
    iceWear: 0,
    mgukUsed: 1,
    mgukWear: 0,
    gearboxUsed: 1,
    gearboxWear: 0,
    pendingGridPenalty: 0,
  },
  car2: {
    iceUsed: 1,
    iceWear: 0,
    mgukUsed: 1,
    mgukWear: 0,
    gearboxUsed: 1,
    gearboxWear: 0,
    pendingGridPenalty: 0,
  },
});

const STAFF_CANDIDATE_NAMES: Record<StaffRole, string[]> = {
  TECHNICAL_CHIEF: ['Enrico Cardile', 'Pierre Waché', 'James Allison', 'Peter Prodromou'],
  HEAD_OF_AERO: ['Diego Tondi', 'Ben Waterhouse', 'Eric Blandin', 'Dan Fallows'],
  SPORTING_DIRECTOR: ['Diego Ioverno', 'Jonathan Wheatley', 'Ron Meadows', 'Andrea Stella'],
  RACE_ENGINEER_1: ['Riccardo Adami', 'Gianpiero Lambiase', 'Peter Bonnington', 'Will Joseph'],
  RACE_ENGINEER_2: ['Bryan Bozzi', 'Hugh Bird', 'Marcus Dudley', 'Tom Stallard'],
};

const createInitialStaffRoster = (): Record<StaffRole, StaffMember> => ({
  TECHNICAL_CHIEF: {
    id: 'staff-tech',
    name: 'Enrico Cardile',
    role: 'TECHNICAL_CHIEF',
    roleLabel: 'Technical Chief',
    rating: 78,
    mentality: 76,
    salary: 350_000,
    level: 1,
  },
  HEAD_OF_AERO: {
    id: 'staff-aero',
    name: 'Diego Tondi',
    role: 'HEAD_OF_AERO',
    roleLabel: 'Head of Aerodynamics',
    rating: 77,
    mentality: 75,
    salary: 310_000,
    level: 1,
  },
  SPORTING_DIRECTOR: {
    id: 'staff-sporting',
    name: 'Diego Ioverno',
    role: 'SPORTING_DIRECTOR',
    roleLabel: 'Sporting Director',
    rating: 76,
    mentality: 75,
    salary: 280_000,
    level: 1,
  },
  RACE_ENGINEER_1: {
    id: 'staff-re1',
    name: 'Riccardo Adami',
    role: 'RACE_ENGINEER_1',
    roleLabel: 'Race Engineer #1',
    rating: 78,
    mentality: 78,
    salary: 220_000,
    level: 1,
  },
  RACE_ENGINEER_2: {
    id: 'staff-re2',
    name: 'Bryan Bozzi',
    role: 'RACE_ENGINEER_2',
    roleLabel: 'Race Engineer #2',
    rating: 76,
    mentality: 76,
    salary: 210_000,
    level: 1,
  },
});

const createInitialFacilities = (): Record<FacilityType, FacilityState> => ({
  DESIGN_CENTRE: {
    type: 'DESIGN_CENTRE',
    name: 'Design Centre',
    level: 1,
    condition: 100,
    upgradeCost: 4_500_000,
    refurbishCost: 1_200_000,
    effectText: 'Meningkatkan efektivitas upgrade Aero & Chassis serta kapasitas riset.',
  },
  WIND_TUNNEL: {
    type: 'WIND_TUNNEL',
    name: 'Wind Tunnel & CFD',
    level: 1,
    condition: 100,
    upgradeCost: 5_000_000,
    refurbishCost: 1_350_000,
    effectText: 'Menambah bonus efisiensi downforce per level komponen.',
  },
  RACE_SIMULATOR: {
    type: 'RACE_SIMULATOR',
    name: 'Driver-in-Loop Simulator',
    level: 1,
    condition: 100,
    upgradeCost: 3_800_000,
    refurbishCost: 950_000,
    effectText: 'Mempercepat pertumbuhan pembalap Academy & Racecraft.',
  },
  HOSPITALITY: {
    type: 'HOSPITALITY',
    name: 'Team Hospitality & Hub',
    level: 1,
    condition: 100,
    upgradeCost: 3_200_000,
    refurbishCost: 800_000,
    effectText: 'Menjaga mentalitas tim & menaikkan pemasukan sponsor.',
  },
});

const createInitialPitCrew = (): PitCrewState => ({
  trainingFocus: 'BALANCED',
  estimatedStopSeconds: 2.38,
  fatigue: 15,
  errorChancePercent: 2.8,
});

const createInitialAtrState = (): AtrState => ({
  windTunnelHours: 36,
  cfdHours: 24,
  maxWindTunnelHours: 48,
  maxCfdHours: 32,
  nextResetRound: 5,
});

const createInitialNextSeasonResearch = (): NextSeasonResearchState => ({
  aerodynamics: 0,
  chassis: 0,
  powertrain: 0,
  durability: 0,
});

const createInitialBoardState = (
  originPreset: TeamOriginPreset = 'NEWCOMER',
  targetWccPosition = 5
): BoardState => ({
  originPreset,
  targetWccPosition,
  confidence: 74,
  seasonExpectationLabel: `Target Konstruktor: Top ${targetWccPosition}`,
});

const computeStaffAndFacilityBonuses = (
  staffRoster: Record<StaffRole, StaffMember> | undefined,
  facilities: Record<FacilityType, FacilityState> | undefined
) => {
  const techRating = staffRoster?.TECHNICAL_CHIEF?.rating ?? 78;
  const aeroRating = staffRoster?.HEAD_OF_AERO?.rating ?? 77;
  const dc = facilities?.DESIGN_CENTRE;
  const wt = facilities?.WIND_TUNNEL;

  const dcFactor = dc ? (dc.level - 1) * (dc.condition / 100) * 0.22 : 0;
  const wtFactor = wt ? (wt.level - 1) * (wt.condition / 100) * 0.2 : 0;
  const staffPace = ((techRating - 75) * 0.03 + (aeroRating - 75) * 0.03);
  const staffTyre = (techRating - 75) * 0.025;

  return {
    extraPace: Number(Math.max(-0.4, staffPace + dcFactor + wtFactor).toFixed(2)),
    extraTyre: Number(Math.max(-0.3, staffTyre + dcFactor * 0.6).toFixed(2)),
  };
};

export const useCareerStore = create<CareerState>()(
  persist(
    (set, get) => ({
      isTeamCreated: false,
      teamName: 'Scuderia Ferrari HP',
      teamColor: '#E8002D',
      engineSupplierId: 'ferrari',
      budget: 28_500_000,
      seasonNumber: 2026,
      currentRoundIndex: 0,
      seasonCalendar: SEASON_CALENDAR,
      carParts: {
        aerodynamics: 1,
        chassis: 1,
        powertrain: 1,
        durability: 1,
      },
      driverStandings: createInitialDriverStandings(),
      constructorStandings: createInitialConstructorStandings(),
      raceHistory: [],
      hasClaimedCurrentRace: false,
      selectedSponsorId: 'sponsor-balanced',
      driverMarket: createInitialDriverMarket(),
      teamPerformances: createInitialTeamPerformances(),
      isSeasonCompleted: false,
      offSeasonReport: null,
      isOffSeasonModalOpen: false,
      seasonRdSpending: 0,
      carPowerUnits: createInitialCarPowerUnits(),
      rookieFp1Completed: { car1: 0, car2: 0 },
      rookieFp1UsedThisRound: false,
      sprintPointsAwardedRound: null,
      staffRoster: createInitialStaffRoster(),
      facilities: createInitialFacilities(),
      pitCrew: createInitialPitCrew(),
      atrState: createInitialAtrState(),
      nextSeasonResearch: createInitialNextSeasonResearch(),
      boardState: createInitialBoardState(),
      driverMentalities: {},
      affiliateFocuses: {},
      pendingPoachOffer: null,
      sparePartsInventory: createInitialSparePartsInventory(),

      getCarUpgradeBonuses: () => {
        const state = get();
        const base = calculateBonusesFromParts(state.carParts, state.engineSupplierId);
        const { extraPace, extraTyre } = computeStaffAndFacilityBonuses(
          state.staffRoster,
          state.facilities
        );
        return {
          paceBonus: Number((base.paceBonus + extraPace).toFixed(2)),
          tyreMgmtBonus: Number((base.tyreMgmtBonus + extraTyre).toFixed(2)),
        };
      },

      createCustomTeam: ({ teamName, teamColor, engineSupplierId, selectedDriverIds, originPreset = 'NEWCOMER' }) => {
        const cleanName = teamName.trim() || 'Apex GP Racing';
        const engine =
          ENGINE_SUPPLIERS.find((e) => e.id === engineSupplierId) ?? ENGINE_SUPPLIERS[0];

        const baseMarket = createInitialDriverMarket();
        const d1 = baseMarket.find((d) => d.id === selectedDriverIds[0]);
        const d2 = baseMarket.find((d) => d.id === selectedDriverIds[1]);

        if (!d1 || !d2 || d1.id === d2.id) {
          return {
            success: false,
            message: 'Pilih 2 pembalap berbeda untuk mengisi kursi tim Anda.',
          };
        }

        const totalSetupCost = engine.cost + d1.buyoutCost + d2.buyoutCost;
        if (totalSetupCost > INITIAL_CREATION_BUDGET) {
          return {
            success: false,
            message: 'Total biaya Mesin dan 2 Pembalap melebihi anggaran awal $42.00M!',
          };
        }

        const remainingBudget = INITIAL_CREATION_BUDGET - totalSetupCost;

        // Tim kustom ditambahkan sebagai tim ke-12 (bukan menimpa salah satu dari 11 tim resmi)
        const baseMarketNormalized: DriverMarketEntry[] = baseMarket.map((entry) => ({
          ...entry,
          isPlayerControlled: false,
        }));

        // Tempatkan 2 pembalap pilihan pemain ke kursi Tim Kustom ke-12
        const withPlayerDrivers: DriverMarketEntry[] = baseMarketNormalized.map((entry) =>
          selectedDriverIds.includes(entry.id)
            ? {
                ...entry,
                category: 'F1_GRID' as DriverCategory,
                isOnF1Grid: true,
                isInPlayerAcademy: false,
                teamId: CUSTOM_TEAM_ID,
                teamName: cleanName,
                teamColor,
                isPlayerControlled: true,
              }
            : entry
        );

        // Jika pemain membajak pembalap yang sebelumnya berada di salah satu dari 11 tim resmi,
        // otomatis isi kembali kursi tim AI tersebut dengan pembalap Reserve/F2/IndyCar terbaik agar seluruh 11 tim resmi tetap utuh!
        const availableExternalIds = withPlayerDrivers
          .filter((e) => !e.isOnF1Grid && !e.isPlayerControlled)
          .sort((a, b) => b.basePace * 0.65 + b.tyreManagement * 0.35 - (a.basePace * 0.65 + a.tyreManagement * 0.35))
          .map((e) => e.id);

        const replacementAssignments: Record<string, { teamId: string; teamName: string; teamColor: string }> = {};
        let nextAvailIdx = 0;

        for (const officialTeam of INITIAL_TEAMS) {
          const currentTeamSeats = withPlayerDrivers.filter(
            (e) => e.isOnF1Grid && e.teamId === officialTeam.id
          ).length;

          let needed = Math.max(0, 2 - currentTeamSeats);
          while (needed > 0 && nextAvailIdx < availableExternalIds.length) {
            const fillId = availableExternalIds[nextAvailIdx];
            nextAvailIdx += 1;
            replacementAssignments[fillId] = {
              teamId: officialTeam.id,
              teamName: officialTeam.name,
              teamColor: officialTeam.colorHex,
            };
            needed -= 1;
          }
        }

        const updatedMarket: DriverMarketEntry[] = withPlayerDrivers.map((entry) => {
          const assign = replacementAssignments[entry.id];
          if (assign) {
            return {
              ...entry,
              category: 'F1_GRID' as DriverCategory,
              isOnF1Grid: true,
              teamId: assign.teamId,
              teamName: assign.teamName,
              teamColor: assign.teamColor,
              isPlayerControlled: false,
            };
          }
          return entry;
        });

        const activeGridDrivers = updatedMarket.filter(
          (m) => m.isOnF1Grid || m.isPlayerControlled
        );

        const updatedDriverStandings: DriverStanding[] = activeGridDrivers.map((m) => ({
          driverId: m.id,
          name: m.name,
          code: m.code,
          number: m.number,
          teamId: m.teamId,
          teamName: m.teamName,
          teamColor: m.teamColor,
          points: 0,
          wins: 0,
          podiums: 0,
          isPlayerControlled: m.isPlayerControlled,
        }));

        // 11 Tim Resmi F1 2026 tetap dipertahankan + Tim Kustom sebagai Constructor ke-12
        const updatedConstructorStandings: ConstructorStanding[] = [
          ...INITIAL_TEAMS.map((t) => ({
            teamId: t.id,
            teamName: t.name,
            colorHex: t.colorHex,
            points: 0,
            wins: 0,
            podiums: 0,
            isPlayerTeam: false,
          })),
          {
            teamId: CUSTOM_TEAM_ID,
            teamName: cleanName,
            colorHex: teamColor,
            points: 0,
            wins: 0,
            podiums: 0,
            isPlayerTeam: true,
          },
        ];

        const customCarPerformanceByEngine: Record<EngineSupplierId, number> = {
          mercedes: 88,
          rbpt: 87,
          ferrari: 87,
          audi: 85,
          honda: 84,
        };
        const updatedTeamPerformances: Record<string, number> = {
          ...createInitialTeamPerformances(),
          [CUSTOM_TEAM_ID]: customCarPerformanceByEngine[engineSupplierId] ?? 86,
        };

        const driverStatsMap: Record<string, { basePace: number; tyreManagement: number }> = {};
        updatedMarket.forEach((d) => {
          driverStatsMap[d.id] = {
            basePace: d.basePace,
            tyreManagement: d.tyreManagement,
          };
        });

        const originMeta =
          TEAM_ORIGIN_PRESETS.find((o) => o.id === originPreset) ?? TEAM_ORIGIN_PRESETS[0];

        const defaultParts: CarPartsState = {
          aerodynamics: originMeta.startLevel,
          chassis: originMeta.startLevel,
          powertrain: originPreset === 'CONTENDER' ? 2 : 1,
          durability: originPreset === 'CONTENDER' ? 2 : 1,
        };
        const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
          defaultParts,
          engineSupplierId
        );

        const initialMentalities: Record<string, number> = {
          [selectedDriverIds[0]]: 78,
          [selectedDriverIds[1]]: 78,
        };

        set({
          isTeamCreated: true,
          teamName: cleanName,
          teamColor,
          engineSupplierId,
          budget: Math.max(2_000_000, remainingBudget + originMeta.budgetDelta),
          seasonNumber: 2026,
          currentRoundIndex: 0,
          carParts: defaultParts,
          driverMarket: updatedMarket,
          driverStandings: updatedDriverStandings,
          constructorStandings: updatedConstructorStandings,
          teamPerformances: updatedTeamPerformances,
          raceHistory: [],
          hasClaimedCurrentRace: false,
          selectedSponsorId: 'sponsor-balanced',
          isSeasonCompleted: false,
          offSeasonReport: null,
          seasonRdSpending: 0,
          carPowerUnits: createInitialCarPowerUnits(),
          rookieFp1Completed: { car1: 0, car2: 0 },
          rookieFp1UsedThisRound: false,
          sprintPointsAwardedRound: null,
          staffRoster: createInitialStaffRoster(),
          facilities: createInitialFacilities(),
          pitCrew: createInitialPitCrew(),
          atrState: createInitialAtrState(),
          nextSeasonResearch: createInitialNextSeasonResearch(),
          boardState: createInitialBoardState(originPreset, originMeta.targetWcc),
          driverMentalities: initialMentalities,
          affiliateFocuses: {},
          pendingPoachOffer: null,
          sparePartsInventory: createInitialSparePartsInventory(),
          isOffSeasonModalOpen: false,
        });

        useRaceStore
          .getState()
          .syncFromCareerState(
            SEASON_CALENDAR[0],
            selectedDriverIds,
            paceBonus,
            tyreMgmtBonus,
            cleanName,
            teamColor,
            'MEDIA_DAY',
            driverStatsMap,
            updatedTeamPerformances,
            activeGridDrivers
          );

        return {
          success: true,
          message: `Tim ${cleanName} resmi bergabung sebagai Tim ke-12 di grid F1 2026 (${activeGridDrivers.length} Mobil)!`,
        };
      },

      startOfficialTeamCareer: (teamId: string) => {
        const officialTeam = INITIAL_TEAMS.find((t) => t.id === teamId) ?? INITIAL_TEAMS[0];
        const teamDrivers = INITIAL_DRIVERS.filter((d) => d.teamId === officialTeam.id);
        const selectedDriverIds: [string, string] = [
          teamDrivers[0]?.id ?? INITIAL_DRIVERS[0].id,
          teamDrivers[1]?.id ?? INITIAL_DRIVERS[1].id,
        ];

        const supplierByTeam: Record<string, EngineSupplierId> = {
          mercedes: 'mercedes',
          mclaren: 'mercedes',
          alpine: 'mercedes',
          williams: 'mercedes',
          'red-bull': 'rbpt',
          rb: 'rbpt',
          ferrari: 'ferrari',
          haas: 'ferrari',
          cadillac: 'ferrari',
          audi: 'audi',
          'aston-martin': 'honda',
        };
        const engineSupplierId: EngineSupplierId = supplierByTeam[officialTeam.id] ?? 'ferrari';

        const baseMarket = createInitialDriverMarket();
        const updatedMarket: DriverMarketEntry[] = baseMarket.map((entry) => ({
          ...entry,
          isPlayerControlled: selectedDriverIds.includes(entry.id),
        }));

        const updatedDriverStandings: DriverStanding[] = updatedMarket
          .filter((m) => m.isOnF1Grid || m.isPlayerControlled)
          .map((m) => ({
            driverId: m.id,
            name: m.name,
            code: m.code,
            number: m.number,
            teamId: m.teamId,
            teamName: m.teamName,
            teamColor: m.teamColor,
            points: 0,
            wins: 0,
            podiums: 0,
            isPlayerControlled: m.isPlayerControlled,
          }));

        const updatedConstructorStandings: ConstructorStanding[] = INITIAL_TEAMS.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          colorHex: t.colorHex,
          points: 0,
          wins: 0,
          podiums: 0,
          isPlayerTeam: t.id === officialTeam.id,
        }));

        const defaultParts: CarPartsState = {
          aerodynamics: 1,
          chassis: 1,
          powertrain: 1,
          durability: 1,
        };
        const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
          defaultParts,
          engineSupplierId
        );

        const startingBudget = 18_500_000;
        const freshTeamPerformances = createInitialTeamPerformances();

        set({
          isTeamCreated: true,
          teamName: officialTeam.name,
          teamColor: officialTeam.colorHex,
          engineSupplierId,
          budget: startingBudget,
          seasonNumber: 2026,
          currentRoundIndex: 0,
          carParts: defaultParts,
          driverMarket: updatedMarket,
          driverStandings: updatedDriverStandings,
          constructorStandings: updatedConstructorStandings,
          teamPerformances: freshTeamPerformances,
          raceHistory: [],
          hasClaimedCurrentRace: false,
          selectedSponsorId: 'sponsor-balanced',
          isSeasonCompleted: false,
          offSeasonReport: null,
          seasonRdSpending: 0,
          carPowerUnits: createInitialCarPowerUnits(),
          rookieFp1Completed: { car1: 0, car2: 0 },
          rookieFp1UsedThisRound: false,
          sprintPointsAwardedRound: null,
          staffRoster: createInitialStaffRoster(),
          facilities: createInitialFacilities(),
          pitCrew: createInitialPitCrew(),
          atrState: createInitialAtrState(),
          nextSeasonResearch: createInitialNextSeasonResearch(),
          boardState: createInitialBoardState(
            'CONTENDER',
            officialTeam.carPerformance >= 94 ? 3 : officialTeam.carPerformance >= 89 ? 6 : 9
          ),
          driverMentalities: {
            [selectedDriverIds[0]]: 78,
            [selectedDriverIds[1]]: 78,
          },
          affiliateFocuses: {},
          pendingPoachOffer: null,
          sparePartsInventory: createInitialSparePartsInventory(),
          isOffSeasonModalOpen: false,
        });

        useRaceStore
          .getState()
          .syncFromCareerState(
            SEASON_CALENDAR[0],
            selectedDriverIds,
            paceBonus,
            tyreMgmtBonus,
            officialTeam.name,
            officialTeam.colorHex,
            'MEDIA_DAY'
          );

        return {
          success: true,
          message: `Karier baru bersama ${officialTeam.name} siap dimulai di Musim 2026!`,
        };
      },

      continueSavedCareer: () => {
        const state = get();
        const roundIdx = Math.max(
          0,
          Math.min(SEASON_CALENDAR.length - 1, state.currentRoundIndex)
        );
        const circuit = SEASON_CALENDAR[roundIdx];
        const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
          state.carParts,
          state.engineSupplierId
        );
        const activeGridDrivers = state.driverMarket.filter(
          (d) => d.isOnF1Grid || d.isPlayerControlled
        );
        const playerIds = activeGridDrivers
          .filter((d) => d.isPlayerControlled)
          .map((d) => d.id);
        const driverStatsMap: Record<string, { basePace: number; tyreManagement: number }> = {};
        state.driverMarket.forEach((d) => {
          driverStatsMap[d.id] = {
            basePace: d.basePace,
            tyreManagement: d.tyreManagement,
          };
        });

        useRaceStore
          .getState()
          .syncFromCareerState(
            circuit,
            playerIds,
            paceBonus,
            tyreMgmtBonus,
            state.teamName,
            state.teamColor,
            'MEDIA_DAY',
            driverStatsMap,
            state.teamPerformances,
            activeGridDrivers
          );
      },

      grantMediaDaySponsorBonus: (amount: number) => {
        if (amount <= 0) return;
        set((state) => ({
          budget: state.budget + amount,
        }));
      },

      selectSponsor: (sponsorId: string) => {
        const exists = SPONSOR_OFFERS.some((s) => s.id === sponsorId);
        if (exists) {
          set({ selectedSponsorId: sponsorId });
        }
      },

      upgradeCarPart: (partName: CarPartName, cost: number) => {
        const state = get();
        const currentLevel = state.carParts[partName];
        const currentRdSpend = state.seasonRdSpending ?? 0;

        if (
          currentLevel >= 10 ||
          state.budget < cost ||
          currentRdSpend + cost > COST_CAP_LIMIT_2026
        ) {
          return false;
        }

        const updatedParts: CarPartsState = {
          ...state.carParts,
          [partName]: currentLevel + 1,
        };

        const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
          updatedParts,
          state.engineSupplierId
        );

        useRaceStore.getState().applyPlayerUpgrades(paceBonus, tyreMgmtBonus);

        set({
          budget: state.budget - cost,
          seasonRdSpending: currentRdSpend + cost,
          carParts: updatedParts,
        });

        return true;
      },

      signToDriverAcademy: (driverId: string) => {
        const state = get();
        const target = state.driverMarket.find((d) => d.id === driverId);

        if (!target) {
          return { success: false, message: 'Data pembalap tidak ditemukan.' };
        }
        if (target.category !== 'F2_ACADEMY' && target.category !== 'F3_ACADEMY') {
          return {
            success: false,
            message: 'Hanya pembalap muda kategori F2 / F3 yang dapat direkrut ke Driver Academy!',
          };
        }
        if (target.isInPlayerAcademy) {
          return {
            success: false,
            message: `${target.name} sudah tergabung di Driver Academy tim Anda.`,
          };
        }
        if (target.isPlayerControlled) {
          return {
            success: false,
            message: `${target.name} sudah menjadi pembalap utama tim Anda.`,
          };
        }

        const enrollCost = target.academyCost ?? 750_000;
        if (state.budget < enrollCost) {
          return {
            success: false,
            message: `Budget tidak mencukupi untuk biaya pembinaan Driver Academy ${target.name} ($${(
              enrollCost / 1_000_000
            ).toFixed(2)}M).`,
          };
        }

        const updatedMarket = state.driverMarket.map((entry) =>
          entry.id === driverId
            ? {
                ...entry,
                isInPlayerAcademy: true,
                buyoutCost: 0,
                marketValue: 0,
                teamName: `${state.teamName} Driver Academy (${entry.category === 'F2_ACADEMY' ? 'F2' : 'F3'})`,
                teamColor: state.teamColor,
              }
            : entry
        );

        set({
          budget: state.budget - enrollCost,
          driverMarket: updatedMarket,
        });

        return {
          success: true,
          message: `${target.name} (${target.code}) resmi masuk ${state.teamName} Driver Academy! Skill Pace & Tyre Mgmt akan meningkat setiap selesai seri balapan F1 hingga mencapai Potential (${target.potential}).`,
        };
      },

      signDriverFromMarket: (targetDriverId: string, replacePlayerDriverId: string) => {
        const state = get();
        const raceStatus = useRaceStore.getState().raceStatus;

        if (raceStatus === 'RACING') {
          return {
            success: false,
            message: 'Tidak dapat melakukan transfer pembalap saat sesi balapan sedang berjalan!',
          };
        }

        const incoming = state.driverMarket.find((d) => d.id === targetDriverId);
        const outgoing = state.driverMarket.find((d) => d.id === replacePlayerDriverId);

        if (!incoming || !outgoing) {
          return { success: false, message: 'Data pembalap tidak ditemukan.' };
        }
        if (incoming.isPlayerControlled) {
          return { success: false, message: `${incoming.name} sudah berada di kursi utama tim Anda.` };
        }
        if (!outgoing.isPlayerControlled) {
          return {
            success: false,
            message: 'Pembalap yang digantikan harus berasal dari kursi utama tim Anda.',
          };
        }

        // Jika pembalap berasal dari Driver Academy kita sendiri, biaya promosi $0!
        const effectiveBuyoutCost = incoming.isInPlayerAcademy ? 0 : incoming.buyoutCost;

        if (state.budget < effectiveBuyoutCost) {
          return {
            success: false,
            message: `Budget tidak mencukupi untuk menebus kontrak ${incoming.name}.`,
          };
        }

        const playerTeamMeta = {
          teamId: outgoing.teamId,
          teamName: state.teamName,
          teamColor: state.teamColor,
        };

        const wasIncomingOnF1Grid = Boolean(incoming.isOnF1Grid);

        const updatedMarket: DriverMarketEntry[] = state.driverMarket.map((entry) => {
          if (entry.id === targetDriverId) {
            return {
              ...entry,
              category: 'F1_GRID' as DriverCategory,
              isOnF1Grid: true,
              isInPlayerAcademy: false,
              teamId: playerTeamMeta.teamId,
              teamName: playerTeamMeta.teamName,
              teamColor: playerTeamMeta.teamColor,
              isPlayerControlled: true,
            };
          }
          if (entry.id === replacePlayerDriverId) {
            // Sesuai spesifikasi Upgrade 5: Pembalap lama yang digantikan otomatis masuk ke daftar Free Agent / Reserve
            return {
              ...entry,
              category: 'RESERVE' as DriverCategory,
              isOnF1Grid: wasIncomingOnF1Grid,
              isInPlayerAcademy: false,
              teamId: wasIncomingOnF1Grid ? incoming.teamId : 'reserve',
              teamName: wasIncomingOnF1Grid
                ? `${incoming.teamName} / Free Agent`
                : 'Free Agent / Reserve Pool',
              teamColor: wasIncomingOnF1Grid ? incoming.teamColor : '#94A3B8',
              isPlayerControlled: false,
            };
          }
          return entry;
        });

        let updatedDriverStandings = state.driverStandings.map((st) => {
          if (st.driverId === targetDriverId) {
            return {
              ...st,
              teamId: playerTeamMeta.teamId,
              teamName: playerTeamMeta.teamName,
              teamColor: playerTeamMeta.teamColor,
              isPlayerControlled: true,
            };
          }
          if (st.driverId === replacePlayerDriverId) {
            return {
              ...st,
              teamId: wasIncomingOnF1Grid ? incoming.teamId : 'reserve',
              teamName: wasIncomingOnF1Grid ? incoming.teamName : 'Free Agent / Reserve',
              teamColor: wasIncomingOnF1Grid ? incoming.teamColor : '#94A3B8',
              isPlayerControlled: false,
            };
          }
          return st;
        });

        // Jika pembalap baru berasal dari luar F1 (Academy / IndyCar / WEC / Reserve) dan belum ada di tabel klasemen, tambahkan ke driverStandings
        if (!updatedDriverStandings.some((s) => s.driverId === targetDriverId)) {
          updatedDriverStandings = [
            ...updatedDriverStandings,
            {
              driverId: incoming.id,
              name: incoming.name,
              code: incoming.code,
              number: incoming.number,
              teamId: playerTeamMeta.teamId,
              teamName: playerTeamMeta.teamName,
              teamColor: playerTeamMeta.teamColor,
              points: 0,
              wins: 0,
              podiums: 0,
              isPlayerControlled: true,
            },
          ];
        }

        const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
          state.carParts,
          state.engineSupplierId
        );
        useRaceStore
          .getState()
          .transferDriverInRaceStore(
            targetDriverId,
            replacePlayerDriverId,
            paceBonus,
            tyreMgmtBonus,
            {
              name: incoming.name,
              code: incoming.code,
              number: incoming.number,
              basePace: incoming.basePace,
              tyreManagement: incoming.tyreManagement,
            }
          );

        set({
          budget: state.budget - effectiveBuyoutCost,
          driverMarket: updatedMarket,
          driverStandings: updatedDriverStandings,
        });

        return {
          success: true,
          message: incoming.isInPlayerAcademy
            ? `PROMOSI AKADEMI SUKSES! ${incoming.name} (${incoming.code}) dipromosikan ke kursi utama ${playerTeamMeta.teamName} (Bebas Biaya Buyout). ${outgoing.name} kini masuk daftar Free Agent / Reserve.`
            : `KONTRAK RESMI DITANDATANGANI! ${incoming.name} (${incoming.code}) bergabung ke kursi utama ${playerTeamMeta.teamName}. ${outgoing.name} kini masuk daftar Free Agent / Reserve.`,
        };
      },

      finishRaceAndClaimPrize: () => {
        const state = get();
        const raceState = useRaceStore.getState();

        const finalDrivers = [...raceState.drivers].sort((a, b) => a.position - b.position);
        const fastestLapDriverId = raceState.fastestLapDriverId;

        const pointsByDriverId: Record<string, number> = {};
        finalDrivers.forEach((driver, index) => {
          if (driver.status !== 'RUNNING') {
            pointsByDriverId[driver.id] = 0;
            return;
          }
          // Aturan F1 2026: Poin hanya diberikan untuk Top 10 (poin bonus Fastest Lap sudah dihapus mulai 2025/2026)
          const pts = index < F1_POINTS_SYSTEM.length ? F1_POINTS_SYSTEM[index] : 0;
          pointsByDriverId[driver.id] = pts;
        });

        const updatedDriverStandings = state.driverStandings
          .map((standing) => {
            const raceResult = finalDrivers.find((d) => d.id === standing.driverId);
            const earnedPoints = pointsByDriverId[standing.driverId] ?? 0;
            const isWin =
              raceResult?.status === 'RUNNING' && raceResult?.position === 1 ? 1 : 0;
            const isPodium =
              raceResult?.status === 'RUNNING' && raceResult.position <= 3 ? 1 : 0;

            return {
              ...standing,
              points: standing.points + earnedPoints,
              wins: standing.wins + isWin,
              podiums: standing.podiums + isPodium,
            };
          })
          .sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums);

        const updatedConstructorStandings = state.constructorStandings
          .map((team) => {
            const teamDrivers = finalDrivers.filter((d) => d.teamId === team.teamId);
            const teamPointsThisRace = teamDrivers.reduce(
              (sum, d) => sum + (pointsByDriverId[d.id] ?? 0),
              0
            );
            const teamWinsThisRace = teamDrivers.some(
              (d) => d.status === 'RUNNING' && d.position === 1
            )
              ? 1
              : 0;
            const teamPodiumsThisRace = teamDrivers.filter(
              (d) => d.status === 'RUNNING' && d.position <= 3
            ).length;

            return {
              ...team,
              points: team.points + teamPointsThisRace,
              wins: team.wins + teamWinsThisRace,
              podiums: team.podiums + teamPodiumsThisRace,
            };
          })
          .sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums);

        const playerDrivers = finalDrivers
          .filter((d) => d.isPlayerControlled)
          .sort((a, b) => a.number - b.number);

        const playerPointsEarned = playerDrivers.reduce(
          (sum, d) => sum + (pointsByDriverId[d.id] ?? 0),
          0
        );

        let podiumBonus = 0;
        for (const pd of playerDrivers) {
          if (pd.status !== 'RUNNING') continue;
          if (pd.position === 1) podiumBonus += 2_500_000;
          else if (pd.position === 2) podiumBonus += 1_500_000;
          else if (pd.position === 3) podiumBonus += 1_000_000;
        }

        const prizeMoney = 2_000_000 + playerPointsEarned * 280_000 + podiumBonus;

        const activeSponsor =
          SPONSOR_OFFERS.find((s) => s.id === state.selectedSponsorId) ?? SPONSOR_OFFERS[1];

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

        const hospitalityFacility = state.facilities?.HOSPITALITY;
        const hospitalityBonus = hospitalityFacility
          ? Math.round((hospitalityFacility.level - 1) * 180_000 * (hospitalityFacility.condition / 100))
          : 0;

        const academyEntries = state.driverMarket.filter((m) => m.isInPlayerAcademy);
        const marketabilityAffiliatesCount = academyEntries.filter(
          (m) => (state.affiliateFocuses?.[m.id] ?? 'CAR_DEVELOPMENT') === 'MARKETABILITY'
        ).length;
        const carDevAffiliatesCount = academyEntries.length - marketabilityAffiliatesCount;
        const affiliateCashBonus = marketabilityAffiliatesCount * 150_000;

        const sponsorUpfront = activeSponsor.upfrontPayout + hospitalityBonus + affiliateCashBonus;
        const sponsorBonus = sponsorObjectiveMet ? activeSponsor.objectiveBonus : 0;
        const totalSponsorPayout = sponsorUpfront + sponsorBonus;

        const playerMarketEntries = state.driverMarket.filter((m) => m.isPlayerControlled);
        const staffSalaries = Object.values(state.staffRoster ?? createInitialStaffRoster()).reduce(
          (sum, st) => sum + st.salary,
          0
        );
        const salariesPaid =
          playerMarketEntries.reduce((sum, m) => sum + m.salaryPerRace, 0) + staffSalaries;
        const repairCostPaid = calculatePlayerRepairCost(playerDrivers);

        const netIncome =
          prizeMoney + totalSponsorPayout - salariesPaid - repairCostPaid;

        const winner = finalDrivers[0];
        const currentCircuit = state.seasonCalendar[state.currentRoundIndex];
        const p1Driver = playerDrivers[0];
        const p2Driver = playerDrivers[1];

        const newHistoryEntry: RaceHistoryEntry = {
          round: state.currentRoundIndex + 1,
          circuitId: currentCircuit.id,
          circuitName: currentCircuit.name,
          country: currentCircuit.country,
          winnerName: winner.name,
          winnerCode: winner.code,
          winnerTeam: winner.teamName,
          playerDriver1Result: {
            code: p1Driver?.code ?? 'LEC',
            position: p1Driver?.position ?? 0,
            points: p1Driver ? pointsByDriverId[p1Driver.id] ?? 0 : 0,
          },
          playerDriver2Result: {
            code: p2Driver?.code ?? 'SAI',
            position: p2Driver?.position ?? 0,
            points: p2Driver ? pointsByDriverId[p2Driver.id] ?? 0 : 0,
          },
          prizeMoneyEarned: prizeMoney,
          sponsorName: activeSponsor.name,
          sponsorPayoutEarned: totalSponsorPayout,
          sponsorObjectiveMet,
          salariesPaid,
          repairCostPaid,
        };

        const isEndOfSeason = state.currentRoundIndex + 1 >= state.seasonCalendar.length;
        const nextRoundIndex = isEndOfSeason
          ? state.currentRoundIndex
          : state.currentRoundIndex + 1;
        const nextCircuit = {
          ...state.seasonCalendar[nextRoundIndex],
          optimalSetup: CIRCUIT_OPTIMAL_SETUPS[state.seasonCalendar[nextRoundIndex].id],
        };

        const { paceBonus, tyreMgmtBonus } = state.getCarUpgradeBonuses();

        // UPGRADE 5 + F1M24 Race Simulator Bonus: Perkembangan pembalap Academy per balapan
        const simFacility = state.facilities?.RACE_SIMULATOR;
        const simGrowthBoost = simFacility
          ? Number((((simFacility.level - 1) * 0.25) * (simFacility.condition / 100)).toFixed(2))
          : 0;

        const progressedMarket: DriverMarketEntry[] = state.driverMarket.map((entry) => {
          if (entry.isInPlayerAcademy) {
            const nextPace = Math.min(
              entry.potential,
              Number((entry.basePace + 0.8 + simGrowthBoost).toFixed(1))
            );
            const nextTyre = Math.min(
              entry.potential,
              Number((entry.tyreManagement + 0.8 + simGrowthBoost).toFixed(1))
            );
            return {
              ...entry,
              basePace: nextPace,
              tyreManagement: nextTyre,
            };
          }
          return entry;
        });

        // F1M24 Mentality Updates (Drivers, Staff & Board Confidence)
        const nextDriverMentalities: Record<string, number> = { ...(state.driverMentalities ?? {}) };
        for (const pd of playerDrivers) {
          const prevM = nextDriverMentalities[pd.id] ?? 75;
          const delta =
            pd.status !== 'RUNNING'
              ? -8
              : pd.position <= 3
              ? 8
              : pd.position <= 10
              ? 4
              : pd.position <= 14
              ? 0
              : -4;
          nextDriverMentalities[pd.id] = Math.max(15, Math.min(100, prevM + delta));
        }

        const avgDriverDelta =
          playerDrivers.reduce(
            (sum, pd) => sum + ((nextDriverMentalities[pd.id] ?? 75) - (state.driverMentalities?.[pd.id] ?? 75)),
            0
          ) / Math.max(1, playerDrivers.length);

        const nextStaffRoster = { ...(state.staffRoster ?? createInitialStaffRoster()) };
        (Object.keys(nextStaffRoster) as StaffRole[]).forEach((r) => {
          const st = nextStaffRoster[r];
          nextStaffRoster[r] = {
            ...st,
            mentality: Math.max(20, Math.min(100, Math.round(st.mentality + avgDriverDelta * 0.7))),
          };
        });

        // Board Confidence update berdasarkan target posisi konstruktor saat ini
        const currentWccRank =
          updatedConstructorStandings.findIndex((c) => c.isPlayerTeam) + 1 || 10;
        const prevBoard = state.boardState ?? createInitialBoardState();
        const wccDiff = prevBoard.targetWccPosition - currentWccRank;
        const nextBoardState: BoardState = {
          ...prevBoard,
          confidence: Math.max(
            10,
            Math.min(100, prevBoard.confidence + (wccDiff >= 0 ? 3 : -4))
          ),
        };

        // Facility Condition degradation (-4% per race)
        const nextFacilities = { ...(state.facilities ?? createInitialFacilities()) };
        (Object.keys(nextFacilities) as FacilityType[]).forEach((ft) => {
          const fac = nextFacilities[ft];
          nextFacilities[ft] = {
            ...fac,
            condition: Math.max(30, fac.condition - 4),
          };
        });

        // Pit Crew Training & Fatigue update per race
        const prevCrew = state.pitCrew ?? createInitialPitCrew();
        const sportingRating = nextStaffRoster.SPORTING_DIRECTOR?.rating ?? 76;
        const fatigueChange = prevCrew.trainingFocus === 'REST' ? -22 : 11;
        const nextFatigue = Math.max(0, Math.min(100, prevCrew.fatigue + fatigueChange));
        const focusTimeDelta =
          prevCrew.trainingFocus === 'TYRE_CHANGE' || prevCrew.trainingFocus === 'JACK_RELEASE'
            ? -0.05
            : prevCrew.trainingFocus === 'BALANCED'
            ? -0.02
            : 0.01;
        const nextEstStop = Number(
          Math.max(
            1.85,
            Math.min(2.75, prevCrew.estimatedStopSeconds + focusTimeDelta - (sportingRating - 75) * 0.005)
          ).toFixed(2)
        );
        const nextErrorRisk = Number(
          Math.max(0.8, Math.min(18, 1.8 + nextFatigue * 0.12 - (sportingRating - 75) * 0.08)).toFixed(1)
        );
        const nextPitCrew: PitCrewState = {
          ...prevCrew,
          fatigue: nextFatigue,
          estimatedStopSeconds: nextEstStop,
          errorChancePercent: nextErrorRisk,
        };

        // ATR Wind Tunnel & CFD Replenishment every 4 rounds (Sliding Scale by WCC rank)
        const prevAtr = state.atrState ?? createInitialAtrState();
        const completedRoundNum = state.currentRoundIndex + 1;
        let nextAtrState = prevAtr;
        if (completedRoundNum >= prevAtr.nextResetRound) {
          const slidingWt = Math.min(60, 28 + currentWccRank * 3);
          const slidingCfd = Math.min(40, 18 + currentWccRank * 2);
          nextAtrState = {
            windTunnelHours: slidingWt,
            cfdHours: slidingCfd,
            maxWindTunnelHours: slidingWt,
            maxCfdHours: slidingCfd,
            nextResetRound: completedRoundNum + 4,
          };
        }

        // Next-Season Research bonus from Car Development Affiliates
        const prevResearch = state.nextSeasonResearch ?? createInitialNextSeasonResearch();
        const nextResearch: NextSeasonResearchState = {
          ...prevResearch,
          aerodynamics: Math.min(100, prevResearch.aerodynamics + carDevAffiliatesCount * 4),
        };

        // 25% Chance of Rival Poaching Event on a Player Driver or Affiliate
        let nextPoachOffer = state.pendingPoachOffer;
        if (!nextPoachOffer && !isEndOfSeason && Math.random() < 0.25) {
          const poachPool = progressedMarket.filter(
            (m) => m.isPlayerControlled || m.isInPlayerAcademy
          );
          const targetDriver = poachPool[Math.floor(Math.random() * poachPool.length)];
          const rivalTeam = INITIAL_TEAMS.find((t) => t.id !== targetDriver?.teamId) ?? INITIAL_TEAMS[0];
          if (targetDriver) {
            nextPoachOffer = {
              driverId: targetDriver.id,
              driverName: targetDriver.name,
              rivalTeamName: rivalTeam.name,
              rivalSalaryOffer: Math.round(targetDriver.salaryPerRace * 1.3),
              buyoutOffer: Math.round(targetDriver.marketValue * 0.65),
            };
          }
        }

        // Akumulasi keausan Power Unit & Gearbox per seri (dikurangi level Durability R&D)
        const duraFactor = Math.max(0.55, 1 - (state.carParts.durability - 1) * 0.045);
        const currentPus = state.carPowerUnits ?? createInitialCarPowerUnits();
        const addWear = (pu: CarPowerUnitState): CarPowerUnitState => ({
          ...pu,
          iceWear: Math.min(100, Math.round(pu.iceWear + 13 * duraFactor)),
          mgukWear: Math.min(100, Math.round(pu.mgukWear + 12 * duraFactor)),
          gearboxWear: Math.min(100, Math.round(pu.gearboxWear + 11 * duraFactor)),
        });
        const nextCarPowerUnits = {
          car1: addWear(currentPus.car1),
          car2: addWear(currentPus.car2),
        };

        // Cek denda akhir musim jika kewajiban Rookie FP1 (2x per mobil) tidak terpenuhi
        const fp1Counts = state.rookieFp1Completed ?? { car1: 0, car2: 0 };
        const missedRookieSessions = isEndOfSeason
          ? Math.max(0, ROOKIE_FP1_TARGET_PER_CAR - fp1Counts.car1) +
            Math.max(0, ROOKIE_FP1_TARGET_PER_CAR - fp1Counts.car2)
          : 0;
        const rookieFine = missedRookieSessions * 2_000_000;

        if (!isEndOfSeason) {
          useRaceStore.getState().loadCircuit(nextCircuit, paceBonus, tyreMgmtBonus);
        }
        useRaceStore
          .getState()
          .syncPitCrewAndMentalities(
            nextPitCrew.estimatedStopSeconds,
            nextPitCrew.errorChancePercent,
            nextDriverMentalities
          );

        set({
          budget: Math.max(0, state.budget + netIncome - rookieFine),
          driverMarket: progressedMarket,
          driverStandings: updatedDriverStandings,
          constructorStandings: updatedConstructorStandings,
          raceHistory: [newHistoryEntry, ...state.raceHistory],
          carPowerUnits: nextCarPowerUnits,
          rookieFp1UsedThisRound: isEndOfSeason ? state.rookieFp1UsedThisRound : false,
          sprintPointsAwardedRound: isEndOfSeason ? state.sprintPointsAwardedRound : null,
          staffRoster: nextStaffRoster,
          facilities: nextFacilities,
          pitCrew: nextPitCrew,
          atrState: nextAtrState,
          nextSeasonResearch: nextResearch,
          boardState: nextBoardState,
          driverMentalities: nextDriverMentalities,
          pendingPoachOffer: nextPoachOffer,
          currentRoundIndex: nextRoundIndex,
          isSeasonCompleted: isEndOfSeason,
          hasClaimedCurrentRace: isEndOfSeason,
        });

        return {
          prizeMoney,
          sponsorUpfront,
          sponsorBonus,
          sponsorObjectiveMet,
          salariesPaid,
          repairCostPaid,
          netIncome,
          playerPointsEarned,
          nextCircuit,
          isEndOfSeason,
        };
      },

      advanceToNextSeason: () => {
        const state = get();
        const completedSeason = state.seasonNumber;
        const nextSeason = completedSeason + 1;

        // 1. Evaluasi Juara Dunia (WDC & WCC) & Hadiah Kasta Klasemen Akhir Konstruktor
        const sortedDrivers = [...state.driverStandings].sort(
          (a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums
        );
        const sortedConstructors = [...state.constructorStandings].sort(
          (a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums
        );

        const wdcChamp = sortedDrivers[0] ?? {
          name: 'Max Verstappen',
          code: 'VER',
          teamName: 'Oracle Red Bull Racing',
          teamColor: '#3671C6',
          points: 0,
          wins: 0,
        };
        const wccChamp = sortedConstructors[0] ?? {
          teamName: 'Mercedes-AMG PETRONAS F1 Team',
          colorHex: '#27F4D2',
          points: 0,
          wins: 0,
        };

        const playerWccIdx = sortedConstructors.findIndex((c) => c.isPlayerTeam);
        const playerWccPosition = playerWccIdx !== -1 ? playerWccIdx + 1 : 5;
        const playerWccPoints =
          playerWccIdx !== -1 ? sortedConstructors[playerWccIdx].points : 0;
        const constructorPrizeMoneyEarned =
          WCC_PRIZE_POOL_BY_POSITION[playerWccPosition - 1] ?? 10_000_000;

        // 2. Perubahan Kekuatan Mobil Tim AI (Regulation Reset & R&D Shakeup)
        const hasCustomExpansionTeam = state.constructorStandings.some(
          (c) => c.teamId === CUSTOM_TEAM_ID
        );
        const allGridTeamsMeta = hasCustomExpansionTeam
          ? [
              ...INITIAL_TEAMS,
              {
                id: CUSTOM_TEAM_ID,
                name: state.teamName,
                shortName: state.teamName,
                colorHex: state.teamColor,
                carPerformance: state.teamPerformances?.[CUSTOM_TEAM_ID] ?? 86,
                rdPhilosophy: 'DEVELOPING_CHALLENGER' as RDPhilosophy,
                isPlayerTeam: true,
              },
            ]
          : INITIAL_TEAMS;

        const currentPerfMap: Record<string, number> = {
          ...createInitialTeamPerformances(),
          ...(state.teamPerformances ?? {}),
        };
        const nextPerfMap: Record<string, number> = {};
        const powerRankings: OffSeasonPowerRankingItem[] = [];

        // Pilih 1-2 tim papan atas/menengah-atas yang salah konsep aerodinamika (kecuali CONSISTENT_GIANT)
        const aeroFlawCandidates = allGridTeamsMeta.filter(
          (t) =>
            t.rdPhilosophy === 'HIGH_RISK_VOLATILE' &&
            (currentPerfMap[t.id] ?? t.carPerformance) >= 89
        ).sort(() => Math.random() - 0.5);
        const aeroFlawTeamIds = new Set(
          aeroFlawCandidates.slice(0, randomIntBetween(1, 2)).map((t) => t.id)
        );

        // Pilih 1-2 tim papan tengah/bawah yang berhasil membuat mobil roket (Breakthrough)
        const rocketCandidates = allGridTeamsMeta.filter(
          (t) =>
            (t.rdPhilosophy === 'DEVELOPING_CHALLENGER' ||
              t.rdPhilosophy === 'HIGH_RISK_VOLATILE') &&
            !aeroFlawTeamIds.has(t.id) &&
            (currentPerfMap[t.id] ?? t.carPerformance) <= 91
        ).sort(() => Math.random() - 0.5);
        const rocketTeamIds = new Set(
          rocketCandidates.slice(0, randomIntBetween(1, 2)).map((t) => t.id)
        );

        for (const team of allGridTeamsMeta) {
          const prevPerf = currentPerfMap[team.id] ?? team.carPerformance;
          const isPlayerTeam =
            state.constructorStandings.find((c) => c.teamId === team.id)?.isPlayerTeam ??
            team.isPlayerTeam;
          const displayTeamName = isPlayerTeam ? state.teamName : team.name;
          const displayColor = isPlayerTeam ? state.teamColor : team.colorHex;

          let delta = 0;
          let statusLabel = 'STEADY R&D EVOLUTION';

          if (aeroFlawTeamIds.has(team.id)) {
            delta = -randomIntBetween(6, 9);
            statusLabel = 'AERO CONCEPT FLAW (DROP)';
          } else if (rocketTeamIds.has(team.id)) {
            delta = randomIntBetween(6, 8);
            statusLabel = 'ROCKET BREAKTHROUGH (SURGE)';
          } else if (team.rdPhilosophy === 'CONSISTENT_GIANT') {
            delta = randomIntBetween(-3, 4);
            statusLabel = delta >= 2 ? 'STRONG FACTORY UPDATE' : 'CONSISTENT GIANT STABILITY';
          } else if (team.rdPhilosophy === 'HIGH_RISK_VOLATILE') {
            delta = randomIntBetween(-5, 6);
            statusLabel =
              delta >= 4
                ? 'AGGRESSIVE AERO GAIN'
                : delta <= -3
                ? 'CORRELATION ISSUE'
                : 'VOLATILE R&D SPEC';
          } else {
            // DEVELOPING_CHALLENGER
            delta = randomIntBetween(-2, 5);
            statusLabel =
              delta >= 3 ? 'CHALLENGER LEAP FORWARD' : 'INCREMENTAL CHASSIS GAIN';
          }

          const newPerf = Math.max(82, Math.min(99, prevPerf + delta));
          const actualDelta = newPerf - prevPerf;
          nextPerfMap[team.id] = newPerf;

          powerRankings.push({
            teamId: team.id,
            teamName: displayTeamName,
            colorHex: displayColor,
            rdPhilosophy: team.rdPhilosophy,
            previousPerformance: prevPerf,
            newPerformance: newPerf,
            delta: actualDelta,
            statusLabel,
            isPlayerTeam,
          });
        }

        powerRankings.sort((a, b) => b.newPerformance - a.newPerformance);

        // 3. Perkembangan & Penuaan Pembalap (Driver Aging & Progression)
        const transferNews: OffSeasonTransferNewsItem[] = [];
        const driverProgressions: OffSeasonDriverProgressionItem[] = [];
        const retiredDriverIds = new Set<string>();

        const agedMarket: DriverMarketEntry[] = state.driverMarket.map((entry) => {
          const oldAge = entry.age ?? 25;
          const newAge = oldAge + 1;
          const oldPace = entry.basePace;
          const oldTyre = entry.tyreManagement;
          let newPace = oldPace;
          let newTyre = oldTyre;
          let status: OffSeasonDriverProgressionItem['status'] = 'PRIME_HOLD';

          if (newAge <= 24) {
            // Pembalap muda (age <= 24) naik statistiknya (+1 s/d +4 menuju potential)
            const paceGain = randomIntBetween(1, 4);
            const tyreGain = randomIntBetween(1, 3);
            newPace = Math.min(entry.potential, Number((oldPace + paceGain).toFixed(1)));
            newTyre = Math.min(entry.potential, Number((oldTyre + tyreGain).toFixed(1)));
            status = 'YOUNGSTER_GROWTH';
          } else if (newAge >= 36) {
            // Pembalap veteran (age >= 36) menurun statistiknya (-1 s/d -2) atau memilih Pensiun (Retire)
            const paceDrop = randomIntBetween(1, 2);
            const tyreDrop = randomIntBetween(0, 1);
            newPace = Math.max(78, Number((oldPace - paceDrop).toFixed(1)));
            newTyre = Math.max(78, Number((oldTyre - tyreDrop).toFixed(1)));
            status = 'VETERAN_DECLINE';

            // Peluang pensiun untuk pembalap veteran AI (bukan kursi utama Player)
            const retireChance = newAge >= 41 ? 0.8 : newAge >= 38 ? 0.5 : 0.3;
            if (
              !entry.isPlayerControlled &&
              entry.isOnF1Grid &&
              retiredDriverIds.size < 2 &&
              Math.random() < retireChance
            ) {
              retiredDriverIds.add(entry.id);
              status = 'RETIRED';
            }
          } else {
            // Usia prima (25 - 35): perkembangan halus 0 s/d +1
            const primeGain = Math.random() < 0.45 ? 1 : 0;
            newPace = Math.min(entry.potential, Number((oldPace + primeGain).toFixed(1)));
            newTyre = Math.min(entry.potential, Number((oldTyre + primeGain).toFixed(1)));
            status = 'PRIME_HOLD';
          }

          if (
            entry.isOnF1Grid ||
            entry.isPlayerControlled ||
            entry.isInPlayerAcademy ||
            newPace !== oldPace
          ) {
            driverProgressions.push({
              driverId: entry.id,
              name: entry.name,
              code: entry.code,
              age: newAge,
              teamName: entry.teamName,
              teamColor: entry.teamColor,
              oldPace,
              newPace,
              oldTyre,
              newTyre,
              deltaPace: Number((newPace - oldPace).toFixed(1)),
              status,
            });
          }

          return {
            ...entry,
            age: newAge,
            basePace: newPace,
            tyreManagement: newTyre,
          };
        });

        // Pastikan minimal ada 1 veteran AI yang pensiun jika terdapat pembalap AI berusia >= 38 di grid
        if (retiredDriverIds.size === 0) {
          const oldestAiGridVeteran = agedMarket
            .filter((d) => !d.isPlayerControlled && d.isOnF1Grid && d.age >= 38)
            .sort((a, b) => b.age - a.age)[0];
          if (oldestAiGridVeteran) {
            retiredDriverIds.add(oldestAiGridVeteran.id);
            const progItem = driverProgressions.find(
              (p) => p.driverId === oldestAiGridVeteran.id
            );
            if (progItem) {
              progItem.status = 'RETIRED';
            }
          }
        }

        // 4. AI "Silly Season" (Perpindahan Pembalap Otomatis)
        const workingMarket: DriverMarketEntry[] = agedMarket.map((d) => ({ ...d }));

        // Proses pembalap veteran AI yang pensiun
        workingMarket.forEach((d) => {
          if (retiredDriverIds.has(d.id)) {
            const formerTeam = d.teamName;
            const formerColor = d.teamColor;
            d.isOnF1Grid = false;
            d.category = 'RESERVE';
            d.teamId = 'retired';
            d.teamName = 'Retired F1 Legend';

            transferNews.push({
              id: `retire-${d.id}-${completedSeason}`,
              type: 'RETIREMENT',
              headline: `BREAKING: ${d.name} (${d.age} yo) Announces Retirement from F1`,
              details: `Setelah musim ${completedSeason} berakhir, ${d.name} (${d.code}) resmi gantung helm dan meninggalkan kursi balap di ${formerTeam}.`,
              driverName: d.name,
              driverCode: d.code,
              fromTeam: formerTeam,
              toTeam: 'Retired from F1',
              teamColor: formerColor,
            });
          }
        });

        // Pilih secara acak 2-3 pembalap AI di grid yang kontraknya habis di akhir musim
        const aiGridDriversWithExpiringContracts = workingMarket
          .filter((d) => !d.isPlayerControlled && d.isOnF1Grid)
          .sort(() => Math.random() - 0.5)
          .slice(0, randomIntBetween(2, 3));

        const formerTeamByDriverId = new Map<
          string,
          { teamId: string; teamName: string; teamColor: string }
        >();

        aiGridDriversWithExpiringContracts.forEach((d) => {
          formerTeamByDriverId.set(d.id, {
            teamId: d.teamId,
            teamName: d.teamName,
            teamColor: d.teamColor,
          });
          d.isOnF1Grid = false;
          d.category = 'RESERVE';
          d.teamId = 'free-agent';
          d.teamName = 'Off-Season Free Agent';
        });

        // Identifikasi tim milik Player agar kursinya tidak diutak-atik AI
        const playerTeamId =
          state.constructorStandings.find((c) => c.isPlayerTeam)?.teamId ??
          workingMarket.find((d) => d.isPlayerControlled)?.teamId ??
          'ferrari';

        // Urutkan tim AI (10 tim jika pakai tim resmi, atau 11 tim jika pakai Custom Expansion Team) dari performa mobil tertinggi ke terendah
        const aiTeamsSortedByPerf = allGridTeamsMeta.filter((t) => t.id !== playerTeamId).sort(
          (a, b) => (nextPerfMap[b.id] ?? b.carPerformance) - (nextPerfMap[a.id] ?? a.carPerformance)
        );

        // Tahap A: Tim Papan Atas (Top 4 AI Teams) yang kursinya kosong membajak pembalap terbaik dari tim papan tengah!
        const topAiTeams = aiTeamsSortedByPerf.slice(0, 4);
        for (const topTeam of topAiTeams) {
          const currentTeamDrivers = workingMarket.filter(
            (d) => d.isOnF1Grid && d.teamId === topTeam.id && !d.isPlayerControlled
          );

          while (currentTeamDrivers.length < 2) {
            // Cari pembalap berstatistik tinggi dari tim papan tengah/bawah
            const poachCandidate = workingMarket
              .filter(
                (d) =>
                  !d.isPlayerControlled &&
                  d.isOnF1Grid &&
                  d.teamId !== topTeam.id &&
                  !topAiTeams.some((tt) => tt.id === d.teamId)
              )
              .sort(
                (a, b) =>
                  b.basePace * 0.65 +
                  b.tyreManagement * 0.35 -
                  (a.basePace * 0.65 + a.tyreManagement * 0.35)
              )[0];

            if (!poachCandidate) break;

            const oldTeamName = poachCandidate.teamName;
            poachCandidate.teamId = topTeam.id;
            poachCandidate.teamName = topTeam.name;
            poachCandidate.teamColor = topTeam.colorHex;
            poachCandidate.category = 'F1_GRID';
            poachCandidate.isOnF1Grid = true;
            currentTeamDrivers.push(poachCandidate);

            transferNews.push({
              id: `poach-${poachCandidate.id}-${nextSeason}`,
              type: 'BLOCKBUSTER_POACH',
              headline: `BLOCKBUSTER: ${poachCandidate.name} Joins ${topTeam.name}`,
              details: `Tim papan atas ${topTeam.name} resmi membajak ${poachCandidate.name} (${poachCandidate.code}) dari ${oldTeamName} untuk musim ${nextSeason}!`,
              driverName: poachCandidate.name,
              driverCode: poachCandidate.code,
              fromTeam: oldTeamName,
              toTeam: topTeam.name,
              teamColor: topTeam.colorHex,
            });
          }
        }

        // Tahap B: Isi seluruh kursi kosong di tim AI (papan tengah/bawah atau sisa kursi) dengan mempromosikan talenta terbaik dari F2/F3, IndyCar, WEC, atau Free Agent
        for (const aiTeam of aiTeamsSortedByPerf) {
          const teamDrivers = workingMarket.filter(
            (d) => d.isOnF1Grid && d.teamId === aiTeam.id && !d.isPlayerControlled
          );

          while (teamDrivers.length < 2) {
            // Prioritaskan kandidat dari F2_ACADEMY, INDYCAR, WEC_HYPERCAR, F3_ACADEMY, atau Free Agent (kecuali yang ada di Akademi Player & yang baru pensiun)
            const availableCandidates = workingMarket
              .filter(
                (d) =>
                  !d.isPlayerControlled &&
                  !d.isOnF1Grid &&
                  !d.isInPlayerAcademy &&
                  !retiredDriverIds.has(d.id) &&
                  formerTeamByDriverId.get(d.id)?.teamId !== aiTeam.id
              )
              .sort((a, b) => {
                const scoreA =
                  a.basePace * 0.55 + a.tyreManagement * 0.25 + a.potential * 0.2;
                const scoreB =
                  b.basePace * 0.55 + b.tyreManagement * 0.25 + b.potential * 0.2;
                return scoreB - scoreA;
              });

            const chosen =
              availableCandidates[0] ??
              workingMarket.find(
                (d) =>
                  !d.isPlayerControlled &&
                  !d.isOnF1Grid &&
                  !d.isInPlayerAcademy &&
                  !retiredDriverIds.has(d.id)
              );

            if (!chosen) break;

            const prevSeriesOrTeam =
              formerTeamByDriverId.get(chosen.id)?.teamName ?? chosen.teamName;
            const wasExternalRookie = !formerTeamByDriverId.has(chosen.id);

            chosen.teamId = aiTeam.id;
            chosen.teamName = aiTeam.name;
            chosen.teamColor = aiTeam.colorHex;
            chosen.category = 'F1_GRID';
            chosen.isOnF1Grid = true;
            teamDrivers.push(chosen);

            transferNews.push({
              id: `sign-${chosen.id}-${aiTeam.id}-${nextSeason}`,
              type: wasExternalRookie ? 'ROOKIE_PROMOTION' : 'CONTRACT_SWAP',
              headline: wasExternalRookie
                ? `PROMOTED TO F1: ${chosen.name} Signs with ${aiTeam.name}`
                : `TRANSFER: ${chosen.name} Moves to ${aiTeam.name}`,
              details: wasExternalRookie
                ? `${aiTeam.name} mempromosikan ${chosen.name} (${chosen.code}) dari ${prevSeriesOrTeam} ke grid utama F1 ${nextSeason}!`
                : `${chosen.name} (${chosen.code}) menandatangani kontrak baru bersama ${aiTeam.name} setelah meninggalkan ${prevSeriesOrTeam}.`,
              driverName: chosen.name,
              driverCode: chosen.code,
              fromTeam: prevSeriesOrTeam,
              toTeam: aiTeam.name,
              teamColor: aiTeam.colorHex,
            });
          }
        }

        const report: OffSeasonReport = {
          completedSeason,
          nextSeason,
          wdcChampion: {
            name: wdcChamp.name,
            code: wdcChamp.code,
            teamName: wdcChamp.teamName,
            teamColor: wdcChamp.teamColor,
            points: wdcChamp.points,
            wins: wdcChamp.wins,
          },
          wccChampion: {
            teamName: wccChamp.teamName,
            colorHex: wccChamp.colorHex,
            points: wccChamp.points,
            wins: wccChamp.wins,
          },
          playerWccPosition,
          playerWccPoints,
          constructorPrizeMoneyEarned,
          transferNews,
          driverProgressions: driverProgressions.sort(
            (a, b) => Math.abs(b.deltaPace) - Math.abs(a.deltaPace)
          ),
          powerRankings,
        };

        set({
          budget: state.budget + constructorPrizeMoneyEarned,
          driverMarket: workingMarket,
          teamPerformances: nextPerfMap,
          offSeasonReport: report,
          isOffSeasonModalOpen: true,
        });

        return report;
      },

      startNewSeasonAfterOffSeason: () => {
        const state = get();
        const nextSeasonNumber = state.offSeasonReport?.nextSeason ?? state.seasonNumber + 1;

        // Reset poin klasemen WDC & WCC kembali ke 0 untuk 22 pembalap aktif di grid baru
        const activeGridDrivers = state.driverMarket.filter(
          (m) => m.isOnF1Grid || m.isPlayerControlled
        );

        const freshDriverStandings: DriverStanding[] = activeGridDrivers.map((m) => ({
          driverId: m.id,
          name: m.name,
          code: m.code,
          number: m.number,
          teamId: m.teamId,
          teamName: m.teamName,
          teamColor: m.teamColor,
          points: 0,
          wins: 0,
          podiums: 0,
          isPlayerControlled: m.isPlayerControlled,
        }));

        const freshConstructorStandings: ConstructorStanding[] = state.constructorStandings.map(
          (c) => ({
            ...c,
            points: 0,
            wins: 0,
            podiums: 0,
          })
        );

        const round1Circuit = {
          ...state.seasonCalendar[0],
          optimalSetup: CIRCUIT_OPTIMAL_SETUPS[state.seasonCalendar[0].id],
        };

        // Terapkan hasil Next-Season Car Research (Regulasi Musim Baru)
        const research = state.nextSeasonResearch ?? createInitialNextSeasonResearch();
        const carriedParts: CarPartsState = {
          aerodynamics: Math.min(10, 1 + Math.floor(research.aerodynamics / 25)),
          chassis: Math.min(10, 1 + Math.floor(research.chassis / 25)),
          powertrain: Math.min(10, 1 + Math.floor(research.powertrain / 25)),
          durability: Math.min(10, 1 + Math.floor(research.durability / 25)),
        };

        const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
          carriedParts,
          state.engineSupplierId
        );

        const playerIds = activeGridDrivers
          .filter((d) => d.isPlayerControlled)
          .map((d) => d.id);

        const driverStatsMap: Record<string, { basePace: number; tyreManagement: number }> = {};
        state.driverMarket.forEach((d) => {
          driverStatsMap[d.id] = {
            basePace: d.basePace,
            tyreManagement: d.tyreManagement,
          };
        });

        useRaceStore
          .getState()
          .syncFromCareerState(
            round1Circuit,
            playerIds,
            paceBonus,
            tyreMgmtBonus,
            state.teamName,
            state.teamColor,
            'MEDIA_DAY',
            driverStatsMap,
            state.teamPerformances,
            activeGridDrivers
          );

        set({
          seasonNumber: nextSeasonNumber,
          currentRoundIndex: 0,
          carParts: carriedParts,
          driverStandings: freshDriverStandings,
          constructorStandings: freshConstructorStandings,
          raceHistory: [],
          isSeasonCompleted: false,
          hasClaimedCurrentRace: false,
          isOffSeasonModalOpen: false,
          seasonRdSpending: 0,
          carPowerUnits: createInitialCarPowerUnits(),
          rookieFp1Completed: { car1: 0, car2: 0 },
          rookieFp1UsedThisRound: false,
          sprintPointsAwardedRound: null,
          nextSeasonResearch: createInitialNextSeasonResearch(),
          atrState: createInitialAtrState(),
          pendingPoachOffer: null,
          sparePartsInventory: createInitialSparePartsInventory(),
        });
      },

      closeOffSeasonModal: () => {
        set({ isOffSeasonModalOpen: false });
      },

      replacePowerUnitComponent: (carSlot, component) => {
        const state = get();
        const pus = state.carPowerUnits ?? createInitialCarPowerUnits();
        const target = { ...pus[carSlot] };
        let gridPenaltyAdded = 0;

        if (component === 'ICE') {
          target.iceUsed += 1;
          target.iceWear = 0;
          if (target.iceUsed > PU_SEASON_LIMIT_2026) {
            gridPenaltyAdded = 10;
          }
        } else if (component === 'MGUK') {
          target.mgukUsed += 1;
          target.mgukWear = 0;
          if (target.mgukUsed > PU_SEASON_LIMIT_2026) {
            gridPenaltyAdded = 10;
          }
        } else {
          target.gearboxUsed += 1;
          target.gearboxWear = 0;
          if (target.gearboxUsed > GEARBOX_SEASON_LIMIT_2026) {
            gridPenaltyAdded = 5;
          }
        }

        target.pendingGridPenalty += gridPenaltyAdded;

        set({
          carPowerUnits: {
            ...pus,
            [carSlot]: target,
          },
        });

        const unitNum =
          component === 'ICE'
            ? target.iceUsed
            : component === 'MGUK'
            ? target.mgukUsed
            : target.gearboxUsed;

        return {
          success: true,
          gridPenaltyAdded,
          message:
            gridPenaltyAdded > 0
              ? `${component} #${unitNum} dipasang pada ${carSlot.toUpperCase()} (melebihi kuota ${PU_SEASON_LIMIT_2026} unit — PENALTI +${gridPenaltyAdded} GRID pada balapan berikutnya!).`
              : `${component} #${unitNum}/${PU_SEASON_LIMIT_2026} baru dipasang pada ${carSlot.toUpperCase()} (0% keausan, bebas penalti grid).`,
        };
      },

      clearPendingGridPenalties: () => {
        const state = get();
        const pus = state.carPowerUnits ?? createInitialCarPowerUnits();
        set({
          carPowerUnits: {
            car1: { ...pus.car1, pendingGridPenalty: 0 },
            car2: { ...pus.car2, pendingGridPenalty: 0 },
          },
        });
      },

      completeRookieFp1: (carSlot, rookieDriverId) => {
        const state = get();
        if (state.rookieFp1UsedThisRound) {
          return {
            success: false,
            message: 'Anda sudah menurunkan pembalap Rookie FP1 pada seri akhir pekan ini.',
          };
        }
        const counts = state.rookieFp1Completed ?? { car1: 0, car2: 0 };
        if (counts[carSlot] >= ROOKIE_FP1_TARGET_PER_CAR) {
          return {
            success: false,
            message: `Kewajiban Rookie FP1 untuk ${carSlot.toUpperCase()} (2/2) sudah terpenuhi musim ini.`,
          };
        }

        const academyCandidate = rookieDriverId
          ? state.driverMarket.find((d) => d.id === rookieDriverId)
          : state.driverMarket.find((d) => d.isInPlayerAcademy) ??
            state.driverMarket.find(
              (d) =>
                !d.isOnF1Grid &&
                (d.category === 'F2_ACADEMY' || d.category === 'F3_ACADEMY' || d.category === 'RESERVE')
            );

        const nextMarket = academyCandidate
          ? state.driverMarket.map((d) =>
              d.id === academyCandidate.id
                ? {
                    ...d,
                    basePace: Math.min(d.potential, Number((d.basePace + 0.4).toFixed(1))),
                  }
                : d
            )
          : state.driverMarket;

        const nextCounts = {
          ...counts,
          [carSlot]: counts[carSlot] + 1,
        };

        set({
          rookieFp1Completed: nextCounts,
          rookieFp1UsedThisRound: true,
          driverMarket: nextMarket,
        });

        return {
          success: true,
          message: `Rookie FP1 selesai (${academyCandidate?.name ?? 'Academy Reserve'} di ${carSlot.toUpperCase()})! Kuota ${carSlot.toUpperCase()}: ${nextCounts[carSlot]}/${ROOKIE_FP1_TARGET_PER_CAR}.`,
        };
      },

      awardSprintPoints: (results) => {
        const state = get();
        const roundNumber = state.currentRoundIndex + 1;
        if (state.sprintPointsAwardedRound === roundNumber) {
          return false;
        }

        const sprintPtsByDriver: Record<string, number> = {};
        results.forEach((r) => {
          if (r.position >= 1 && r.position <= SPRINT_POINTS_2026.length) {
            sprintPtsByDriver[r.driverId] = SPRINT_POINTS_2026[r.position - 1] ?? 0;
          }
        });

        const updatedDriverStandings = state.driverStandings
          .map((d) => ({
            ...d,
            points: d.points + (sprintPtsByDriver[d.driverId] ?? 0),
          }))
          .sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums);

        const updatedConstructorStandings = state.constructorStandings
          .map((t) => {
            const teamSprintPts = results
              .filter((r) => r.teamId === t.teamId)
              .reduce((sum, r) => sum + (sprintPtsByDriver[r.driverId] ?? 0), 0);
            return {
              ...t,
              points: t.points + teamSprintPts,
            };
          })
          .sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums);

        set({
          driverStandings: updatedDriverStandings,
          constructorStandings: updatedConstructorStandings,
          sprintPointsAwardedRound: roundNumber,
        });

        return true;
      },

      manageStaff: (role, action) => {
        const state = get();
        const roster = state.staffRoster ?? createInitialStaffRoster();
        const current = roster[role];
        if (!current) {
          return { success: false, message: 'Data staf tidak ditemukan.' };
        }

        if (action === 'TRAIN') {
          const trainCost = 750_000;
          if (current.rating >= 99) {
            return { success: false, message: `${current.roleLabel} sudah mencapai rating maksimal (99).` };
          }
          if (state.budget < trainCost) {
            return { success: false, message: 'Anggaran tidak mencukupi ($0.75M diperlukan untuk training).' };
          }
          const updated: StaffMember = {
            ...current,
            rating: Math.min(99, current.rating + 2),
            mentality: Math.min(100, current.mentality + 4),
            level: Math.min(10, current.level + 1),
          };
          set({
            budget: state.budget - trainCost,
            staffRoster: { ...roster, [role]: updated },
          });
          const bonuses = get().getCarUpgradeBonuses();
          useRaceStore.getState().applyPlayerUpgrades(bonuses.paceBonus, bonuses.tyreMgmtBonus);
          return {
            success: true,
            message: `${updated.name} (${updated.roleLabel}) ditingkatkan ke Rating ${updated.rating}.`,
          };
        }

        const hireCost = 1_500_000;
        if (state.budget < hireCost) {
          return { success: false, message: 'Anggaran tidak mencukupi ($1.50M diperlukan untuk merekrut staf baru).' };
        }
        const candidates = STAFF_CANDIDATE_NAMES[role];
        const nextName =
          candidates.find((n) => n !== current.name) ?? `${current.roleLabel} Senior`;
        const hired: StaffMember = {
          ...current,
          name: nextName,
          rating: Math.min(99, Math.max(current.rating + 3, 82)),
          mentality: 85,
          salary: current.salary + 40_000,
          level: Math.min(10, current.level + 1),
        };
        set({
          budget: state.budget - hireCost,
          staffRoster: { ...roster, [role]: hired },
        });
        const bonuses = get().getCarUpgradeBonuses();
        useRaceStore.getState().applyPlayerUpgrades(bonuses.paceBonus, bonuses.tyreMgmtBonus);
        return {
          success: true,
          message: `Rekrut ${hired.name} sebagai ${hired.roleLabel} baru (Rating ${hired.rating}).`,
        };
      },

      manageFacility: (type, action) => {
        const state = get();
        const facs = state.facilities ?? createInitialFacilities();
        const target = facs[type];
        if (!target) {
          return { success: false, message: 'Fasilitas tidak ditemukan.' };
        }

        if (action === 'REFURBISH') {
          if (target.condition >= 100) {
            return { success: false, message: `${target.name} sudah dalam kondisi 100%.` };
          }
          if (state.budget < target.refurbishCost) {
            return { success: false, message: 'Anggaran tidak cukup untuk refurbish fasilitas.' };
          }
          const updated: FacilityState = { ...target, condition: 100 };
          set({
            budget: state.budget - target.refurbishCost,
            facilities: { ...facs, [type]: updated },
          });
          const bonuses = get().getCarUpgradeBonuses();
          useRaceStore.getState().applyPlayerUpgrades(bonuses.paceBonus, bonuses.tyreMgmtBonus);
          return { success: true, message: `${target.name} telah di-refurbish ke kondisi 100%.` };
        }

        if (target.level >= 5) {
          return { success: false, message: `${target.name} sudah berada di Level maksimal (Lv. 5).` };
        }
        if (state.budget < target.upgradeCost) {
          return { success: false, message: 'Anggaran tidak mencukupi untuk upgrade fasilitas.' };
        }
        const nextLevel = target.level + 1;
        const updated: FacilityState = {
          ...target,
          level: nextLevel,
          condition: 100,
          upgradeCost: Math.round(target.upgradeCost * 1.45),
        };
        set({
          budget: state.budget - target.upgradeCost,
          facilities: { ...facs, [type]: updated },
        });
        const bonuses = get().getCarUpgradeBonuses();
        useRaceStore.getState().applyPlayerUpgrades(bonuses.paceBonus, bonuses.tyreMgmtBonus);
        return {
          success: true,
          message: `${target.name} berhasil di-upgrade ke Level ${nextLevel}!`,
        };
      },

      setPitCrewTraining: (focus) => {
        const state = get();
        const crew = state.pitCrew ?? createInitialPitCrew();
        const nextCrew = {
          ...crew,
          trainingFocus: focus,
        };
        set({
          pitCrew: nextCrew,
        });
        useRaceStore
          .getState()
          .syncPitCrewAndMentalities(
            nextCrew.estimatedStopSeconds,
            nextCrew.errorChancePercent,
            state.driverMentalities ?? {}
          );
      },

      developPartWithAtr: (partName, mode, useAtrBoost) => {
        const state = get();
        const currentLevel = state.carParts[partName];
        if (currentLevel >= 10) {
          return { success: false, message: `${partName} sudah berada di Level 10 maksimal.` };
        }
        const baseCost = getUpgradeCostForLevel(currentLevel);
        const modeCostMult = mode === 'RUSHED' ? 1.5 : mode === 'INTENSIVE' ? 1.3 : 1.0;
        const totalCost = Math.round((baseCost * modeCostMult) / 50_000) * 50_000;
        const currentRdSpend = state.seasonRdSpending ?? 0;

        if (state.budget < totalCost) {
          return { success: false, message: 'Anggaran tim tidak mencukupi untuk pengembangan ini.' };
        }
        if (currentRdSpend + totalCost > COST_CAP_LIMIT_2026) {
          return { success: false, message: 'Melebihi batas FIA Cost Cap ($215.0M) musim ini!' };
        }

        const atr = state.atrState ?? createInitialAtrState();
        let nextAtr = atr;
        if (useAtrBoost) {
          if (atr.windTunnelHours < 8 || atr.cfdHours < 6) {
            return { success: false, message: 'Jam Wind Tunnel / CFD ATR periode ini tidak mencukupi (butuh 8h WT & 6h CFD).' };
          }
          nextAtr = {
            ...atr,
            windTunnelHours: atr.windTunnelHours - 8,
            cfdHours: atr.cfdHours - 6,
          };
        }

        const levelsGained =
          mode === 'INTENSIVE' || useAtrBoost
            ? Math.min(10, currentLevel + (mode === 'INTENSIVE' && useAtrBoost ? 2 : 1))
            : currentLevel + 1;

        const updatedParts: CarPartsState = {
          ...state.carParts,
          [partName]: levelsGained,
        };
        set({
          budget: state.budget - totalCost,
          seasonRdSpending: currentRdSpend + totalCost,
          carParts: updatedParts,
          atrState: nextAtr,
        });
        const bonuses = get().getCarUpgradeBonuses();
        useRaceStore.getState().applyPlayerUpgrades(bonuses.paceBonus, bonuses.tyreMgmtBonus);

        return {
          success: true,
          message: `Desain ${partName} (${mode}${useAtrBoost ? ' + ATR' : ''}) selesai! Naik ke Level ${levelsGained}.`,
        };
      },

      investNextSeasonResearch: (partName) => {
        const state = get();
        const research = state.nextSeasonResearch ?? createInitialNextSeasonResearch();
        if (research[partName] >= 100) {
          return { success: false, message: `Riset musim depan untuk ${partName} sudah mencapai 100%.` };
        }
        const cost = 2_000_000;
        const currentRdSpend = state.seasonRdSpending ?? 0;
        if (state.budget < cost) {
          return { success: false, message: 'Anggaran tidak mencukupi ($2.00M diperlukan untuk riset).' };
        }
        if (currentRdSpend + cost > COST_CAP_LIMIT_2026) {
          return { success: false, message: 'Melebihi batas FIA Cost Cap ($215.0M)!' };
        }

        const atr = state.atrState ?? createInitialAtrState();
        const wtBonus = atr.windTunnelHours >= 6 ? 8 : 0;
        const nextAtr = wtBonus > 0
          ? { ...atr, windTunnelHours: atr.windTunnelHours - 6, cfdHours: Math.max(0, atr.cfdHours - 4) }
          : atr;

        const nextProgress = Math.min(100, research[partName] + 25 + wtBonus);
        set({
          budget: state.budget - cost,
          seasonRdSpending: currentRdSpend + cost,
          nextSeasonResearch: { ...research, [partName]: nextProgress },
          atrState: nextAtr,
        });
        return {
          success: true,
          message: `Riset musim depan ${partName} meningkat menjadi ${nextProgress}%!`,
        };
      },

      setAffiliateFocus: (driverId, focus) => {
        const state = get();
        set({
          affiliateFocuses: {
            ...(state.affiliateFocuses ?? {}),
            [driverId]: focus,
          },
        });
      },

      resolvePoachOffer: (decision) => {
        const state = get();
        const offer = state.pendingPoachOffer;
        if (!offer) {
          return { success: false, message: 'Tidak ada tawaran pembajakan pembalap aktif.' };
        }

        if (decision === 'COUNTER') {
          const counterBonusCost = 850_000;
          if (state.budget < counterBonusCost) {
            return { success: false, message: 'Anggaran tidak cukup ($0.85M diperlukan untuk counter-offer).' };
          }
          const updatedMarket = state.driverMarket.map((m) =>
            m.id === offer.driverId ? { ...m, salaryPerRace: offer.rivalSalaryOffer } : m
          );
          set({
            budget: state.budget - counterBonusCost,
            driverMarket: updatedMarket,
            pendingPoachOffer: null,
          });
          return {
            success: true,
            message: `${offer.driverName} setuju bertahan setelah kontraknya dinaikkan!`,
          };
        }

        // RELEASE: Terima buyout dari tim rival & lepaskan dari Academy/Kursi
        const updatedMarket = state.driverMarket.map((m) =>
          m.id === offer.driverId
            ? { ...m, isInPlayerAcademy: false }
            : m
        );
        set({
          budget: state.budget + offer.buyoutOffer,
          driverMarket: updatedMarket,
          pendingPoachOffer: null,
        });
        return {
          success: true,
          message: `${offer.driverName} dilepas ke ${offer.rivalTeamName} (+$${(offer.buyoutOffer / 1_000_000).toFixed(2)}M buyout diterima).`,
        };
      },

      manufactureSparePart: (partType, isEmergency = false) => {
        const state = get();
        const spec = PART_MANUFACTURE_SPECS[partType];
        const cost = isEmergency ? spec.emergencyCost : spec.normalCost;
        const currentRdSpend = state.seasonRdSpending ?? 0;

        if (state.budget < cost) {
          return {
            success: false,
            message: `Anggaran tidak mencukupi ($${(cost / 1_000_000).toFixed(2)}M diperlukan untuk membuat ${spec.label}).`,
          };
        }
        if (currentRdSpend + cost > COST_CAP_LIMIT_2026) {
          return {
            success: false,
            message: 'Produksi suku cadang melewati batas FIA Cost Cap ($215.0M)!',
          };
        }

        const curInv = state.sparePartsInventory ?? createInitialSparePartsInventory();
        const nextStock = (curInv[partType] ?? 0) + 1;
        set({
          budget: state.budget - cost,
          seasonRdSpending: currentRdSpend + cost,
          sparePartsInventory: {
            ...curInv,
            [partType]: nextStock,
          },
        });

        return {
          success: true,
          message: `${spec.label} +1 berhasil diproduksi (${isEmergency ? 'Emergency Build' : 'Standard Build'})! Stok gudang: ${nextStock}.`,
        };
      },

      fitSparePartToDriverCar: (driverId, partType) => {
        const state = get();
        const spec = PART_MANUFACTURE_SPECS[partType];
        const curInv = state.sparePartsInventory ?? createInitialSparePartsInventory();
        const stock = curInv[partType] ?? 0;
        const raceState = useRaceStore.getState();
        const targetDriver = raceState.drivers.find((d) => d.id === driverId);

        if (!targetDriver) {
          return { success: false, message: 'Mobil pembalap tidak ditemukan.' };
        }
        const dmg = getDriverPartDamage(targetDriver)[partType] ?? 0;
        if (dmg <= 0) {
          return {
            success: false,
            message: `${spec.label} pada ${targetDriver.code} dalam kondisi 0% kerusakan.`,
          };
        }

        if (stock > 0) {
          set({
            sparePartsInventory: {
              ...curInv,
              [partType]: stock - 1,
            },
          });
          raceState.applyGaragePartRepair(driverId, partType, false);
          return {
            success: true,
            message: `${spec.label} cadangan dipasang pada ${targetDriver.code} (0% kerusakan • Sisa stok: ${stock - 1}).`,
          };
        }

        // Emergency Build & Fit jika stok gudang = 0
        const currentRdSpend = state.seasonRdSpending ?? 0;
        if (state.budget < spec.emergencyCost) {
          return {
            success: false,
            message: `Stok ${spec.label} habis (0) & anggaran tidak cukup untuk Emergency Manufacture ($${(spec.emergencyCost / 1_000_000).toFixed(2)}M).`,
          };
        }
        if (currentRdSpend + spec.emergencyCost > COST_CAP_LIMIT_2026) {
          return {
            success: false,
            message: `Stok ${spec.label} habis (0) & Emergency Build melewati batas FIA Cost Cap ($215.0M)!`,
          };
        }

        set({
          budget: state.budget - spec.emergencyCost,
          seasonRdSpending: currentRdSpend + spec.emergencyCost,
        });
        raceState.applyGaragePartRepair(driverId, partType, true);
        return {
          success: true,
          message: `Emergency Build & Fit ${spec.label} untuk ${targetDriver.code} (-$${(spec.emergencyCost / 1_000_000).toFixed(2)}M${raceState.parcFermeLocked ? ' • Parc Fermé Breach!' : ''}).`,
        };
      },

      fitAllDamagedPartsForDriver: (driverId) => {
        const raceDrivers = useRaceStore.getState().drivers;
        const targetDriver = raceDrivers.find((d) => d.id === driverId);
        if (!targetDriver) {
          return { success: false, message: 'Mobil pembalap tidak ditemukan.' };
        }
        const dmgMap = getDriverPartDamage(targetDriver);
        const damagedKeys = (Object.keys(dmgMap) as CarPhysicalPartType[]).filter(
          (k) => (dmgMap[k] ?? 0) > 0
        );
        if (damagedKeys.length === 0) {
          return { success: false, message: `Semua komponen ${targetDriver.code} sudah 100% utuh.` };
        }

        let repairedCount = 0;
        let lastFailure = '';
        for (const k of damagedKeys) {
          const res = get().fitSparePartToDriverCar(driverId, k);
          if (res.success) {
            repairedCount += 1;
          } else {
            lastFailure = res.message;
          }
        }

        if (repairedCount === 0) {
          return { success: false, message: lastFailure || 'Gagal memperbaiki komponen mobil.' };
        }
        return {
          success: true,
          message: `${repairedCount}/${damagedKeys.length} komponen rusak pada ${targetDriver.code} berhasil diganti!${lastFailure ? ` (${lastFailure})` : ''}`,
        };
      },

      selectRoundCircuit: (roundIndex: number) => {
        const state = get();
        if (roundIndex < 0 || roundIndex >= state.seasonCalendar.length) return;
        // PATCH 1: Pemain dilarang memilih sirkuit di luar urutan currentRoundIndex
        if (roundIndex !== state.currentRoundIndex) return;

        const targetCircuit = {
          ...state.seasonCalendar[roundIndex],
          optimalSetup: CIRCUIT_OPTIMAL_SETUPS[state.seasonCalendar[roundIndex].id],
        };
        const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
          state.carParts,
          state.engineSupplierId
        );

        useRaceStore.getState().loadCircuit(targetCircuit, paceBonus, tyreMgmtBonus);
        set({ currentRoundIndex: roundIndex });
      },

      resetCareer: () => {
        const defaultParts: CarPartsState = {
          aerodynamics: 1,
          chassis: 1,
          powertrain: 1,
          durability: 1,
        };
        const freshMarket = createInitialDriverMarket();
        const freshPerf = createInitialTeamPerformances();
        const defaultPlayerIds = freshMarket
          .filter((d) => d.isPlayerControlled)
          .map((d) => d.id);

        set({
          isTeamCreated: false,
          teamName: 'Scuderia Ferrari HP',
          teamColor: '#E8002D',
          engineSupplierId: 'ferrari',
          budget: 28_500_000,
          seasonNumber: 2026,
          currentRoundIndex: 0,
          seasonCalendar: SEASON_CALENDAR,
          carParts: defaultParts,
          driverStandings: createInitialDriverStandings(),
          constructorStandings: createInitialConstructorStandings(),
          raceHistory: [],
          hasClaimedCurrentRace: false,
          selectedSponsorId: 'sponsor-balanced',
          driverMarket: freshMarket,
          teamPerformances: freshPerf,
          isSeasonCompleted: false,
          offSeasonReport: null,
          isOffSeasonModalOpen: false,
          seasonRdSpending: 0,
          carPowerUnits: createInitialCarPowerUnits(),
          rookieFp1Completed: { car1: 0, car2: 0 },
          rookieFp1UsedThisRound: false,
          sprintPointsAwardedRound: null,
          staffRoster: createInitialStaffRoster(),
          facilities: createInitialFacilities(),
          pitCrew: createInitialPitCrew(),
          atrState: createInitialAtrState(),
          nextSeasonResearch: createInitialNextSeasonResearch(),
          boardState: createInitialBoardState(),
          driverMentalities: {},
          affiliateFocuses: {},
          pendingPoachOffer: null,
          sparePartsInventory: createInitialSparePartsInventory(),
        });

        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(CAREER_STORAGE_KEY);
        }

        useRaceStore
          .getState()
          .syncFromCareerState(
            SEASON_CALENDAR[0],
            defaultPlayerIds,
            0,
            0,
            'Scuderia Ferrari HP',
            '#E8002D',
            'MAIN_MENU',
            undefined,
            freshPerf
          );
      },

      exportSaveData: () => {
        if (typeof window === 'undefined') return;
        const state = get();

        const payload: CareerSavePayload = {
          version: 2,
          exportedAt: new Date().toISOString(),
          isTeamCreated: state.isTeamCreated,
          teamName: state.teamName,
          teamColor: state.teamColor,
          engineSupplierId: state.engineSupplierId,
          budget: state.budget,
          seasonNumber: state.seasonNumber,
          currentRoundIndex: state.currentRoundIndex,
          carParts: state.carParts,
          driverStandings: state.driverStandings,
          constructorStandings: state.constructorStandings,
          raceHistory: state.raceHistory,
          selectedSponsorId: state.selectedSponsorId,
          driverMarket: state.driverMarket,
          teamPerformances: state.teamPerformances,
        };

        const jsonStr = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `f1-manager-save-S${state.seasonNumber}-R${String(
          state.currentRoundIndex + 1
        ).padStart(2, '0')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },

      importSaveData: (jsonString: string) => {
        try {
          const parsed = JSON.parse(jsonString) as Partial<CareerSavePayload>;

          if (
            typeof parsed.budget !== 'number' ||
            typeof parsed.currentRoundIndex !== 'number' ||
            !parsed.carParts ||
            !Array.isArray(parsed.driverStandings) ||
            !Array.isArray(parsed.constructorStandings) ||
            !Array.isArray(parsed.driverMarket)
          ) {
            return {
              success: false,
              message: 'Format file JSON tidak valid atau bukan file save F1 Motorsport Manager.',
            };
          }

          const roundIdx = Math.max(
            0,
            Math.min(SEASON_CALENDAR.length - 1, parsed.currentRoundIndex)
          );
          const targetCircuit = SEASON_CALENDAR[roundIdx];
          const supplierId = parsed.engineSupplierId ?? 'ferrari';
          const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
            parsed.carParts,
            supplierId
          );
          const playerDriverIds = parsed.driverMarket
            .filter((d) => d.isPlayerControlled)
            .map((d) => d.id);
          const restoredTeamName = parsed.teamName ?? 'Scuderia Ferrari HP';
          const restoredTeamColor = parsed.teamColor ?? '#E8002D';

          const restoredTeamPerformances = parsed.teamPerformances ?? createInitialTeamPerformances();
          const activeGridDrivers = parsed.driverMarket.filter(
            (d) => d.isOnF1Grid || d.isPlayerControlled
          );
          const driverStatsMap: Record<string, { basePace: number; tyreManagement: number }> = {};
          parsed.driverMarket.forEach((d) => {
            driverStatsMap[d.id] = {
              basePace: d.basePace,
              tyreManagement: d.tyreManagement,
            };
          });

          set({
            isTeamCreated: parsed.isTeamCreated ?? true,
            teamName: restoredTeamName,
            teamColor: restoredTeamColor,
            engineSupplierId: supplierId,
            budget: parsed.budget,
            seasonNumber: parsed.seasonNumber ?? 2026,
            currentRoundIndex: roundIdx,
            carParts: parsed.carParts,
            driverStandings: parsed.driverStandings,
            constructorStandings: parsed.constructorStandings,
            raceHistory: Array.isArray(parsed.raceHistory) ? parsed.raceHistory : [],
            selectedSponsorId: parsed.selectedSponsorId ?? 'sponsor-balanced',
            driverMarket: parsed.driverMarket,
            teamPerformances: restoredTeamPerformances,
          });

          useRaceStore
            .getState()
            .syncFromCareerState(
              targetCircuit,
              playerDriverIds,
              paceBonus,
              tyreMgmtBonus,
              restoredTeamName,
              restoredTeamColor,
              'MEDIA_DAY',
              driverStatsMap,
              restoredTeamPerformances,
              activeGridDrivers
            );

          return {
            success: true,
            message: `Save data berhasil dipulihkan! (${restoredTeamName} • Musim ${
              parsed.seasonNumber ?? 2026
            } • Seri #${roundIdx + 1})`,
          };
        } catch {
          return {
            success: false,
            message: 'Gagal membaca file JSON. Pastikan file tidak rusak.',
          };
        }
      },
    }),
    {
      name: CAREER_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isTeamCreated: state.isTeamCreated,
        teamName: state.teamName,
        teamColor: state.teamColor,
        engineSupplierId: state.engineSupplierId,
        budget: state.budget,
        seasonNumber: state.seasonNumber,
        currentRoundIndex: state.currentRoundIndex,
        carParts: state.carParts,
        driverStandings: state.driverStandings,
        constructorStandings: state.constructorStandings,
        raceHistory: state.raceHistory,
        selectedSponsorId: state.selectedSponsorId,
        driverMarket: state.driverMarket,
        teamPerformances: state.teamPerformances,
        isSeasonCompleted: state.isSeasonCompleted,
        offSeasonReport: state.offSeasonReport,
        seasonRdSpending: state.seasonRdSpending,
        carPowerUnits: state.carPowerUnits,
        rookieFp1Completed: state.rookieFp1Completed,
        staffRoster: state.staffRoster,
        facilities: state.facilities,
        pitCrew: state.pitCrew,
        atrState: state.atrState,
        nextSeasonResearch: state.nextSeasonResearch,
        boardState: state.boardState,
        driverMentalities: state.driverMentalities,
        affiliateFocuses: state.affiliateFocuses,
        pendingPoachOffer: state.pendingPoachOffer,
        sparePartsInventory: state.sparePartsInventory,
      }),
      onRehydrateStorage: () => (rehydratedState) => {
        if (!rehydratedState) return;

        // Pastikan kalender 24 balapan resmi 2026 selalu terpasang
        rehydratedState.seasonCalendar = SEASON_CALENDAR;
        if (!rehydratedState.teamPerformances) {
          rehydratedState.teamPerformances = createInitialTeamPerformances();
        }
        if (!rehydratedState.staffRoster) rehydratedState.staffRoster = createInitialStaffRoster();
        if (!rehydratedState.facilities) rehydratedState.facilities = createInitialFacilities();
        if (!rehydratedState.pitCrew) rehydratedState.pitCrew = createInitialPitCrew();
        if (!rehydratedState.atrState) rehydratedState.atrState = createInitialAtrState();
        if (!rehydratedState.nextSeasonResearch) {
          rehydratedState.nextSeasonResearch = createInitialNextSeasonResearch();
        }
        if (!rehydratedState.boardState) rehydratedState.boardState = createInitialBoardState();
        if (!rehydratedState.driverMentalities) rehydratedState.driverMentalities = {};
        if (!rehydratedState.affiliateFocuses) rehydratedState.affiliateFocuses = {};
        if (!rehydratedState.sparePartsInventory) {
          rehydratedState.sparePartsInventory = createInitialSparePartsInventory();
        }

        // Cek apakah save lama sudah memiliki 22 pembalap F1 2026 + 20 pembalap EXTERNAL_DRIVERS_POOL (total 42 pembalap)
        const expectedTotalMarketSize =
          INITIAL_DRIVERS.length + EXTERNAL_DRIVERS_POOL.length;
        const hasAllOfficial2026AndExternalDrivers =
          Array.isArray(rehydratedState.driverMarket) &&
          rehydratedState.driverMarket.length === expectedTotalMarketSize &&
          rehydratedState.driverMarket.some((d) => d.id === 'colapinto') &&
          rehydratedState.driverMarket.some((d) => d.id === 'browning') &&
          rehydratedState.driverMarket.some((d) => d.id === 'palou') &&
          rehydratedState.driverMarket.some((d) => d.id === 'schumacher');

        if (!hasAllOfficial2026AndExternalDrivers) {
          const previousPlayerIds = Array.isArray(rehydratedState.driverMarket)
            ? rehydratedState.driverMarket
                .filter((d) => d.isPlayerControlled)
                .map((d) => d.id)
            : [];

          const freshMarket = createInitialDriverMarket();
          const validSavedPlayerIds = previousPlayerIds.filter((id) =>
            freshMarket.some((m) => m.id === id)
          );
          const finalPlayerIds =
            validSavedPlayerIds.length === 2
              ? validSavedPlayerIds
              : freshMarket.filter((m) => m.isPlayerControlled).map((m) => m.id);

          rehydratedState.driverMarket = freshMarket.map((entry) =>
            finalPlayerIds.includes(entry.id)
              ? {
                  ...entry,
                  category: 'F1_GRID' as DriverCategory,
                  isOnF1Grid: true,
                  teamName: rehydratedState.teamName || entry.teamName,
                  teamColor: rehydratedState.teamColor || entry.teamColor,
                  isPlayerControlled: true,
                }
              : {
                  ...entry,
                  isPlayerControlled: false,
                }
          );

          const oldPointsByDriver = new Map(
            (rehydratedState.driverStandings ?? []).map((s) => [s.driverId, s])
          );
          rehydratedState.driverStandings = rehydratedState.driverMarket
            .filter((m) => m.isOnF1Grid || m.isPlayerControlled)
            .map((m) => {
              const prev = oldPointsByDriver.get(m.id);
              return {
                driverId: m.id,
                name: m.name,
                code: m.code,
                number: m.number,
                teamId: m.teamId,
                teamName: m.teamName,
                teamColor: m.teamColor,
                points: prev?.points ?? 0,
                wins: prev?.wins ?? 0,
                podiums: prev?.podiums ?? 0,
                isPlayerControlled: m.isPlayerControlled,
              };
            });

          const oldPointsByTeam = new Map(
            (rehydratedState.constructorStandings ?? []).map((c) => [c.teamId, c])
          );
          rehydratedState.constructorStandings = createInitialConstructorStandings().map((c) => {
            const prev = oldPointsByTeam.get(c.teamId);
            return {
              ...c,
              teamName: c.isPlayerTeam ? rehydratedState.teamName || c.teamName : c.teamName,
              colorHex: c.isPlayerTeam ? rehydratedState.teamColor || c.colorHex : c.colorHex,
              points: prev?.points ?? 0,
              wins: prev?.wins ?? 0,
              podiums: prev?.podiums ?? 0,
            };
          });
        }

        // Migrasi otomatis save lama Custom Team yang sebelumnya menimpa salah satu tim resmi (11 tim -> 12 tim / 24 mobil)
        const matchesOfficialTeam = INITIAL_TEAMS.some(
          (t) =>
            t.name.trim().toLowerCase() ===
            (rehydratedState.teamName ?? '').trim().toLowerCase()
        );
        const alreadyHasCustomTeam = (rehydratedState.constructorStandings ?? []).some(
          (c) => c.teamId === CUSTOM_TEAM_ID
        );

        if (rehydratedState.isTeamCreated && !matchesOfficialTeam && !alreadyHasCustomTeam) {
          const customName = rehydratedState.teamName || 'Apex Grand Prix';
          const customColor = rehydratedState.teamColor || '#FF8000';

          // 1. Pindahkan pembalap pemain ke CUSTOM_TEAM_ID
          let migratedMarket: DriverMarketEntry[] = rehydratedState.driverMarket.map((entry) =>
            entry.isPlayerControlled
              ? {
                  ...entry,
                  category: 'F1_GRID' as DriverCategory,
                  isOnF1Grid: true,
                  isInPlayerAcademy: false,
                  teamId: CUSTOM_TEAM_ID,
                  teamName: customName,
                  teamColor: customColor,
                }
              : entry
          );

          // 2. Pastikan seluruh 11 tim resmi F1 memiliki 2 pembalap AI di grid
          const takenIds = new Set<string>();
          for (const officialTeam of INITIAL_TEAMS) {
            const currentAiSeats = migratedMarket.filter(
              (m) => m.isOnF1Grid && !m.isPlayerControlled && m.teamId === officialTeam.id
            );
            currentAiSeats.forEach((s) => takenIds.add(s.id));

            let needed = Math.max(0, 2 - currentAiSeats.length);
            if (needed > 0) {
              // Prioritaskan pembalap asli tim ini yang sebelumnya tersingkir saat slot tim tertimpa
              const originalSeeds = INITIAL_DRIVERS.filter((s) => s.teamId === officialTeam.id);
              for (const orig of originalSeeds) {
                if (needed <= 0) break;
                const candidate = migratedMarket.find(
                  (m) =>
                    m.id === orig.id &&
                    !m.isPlayerControlled &&
                    !m.isOnF1Grid &&
                    !takenIds.has(m.id)
                );
                if (candidate) {
                  takenIds.add(candidate.id);
                  migratedMarket = migratedMarket.map((m) =>
                    m.id === candidate.id
                      ? {
                          ...m,
                          category: 'F1_GRID' as DriverCategory,
                          isOnF1Grid: true,
                          teamId: officialTeam.id,
                          teamName: officialTeam.name,
                          teamColor: officialTeam.colorHex,
                        }
                      : m
                  );
                  needed -= 1;
                }
              }

              // Jika masih kurang (karena pembalap asli tim dibajak pemain), isi dari kandidat external terbaik
              if (needed > 0) {
                const topExternals = migratedMarket
                  .filter(
                    (m) => !m.isOnF1Grid && !m.isPlayerControlled && !takenIds.has(m.id)
                  )
                  .sort(
                    (a, b) =>
                      b.basePace * 0.65 +
                      b.tyreManagement * 0.35 -
                      (a.basePace * 0.65 + a.tyreManagement * 0.35)
                  );
                for (const ext of topExternals) {
                  if (needed <= 0) break;
                  takenIds.add(ext.id);
                  migratedMarket = migratedMarket.map((m) =>
                    m.id === ext.id
                      ? {
                          ...m,
                          category: 'F1_GRID' as DriverCategory,
                          isOnF1Grid: true,
                          teamId: officialTeam.id,
                          teamName: officialTeam.name,
                          teamColor: officialTeam.colorHex,
                        }
                      : m
                  );
                  needed -= 1;
                }
              }
            }
          }

          rehydratedState.driverMarket = migratedMarket;

          // 3. Pulihkan seluruh 11 Constructor Resmi + tambahkan Custom Team sebagai tim ke-12
          const oldPlayerConstructor = (rehydratedState.constructorStandings ?? []).find(
            (c) => c.isPlayerTeam
          );
          const prevConstructorById = new Map(
            (rehydratedState.constructorStandings ?? []).map((c) => [c.teamId, c])
          );

          rehydratedState.constructorStandings = [
            ...INITIAL_TEAMS.map((t) => {
              const prev = prevConstructorById.get(t.id);
              const wasOverwritten = prev?.isPlayerTeam === true;
              return {
                teamId: t.id,
                teamName: t.name,
                colorHex: t.colorHex,
                points: wasOverwritten ? 0 : prev?.points ?? 0,
                wins: wasOverwritten ? 0 : prev?.wins ?? 0,
                podiums: wasOverwritten ? 0 : prev?.podiums ?? 0,
                isPlayerTeam: false,
              };
            }),
            {
              teamId: CUSTOM_TEAM_ID,
              teamName: customName,
              colorHex: customColor,
              points: oldPlayerConstructor?.points ?? 0,
              wins: oldPlayerConstructor?.wins ?? 0,
              podiums: oldPlayerConstructor?.podiums ?? 0,
              isPlayerTeam: true,
            },
          ].sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums);

          // 4. Sinkronkan Driver Standings menjadi 24 pembalap aktif di grid
          const oldDriverPoints = new Map(
            (rehydratedState.driverStandings ?? []).map((s) => [s.driverId, s])
          );
          rehydratedState.driverStandings = migratedMarket
            .filter((m) => m.isOnF1Grid || m.isPlayerControlled)
            .map((m) => {
              const prev = oldDriverPoints.get(m.id);
              return {
                driverId: m.id,
                name: m.name,
                code: m.code,
                number: m.number,
                teamId: m.teamId,
                teamName: m.teamName,
                teamColor: m.teamColor,
                points: prev?.points ?? 0,
                wins: prev?.wins ?? 0,
                podiums: prev?.podiums ?? 0,
                isPlayerControlled: m.isPlayerControlled,
              };
            })
            .sort((a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums);

          // 5. Pastikan performa mobil Custom Team terdaftar
          const customPerfByEngine: Record<EngineSupplierId, number> = {
            mercedes: 88,
            rbpt: 87,
            ferrari: 87,
            audi: 85,
            honda: 84,
          };
          rehydratedState.teamPerformances = {
            ...createInitialTeamPerformances(),
            ...rehydratedState.teamPerformances,
            [CUSTOM_TEAM_ID]:
              rehydratedState.teamPerformances?.[CUSTOM_TEAM_ID] ??
              customPerfByEngine[rehydratedState.engineSupplierId ?? 'ferrari'] ??
              86,
          };
        }

        const roundIdx = Math.max(
          0,
          Math.min(SEASON_CALENDAR.length - 1, rehydratedState.currentRoundIndex ?? 0)
        );
        const circuit = SEASON_CALENDAR[roundIdx];
        const { paceBonus, tyreMgmtBonus } = calculateBonusesFromParts(
          rehydratedState.carParts,
          rehydratedState.engineSupplierId ?? 'ferrari'
        );
        const activeGridDrivers = rehydratedState.driverMarket.filter(
          (d) => d.isOnF1Grid || d.isPlayerControlled
        );
        const playerIds = activeGridDrivers
          .filter((d) => d.isPlayerControlled)
          .map((d) => d.id);
        const driverStatsMap: Record<string, { basePace: number; tyreManagement: number }> = {};
        rehydratedState.driverMarket.forEach((d) => {
          driverStatsMap[d.id] = {
            basePace: d.basePace,
            tyreManagement: d.tyreManagement,
          };
        });

        useRaceStore
          .getState()
          .syncFromCareerState(
            circuit,
            playerIds,
            paceBonus,
            tyreMgmtBonus,
            rehydratedState.teamName,
            rehydratedState.teamColor,
            'MAIN_MENU',
            driverStatsMap,
            rehydratedState.teamPerformances,
            activeGridDrivers
          );
      },
    }
  )
);
