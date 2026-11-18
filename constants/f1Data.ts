import {
  CarSetup,
  CircuitInfo,
  ClimateProfile,
  DriverCategory,
  DriverState,
  ERSMode,
  ExternalDriverCandidate,
  PaceMode,
  TeamInfo,
  TyreCompound,
  TyreCompoundSpec,
  WeatherTimelineEntry,
  WeatherTransitionConfig,
  WeatherType,
} from '../types/f1';

/**
 * Versi skema Roster & Kalender Resmi F1 2026 (11 Tim Resmi + opsi Tim ke-12, 24 Balapan).
 * Digunakan untuk auto-migrate data localStorage lama agar 22 pembalap & 24 sirkuit 2026 langsung aktif.
 */
export const F1_2026_DATA_VERSION = 202602;

/**
 * Regulasi Teknis F1 2026: Bahan bakar 100% Sustainable E-Fuel dibatasi maksimal 75 kg per balapan
 * (turun dari batas lama 110 kg), dengan laju konsumsi energi termal ~72% dari era sebelumnya.
 */
export const MAX_FUEL_LOAD_2026_KG = 75;
export const FUEL_BURN_SCALE_2026 = 0.72;

/** Poin Sprint Race resmi F1 2026 (Top 8: 8-7-6-5-4-3-2-1) */
export const SPRINT_POINTS_2026 = [8, 7, 6, 5, 4, 3, 2, 1];

/** Batas FIA Cost Cap pengeluaran R&D per musim (USD) */
export const COST_CAP_LIMIT_2026 = 215_000_000;

/** Kuota maksimal komponen Power Unit & Gearbox per mobil per musim sebelum kena Grid Penalty */
export const PU_SEASON_LIMIT_2026 = 4;
export const GEARBOX_SEASON_LIMIT_2026 = 4;

/** Kewajiban Rookie FP1 per mobil per musim (2x per mobil = 4x total/musim) */
export const ROOKIE_FP1_TARGET_PER_CAR = 2;

/** Alokasi set ban standar akhir pekan per pembalap (F1 Weekend Tyre Allocation) */
export const DEFAULT_WEEKEND_TYRE_ALLOCATION: Record<TyreCompound, number> = {
  SOFT: 8,
  MEDIUM: 3,
  HARD: 2,
  INTER: 4,
  WET: 3,
};

export const getCircuitActiveAeroZones = (circuit: CircuitInfo): Array<[number, number]> =>
  circuit.activeAeroZones ?? circuit.drsZones;

export const getCircuitFuelBurn2026 = (circuit: CircuitInfo): number =>
  Number((circuit.fuelConsumptionPerLap * FUEL_BURN_SCALE_2026).toFixed(2));

export const getStandardFuelLoad2026 = (circuit: CircuitInfo): number =>
  Number(
    Math.min(
      MAX_FUEL_LOAD_2026_KG,
      circuit.totalLaps * circuit.fuelConsumptionPerLap * FUEL_BURN_SCALE_2026 + 1.5
    ).toFixed(1)
  );

/**
 * Konfigurasi inersia transisi cuaca natural (Upgrade 1):
 * - Saat hujan (LIGHT_RAIN / HEAVY_RAIN), trackWetness naik maksimal +1.5% per lap.
 * - Saat hujan berhenti (DRY), trackWetness mengering maksimal -1.0% per lap.
 */
export const WEATHER_TRANSITION_CONFIG: WeatherTransitionConfig = {
  maxWetnessGainPerLap: 1.5,
  maxDryingRatePerLap: 1.0,
};

/**
 * Metadata deskriptif untuk setiap ClimateProfile sirkuit.
 */
export const CLIMATE_PROFILE_SPECS: Record<
  ClimateProfile,
  {
    label: string;
    rainChanceSummary: string;
    description: string;
  }
> = {
  DESERT_DRY: {
    label: 'Desert / Arid (99% Dry)',
    rainChanceSummary: '1% Rain Chance',
    description:
      'Iklim gurun/kering (Bahrain, Jeddah, Baku, Las Vegas, Qatar, Abu Dhabi) — 99% cerah sepanjang balapan.',
  },
  MEDITERRANEAN_WARM: {
    label: 'Mediterranean / Warm (85% Dry)',
    rainChanceSummary: '15% Rain Chance',
    description:
      'Iklim hangat (Albert Park, Monaco, Barcelona, Hungaroring, Monza, Madrid, Austin, Mexico) — mayoritas cerah, peluang hujan 15%.',
  },
  TROPICAL_CHANGEABLE: {
    label: 'Changeable / Microclimate (55% Rain)',
    rainChanceSummary: 'High Rain / Dynamic Fronts',
    description:
      'Iklim mikro dinamis (Shanghai, Suzuka, Miami, Montreal, Austria, Silverstone, Spa, Zandvoort, Singapore, Interlagos) — transisi cuaca aktif.',
  },
};

/**
 * Konfigurasi spesifikasi tiap TyreCompound.
 * - gripBonus: Pengurangan waktu per lap dalam detik dibanding baseline (semakin negatif = semakin cepat).
 * - degradationRate: Persentase keausan ban dasar per lap.
 * - optimalWetnessRange: Rentang tingkat kebasahan trek (0% kering - 100% badai) di mana ban bekerja optimal.
 * - colorHex: Warna standar F1 Pirelli untuk indikator visual.
 */
export const TYRE_SPECS: Record<TyreCompound, TyreCompoundSpec> = {
  SOFT: {
    compound: 'SOFT',
    label: 'Soft (C5)',
    shortCode: 'S',
    gripBonus: -1.35,
    degradationRate: 3.4,
    optimalWetnessRange: [0, 10],
    colorHex: '#EF4444', // Merah
  },
  MEDIUM: {
    compound: 'MEDIUM',
    label: 'Medium (C4)',
    shortCode: 'M',
    gripBonus: -0.65,
    degradationRate: 2.1,
    optimalWetnessRange: [0, 15],
    colorHex: '#EAB308', // Kuning
  },
  HARD: {
    compound: 'HARD',
    label: 'Hard (C3)',
    shortCode: 'H',
    gripBonus: 0.0,
    degradationRate: 1.25,
    optimalWetnessRange: [0, 15],
    colorHex: '#F8FAFC', // Putih
  },
  INTER: {
    compound: 'INTER',
    label: 'Intermediate',
    shortCode: 'I',
    gripBonus: 2.8, // Lebih lambat di trek kering, namun optimal saat trek lembab/basah
    degradationRate: 1.9,
    optimalWetnessRange: [15, 65],
    colorHex: '#22C55E', // Hijau
  },
  WET: {
    compound: 'WET',
    label: 'Full Wet',
    shortCode: 'W',
    gripBonus: 6.2, // Sangat lambat di trek kering, namun wajib saat genangan air tinggi
    degradationRate: 1.6,
    optimalWetnessRange: [60, 100],
    colorHex: '#3B82F6', // Biru
  },
};

/**
 * Modifikator PaceMode terhadap waktu lap (detik), pengali degradasi ban, dan pengali konsumsi bensin.
 */
export const PACE_MODE_MODIFIERS: Record<
  PaceMode,
  { lapTimeDelta: number; tyreWearMultiplier: number; fuelBurnMultiplier: number }
> = {
  PUSH: {
    lapTimeDelta: -0.45,
    tyreWearMultiplier: 1.35,
    fuelBurnMultiplier: 1.2,
  },
  STANDARD: {
    lapTimeDelta: 0.0,
    tyreWearMultiplier: 1.0,
    fuelBurnMultiplier: 1.0,
  },
  CONSERVE: {
    lapTimeDelta: 0.55,
    tyreWearMultiplier: 0.72,
    fuelBurnMultiplier: 0.82,
  },
};

/**
 * Modifikator ERSMode (2026 Active Aero & Manual Override Mode) terhadap waktu lap (detik) dan baterai per lap (%):
 * - HARVEST: Mengisi ulang baterai MGU-K (+15% / lap)
 * - NEUTRAL: Mode seimbang Z-Mode / X-Mode Active Aero
 * - DEPLOY: Manual OVERRIDE BOOST (pengganti DRS di regulasi F1 2026, memberikan ekstra daya listrik 350kW)
 */
export const ERS_MODE_MODIFIERS: Record<
  ERSMode,
  { lapTimeDelta: number; batteryDeltaPerLap: number; label2026: string }
> = {
  DEPLOY: {
    lapTimeDelta: -0.45,
    batteryDeltaPerLap: -18,
    label2026: 'OVERRIDE BOOST',
  },
  NEUTRAL: {
    lapTimeDelta: 0.0,
    batteryDeltaPerLap: -2,
    label2026: 'NEUTRAL',
  },
  HARVEST: {
    lapTimeDelta: 0.35,
    batteryDeltaPerLap: 15,
    label2026: 'HARVEST',
  },
};

/**
 * Setup mobil standar awal (netral) sebelum dituning oleh pemain.
 */
export const DEFAULT_CAR_SETUP: CarSetup = {
  frontWingAngle: 5,
  rearWingAngle: 5,
  suspensionStiffness: 5,
  brakeBias: 55,
};

/**
 * Konfigurasi "Optimal Setup" tersembunyi untuk ke-24 sirkuit di kalender resmi F1 2026.
 */
export const CIRCUIT_OPTIMAL_SETUPS: Record<string, CarSetup> = {
  australia: {
    frontWingAngle: 6,
    rearWingAngle: 5,
    suspensionStiffness: 6,
    brakeBias: 56,
  },
  china: {
    frontWingAngle: 6,
    rearWingAngle: 6,
    suspensionStiffness: 6,
    brakeBias: 55,
  },
  suzuka: {
    frontWingAngle: 8,
    rearWingAngle: 7,
    suspensionStiffness: 8,
    brakeBias: 54,
  },
  bahrain: {
    frontWingAngle: 5,
    rearWingAngle: 5,
    suspensionStiffness: 6,
    brakeBias: 56,
  },
  jeddah: {
    frontWingAngle: 3,
    rearWingAngle: 3,
    suspensionStiffness: 7,
    brakeBias: 55,
  },
  miami: {
    frontWingAngle: 5,
    rearWingAngle: 4,
    suspensionStiffness: 6,
    brakeBias: 56,
  },
  montreal: {
    frontWingAngle: 4,
    rearWingAngle: 4,
    suspensionStiffness: 5,
    brakeBias: 58,
  },
  monaco: {
    frontWingAngle: 10,
    rearWingAngle: 10,
    suspensionStiffness: 3,
    brakeBias: 53,
  },
  barcelona: {
    frontWingAngle: 7,
    rearWingAngle: 7,
    suspensionStiffness: 7,
    brakeBias: 55,
  },
  austria: {
    frontWingAngle: 5,
    rearWingAngle: 5,
    suspensionStiffness: 7,
    brakeBias: 56,
  },
  silverstone: {
    frontWingAngle: 7,
    rearWingAngle: 7,
    suspensionStiffness: 8,
    brakeBias: 55,
  },
  spa: {
    frontWingAngle: 4,
    rearWingAngle: 4,
    suspensionStiffness: 7,
    brakeBias: 56,
  },
  hungary: {
    frontWingAngle: 9,
    rearWingAngle: 9,
    suspensionStiffness: 5,
    brakeBias: 54,
  },
  zandvoort: {
    frontWingAngle: 8,
    rearWingAngle: 8,
    suspensionStiffness: 8,
    brakeBias: 55,
  },
  monza: {
    frontWingAngle: 2,
    rearWingAngle: 2,
    suspensionStiffness: 6,
    brakeBias: 57,
  },
  madrid: {
    frontWingAngle: 7,
    rearWingAngle: 6,
    suspensionStiffness: 6,
    brakeBias: 55,
  },
  baku: {
    frontWingAngle: 3,
    rearWingAngle: 2,
    suspensionStiffness: 5,
    brakeBias: 57,
  },
  singapore: {
    frontWingAngle: 9,
    rearWingAngle: 9,
    suspensionStiffness: 4,
    brakeBias: 54,
  },
  cota: {
    frontWingAngle: 7,
    rearWingAngle: 6,
    suspensionStiffness: 7,
    brakeBias: 55,
  },
  mexico: {
    frontWingAngle: 8,
    rearWingAngle: 8,
    suspensionStiffness: 5,
    brakeBias: 56,
  },
  interlagos: {
    frontWingAngle: 6,
    rearWingAngle: 6,
    suspensionStiffness: 5,
    brakeBias: 55,
  },
  'las-vegas': {
    frontWingAngle: 2,
    rearWingAngle: 2,
    suspensionStiffness: 6,
    brakeBias: 57,
  },
  lusail: {
    frontWingAngle: 7,
    rearWingAngle: 6,
    suspensionStiffness: 8,
    brakeBias: 54,
  },
  'yas-marina': {
    frontWingAngle: 6,
    rearWingAngle: 5,
    suspensionStiffness: 6,
    brakeBias: 56,
  },
};

/**
 * Menghasilkan idealSetup (driverOptimalSetup) yang unik untuk setiap pembalap berdasarkan gaya balapnya (Patch 1):
 * - Pembalap 1 / Gaya Agresif Oversteer: butuh Front Wing lebih tinggi (+1 s/d +2 poin), suspensi sedikit lebih kaku (+1), dan Brake Bias lebih ke depan (+1% s/d +2%).
 * - Pembalap 2 / Gaya Smooth Rear-Stability: butuh Rear Wing lebih stabil (+1 poin), Front Wing sedikit lebih rendah (-1 poin), suspensi lebih lembut (-1), dan Brake Bias lebih ke belakang (-1% s/d -2%).
 */
export const generateDriverOptimalSetup = (
  circuit: CircuitInfo,
  driver: {
    id: string;
    number?: number;
    basePace?: number;
    tyreManagement?: number;
  },
  carSlotIndex = 0
): CarSetup => {
  const baseCircuitOptimal: CarSetup =
    circuit.optimalSetup ??
    CIRCUIT_OPTIMAL_SETUPS[circuit.id] ??
    CIRCUIT_OPTIMAL_SETUPS.australia;

  // Tentukan karakteristik gaya balap dari kombinasi nomor mobil / rasio Pace vs Tyre Mgmt / slot mobil (Car 1 vs Car 2)
  const hashSeed = driver.id
    .split('')
    .reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  const isAggressiveOversteerStyle =
    carSlotIndex === 0 || (driver.basePace ?? 90) > (driver.tyreManagement ?? 90) + 1;

  if (isAggressiveOversteerStyle) {
    // Gaya Agresif / Pointy Front-End: Front Wing lebih tinggi (+2 poin), Brake Bias lebih ke depan (+2%)
    const frontDelta = (hashSeed % 2) + 1; // +1 atau +2
    const rearDelta = hashSeed % 2 === 0 ? 0 : -1;
    const suspDelta = 1;
    const biasDelta = (hashSeed % 2) + 1; // +1% atau +2%

    return {
      frontWingAngle: Math.max(1, Math.min(10, baseCircuitOptimal.frontWingAngle + frontDelta)),
      rearWingAngle: Math.max(1, Math.min(10, baseCircuitOptimal.rearWingAngle + rearDelta)),
      suspensionStiffness: Math.max(
        1,
        Math.min(10, baseCircuitOptimal.suspensionStiffness + suspDelta)
      ),
      brakeBias: Math.max(50, Math.min(60, baseCircuitOptimal.brakeBias + biasDelta)),
    };
  }

  // Gaya Smooth / Planted Rear-End (Rekan Setim): Front Wing lebih rendah (-1), Rear Wing +1, Suspensi lebih lembut (-1), Brake Bias ke belakang (-1% s/d -2%)
  const frontDelta = -1;
  const rearDelta = 1;
  const suspDelta = -1;
  const biasDelta = -((hashSeed % 2) + 1); // -1% atau -2%

  return {
    frontWingAngle: Math.max(1, Math.min(10, baseCircuitOptimal.frontWingAngle + frontDelta)),
    rearWingAngle: Math.max(1, Math.min(10, baseCircuitOptimal.rearWingAngle + rearDelta)),
    suspensionStiffness: Math.max(
      1,
      Math.min(10, baseCircuitOptimal.suspensionStiffness + suspDelta)
    ),
    brakeBias: Math.max(50, Math.min(60, baseCircuitOptimal.brakeBias + biasDelta)),
  };
};

/**
 * Menghitung persentase kecocokan setup (setupConfidence: 0 - 100%)
 * berdasarkan selisih antara setup pilihan pemain dan driverOptimalSetup unik pembalap (atau optimalSetup sirkuit).
 */
export const calculateSetupConfidence = (
  playerSetup: CarSetup,
  circuit: CircuitInfo,
  driverOptimalSetup?: CarSetup
): number => {
  const optimal: CarSetup =
    driverOptimalSetup ??
    circuit.optimalSetup ??
    CIRCUIT_OPTIMAL_SETUPS[circuit.id] ??
    CIRCUIT_OPTIMAL_SETUPS.australia;

  const frontWingError = Math.abs(playerSetup.frontWingAngle - optimal.frontWingAngle) / 9;
  const rearWingError = Math.abs(playerSetup.rearWingAngle - optimal.rearWingAngle) / 9;
  const suspensionError =
    Math.abs(playerSetup.suspensionStiffness - optimal.suspensionStiffness) / 9;
  const brakeBiasError = Math.abs(playerSetup.brakeBias - optimal.brakeBias) / 10;

  const weightedError =
    frontWingError * 0.3 +
    rearWingError * 0.3 +
    suspensionError * 0.25 +
    brakeBiasError * 0.15;

  const confidence = Math.max(0, Math.min(100, (1 - weightedError) * 100));
  return Number(confidence.toFixed(1));
};

/**
 * Helper Badge Indikator Kondisi Lintasan berdasarkan persentase kebasahan trek (Patch 1):
 * - 0% - 15% Wetness: Badge Hijau "TRACK: DRY (SLICK TYRES OPTIMAL)"
 * - 16% - 54% Wetness: Badge Biru Muda "TRACK: DAMP / WET (INTERMEDIATES OPTIMAL - CROSSOVER ZONE)"
 * - 55% - 100% Wetness: Badge Biru Tua "TRACK: MONSOON / STANDING WATER (FULL WETS REQUIRED)"
 */
export const getTrackConditionBadge = (trackWetness: number) => {
  if (trackWetness >= 55) {
    return {
      label: 'TRACK: MONSOON / STANDING WATER (FULL WETS REQUIRED)',
      shortLabel: 'MONSOON (WETS REQUIRED)',
      recommendedTyre: 'FULL WET (W)',
      badgeClass: 'bg-blue-900/80 text-blue-100 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.45)]',
      dotClass: 'bg-blue-400',
    };
  }
  if (trackWetness >= 16) {
    return {
      label: 'TRACK: DAMP / WET (INTERMEDIATES OPTIMAL - CROSSOVER ZONE)',
      shortLabel: 'DAMP / WET (INTERS OPTIMAL)',
      recommendedTyre: 'INTERMEDIATE (I)',
      badgeClass: 'bg-sky-500/25 text-sky-200 border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.3)]',
      dotClass: 'bg-sky-400',
    };
  }
  return {
    label: 'TRACK: DRY (SLICK TYRES OPTIMAL)',
    shortLabel: 'DRY (SLICKS OPTIMAL)',
    recommendedTyre: 'SLICK (SOFT / MEDIUM / HARD)',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    dotClass: 'bg-emerald-400',
  };
};

/**
 * Kalender Lengkap 24 Sirkuit Resmi F1 Musim 2026 (Termasuk Sirkuit Baru Madrid - Madring Street Circuit):
 * 1. Australia (Albert Park, 58 Laps) - MEDITERRANEAN_WARM
 * 2. China (Shanghai, 56 Laps) - TROPICAL_CHANGEABLE
 * 3. Japan (Suzuka, 53 Laps) - TROPICAL_CHANGEABLE
 * 4. Bahrain (Sakhir, 57 Laps) - DESERT_DRY
 * 5. Saudi Arabia (Jeddah, 50 Laps) - DESERT_DRY
 * 6. Miami (Miami Autodrome, 57 Laps) - TROPICAL_CHANGEABLE
 * 7. Canada (Gilles-Villeneuve, 70 Laps) - TROPICAL_CHANGEABLE
 * 8. Monaco (Monte Carlo, 78 Laps) - MEDITERRANEAN_WARM
 * 9. Barcelona-Catalunya (Barcelona, 66 Laps) - MEDITERRANEAN_WARM
 * 10. Austria (Red Bull Ring, 71 Laps) - TROPICAL_CHANGEABLE
 * 11. Great Britain (Silverstone, 52 Laps) - TROPICAL_CHANGEABLE
 * 12. Belgium (Spa-Francorchamps, 44 Laps) - TROPICAL_CHANGEABLE
 * 13. Hungary (Hungaroring, 70 Laps) - MEDITERRANEAN_WARM
 * 14. Netherlands (Zandvoort, 72 Laps) - TROPICAL_CHANGEABLE
 * 15. Italy (Monza, 53 Laps) - MEDITERRANEAN_WARM
 * 16. Spain - Madrid (Madring Street Circuit, 55 Laps) - MEDITERRANEAN_WARM
 * 17. Azerbaijan (Baku, 51 Laps) - DESERT_DRY
 * 18. Singapore (Marina Bay, 62 Laps) - TROPICAL_CHANGEABLE
 * 19. USA (COTA Austin, 56 Laps) - MEDITERRANEAN_WARM
 * 20. Mexico (Hermanos Rodriguez, 71 Laps) - MEDITERRANEAN_WARM
 * 21. Brazil (Interlagos, 71 Laps) - TROPICAL_CHANGEABLE
 * 22. Las Vegas (Las Vegas Strip, 50 Laps) - DESERT_DRY
 * 23. Qatar (Lusail, 57 Laps) - DESERT_DRY
 * 24. Abu Dhabi (Yas Marina, 58 Laps) - DESERT_DRY
 */
export const F1_2026_CIRCUITS: CircuitInfo[] = [
  {
    id: 'australia',
    name: 'Albert Park Circuit',
    officialName: 'Australian Grand Prix — Melbourne',
    country: 'Australia',
    totalLaps: 58,
    lengthKm: 5.278,
    climateProfile: 'MEDITERRANEAN_WARM',
    baseLapTime: 79.8,
    pitLossTime: 21.2,
    tyreWearMultiplier: 1.05,
    fuelConsumptionPerLap: 1.68,
    drsZones: [
      [12, 24],
      [62, 74],
      [86, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.australia,
  },
  {
    id: 'china',
    name: 'Shanghai International Circuit',
    officialName: 'Chinese Grand Prix — Shanghai',
    country: 'China',
    totalLaps: 56,
    lengthKm: 5.451,
    climateProfile: 'TROPICAL_CHANGEABLE',
    isSprintWeekend: true,
    baseLapTime: 94.2,
    pitLossTime: 23.2,
    tyreWearMultiplier: 1.24,
    fuelConsumptionPerLap: 1.76,
    drsZones: [
      [54, 72],
      [86, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.china,
  },
  {
    id: 'suzuka',
    name: 'Suzuka International Racing Course',
    officialName: 'Japanese Grand Prix — Suzuka',
    country: 'Japan',
    totalLaps: 53,
    lengthKm: 5.807,
    climateProfile: 'TROPICAL_CHANGEABLE',
    baseLapTime: 90.5,
    pitLossTime: 22.8,
    tyreWearMultiplier: 1.3,
    fuelConsumptionPerLap: 1.84,
    drsZones: [[86, 98]],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.suzuka,
  },
  {
    id: 'bahrain',
    name: 'Bahrain International Circuit (Sakhir)',
    officialName: 'Bahrain Grand Prix — Sakhir',
    country: 'Bahrain',
    totalLaps: 57,
    lengthKm: 5.412,
    climateProfile: 'DESERT_DRY',
    baseLapTime: 91.2,
    pitLossTime: 23.5,
    tyreWearMultiplier: 1.25,
    fuelConsumptionPerLap: 1.72,
    drsZones: [
      [8, 20],
      [55, 66],
      [86, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.bahrain,
  },
  {
    id: 'jeddah',
    name: 'Jeddah Corniche Circuit',
    officialName: 'Saudi Arabian Grand Prix — Jeddah',
    country: 'Saudi Arabia',
    totalLaps: 50,
    lengthKm: 6.174,
    climateProfile: 'DESERT_DRY',
    baseLapTime: 89.4,
    pitLossTime: 21.0,
    tyreWearMultiplier: 0.92,
    fuelConsumptionPerLap: 1.92,
    drsZones: [
      [32, 44],
      [62, 74],
      [86, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.jeddah,
  },
  {
    id: 'miami',
    name: 'Miami International Autodrome',
    officialName: 'Miami Grand Prix — Hard Rock Stadium',
    country: 'Miami (USA)',
    totalLaps: 57,
    lengthKm: 5.412,
    climateProfile: 'TROPICAL_CHANGEABLE',
    isSprintWeekend: true,
    baseLapTime: 89.8,
    pitLossTime: 21.5,
    tyreWearMultiplier: 1.08,
    fuelConsumptionPerLap: 1.72,
    drsZones: [
      [34, 48],
      [68, 82],
      [88, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.miami,
  },
  {
    id: 'montreal',
    name: 'Circuit Gilles-Villeneuve',
    officialName: 'Canadian Grand Prix — Montreal',
    country: 'Canada',
    totalLaps: 70,
    lengthKm: 4.361,
    climateProfile: 'TROPICAL_CHANGEABLE',
    isSprintWeekend: true,
    baseLapTime: 73.4,
    pitLossTime: 19.8,
    tyreWearMultiplier: 0.96,
    fuelConsumptionPerLap: 1.41,
    drsZones: [
      [58, 72],
      [84, 97],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.montreal,
  },
  {
    id: 'monaco',
    name: 'Circuit de Monaco (Monte Carlo)',
    officialName: 'Grand Prix de Monaco — Monte Carlo',
    country: 'Monaco',
    totalLaps: 78,
    lengthKm: 3.337,
    climateProfile: 'MEDITERRANEAN_WARM',
    baseLapTime: 72.9,
    pitLossTime: 19.5,
    tyreWearMultiplier: 0.75,
    fuelConsumptionPerLap: 1.22,
    drsZones: [[88, 98]],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.monaco,
  },
  {
    id: 'barcelona',
    name: 'Circuit de Barcelona-Catalunya',
    officialName: 'Gran Premio de Barcelona-Catalunya',
    country: 'Barcelona-Catalunya',
    totalLaps: 66,
    lengthKm: 4.657,
    climateProfile: 'MEDITERRANEAN_WARM',
    baseLapTime: 76.2,
    pitLossTime: 21.8,
    tyreWearMultiplier: 1.32,
    fuelConsumptionPerLap: 1.48,
    drsZones: [
      [42, 54],
      [85, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.barcelona,
  },
  {
    id: 'austria',
    name: 'Red Bull Ring (Spielberg)',
    officialName: 'Austrian Grand Prix — Spielberg',
    country: 'Austria',
    totalLaps: 71,
    lengthKm: 4.318,
    climateProfile: 'TROPICAL_CHANGEABLE',
    baseLapTime: 67.2,
    pitLossTime: 20.4,
    tyreWearMultiplier: 1.06,
    fuelConsumptionPerLap: 1.38,
    drsZones: [
      [14, 28],
      [38, 50],
      [84, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.austria,
  },
  {
    id: 'silverstone',
    name: 'Silverstone Circuit',
    officialName: 'British Grand Prix — Silverstone',
    country: 'Great Britain',
    totalLaps: 52,
    lengthKm: 5.891,
    climateProfile: 'TROPICAL_CHANGEABLE',
    isSprintWeekend: true,
    baseLapTime: 87.9,
    pitLossTime: 20.5,
    tyreWearMultiplier: 1.28,
    fuelConsumptionPerLap: 1.88,
    drsZones: [
      [25, 36],
      [68, 80],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.silverstone,
  },
  {
    id: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    officialName: 'Belgian Grand Prix — Spa-Francorchamps',
    country: 'Belgium',
    totalLaps: 44,
    lengthKm: 7.004,
    climateProfile: 'TROPICAL_CHANGEABLE',
    baseLapTime: 106.4,
    pitLossTime: 23.0,
    tyreWearMultiplier: 1.22,
    fuelConsumptionPerLap: 2.2,
    drsZones: [
      [18, 32],
      [86, 97],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.spa,
  },
  {
    id: 'hungary',
    name: 'Hungaroring',
    officialName: 'Hungarian Grand Prix — Budapest',
    country: 'Hungary',
    totalLaps: 70,
    lengthKm: 4.381,
    climateProfile: 'MEDITERRANEAN_WARM',
    baseLapTime: 77.6,
    pitLossTime: 20.8,
    tyreWearMultiplier: 1.12,
    fuelConsumptionPerLap: 1.4,
    drsZones: [
      [12, 22],
      [86, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.hungary,
  },
  {
    id: 'zandvoort',
    name: 'Circuit Zandvoort',
    officialName: 'Dutch Grand Prix — Zandvoort',
    country: 'Netherlands',
    totalLaps: 72,
    lengthKm: 4.259,
    climateProfile: 'TROPICAL_CHANGEABLE',
    isSprintWeekend: true,
    baseLapTime: 72.4,
    pitLossTime: 21.0,
    tyreWearMultiplier: 1.26,
    fuelConsumptionPerLap: 1.37,
    drsZones: [
      [54, 65],
      [85, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.zandvoort,
  },
  {
    id: 'monza',
    name: 'Autodromo Nazionale Monza',
    officialName: 'Italian Grand Prix — Monza',
    country: 'Italy',
    totalLaps: 53,
    lengthKm: 5.793,
    climateProfile: 'MEDITERRANEAN_WARM',
    baseLapTime: 81.5,
    pitLossTime: 22.0,
    tyreWearMultiplier: 0.95,
    fuelConsumptionPerLap: 1.85,
    drsZones: [
      [12, 24],
      [84, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.monza,
  },
  {
    id: 'madrid',
    name: 'Madring Street Circuit (IFEMA Madrid)',
    officialName: 'Spanish Grand Prix — Madrid (New 2026)',
    country: 'Spain - Madrid',
    totalLaps: 55,
    lengthKm: 5.474,
    climateProfile: 'MEDITERRANEAN_WARM',
    baseLapTime: 92.6,
    pitLossTime: 21.4,
    tyreWearMultiplier: 1.14,
    fuelConsumptionPerLap: 1.75,
    drsZones: [
      [28, 41],
      [84, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.madrid,
  },
  {
    id: 'baku',
    name: 'Baku City Circuit',
    officialName: 'Azerbaijan Grand Prix — Baku',
    country: 'Azerbaijan',
    totalLaps: 51,
    lengthKm: 6.003,
    climateProfile: 'DESERT_DRY',
    baseLapTime: 103.2,
    pitLossTime: 20.6,
    tyreWearMultiplier: 0.94,
    fuelConsumptionPerLap: 1.9,
    drsZones: [
      [14, 25],
      [78, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.baku,
  },
  {
    id: 'singapore',
    name: 'Marina Bay Street Circuit',
    officialName: 'Singapore Airlines Grand Prix — Marina Bay',
    country: 'Singapore',
    totalLaps: 62,
    lengthKm: 4.94,
    climateProfile: 'TROPICAL_CHANGEABLE',
    isSprintWeekend: true,
    baseLapTime: 91.8,
    pitLossTime: 24.5,
    tyreWearMultiplier: 1.18,
    fuelConsumptionPerLap: 1.6,
    drsZones: [
      [22, 34],
      [64, 75],
      [86, 97],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.singapore,
  },
  {
    id: 'cota',
    name: 'Circuit of The Americas (COTA Austin)',
    officialName: 'United States Grand Prix — Austin',
    country: 'USA',
    totalLaps: 56,
    lengthKm: 5.513,
    climateProfile: 'MEDITERRANEAN_WARM',
    baseLapTime: 95.4,
    pitLossTime: 21.8,
    tyreWearMultiplier: 1.26,
    fuelConsumptionPerLap: 1.76,
    drsZones: [
      [52, 68],
      [86, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.cota,
  },
  {
    id: 'mexico',
    name: 'Autódromo Hermanos Rodríguez',
    officialName: 'Gran Premio de la Ciudad de México',
    country: 'Mexico',
    totalLaps: 71,
    lengthKm: 4.304,
    climateProfile: 'MEDITERRANEAN_WARM',
    baseLapTime: 78.4,
    pitLossTime: 22.2,
    tyreWearMultiplier: 1.04,
    fuelConsumptionPerLap: 1.38,
    drsZones: [
      [18, 30],
      [82, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.mexico,
  },
  {
    id: 'interlagos',
    name: 'Autódromo José Carlos Pace (Interlagos)',
    officialName: 'São Paulo Grand Prix — Interlagos',
    country: 'Brazil',
    totalLaps: 71,
    lengthKm: 4.309,
    climateProfile: 'TROPICAL_CHANGEABLE',
    baseLapTime: 71.8,
    pitLossTime: 21.2,
    tyreWearMultiplier: 1.08,
    fuelConsumptionPerLap: 1.38,
    drsZones: [
      [22, 35],
      [84, 98],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.interlagos,
  },
  {
    id: 'las-vegas',
    name: 'Las Vegas Strip Circuit',
    officialName: 'Las Vegas Grand Prix — The Strip',
    country: 'Las Vegas (USA)',
    totalLaps: 50,
    lengthKm: 6.201,
    climateProfile: 'DESERT_DRY',
    baseLapTime: 93.5,
    pitLossTime: 20.8,
    tyreWearMultiplier: 0.9,
    fuelConsumptionPerLap: 1.94,
    drsZones: [
      [24, 36],
      [62, 86],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS['las-vegas'],
  },
  {
    id: 'lusail',
    name: 'Lusail International Circuit',
    officialName: 'Qatar Airways Grand Prix — Lusail',
    country: 'Qatar',
    totalLaps: 57,
    lengthKm: 5.419,
    climateProfile: 'DESERT_DRY',
    baseLapTime: 83.2,
    pitLossTime: 24.0,
    tyreWearMultiplier: 1.35,
    fuelConsumptionPerLap: 1.74,
    drsZones: [[85, 98]],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS.lusail,
  },
  {
    id: 'yas-marina',
    name: 'Yas Marina Circuit',
    officialName: 'Abu Dhabi Grand Prix — Yas Island',
    country: 'Abu Dhabi',
    totalLaps: 58,
    lengthKm: 5.281,
    climateProfile: 'DESERT_DRY',
    baseLapTime: 85.4,
    pitLossTime: 21.6,
    tyreWearMultiplier: 1.05,
    fuelConsumptionPerLap: 1.69,
    drsZones: [
      [34, 48],
      [54, 67],
    ],
    optimalSetup: CIRCUIT_OPTIMAL_SETUPS['yas-marina'],
  },
];

/**
 * Data Sirkuit Default Pembuka Musim F1 2026: Australia (Albert Park, 58 Laps)
 */
export const DEFAULT_CIRCUIT: CircuitInfo = F1_2026_CIRCUITS[0];

/**
 * Generator Pre-Race Weather Timeline (Lap 1 s/d Total Laps) berdasarkan `climateProfile` sirkuit.
 * Menghasilkan pola cuaca berkesinambungan (weather fronts/stints) SEBELUM balapan dimulai,
 * sehingga cuaca tidak berubah-ubah secara acak tiap tick dan mematuhi batas inersia:
 * - Saat hujan: trackWetness naik maksimal +1.5% per lap.
 * - Saat kering: trackWetness turun maksimal -1.0% per lap.
 */
export const generateWeatherTimeline = (
  circuit: CircuitInfo
): WeatherTimelineEntry[] => {
  const totalLaps = Math.max(1, circuit.totalLaps);
  const profile = circuit.climateProfile;
  const lapWeathers: WeatherType[] = new Array(totalLaps).fill('DRY');

  const scenarioRoll = Math.random();

  if (profile === 'DESERT_DRY') {
    // 99% Cerah (DRY) sepanjang balapan
    if (scenarioRoll >= 0.99) {
      const startLapIdx = Math.floor(totalLaps * 0.35);
      const duration = Math.min(14, totalLaps - startLapIdx);
      for (let i = startLapIdx; i < startLapIdx + duration; i++) {
        lapFrontAssign(lapWeathers, i, 'LIGHT_RAIN');
      }
    }
  } else if (profile === 'MEDITERRANEAN_WARM') {
    // Mayoritas cerah (85%), peluang hujan 15% dalam 1 blok front hujan yang konsisten
    if (scenarioRoll < 0.15) {
      const rainStart = Math.max(4, Math.floor(totalLaps * (0.2 + Math.random() * 0.35)));
      const rainDuration = Math.max(14, Math.floor(totalLaps * (0.3 + Math.random() * 0.25)));
      const rainEnd = Math.min(totalLaps, rainStart + rainDuration);

      for (let i = rainStart; i < rainEnd; i++) {
        const progressInFront = (i - rainStart) / Math.max(1, rainEnd - rainStart);
        const isHeavyPeak =
          rainDuration >= 18 && progressInFront > 0.35 && progressInFront < 0.7;
        lapFrontAssign(lapWeathers, i, isHeavyPeak ? 'HEAVY_RAIN' : 'LIGHT_RAIN');
      }
    }
  } else {
    // TROPICAL_CHANGEABLE
    if (scenarioRoll < 0.35) {
      // Full DRY
    } else if (scenarioRoll < 0.65) {
      const rainStart = Math.max(5, Math.floor(totalLaps * (0.18 + Math.random() * 0.25)));
      const rainDuration = Math.max(16, Math.floor(totalLaps * (0.38 + Math.random() * 0.28)));
      const rainEnd = Math.min(totalLaps, rainStart + rainDuration);
      const hasHeavyCore = Math.random() < 0.55;

      for (let i = rainStart; i < rainEnd; i++) {
        const rel = (i - rainStart) / Math.max(1, rainEnd - rainStart);
        const weatherType: WeatherType =
          hasHeavyCore && rel >= 0.3 && rel <= 0.75 ? 'HEAVY_RAIN' : 'LIGHT_RAIN';
        lapFrontAssign(lapWeathers, i, weatherType);
      }
    } else if (scenarioRoll < 0.85) {
      const wetEnd = Math.max(14, Math.floor(totalLaps * (0.35 + Math.random() * 0.3)));
      const startHeavy = Math.random() < 0.4;
      for (let i = 0; i < Math.min(totalLaps, wetEnd); i++) {
        const rel = i / Math.max(1, wetEnd);
        const weatherType: WeatherType =
          startHeavy && rel < 0.45 ? 'HEAVY_RAIN' : 'LIGHT_RAIN';
        lapFrontAssign(lapWeathers, i, weatherType);
      }
    } else {
      const heavyStart = Math.floor(totalLaps * 0.25);
      const heavyEnd = Math.floor(totalLaps * 0.68);
      for (let i = 0; i < totalLaps; i++) {
        const weatherType: WeatherType =
          i >= heavyStart && i <= heavyEnd ? 'HEAVY_RAIN' : 'LIGHT_RAIN';
        lapFrontAssign(lapWeathers, i, weatherType);
      }
    }
  }

  let rollingWetness =
    lapWeathers[0] === 'HEAVY_RAIN' ? 22 : lapWeathers[0] === 'LIGHT_RAIN' ? 12 : 0;

  const timeline: WeatherTimelineEntry[] = [];

  for (let idx = 0; idx < totalLaps; idx++) {
    const lapNumber = idx + 1;
    const weather = lapWeathers[idx];

    if (idx > 0) {
      if (weather === 'HEAVY_RAIN') {
        rollingWetness = Math.min(
          100,
          Number((rollingWetness + WEATHER_TRANSITION_CONFIG.maxWetnessGainPerLap).toFixed(2))
        );
      } else if (weather === 'LIGHT_RAIN') {
        rollingWetness = Math.min(
          65,
          Number(
            (rollingWetness + WEATHER_TRANSITION_CONFIG.maxWetnessGainPerLap * 0.85).toFixed(2)
          )
        );
      } else {
        rollingWetness = Math.max(
          0,
          Number((rollingWetness - WEATHER_TRANSITION_CONFIG.maxDryingRatePerLap).toFixed(2))
        );
      }
    }

    let rainProbability = 0;
    if (weather === 'HEAVY_RAIN') {
      rainProbability = 90;
    } else if (weather === 'LIGHT_RAIN') {
      rainProbability = 65;
    } else {
      let rainSoonDistance = -1;
      for (let lookahead = 1; lookahead <= 5; lookahead++) {
        if (idx + lookahead < totalLaps && lapWeathers[idx + lookahead] !== 'DRY') {
          rainSoonDistance = lookahead;
          break;
        }
      }
      if (rainSoonDistance > 0) {
        rainProbability = Math.round(50 - (rainSoonDistance - 1) * 8);
      } else if (profile === 'DESERT_DRY') {
        rainProbability = 1;
      } else if (profile === 'MEDITERRANEAN_WARM') {
        rainProbability = 10;
      } else {
        rainProbability = 15;
      }
    }

    timeline.push({
      lap: lapNumber,
      weather,
      rainProbability,
      projectedWetness: rollingWetness,
    });
  }

  return timeline;
};

function lapFrontAssign(arr: WeatherType[], index: number, value: WeatherType) {
  if (index >= 0 && index < arr.length) {
    arr[index] = value;
  }
}

/**
 * URUTAN PERFORMA RESMI 11 TIM F1 2026 & PEMASOK POWER UNIT (5 ENGINE):
 * 1. Mercedes-AMG PETRONAS F1 Team (#27F4D2 - Car Perf: 98 - Engine: Mercedes)
 * 2. Oracle Red Bull Racing (#3671C6 - Car Perf: 97 - Engine: RBPT)
 * 3. Scuderia Ferrari HP (#E80020 - Car Perf: 96 - Engine: Ferrari)
 * 4. McLaren Mastercard F1 Team (#FF8000 - Car Perf: 95 - Engine: Mercedes)
 * 5. BWT Alpine F1 Team (#0093CC - Car Perf: 91 - Engine: Mercedes)
 * 6. Visa Cash App Racing Bulls (VCARB) (#6692FF - Car Perf: 90 - Engine: RBPT)
 * 7. Audi Revolut F1 Team (#F50537 - Car Perf: 89 - Engine: Audi)
 * 8. TGR Haas F1 Team (#B6BABD - Car Perf: 88 - Engine: Ferrari)
 * 9. Atlassian Williams F1 Team (#64C4FF - Car Perf: 87 - Engine: Mercedes)
 * 10. Aston Martin Aramco F1 Team (#229971 - Car Perf: 86 - Engine: Honda)
 * 11. Cadillac Formula 1 Team (#D4AF37 - Car Perf: 84 - Engine: Ferrari)
 */
export const INITIAL_TEAMS: TeamInfo[] = [
  {
    id: 'mercedes',
    name: 'Mercedes-AMG PETRONAS F1 Team',
    colorHex: '#27F4D2',
    secondaryColorHex: '#94A3B8',
    carPerformance: 98,
    powerUnit: 'Mercedes',
    rdPhilosophy: 'CONSISTENT_GIANT',
    isPlayerTeam: false,
  },
  {
    id: 'red-bull',
    name: 'Oracle Red Bull Racing',
    colorHex: '#3671C6',
    secondaryColorHex: '#EF4444',
    carPerformance: 97,
    powerUnit: 'RBPT',
    rdPhilosophy: 'HIGH_RISK_VOLATILE',
    isPlayerTeam: false,
  },
  {
    id: 'ferrari',
    name: 'Scuderia Ferrari HP',
    colorHex: '#E80020',
    secondaryColorHex: '#FFF200',
    carPerformance: 96,
    powerUnit: 'Ferrari',
    rdPhilosophy: 'CONSISTENT_GIANT',
    isPlayerTeam: true, // Tim default yang dikendalikan pemain
  },
  {
    id: 'mclaren',
    name: 'McLaren Mastercard F1 Team',
    colorHex: '#FF8000',
    secondaryColorHex: '#38BDF8',
    carPerformance: 95,
    powerUnit: 'Mercedes',
    rdPhilosophy: 'CONSISTENT_GIANT',
    isPlayerTeam: false,
  },
  {
    id: 'alpine',
    name: 'BWT Alpine F1 Team',
    colorHex: '#0093CC',
    secondaryColorHex: '#EC4899',
    carPerformance: 91,
    powerUnit: 'Mercedes',
    rdPhilosophy: 'HIGH_RISK_VOLATILE',
    isPlayerTeam: false,
  },
  {
    id: 'rb',
    name: 'Visa Cash App Racing Bulls (VCARB)',
    colorHex: '#6692FF',
    secondaryColorHex: '#FFFFFF',
    carPerformance: 90,
    powerUnit: 'RBPT',
    rdPhilosophy: 'DEVELOPING_CHALLENGER',
    isPlayerTeam: false,
  },
  {
    id: 'audi',
    name: 'Audi Revolut F1 Team',
    colorHex: '#F50537',
    secondaryColorHex: '#C0C0C0',
    carPerformance: 89,
    powerUnit: 'Audi',
    rdPhilosophy: 'DEVELOPING_CHALLENGER',
    isPlayerTeam: false,
  },
  {
    id: 'haas',
    name: 'TGR Haas F1 Team',
    colorHex: '#B6BABD',
    secondaryColorHex: '#EF4444',
    carPerformance: 88,
    powerUnit: 'Ferrari',
    rdPhilosophy: 'DEVELOPING_CHALLENGER',
    isPlayerTeam: false,
  },
  {
    id: 'williams',
    name: 'Atlassian Williams F1 Team',
    colorHex: '#64C4FF',
    secondaryColorHex: '#1E3A8A',
    carPerformance: 87,
    powerUnit: 'Mercedes',
    rdPhilosophy: 'HIGH_RISK_VOLATILE',
    isPlayerTeam: false,
  },
  {
    id: 'aston-martin',
    name: 'Aston Martin Aramco F1 Team',
    colorHex: '#229971',
    secondaryColorHex: '#CEDC00',
    carPerformance: 86,
    powerUnit: 'Honda',
    rdPhilosophy: 'HIGH_RISK_VOLATILE',
    isPlayerTeam: false,
  },
  {
    id: 'cadillac',
    name: 'Cadillac Formula 1 Team',
    colorHex: '#D4AF37',
    secondaryColorHex: '#1E293B',
    carPerformance: 84,
    powerUnit: 'Ferrari',
    rdPhilosophy: 'DEVELOPING_CHALLENGER',
    isPlayerTeam: false,
  },
];

interface RawDriverSeed {
  id: string;
  name: string;
  code: string;
  number: number;
  age: number;
  potential: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  basePace: number;
  tyreManagement: number;
  startingPosition: number;
  startingTyre: TyreCompound;
  nextTyreCompound: TyreCompound;
  isPlayerControlled: boolean;
}

/**
 * ROSTER RESMI 22 PEMBALAP MUSIM F1 2026 (11 Tim):
 * - McLaren Mastercard F1 Team: Lando Norris (NOR #4), Oscar Piastri (PIA #81)
 * - Scuderia Ferrari HP: Charles Leclerc (LEC #16), Lewis Hamilton (HAM #44)
 * - Oracle Red Bull Racing: Max Verstappen (VER #1), Isack Hadjar (HAD #6)
 * - Mercedes-AMG PETRONAS F1 Team: George Russell (RUS #63), Andrea Kimi Antonelli (ANT #12)
 * - Aston Martin Aramco F1 Team: Fernando Alonso (ALO #14), Lance Stroll (STR #18)
 * - Atlassian Williams F1 Team: Carlos Sainz (SAI #55), Alexander Albon (ALB #23)
 * - BWT Alpine F1 Team: Pierre Gasly (GAS #10), Franco Colapinto (COL #43)
 * - TGR Haas F1 Team: Esteban Ocon (OCO #31), Oliver Bearman (BEA #87)
 * - Audi Revolut F1 Team: Nico Hulkenberg (HUL #27), Gabriel Bortoleto (BOR #5)
 * - Visa Cash App Racing Bulls (VCARB): Liam Lawson (LAW #30), Arvid Lindblad (LIN #40)
 * - Cadillac Formula 1 Team: Valtteri Bottas (BOT #77), Sergio Perez (PER #11)
 */
const RAW_DRIVER_SEEDS: RawDriverSeed[] = [
  {
    id: 'verstappen',
    name: 'Max Verstappen',
    code: 'VER',
    number: 1,
    age: 28,
    potential: 99,
    teamId: 'red-bull',
    teamName: 'Oracle Red Bull Racing',
    teamColor: '#3671C6',
    basePace: 99,
    tyreManagement: 96,
    startingPosition: 1,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'norris',
    name: 'Lando Norris',
    code: 'NOR',
    number: 4,
    age: 26,
    potential: 98,
    teamId: 'mclaren',
    teamName: 'McLaren Mastercard F1 Team',
    teamColor: '#FF8000',
    basePace: 96,
    tyreManagement: 94,
    startingPosition: 2,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'leclerc',
    name: 'Charles Leclerc',
    code: 'LEC',
    number: 16,
    age: 28,
    potential: 98,
    teamId: 'ferrari',
    teamName: 'Scuderia Ferrari HP',
    teamColor: '#E80020',
    basePace: 96,
    tyreManagement: 92,
    startingPosition: 3,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: true, // Pembalap Player #1
  },
  {
    id: 'hamilton',
    name: 'Lewis Hamilton',
    code: 'HAM',
    number: 44,
    age: 41,
    potential: 96,
    teamId: 'ferrari',
    teamName: 'Scuderia Ferrari HP',
    teamColor: '#E80020',
    basePace: 95,
    tyreManagement: 97,
    startingPosition: 4,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: true, // Pembalap Player #2
  },
  {
    id: 'piastri',
    name: 'Oscar Piastri',
    code: 'PIA',
    number: 81,
    age: 25,
    potential: 98,
    teamId: 'mclaren',
    teamName: 'McLaren Mastercard F1 Team',
    teamColor: '#FF8000',
    basePace: 95,
    tyreManagement: 93,
    startingPosition: 5,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'russell',
    name: 'George Russell',
    code: 'RUS',
    number: 63,
    age: 28,
    potential: 96,
    teamId: 'mercedes',
    teamName: 'Mercedes-AMG PETRONAS F1 Team',
    teamColor: '#27F4D2',
    basePace: 94,
    tyreManagement: 92,
    startingPosition: 6,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'sainz',
    name: 'Carlos Sainz',
    code: 'SAI',
    number: 55,
    age: 31,
    potential: 94,
    teamId: 'williams',
    teamName: 'Atlassian Williams F1 Team',
    teamColor: '#64C4FF',
    basePace: 93,
    tyreManagement: 94,
    startingPosition: 7,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'alonso',
    name: 'Fernando Alonso',
    code: 'ALO',
    number: 14,
    age: 44,
    potential: 93,
    teamId: 'aston-martin',
    teamName: 'Aston Martin Aramco F1 Team',
    teamColor: '#229971',
    basePace: 93,
    tyreManagement: 96,
    startingPosition: 8,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'albon',
    name: 'Alexander Albon',
    code: 'ALB',
    number: 23,
    age: 30,
    potential: 92,
    teamId: 'williams',
    teamName: 'Atlassian Williams F1 Team',
    teamColor: '#64C4FF',
    basePace: 90,
    tyreManagement: 91,
    startingPosition: 9,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'antonelli',
    name: 'Andrea Kimi Antonelli',
    code: 'ANT',
    number: 12,
    age: 19,
    potential: 97,
    teamId: 'mercedes',
    teamName: 'Mercedes-AMG PETRONAS F1 Team',
    teamColor: '#27F4D2',
    basePace: 89,
    tyreManagement: 86,
    startingPosition: 10,
    startingTyre: 'SOFT',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'gasly',
    name: 'Pierre Gasly',
    code: 'GAS',
    number: 10,
    age: 30,
    potential: 91,
    teamId: 'alpine',
    teamName: 'BWT Alpine F1 Team',
    teamColor: '#0093CC',
    basePace: 89,
    tyreManagement: 89,
    startingPosition: 11,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'hulkenberg',
    name: 'Nico Hulkenberg',
    code: 'HUL',
    number: 27,
    age: 38,
    potential: 89,
    teamId: 'audi',
    teamName: 'Audi Revolut F1 Team',
    teamColor: '#F50537',
    basePace: 89,
    tyreManagement: 88,
    startingPosition: 12,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'perez',
    name: 'Sergio Perez',
    code: 'PER',
    number: 11,
    age: 36,
    potential: 89,
    teamId: 'cadillac',
    teamName: 'Cadillac Formula 1 Team',
    teamColor: '#D4AF37',
    basePace: 88,
    tyreManagement: 93,
    startingPosition: 13,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'bottas',
    name: 'Valtteri Bottas',
    code: 'BOT',
    number: 77,
    age: 36,
    potential: 89,
    teamId: 'cadillac',
    teamName: 'Cadillac Formula 1 Team',
    teamColor: '#D4AF37',
    basePace: 88,
    tyreManagement: 91,
    startingPosition: 14,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'ocon',
    name: 'Esteban Ocon',
    code: 'OCO',
    number: 31,
    age: 29,
    potential: 90,
    teamId: 'haas',
    teamName: 'TGR Haas F1 Team',
    teamColor: '#B6BABD',
    basePace: 88,
    tyreManagement: 88,
    startingPosition: 15,
    startingTyre: 'HARD',
    nextTyreCompound: 'MEDIUM',
    isPlayerControlled: false,
  },
  {
    id: 'lawson',
    name: 'Liam Lawson',
    code: 'LAW',
    number: 30,
    age: 24,
    potential: 92,
    teamId: 'rb',
    teamName: 'Visa Cash App Racing Bulls (VCARB)',
    teamColor: '#6692FF',
    basePace: 88,
    tyreManagement: 87,
    startingPosition: 16,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'hadjar',
    name: 'Isack Hadjar',
    code: 'HAD',
    number: 6,
    age: 21,
    potential: 93,
    teamId: 'red-bull',
    teamName: 'Oracle Red Bull Racing',
    teamColor: '#3671C6',
    basePace: 87,
    tyreManagement: 85,
    startingPosition: 17,
    startingTyre: 'SOFT',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'bearman',
    name: 'Oliver Bearman',
    code: 'BEA',
    number: 87,
    age: 20,
    potential: 94,
    teamId: 'haas',
    teamName: 'TGR Haas F1 Team',
    teamColor: '#B6BABD',
    basePace: 87,
    tyreManagement: 85,
    startingPosition: 18,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'colapinto',
    name: 'Franco Colapinto',
    code: 'COL',
    number: 43,
    age: 22,
    potential: 92,
    teamId: 'alpine',
    teamName: 'BWT Alpine F1 Team',
    teamColor: '#0093CC',
    basePace: 86,
    tyreManagement: 85,
    startingPosition: 19,
    startingTyre: 'SOFT',
    nextTyreCompound: 'MEDIUM',
    isPlayerControlled: false,
  },
  {
    id: 'bortoleto',
    name: 'Gabriel Bortoleto',
    code: 'BOR',
    number: 5,
    age: 21,
    potential: 94,
    teamId: 'audi',
    teamName: 'Audi Revolut F1 Team',
    teamColor: '#F50537',
    basePace: 86,
    tyreManagement: 84,
    startingPosition: 20,
    startingTyre: 'MEDIUM',
    nextTyreCompound: 'HARD',
    isPlayerControlled: false,
  },
  {
    id: 'stroll',
    name: 'Lance Stroll',
    code: 'STR',
    number: 18,
    age: 27,
    potential: 86,
    teamId: 'aston-martin',
    teamName: 'Aston Martin Aramco F1 Team',
    teamColor: '#229971',
    basePace: 84,
    tyreManagement: 85,
    startingPosition: 21,
    startingTyre: 'HARD',
    nextTyreCompound: 'MEDIUM',
    isPlayerControlled: false,
  },
  {
    id: 'lindblad',
    name: 'Arvid Lindblad',
    code: 'LIN',
    number: 40,
    age: 18,
    potential: 95,
    teamId: 'rb',
    teamName: 'Visa Cash App Racing Bulls (VCARB)',
    teamColor: '#6692FF',
    basePace: 84,
    tyreManagement: 82,
    startingPosition: 22,
    startingTyre: 'SOFT',
    nextTyreCompound: 'MEDIUM',
    isPlayerControlled: false,
  },
];

/**
 * Data awal 22 Pembalap F1 2026 dalam kondisi siap di Starting Grid (Lap 1, staggered grid offset).
 * Tim Scuderia Ferrari HP (Leclerc & Hamilton) memiliki `isPlayerControlled: true` secara default.
 */
export const INITIAL_DRIVERS: DriverState[] = RAW_DRIVER_SEEDS.map((seed) => {
  const gridTimeOffset = (seed.startingPosition - 1) * 0.25;

  return {
    id: seed.id,
    name: seed.name,
    code: seed.code,
    number: seed.number,
    age: seed.age,
    potential: seed.potential,
    category: 'F1_GRID' as DriverCategory,
    teamId: seed.teamId,
    teamName: seed.teamName,
    teamColor: seed.teamColor,
    basePace: seed.basePace,
    tyreManagement: seed.tyreManagement,
    position: seed.startingPosition,
    currentLap: 1,
    trackProgress: Math.max(0, Number((2.2 - (seed.startingPosition - 1) * 0.1).toFixed(2))),
    totalTimeElapsed: 0,
    gapToLeader: Number(gridTimeOffset.toFixed(3)),
    interval: seed.startingPosition === 1 ? 0 : 0.25,
    lastLapTime: 0,
    bestLapTime: 0,
    tyreCompound: seed.startingTyre,
    tyreHealth: 100,
    tyreAge: 0,
    ersBattery: 100,
    fuelLoad: 70.0,
    paceMode: 'STANDARD',
    ersMode: 'NEUTRAL',
    isInPit: false,
    boxThisLap: false,
    nextTyreCompound: seed.nextTyreCompound,
    pitStopsCount: 0,
    wingDamage: 0,
    repairWingOnNextPit: false,
    status: 'RUNNING',
    isPlayerControlled: seed.isPlayerControlled,
  };
});

/**
 * POOL PEMBALAP AKADEMI (F2/F3) & SERI BALAP LAIN (INDYCAR, WEC HYPERCAR, SUPER FORMULA & RESERVES) - UPGRADE 5
 * Total 20 Pembalap Nyata siap di-scout, dibina di Driver Academy, atau dipromosikan ke kursi utama F1.
 */
export const EXTERNAL_DRIVERS_POOL: ExternalDriverCandidate[] = [
  // --- 1. F2 / F3 ACADEMY YOUNGSTERS (Usia 17-21, Base Pace 76-83, Potential 88-97) ---
  {
    id: 'browning',
    name: 'Luke Browning',
    code: 'BRO',
    number: 24,
    age: 21,
    category: 'F2_ACADEMY',
    currentSeriesTeam: 'Hitech Pulse-Eight (FIA F2)',
    teamColor: '#38BDF8',
    basePace: 83,
    tyreManagement: 81,
    potential: 92,
    marketValue: 2_400_000,
    salary: 150_000,
    academyCost: 850_000,
  },
  {
    id: 'fornaroli',
    name: 'Leonardo Fornaroli',
    code: 'FOR',
    number: 25,
    age: 21,
    category: 'F2_ACADEMY',
    currentSeriesTeam: 'Invicta Racing (FIA F2)',
    teamColor: '#FACC15',
    basePace: 83,
    tyreManagement: 82,
    potential: 93,
    marketValue: 2_500_000,
    salary: 150_000,
    academyCost: 900_000,
  },
  {
    id: 'aron',
    name: 'Paul Aron',
    code: 'ARO',
    number: 17,
    age: 21,
    category: 'F2_ACADEMY',
    currentSeriesTeam: 'PREMA Racing (FIA F2)',
    teamColor: '#EF4444',
    basePace: 82,
    tyreManagement: 81,
    potential: 91,
    marketValue: 2_200_000,
    salary: 140_000,
    academyCost: 800_000,
  },
  {
    id: 'beganovic',
    name: 'Dino Beganovic',
    code: 'BEG',
    number: 15,
    age: 21,
    category: 'F2_ACADEMY',
    currentSeriesTeam: 'DAMS Lucas Oil (FIA F2)',
    teamColor: '#0EA5E9',
    basePace: 82,
    tyreManagement: 80,
    potential: 92,
    marketValue: 2_300_000,
    salary: 140_000,
    academyCost: 850_000,
  },
  {
    id: 'marti',
    name: 'Josep Maria Marti',
    code: 'MAR',
    number: 32,
    age: 20,
    category: 'F2_ACADEMY',
    currentSeriesTeam: 'Campos Racing (FIA F2)',
    teamColor: '#F97316',
    basePace: 80,
    tyreManagement: 79,
    potential: 90,
    marketValue: 1_900_000,
    salary: 125_000,
    academyCost: 700_000,
  },
  {
    id: 'maini',
    name: 'Kush Maini',
    code: 'MAI',
    number: 36,
    age: 21,
    category: 'F2_ACADEMY',
    currentSeriesTeam: 'ART Grand Prix (FIA F2)',
    teamColor: '#A855F7',
    basePace: 79,
    tyreManagement: 80,
    potential: 88,
    marketValue: 1_700_000,
    salary: 120_000,
    academyCost: 650_000,
  },
  {
    id: 'crawford',
    name: 'Jak Crawford',
    code: 'CRA',
    number: 29,
    age: 20,
    category: 'F2_ACADEMY',
    currentSeriesTeam: 'DAMS Lucas Oil (FIA F2)',
    teamColor: '#10B981',
    basePace: 81,
    tyreManagement: 80,
    potential: 90,
    marketValue: 2_100_000,
    salary: 135_000,
    academyCost: 750_000,
  },
  {
    id: 'slater',
    name: 'Freddie Slater',
    code: 'SLA',
    number: 51,
    age: 17,
    category: 'F3_ACADEMY',
    currentSeriesTeam: 'PREMA Racing (FIA F3)',
    teamColor: '#EC4899',
    basePace: 80,
    tyreManagement: 78,
    potential: 97,
    marketValue: 2_800_000,
    salary: 130_000,
    academyCost: 1_100_000,
  },
  {
    id: 'tsolov',
    name: 'Nikola Tsolov',
    code: 'TSO',
    number: 39,
    age: 19,
    category: 'F3_ACADEMY',
    currentSeriesTeam: 'Campos Racing (FIA F3)',
    teamColor: '#6366F1',
    basePace: 78,
    tyreManagement: 77,
    potential: 91,
    marketValue: 1_800_000,
    salary: 115_000,
    academyCost: 680_000,
  },
  {
    id: 'camara',
    name: 'Rafael Camara',
    code: 'CAM',
    number: 50,
    age: 20,
    category: 'F3_ACADEMY',
    currentSeriesTeam: 'Trident Motorsport (FIA F3)',
    teamColor: '#E11D48',
    basePace: 81,
    tyreManagement: 80,
    potential: 95,
    marketValue: 2_600_000,
    salary: 135_000,
    academyCost: 950_000,
  },

  // --- 2. INDYCAR STARS (Usia 24-29, Base Pace 85-90, Potential 90-93) ---
  {
    id: 'palou',
    name: 'Alex Palou',
    code: 'PAL',
    number: 49,
    age: 28,
    category: 'INDYCAR',
    currentSeriesTeam: 'Chip Ganassi Racing (IndyCar)',
    teamColor: '#F59E0B',
    basePace: 90,
    tyreManagement: 91,
    potential: 93,
    marketValue: 7_200_000,
    salary: 380_000,
  },
  {
    id: 'oward',
    name: "Pato O'Ward",
    code: 'OWA',
    number: 57,
    age: 26,
    category: 'INDYCAR',
    currentSeriesTeam: 'Arrow McLaren (IndyCar)',
    teamColor: '#FF8000',
    basePace: 89,
    tyreManagement: 88,
    potential: 93,
    marketValue: 6_500_000,
    salary: 350_000,
  },
  {
    id: 'herta',
    name: 'Colton Herta',
    code: 'HER',
    number: 26,
    age: 25,
    category: 'INDYCAR',
    currentSeriesTeam: 'Andretti Global (IndyCar)',
    teamColor: '#FACC15',
    basePace: 87,
    tyreManagement: 85,
    potential: 92,
    marketValue: 5_400_000,
    salary: 300_000,
  },
  {
    id: 'kirkwood',
    name: 'Kyle Kirkwood',
    code: 'KIR',
    number: 28,
    age: 27,
    category: 'INDYCAR',
    currentSeriesTeam: 'Andretti Global (IndyCar)',
    teamColor: '#22C55E',
    basePace: 85,
    tyreManagement: 86,
    potential: 90,
    marketValue: 4_500_000,
    salary: 260_000,
  },

  // --- 3. WEC HYPERCAR / SUPER FORMULA / F1 RESERVES (Usia 22-30, Base Pace 83-88, Potential 88-91) ---
  {
    id: 'schumacher',
    name: 'Mick Schumacher',
    code: 'MSC',
    number: 47,
    age: 27,
    category: 'WEC_HYPERCAR',
    currentSeriesTeam: 'Alpine Endurance Team (WEC Hypercar)',
    teamColor: '#0093CC',
    basePace: 85,
    tyreManagement: 87,
    potential: 89,
    marketValue: 4_200_000,
    salary: 240_000,
  },
  {
    id: 'tsunoda',
    name: 'Yuki Tsunoda',
    code: 'TSU',
    number: 22,
    age: 25,
    category: 'RESERVE',
    currentSeriesTeam: 'Red Bull / Honda Reserve Pool',
    teamColor: '#6692FF',
    basePace: 88,
    tyreManagement: 87,
    potential: 91,
    marketValue: 5_800_000,
    salary: 310_000,
  },
  {
    id: 'doohan',
    name: 'Jack Doohan',
    code: 'DOO',
    number: 7,
    age: 23,
    category: 'RESERVE',
    currentSeriesTeam: 'Alpine F1 Reserve Driver',
    teamColor: '#38BDF8',
    basePace: 84,
    tyreManagement: 85,
    potential: 89,
    marketValue: 3_600_000,
    salary: 210_000,
  },
  {
    id: 'drugovich',
    name: 'Felipe Drugovich',
    code: 'DRU',
    number: 34,
    age: 25,
    category: 'WEC_HYPERCAR',
    currentSeriesTeam: 'Cadillac Whelen (WEC / IMSA)',
    teamColor: '#10B981',
    basePace: 85,
    tyreManagement: 86,
    potential: 89,
    marketValue: 4_000_000,
    salary: 225_000,
  },
  {
    id: 'pourchaire',
    name: 'Theo Pourchaire',
    code: 'POU',
    number: 98,
    age: 22,
    category: 'WEC_HYPERCAR',
    currentSeriesTeam: 'Peugeot TotalEnergies (WEC Hypercar)',
    teamColor: '#84CC16',
    basePace: 86,
    tyreManagement: 85,
    potential: 91,
    marketValue: 4_600_000,
    salary: 250_000,
  },
  {
    id: 'iwasa',
    name: 'Ayumu Iwasa',
    code: 'IWA',
    number: 38,
    age: 24,
    category: 'RESERVE',
    currentSeriesTeam: 'Team Mugen (Super Formula / RB Reserve)',
    teamColor: '#EF4444',
    basePace: 84,
    tyreManagement: 85,
    potential: 90,
    marketValue: 3_800_000,
    salary: 215_000,
  },
];

