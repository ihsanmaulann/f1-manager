'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Shield,
  Palette,
  Cpu,
  Users,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Flag,
  Upload,
  Gauge,
  Zap,
} from 'lucide-react';
import {
  useCareerStore,
  ENGINE_SUPPLIERS,
  INITIAL_CREATION_BUDGET,
  EngineSupplierId,
  TEAM_ORIGIN_PRESETS,
  TeamOriginPreset,
  createInitialDriverMarket,
} from '../store/useCareerStore';
import { soundEngine } from '../utils/soundEffects';

const PRESET_TEAM_COLORS = [
  { name: 'Papaya Orange', hex: '#FF8000' },
  { name: 'Racing Red', hex: '#E80020' },
  { name: 'Electric Cyan', hex: '#27F4D2' },
  { name: 'Royal Blue', hex: '#3671C6' },
  { name: 'British Racing Green', hex: '#229971' },
  { name: 'Hyper Gold', hex: '#F59E0B' },
  { name: 'Neon Purple', hex: '#A855F7' },
  { name: 'Titanium Silver', hex: '#94A3B8' },
];

const PRESET_TEAM_NAMES = [
  'Apex Grand Prix',
  'Valkyrie Motorsport F1',
  'Titan Racing GP',
  'Velocity Works F1 Team',
];

function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
}

export const CreateTeamScreen: React.FC = () => {
  const { createCustomTeam, importSaveData } = useCareerStore();
  const initialDriverPool = useMemo(() => createInitialDriverMarket(), []);

  const [teamName, setTeamName] = useState<string>('Apex Grand Prix');
  const [teamColor, setTeamColor] = useState<string>('#FF8000');
  const [selectedEngineId, setSelectedEngineId] = useState<EngineSupplierId>('mercedes');
  const [originPreset, setOriginPreset] = useState<TeamOriginPreset>('NEWCOMER');
  // Default pilih 2 pembalap Reserve/WEC non-grid agar seluruh 11 tim resmi F1 tetap utuh dengan roster 2026-nya
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([
    'tsunoda',
    'schumacher',
  ]);
  const [importNotice, setImportNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedEngine =
    ENGINE_SUPPLIERS.find((e) => e.id === selectedEngineId) ?? ENGINE_SUPPLIERS[1];

  const selectedDrivers = selectedDriverIds
    .map((id) => initialDriverPool.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const selectedOrigin =
    TEAM_ORIGIN_PRESETS.find((o) => o.id === originPreset) ?? TEAM_ORIGIN_PRESETS[0];
  const engineCost = selectedEngine.cost;
  const driversCost = selectedDrivers.reduce((acc, d) => acc + d.buyoutCost, 0);
  const totalSpent = engineCost + driversCost;
  const remainingBudget = INITIAL_CREATION_BUDGET - totalSpent;
  const adjustedStartingBudget = Math.max(2_000_000, remainingBudget + selectedOrigin.budgetDelta);

  const isFormValid =
    teamName.trim().length >= 3 &&
    selectedDrivers.length === 2 &&
    remainingBudget >= 0;

  const handleToggleDriver = (driverId: string) => {
    soundEngine.playStrategyClick();
    setSelectedDriverIds((prev) => {
      if (prev.includes(driverId)) {
        return prev.filter((id) => id !== driverId);
      }
      if (prev.length >= 2) {
        // Ganti pilihan kedua dengan pembalap yang baru diklik
        return [prev[0], driverId];
      }
      return [...prev, driverId];
    });
  };

  const handleLaunchCareer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const res = createCustomTeam({
      teamName: teamName.trim(),
      teamColor,
      engineSupplierId: selectedEngineId,
      selectedDriverIds: [selectedDriverIds[0], selectedDriverIds[1]],
      originPreset,
    });

    if (res.success) {
      soundEngine.playTeamRadioBeep();
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const result = importSaveData(content);
        if (result.success) {
          soundEngine.playTeamRadioBeep();
        }
        setImportNotice({
          type: result.success ? 'success' : 'error',
          message: result.message,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 selection:bg-red-600 selection:text-white">
      <div className="max-w-[1450px] w-full mx-auto flex flex-col gap-6 my-auto">
        {/* HEADER FIA FRANCHISE ENTRY */}
        <header className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors"
              style={{
                backgroundColor: `${teamColor}20`,
                borderColor: teamColor,
                boxShadow: `0 0 25px ${teamColor}40`,
              }}
            >
              <Shield className="w-7 h-7" style={{ color: teamColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-bold">
                  FIA 12TH GRID ENTRY REGISTRATION (EXPANSION TEAM)
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  12 CONSTRUCTORS • 24 CARS GRID
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                Create Your Formula 1 Team
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Tim Anda akan <strong className="text-zinc-200">ditambahkan sebagai Tim ke-12 (24 Mobil)</strong> tanpa menghapus 11 tim resmi F1 2026. Gunakan dana awal{' '}
                <span className="text-emerald-400 font-mono font-bold">{formatMoney(INITIAL_CREATION_BUDGET)}</span> untuk Power Unit, 2 pembalap, dan sisa modal R&D.
              </p>
            </div>
          </div>

          {/* Opsi Import Save Data Bagi Pemain Lama */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono font-bold transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Restore Existing Save (.JSON)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFileChange}
                className="hidden"
              />
            </div>
            {importNotice && (
              <span
                className={`text-[11px] font-mono ${
                  importNotice.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {importNotice.message}
              </span>
            )}
          </div>
        </header>

        {/* BAR ALOKASI ANGGARAN PEMBUATAN TIM ($42.00M GRANT) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                Franchise Capital Allocation (Total Grant: {formatMoney(INITIAL_CREATION_BUDGET)})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">Power Unit:</span>
                <span className="text-amber-300 font-bold">{formatMoney(engineCost)}</span>
              </div>
              <div className="h-3.5 w-px bg-zinc-800" />
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">2 Drivers Buyout:</span>
                <span className="text-sky-300 font-bold">{formatMoney(driversCost)}</span>
              </div>
              <div className="h-3.5 w-px bg-zinc-800" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400">Starting R&D Budget:</span>
                <span
                  className={`text-sm font-extrabold ${
                    remainingBudget >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatMoney(adjustedStartingBudget)}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Bar */}
          <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 flex">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{
                width: `${Math.min(100, (engineCost / INITIAL_CREATION_BUDGET) * 100)}%`,
              }}
              title={`Engine Cost: ${formatMoney(engineCost)}`}
            />
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{
                width: `${Math.min(
                  100 - (engineCost / INITIAL_CREATION_BUDGET) * 100,
                  (driversCost / INITIAL_CREATION_BUDGET) * 100
                )}%`,
              }}
              title={`Drivers Cost: ${formatMoney(driversCost)}`}
            />
          </div>
        </div>

        {/* TEAM ORIGIN PRESET (F1 MANAGER 24) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
              Team Origin Preset (F1 Manager 24)
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Menentukan Level R&amp;D Awal &amp; Ekspektasi Board Konstruktor
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
            {TEAM_ORIGIN_PRESETS.map((preset) => {
              const active = originPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playStrategyClick();
                    setOriginPreset(preset.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                    active
                      ? 'bg-red-950/35 border-red-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{preset.label}</span>
                      <span className="text-[10px] text-amber-300">P{preset.targetWcc}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      {preset.desc}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-800">
                    <span className="text-sky-300">Start Lv.{preset.startLevel}</span>
                    <span
                      className={
                        preset.budgetDelta >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'
                      }
                    >
                      {preset.budgetDelta >= 0 ? '+' : ''}
                      {(preset.budgetDelta / 1_000_000).toFixed(1)}M
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* FORM UTAMA: KIRI (IDENTITAS & POWER UNIT) | KANAN (PEMILIHAN 2 PEMBALAP) */}
        <form onSubmit={handleLaunchCareer} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* KOLOM KIRI: NAMA TIM, WARNA LIVERY, DAN PEMASOK MESIN */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* 1. Identitas & Warna Tim */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Palette className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  1. Team Identity & Livery Color
                </h2>
              </div>

              {/* Input Nama Tim */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Official Constructor Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={32}
                  placeholder="Enter your F1 team name..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-500 focus:outline-none font-bold text-white text-sm"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono text-zinc-500">Presets:</span>
                  {PRESET_TEAM_NAMES.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        soundEngine.playStrategyClick();
                        setTeamName(preset);
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pemilih Warna Utama Tim */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Primary Telemetry & Livery Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={teamColor}
                    onChange={(e) => setTeamColor(e.target.value)}
                    className="w-12 h-10 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer p-1"
                  />
                  <span className="font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200">
                    {teamColor.toUpperCase()}
                  </span>
                  <div
                    className="flex-1 h-10 rounded-xl border border-zinc-800 flex items-center px-3 gap-2.5"
                    style={{ backgroundColor: `${teamColor}18`, borderColor: `${teamColor}60` }}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: teamColor }}
                    />
                    <span className="text-xs font-bold text-white truncate">
                      {teamName || 'Your F1 Team'}
                    </span>
                  </div>
                </div>

                {/* Swatch Warna F1 */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-1">
                  {PRESET_TEAM_COLORS.map((swatch) => {
                    const isSelected =
                      teamColor.toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => {
                          soundEngine.playStrategyClick();
                          setTeamColor(swatch.hex);
                        }}
                        title={swatch.name}
                        className={`h-7 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'border-white scale-105 shadow-md'
                            : 'border-zinc-800 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Pemasok Mesin (Engine Supplier) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                    2. Power Unit Supplier Deal
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-amber-300 font-bold">
                  {selectedEngine.name} ({formatMoney(selectedEngine.cost)})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ENGINE_SUPPLIERS.map((engine) => {
                  const isSelected = engine.id === selectedEngineId;
                  return (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playStrategyClick();
                        setSelectedEngineId(engine.id);
                      }}
                      className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-white">
                            {engine.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-amber-400">
                            {formatMoney(engine.cost)}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {engine.manufacturer} • {engine.codeName}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                          {engine.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Gauge className="w-3 h-3" />
                          +{engine.powerBonus.toFixed(2)} Pace
                        </span>
                        <span className="flex items-center gap-1 text-sky-400 font-bold">
                          <Zap className="w-3 h-3" />
                          +{engine.efficiencyBonus.toFixed(2)} Eff
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: PEMILIHAN 2 PEMBALAP AWAL */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                    3. Sign 2 Starting Drivers ({selectedDrivers.length} / 2 Selected)
                  </h2>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  Selected Cost:{' '}
                  <strong className="text-sky-400">{formatMoney(driversCost)}</strong>
                </span>
              </div>

              {/* Ringkasan 2 Slot Kursi Mobil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1].map((slotIdx) => {
                  const driver = selectedDrivers[slotIdx];
                  return (
                    <div
                      key={slotIdx}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-2 h-8 rounded-full"
                          style={{ backgroundColor: driver ? teamColor : '#3f3f46' }}
                        />
                        <div>
                          <div className="text-[10px] font-mono uppercase text-zinc-500">
                            CAR #{slotIdx + 1} SEAT
                          </div>
                          {driver ? (
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{driver.name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300">
                                {driver.code}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs italic text-zinc-500">
                              Select a driver below...
                            </div>
                          )}
                        </div>
                      </div>
                      {driver && (
                        <div className="text-right font-mono">
                          <div className="text-xs font-bold text-sky-400">
                            {formatMoney(driver.buyoutCost)}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Pace {driver.basePace} • Tyre {driver.tyreManagement}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid Daftar Pembalap F1 + Reserve/F2/IndyCar/WEC */}
              <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2">
                Tip: Merekrut pembalap dari <span className="text-sky-300 font-semibold">Reserve / F2 / IndyCar / WEC</span> mempertahankan lineup asli tim F1 lain. Jika Anda membajak pembalap F1 aktif, tim lamanya tetap bertahan di grid dan otomatis merekrut pengganti.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {initialDriverPool.map((driver) => {
                  const isSelected = selectedDriverIds.includes(driver.id);
                  const seatNumber = selectedDriverIds.indexOf(driver.id) + 1;
                  const isF1Seat = driver.category === 'F1_GRID';

                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => handleToggleDriver(driver.id)}
                      className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400'
                          : 'bg-zinc-950/80 border-zinc-800/90 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-1.5 h-10 rounded-full shrink-0"
                          style={{
                            backgroundColor: isSelected ? teamColor : driver.teamColor,
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-extrabold text-white">
                              {driver.code}
                            </span>
                            <span className="text-xs font-semibold text-zinc-200 truncate">
                              {driver.name}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-500 text-zinc-950 font-mono text-[9px] font-black shrink-0">
                                CAR #{seatNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400 mt-0.5 flex items-center gap-1.5 truncate">
                            <span
                              className={`px-1 py-0 rounded text-[9px] font-bold shrink-0 ${
                                isF1Seat
                                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {isF1Seat ? 'F1' : driver.category.replace('_', ' ')}
                            </span>
                            <span className="truncate text-zinc-400">{driver.teamName}</span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-0.5 flex items-center gap-2">
                            <span>Pace: {driver.basePace}</span>
                            <span>•</span>
                            <span>Tyre: {driver.tyreManagement}</span>
                            <span>•</span>
                            <span>Pot: {driver.potential}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <div
                          className={`text-xs font-extrabold ${
                            isSelected ? 'text-sky-300' : 'text-zinc-200'
                          }`}
                        >
                          {formatMoney(driver.buyoutCost)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Salary {formatMoney(driver.salaryPerRace)}/GP
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FOOTER VALIDASI & TOMBOL SUBMIT */}
            <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                {remainingBudget < 0 ? (
                  <div className="flex items-center gap-2 text-xs font-mono text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Budget terlampaui sebesar {formatMoney(Math.abs(remainingBudget))}! Pilih mesin atau pembalap yang lebih terjangkau.
                    </span>
                  </div>
                ) : selectedDrivers.length < 2 ? (
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Pilih tepat 2 pembalap untuk mengisi kursi mobil #1 dan #2.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      Siap turun ke grid! Sisa{' '}
                      <strong>{formatMoney(remainingBudget)}</strong> akan masuk ke kas R&D tim Anda.
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!isFormValid}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed"
              >
                <Flag className="w-4 h-4" />
                <span>Register Team & Enter Season</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

