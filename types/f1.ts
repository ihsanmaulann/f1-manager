export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTER' | 'WET';

export type PaceMode = 'PUSH' | 'STANDARD' | 'CONSERVE';

export type ERSMode = 'DEPLOY' | 'NEUTRAL' | 'HARVEST';

export type OvertakeAggression = 'LOW' | 'MEDIUM' | 'HIGH';

export type DefendMode = 'PASSIVE' | 'NORMAL' | 'ALWAYS';

export type MentalityStateLabel = 'ENTHUSIASTIC' | 'POSITIVE' | 'NEUTRAL' | 'LOW' | 'DEMORALISED';

export type WeatherType = 'DRY' | 'LIGHT_RAIN' | 'HEAVY_RAIN';

export type FlagStatus = 'GREEN' | 'YELLOW' | 'VSC' | 'SC' | 'RED';

export type DriverStatus = 'RUNNING' | 'DNF' | 'RETIRED';

/**
 * Kategori kejuaraan asal pembalap untuk sistem Driver Academy & Global Scouting (Upgrade 5):
 */
export type DriverCategory =
  | 'F1_GRID'
  | 'F2_ACADEMY'
  | 'F3_ACADEMY'
  | 'INDYCAR'
  | 'WEC_HYPERCAR'
  | 'RESERVE';

export interface ExternalDriverCandidate {
  id: string;
  name: string;
  code: string;
  number: number;
  age: number;
  category: DriverCategory;
  currentSeriesTeam: string;
  teamColor: string;
  basePace: number;
  tyreManagement: number;
  potential: number;
  marketValue: number;
  salary: number;
  academyCost?: number;
}

/**
 * Alur sesi akhir pekan balapan (Patch 2):
 * 'MAIN_MENU' -> 'HQ' -> 'MEDIA_DAY' -> 'FREE_PRACTICE' -> 'QUALIFYING' -> 'PRE_RACE_STRATEGY' -> 'RACE' -> 'POST_RACE'
 */
export type SessionPhase =
  | 'MAIN_MENU'
  | 'HQ'
  | 'MEDIA_DAY'
  | 'FREE_PRACTICE'
  | 'SPRINT_QUALIFYING'
  | 'SPRINT_RACE'
  | 'QUALIFYING'
  | 'PRE_RACE_STRATEGY'
  | 'RACE'
  | 'POST_RACE';

export type PracticeSessionType = 'FP1' | 'FP2' | 'FP3';

export type QualifyingStage = 'Q1' | 'Q2' | 'Q3';

/** Status warna sektor mikro F1 TV Broadcast: PURPLE (Overall Fastest), GREEN (Personal Best), YELLOW (Slow/Slower), NONE (Belum ada waktu) */
export type SectorPerformance = 'PURPLE' | 'GREEN' | 'YELLOW' | 'NONE';

export interface PracticeStandingEntry {
  driverId: string;
  name: string;
  code: string;
  number: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  position: number;
  bestLapTime: number;
  gapToLeader: number;
  lapsCompleted: number;
  tyreCompound: TyreCompound;
  isOnTrack: boolean;
  setupConfidence: number;
  isPlayerControlled: boolean;
  sectorStatuses?: [SectorPerformance, SectorPerformance, SectorPerformance];
  personalBestSectors?: [number, number, number];
}

export type QualiRunPhase = 'IN_GARAGE' | 'OUT_LAP' | 'FLYING_LAP' | 'IN_LAP' | 'ELIMINATED';

export interface QualifyingDriverStageState {
  driverId: string;
  runPhase: QualiRunPhase;
  tyreCompound: TyreCompound;
  runsCompleted: number;
  q1Time: number;
  q2Time: number;
  q3Time: number;
  currentStageBestTime: number;
  sector1: number;
  sector2: number;
  sector3: number;
  sectorStatuses?: [SectorPerformance, SectorPerformance, SectorPerformance];
  personalBestSectors?: [number, number, number];
  trafficEncountered: boolean;
  eliminatedIn?: 'Q1' | 'Q2';
  lockedGridPosition?: number;
}

export type MediaDayChoiceType = 'CONFIDENT' | 'HUMBLE' | 'SPONSOR';

export interface MediaDayBuffs {
  /** Bonus kecepatan di sesi Kualifikasi (detik, +0.15s per jawaban Confident) */
  qualyPaceBonusSeconds: number;
  /** Pengurangan risiko crash/spin/wingDamage (0.0 - 0.75, +0.25 per jawaban Humble) */
  consistencyCrashReduction: number;
  /** Pengurangan durasi pit stop akhir pekan ini (detik, -0.2s per jawaban Praise R&D/Sponsors) */
  pitStopTimeReductionSeconds: number;
  /** Total uang bonus sponsor instan yang diperoleh di Media Day ($) */
  sponsorBonusEarned: number;
  /** Jumlah jawaban Confident/Aggressive (menuntut ekspektasi tinggi di Race) */
  highExpectationCount: number;
  /** Reputasi Tim saat ini (0 - 100%) */
  teamReputation: number;
  /** Jawaban yang telah dipilih untuk masing-masing pertanyaan (0, 1, 2) */
  answeredQuestions: Record<number, MediaDayChoiceType>;
}

export interface PracticeRunTelemetry {
  id: string;
  driverId: string;
  driverCode: string;
  driverName: string;
  runNumber: number;
  tyreCompound: TyreCompound;
  lapsCompleted: number;
  bestLapTime: number;
  avgLapTime: number;
  setupConfidence: number;
  tyreWearPerLap: number;
  endingTyreHealth: number;
  fuelBurnPerLap: number;
  setupSnapshot: CarSetup;
  parameterFeedback: {
    frontWing: 'OPTIMAL' | 'TOO_LOW' | 'TOO_HIGH';
    rearWing: 'OPTIMAL' | 'TOO_LOW' | 'TOO_HIGH';
    suspension: 'OPTIMAL' | 'TOO_SOFT' | 'TOO_STIFF';
    brakeBias: 'OPTIMAL' | 'TOO_REARWARD' | 'TOO_FORWARD';
  };
}

/**
 * Profil iklim realistis untuk setiap sirkuit di kalender F1 2026:
 * - DESERT_DRY: (Bahrain, Saudi Arabia, Qatar, Abu Dhabi) -> 99% Cerah (DRY), hampir tidak pernah hujan.
 * - TROPICAL_CHANGEABLE: (Spa-Francorchamps, Silverstone, Interlagos, Suzuka, Montreal) -> Bisa full cerah, full hujan, atau transisi cerah <-> hujan.
 * - MEDITERRANEAN_WARM: (Monza, Barcelona, Imola, Monaco) -> Mayoritas cerah, peluang hujan kecil (~15%).
 */
export type ClimateProfile = 'DESERT_DRY' | 'TROPICAL_CHANGEABLE' | 'MEDITERRANEAN_WARM';

export interface WeatherForecastItem {
  lap: number;
  weather: WeatherType;
  rainProbability: number; // 0 - 100%
  /** Estimasi akumulasi kebasahan trek (0 - 100%) pada lap tersebut berdasarkan inersia cuaca */
  projectedWetness?: number;
}

/**
 * Representasi 1 entri pada weatherTimeline dari Lap 1 s/d Total Laps
 * yang di-generate sebelum balapan dimulai berdasarkan climateProfile sirkuit.
 */
export type WeatherTimelineEntry = WeatherForecastItem;

/**
 * Konfigurasi inersia transisi kebasahan lintasan (Natural Weather Transition):
 * - maxWetnessGainPerLap: Kenaikan maksimum trackWetness per lap saat hujan (+1.5% / lap)
 * - maxDryingRatePerLap: Penurunan maksimum trackWetness per lap saat cuaca kembali DRY (-1.0% / lap)
 */
export interface WeatherTransitionConfig {
  maxWetnessGainPerLap: number;
  maxDryingRatePerLap: number;
}

export interface CarSetup {
  /** Sudut sayap depan (1 = Low Drag, 10 = Max Downforce) */
  frontWingAngle: number;
  /** Sudut sayap belakang (1 = Low Drag, 10 = Max Downforce) */
  rearWingAngle: number;
  /** Kekakuan suspensi (1 = Soft, 10 = Stiff) */
  suspensionStiffness: number;
  /** Distribusi pengereman depan/belakang (50% - 60%) */
  brakeBias: number;
}

export interface TyreCompoundSpec {
  compound: TyreCompound;
  label: string;
  shortCode: 'S' | 'M' | 'H' | 'I' | 'W';
  /** Bonus kecepatan per lap dalam detik (nilai negatif = lebih cepat dari baseline HARD) */
  gripBonus: number;
  /** Persentase pengurangan tyreHealth dasar per lap (0 - 100 scale) */
  degradationRate: number;
  /** Rentang kelembaban lintasan (0 - 100%) di mana ban ini bekerja optimal */
  optimalWetnessRange: [number, number];
  /** Warna hex representasi ban di UI */
  colorHex: string;
}

export type RDPhilosophy =
  | 'CONSISTENT_GIANT'
  | 'HIGH_RISK_VOLATILE'
  | 'DEVELOPING_CHALLENGER';

export interface TeamInfo {
  id: string;
  name: string;
  colorHex: string;
  secondaryColorHex: string;
  carPerformance: number; // 80 - 99
  powerUnit?: string;
  rdPhilosophy: RDPhilosophy;
  isPlayerTeam: boolean;
}

export interface CircuitInfo {
  id: string;
  name: string;
  officialName: string;
  country: string;
  totalLaps: number;
  lengthKm: number;
  /** Profil iklim sirkuit untuk menentukan generasi weatherTimeline sebelum balapan */
  climateProfile: ClimateProfile;
  /** Waktu lap dasar dalam detik (kondisi kering, bahan bakar kosong, ban Hard baru) */
  baseLapTime: number;
  /** Waktu yang hilang saat melakukan pit stop dalam detik (pit lane + stationary) */
  pitLossTime: number;
  /** Tingkat keausan ban di sirkuit ini (multiplier, 1.0 = normal) */
  tyreWearMultiplier: number;
  /** Konsumsi bahan bakar rata-rata per lap (kg) */
  fuelConsumptionPerLap: number;
  /** Zona Active Aero & Manual Override Mode 2026 dalam persentase trackProgress [start, end] */
  drsZones: Array<[number, number]>;
  /** Alias resmi 2026 Active Aero X-Mode / Manual Override Activation Zones */
  activeAeroZones?: Array<[number, number]>;
  /** Apakah seri ini menggunakan format Sprint Weekend resmi F1 2026 (6 seri/musim) */
  isSprintWeekend?: boolean;
  /** Setup optimal tersembunyi untuk sirkuit ini */
  optimalSetup?: CarSetup;
}

export interface DriverState {
  id: string;
  name: string;
  /** Kode 3 huruf pembalap (misal: 'VER', 'LEC', 'HAM', 'HER') */
  code: string;
  number: number;
  teamId: string;
  teamName: string;
  /** Warna hex tim (misal: '#E8002D') */
  teamColor: string;
  /** Kecepatan dasar murni pembalap (75 - 99) */
  basePace: number;
  /** Kemampuan menjaga keausan ban (75 - 99) */
  tyreManagement: number;
  /** Usia pembalap (Upgrade 5) */
  age?: number;
  /** Batas maksimal perkembangan skill pembalap (85 - 99) (Upgrade 5) */
  potential?: number;
  /** Kategori seri kejuaraan pembalap (Upgrade 5) */
  category?: DriverCategory;
  /** Nilai kontrak / buyout pasar pembalap (USD) (Upgrade 5) */
  marketValue?: number;
  /** Gaji per seri balapan (USD) (Upgrade 5) */
  salary?: number;
  /** Posisi di lintasan saat ini (1 - 22 pada grid F1 2026) */
  position: number;
  /** Lap saat ini */
  currentLap: number;
  /** Persentase posisi di lap saat ini (0 - 100) */
  trackProgress: number;
  /** Total waktu balapan yang telah ditempuh dalam detik */
  totalTimeElapsed: number;
  /** Selisih waktu dengan pemimpin balapan dalam detik (0 untuk P1) */
  gapToLeader: number;
  /** Selisih waktu dengan mobil tepat di depannya dalam detik (0 untuk P1) */
  interval: number;
  /** Waktu lap terakhir dalam detik (0 jika belum menyelesaikan lap) */
  lastLapTime: number;
  /** Waktu lap terbaik sepanjang balapan dalam detik (0 jika belum menyelesaikan lap) */
  bestLapTime: number;
  /** Kompon ban yang sedang digunakan */
  tyreCompound: TyreCompound;
  /** Daftar seluruh kompon ban unik yang telah dipakai pembalap selama balapan (Aturan FIA Wajib 2 Kompon Kering) */
  usedCompounds?: TyreCompound[];
  /** Kondisi kesehatan ban saat ini (0 - 100%) */
  tyreHealth: number;
  /** Usia ban saat ini dalam jumlah lap */
  tyreAge: number;
  /** Kapasitas baterai ERS saat ini (0 - 100%) */
  ersBattery: number;
  /** Sisa bahan bakar di tangki dalam kilogram (kg) */
  fuelLoad: number;
  /** Mode kecepatan mengemudi saat ini */
  paceMode: PaceMode;
  /** Mode penggunaan energi ERS saat ini */
  ersMode: ERSMode;
  /** Status apakah mobil sedang berada di pit lane */
  isInPit: boolean;
  /** Perintah strategi apakah pembalap akan masuk pit di akhir lap ini */
  boxThisLap: boolean;
  /** Kompon ban yang disiapkan untuk pit stop berikutnya */
  nextTyreCompound: TyreCompound;
  /** Jumlah pit stop yang sudah dilakukan */
  pitStopsCount: number;
  /** Kerusakan sayap depan (0 - 100%), memperlambat mobil & menambah +4.5s saat pit stop jika diperbaiki */
  wingDamage: number;
  /** Kerusakan lengkap 6 komponen fisik mobil (0 - 100% per part) ala F1 Manager 24 */
  partDamage?: CarPartDamageMap;
  /** Opsi strategi apakah kru pit akan memperbaiki Front Wing (+4.5s) pada pit stop berikutnya */
  repairWingOnNextPit: boolean;
  /** Status balapan pembalap ('RUNNING' | 'DNF' | 'RETIRED') */
  status: DriverStatus;
  /** Apakah pembalap ini dikendalikan oleh pemain (tim milik player) */
  isPlayerControlled: boolean;
  /** Preferensi setup mobil unik milik pembalap ini berdasarkan gaya balapnya (Patch 1) */
  driverOptimalSetup?: CarSetup;
  /** Indikator warna 3 sektor mikro F1 TV Broadcast (Ungu / Hijau / Kuning) */
  sectorStatuses?: [SectorPerformance, SectorPerformance, SectorPerformance];
  /** Catatan waktu sektor terbaik pribadi pembalap [S1, S2, S3] dalam detik */
  personalBestSectors?: [number, number, number];
  /** Akumulasi penalti waktu balapan dari FIA Stewards (+5s / +10s) */
  timePenaltySeconds?: number;
  /** Penalti mundur posisi start grid akibat pergantian PU/Gearbox melebihi kuota musim */
  gridPenaltyPositions?: number;
  /** Penyebab DNF (Crash, Mechanical PU, Gearbox, atau Voluntary Retire) */
  dnfReason?: string;
  /** F1 Manager 24 Tactical Directives & Driver Mentality */
  overtakeAggression?: OvertakeAggression;
  defendMode?: DefendMode;
  letTeammatePass?: boolean;
  avoidHighRiskKerbs?: boolean;
  mentality?: number;
}

export type CarPhysicalPartType =
  | 'frontWing'
  | 'rearWing'
  | 'floor'
  | 'sidepods'
  | 'suspension'
  | 'chassis';

export type CarPartDamageMap = Record<CarPhysicalPartType, number>;
export type SparePartsInventoryMap = Record<CarPhysicalPartType, number>;

export type TyreAllocationMap = Record<TyreCompound, number>;

export interface CarPowerUnitState {
  iceUsed: number;
  iceWear: number; // 0 - 100
  mgukUsed: number;
  mgukWear: number; // 0 - 100
  gearboxUsed: number;
  gearboxWear: number; // 0 - 100
  pendingGridPenalty: number;
}

export interface SprintResultEntry {
  driverId: string;
  name: string;
  code: string;
  number: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  position: number;
  gapToLeader: number;
  pointsAwarded: number;
  tyreCompound: TyreCompound;
  isPlayerControlled: boolean;
}

/**
 * Entri riwayat telemetri per-lap khusus pembalap tim milik pemain (Player Controlled).
 */
export interface PlayerLapTelemetryEntry {
  driverId: string;
  driverCode: string;
  driverName: string;
  teamColor: string;
  lap: number;
  lapTime: number;
  position: number;
  gapToLeader: number;
  tyreCompound: TyreCompound;
  tyreHealth: number;
  tyreAge: number;
  fuelLoad: number;
  ersBattery: number;
  paceMode: PaceMode;
  ersMode: ERSMode;
  flagStatus: FlagStatus;
  weather: WeatherType;
  pitInLap: boolean;
  sectorStatuses?: [SectorPerformance, SectorPerformance, SectorPerformance];
}

export type TeamRadioTriggerCategory =
  | 'STRATEGY'
  | 'TACTICS'
  | 'PIT_CALL'
  | 'PIT_EXIT'
  | 'DAMAGE'
  | 'TRACK_OUT'
  | 'SESSION_FINISH'
  | 'RACE_FINISH';

/**
 * Pesan Team Radio dua arah (Race Engineer putih di kiri, Pembalap berwarna tim di kanan).
 */
export interface TeamRadioMessage {
  id: string;
  driverId: string;
  driverName: string;
  driverSurname: string;
  driverCode: string;
  driverNumber: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  lap: number;
  sessionLabel: string;
  category: TeamRadioTriggerCategory;
  engineerMessage: string;
  driverMessage: string;
  createdAt: number;
}
