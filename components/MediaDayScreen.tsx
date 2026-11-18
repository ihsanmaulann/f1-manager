'use client';

import React, { useMemo } from 'react';
import {
  Mic,
  Flame,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Award,
  Timer,
  CloudRain,
  Sun,
  Trophy,
  Users,
} from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { useCareerStore } from '../store/useCareerStore';
import { CLIMATE_PROFILE_SPECS } from '../constants/f1Data';
import { MediaDayChoiceType } from '../types/f1';

interface PressQuestionOption {
  type: MediaDayChoiceType;
  badge: string;
  quote: string;
  effectSummary: string;
  riskSummary: string;
}

interface PressQuestion {
  index: number;
  journalistName: string;
  outlet: string;
  targetRole: string;
  contextTag: string;
  questionText: string;
  options: [PressQuestionOption, PressQuestionOption, PressQuestionOption];
}

export const MediaDayScreen: React.FC = () => {
  const {
    circuit,
    drivers,
    weatherTimeline,
    mediaDayBuffs,
    answerMediaDayQuestion,
    proceedFromMediaDayToFP,
  } = useRaceStore();

  const {
    teamName,
    teamColor,
    seasonNumber,
    currentRoundIndex,
    seasonCalendar,
    constructorStandings,
    raceHistory,
    carParts,
    grantMediaDaySponsorBonus,
  } = useCareerStore();

  const playerDrivers = useMemo(
    () =>
      drivers
        .filter((d) => d.isPlayerControlled)
        .sort((a, b) => a.number - b.number),
    [drivers]
  );

  const driver1 = playerDrivers[0] ?? drivers[0];
  const driver2 = playerDrivers[1] ?? drivers[1];

  const sortedConstructors = useMemo(
    () => [...constructorStandings].sort((a, b) => b.points - a.points),
    [constructorStandings]
  );
  const playerWccIdx = sortedConstructors.findIndex((c) => c.isPlayerTeam);
  const playerWccPos = playerWccIdx !== -1 ? playerWccIdx + 1 : 5;
  const playerWccPts =
    playerWccIdx !== -1 ? sortedConstructors[playerWccIdx].points : 0;

  const lastRace = raceHistory[0];
  const climateSpec = CLIMATE_PROFILE_SPECS[circuit.climateProfile];
  const hasWetForecast = weatherTimeline.some((w) => w.weather !== 'DRY');
  const peakProjectedWetness = Math.max(
    0,
    ...weatherTimeline.map((w) => w.projectedWetness ?? 0)
  );
  const avgPartLevel = (
    (carParts.aerodynamics +
      carParts.chassis +
      carParts.powertrain +
      carParts.durability) /
    4
  ).toFixed(1);

  const questions: PressQuestion[] = useMemo(() => {
    // Pertanyaan 1: Konteks Klasemen Konstruktor & Target Akhir Pekan
    const q1Context =
      currentRoundIndex === 0
        ? `SEASON ${seasonNumber} OPENER • WCC TARGET`
        : `WCC STANDINGS: P${playerWccPos} (${playerWccPts} PTS)`;

    const q1Text =
      currentRoundIndex === 0
        ? `Selamat datang di seri pembuka musim ${seasonNumber} di ${circuit.name}! Banyak pengamat penasaran sejauh mana paket ${teamName} mampu bersaing melawan tim-tim papan atas akhir pekan ini. Apa target realistis yang Anda pasang bersama ${driver1?.name} dan ${driver2?.name}?`
        : `Memasuki Seri #${currentRoundIndex + 1} di ${circuit.name}, ${teamName} saat ini berada di posisi P${playerWccPos} Klasemen Konstruktor dengan koleksi ${playerWccPts} poin. Apakah Anda yakin karakteristik trek ${circuit.country} cocok untuk menyerang posisi podium akhir pekan ini?`;

    // Pertanyaan 2: Konteks Hasil Balapan Sebelumnya & Perkembangan R&D Pabrik
    const lastRaceBestPos = lastRace
      ? Math.min(
          lastRace.playerDriver1Result.position,
          lastRace.playerDriver2Result.position
        )
      : null;

    const q2Context = lastRace
      ? `PREVIOUS GP (${lastRace.circuitName.toUpperCase()}): P${lastRaceBestPos}`
      : `FACTORY R&D SPEC: AVG LVL ${avgPartLevel}`;

    const q2Text = lastRace
      ? `Pada balapan sebelumnya di ${lastRace.circuitName}, mobil terbaik ${teamName} finis di posisi P${lastRaceBestPos} (Pemenang: ${lastRace.winnerName}). Bagaimana evaluasi Anda terhadap performa ${driver1?.code} & ${driver2?.code}, serta seberapa besar kontribusi paket R&D pabrik (Avg Level ${avgPartLevel}) untuk balapan ini?`
      : `Departemen teknis ${teamName} membawa spesifikasi sasis dan aerodinamika terbaru (Rata-rata R&D Level ${avgPartLevel}) ke ${circuit.name}. Bagaimana perasaan ${driver1?.name} dan ${driver2?.name} terhadap keseimbangan mobil di simulator?`;

    // Pertanyaan 3: Konteks Cuaca Sirkuit & Strategi Pit Wall
    const q3Context = hasWetForecast
      ? `WEATHER RADAR: RAIN RISK (${peakProjectedWetness.toFixed(0)}% PEAK WETNESS)`
      : `CLIMATE PROFILE: ${climateSpec.label.toUpperCase()}`;

    const q3Text = hasWetForecast
      ? `Radar meteorologi FIA memprediksi potensi hujan di ${circuit.name} dengan puncak genangan air mencapai ~${peakProjectedWetness.toFixed(
          0
        )}% (${climateSpec.label}). Kondisi crossover ban Slick ke Inter/Wet selalu memicu kekacauan di pit lane. Bagaimana kesiapan tim menghadapi cuaca ekstrem ini?`
      : `Sirkuit ${circuit.name} memiliki profil iklim ${climateSpec.label} dengan tingkat degradasi ban ${circuit.tyreWearMultiplier}x dan pit loss ${circuit.pitLossTime} detik (${circuit.totalLaps} Lap). Apakah Anda akan menerapkan strategi agresif di pit stop?`;

    return [
      {
        index: 0,
        journalistName: 'Natalie Pinkham',
        outlet: 'Sky Sports F1 Paddock Live',
        targetRole: `Team Principal & ${driver1?.name ?? 'Driver #1'}`,
        contextTag: q1Context,
        questionText: q1Text,
        options: [
          {
            type: 'CONFIDENT',
            badge: 'CONFIDENT / AGGRESSIVE',
            quote: `"Kami datang ke ${circuit.name} bukan untuk meramaikan grid. Kecepatan murni mobil kami sangat kuat dan kami mengincar hasil besar di kualifikasi maupun balapan!"`,
            effectSummary: 'Driver Morale ↑ (+0.15s Bonus Pace di Qualifying)',
            riskSummary: 'Ekspektasi Tinggi: Wajib finis Top-6 di Race atau Reputasi Tim -5%',
          },
          {
            type: 'HUMBLE',
            badge: 'HUMBLE / DIPLOMATIC',
            quote: `"Persaingan musim ${seasonNumber} sangat rapat. Fokus utama kami adalah mengeksekusi setiap sesi dengan bersih tanpa kesalahan dan memaksimalkan poin."`,
            effectSummary: 'Mental Stability ↑ (Consistency meningkat, -25% risiko crash/spin)',
            riskSummary: 'Aman: Tidak ada penalti reputasi di akhir pekan ini',
          },
          {
            type: 'SPONSOR',
            badge: 'PRAISE R&D / SPONSORS',
            quote: `"Semua progres ini berkat dukungan luar biasa para mitra sponsor utama dan kru mekanik di garasi yang bekerja tanpa lelah mempersiapkan mobil!"`,
            effectSummary: 'Bonus Sponsor Instan +$250,000 & Pit Stop -0.2s lebih cepat',
            riskSummary: 'Meningkatkan moral kru garasi & likuiditas kas tim',
          },
        ],
      },
      {
        index: 1,
        journalistName: 'Lawrence Barretto',
        outlet: 'F1TV Official Press Conference',
        targetRole: `${driver1?.name ?? 'Driver #1'} & ${driver2?.name ?? 'Driver #2'}`,
        contextTag: q2Context,
        questionText: q2Text,
        options: [
          {
            type: 'CONFIDENT',
            badge: 'CONFIDENT / AGGRESSIVE',
            quote: `"Data korelasi terowongan angin kami sangat agresif. Kami siap menekan mobil hingga batas maksimal sejak Q1 dan menantang barisan terdepan!"`,
            effectSummary: 'Driver Morale ↑ (+0.15s Bonus Pace di Qualifying)',
            riskSummary: 'Ekspektasi Tinggi: Menuntut hasil Top-6 saat Checkered Flag',
          },
          {
            type: 'HUMBLE',
            badge: 'HUMBLE / DIPLOMATIC',
            quote: `"Kami belajar banyak dari telemetri balapan terakhir. Kuncinya adalah menjaga manajemen ban dan ritme balap yang konsisten sepanjang ${circuit.totalLaps} lap."`,
            effectSummary: 'Mental Stability ↑ (Consistency meningkat, -25% risiko crash/spin)',
            riskSummary: 'Aman: Menjaga ketenangan kedua pembalap di bawah tekanan',
          },
          {
            type: 'SPONSOR',
            badge: 'PRAISE R&D / SPONSORS',
            quote: `"Para insinyur R&D di pabrik dan dukungan finansial sponsor kami membuat paket upgrade ini terwujud. Kru pit kami juga siap tampil tercepat!"`,
            effectSummary: 'Bonus Sponsor Instan +$250,000 & Pit Stop -0.2s lebih cepat',
            riskSummary: 'Menambah anggaran R&D langsung ke kas tim',
          },
        ],
      },
      {
        index: 2,
        journalistName: 'Roberto Chinchero',
        outlet: 'Autosport & Motorsport International',
        targetRole: `Team Principal & Head of Race Strategy`,
        contextTag: q3Context,
        questionText: q3Text,
        options: [
          {
            type: 'CONFIDENT',
            badge: 'CONFIDENT / AGGRESSIVE',
            quote: `"Baik lintasan kering maupun basah, pembalap kami memiliki keberanian pengereman terbaik di grid. Kami akan menyerang di setiap kesempatan overtake!"`,
            effectSummary: 'Driver Morale ↑ (+0.15s Bonus Pace di Qualifying)',
            riskSummary: 'Ekspektasi Tinggi: Tekanan media meningkat jika gagal Top-6',
          },
          {
            type: 'HUMBLE',
            badge: 'HUMBLE / DIPLOMATIC',
            quote: `"Karakteristik ${circuit.name} tidak memberi ruang bagi kesalahan kecil. Kami menginstruksikan pembalap untuk menjaga margin keamanan di kerb dan zona basah."`,
            effectSummary: 'Mental Stability ↑ (Consistency meningkat, -25% risiko crash/spin)',
            riskSummary: 'Aman: Sangat efektif mencegah kerusakan Front Wing & DNF',
          },
          {
            type: 'SPONSOR',
            badge: 'PRAISE R&D / SPONSORS',
            quote: `"Sistem radar telemetri mitra teknologi kami dan latihan intensif kru pit stop membuat kami sangat percaya diri mengeksekusi pit stop tercepat minggu ini!"`,
            effectSummary: 'Bonus Sponsor Instan +$250,000 & Pit Stop -0.2s lebih cepat',
            riskSummary: 'Keuntungan finansial langsung & efisiensi pit lane',
          },
        ],
      },
    ];
  }, [
    avgPartLevel,
    circuit.country,
    circuit.name,
    circuit.pitLossTime,
    circuit.totalLaps,
    circuit.tyreWearMultiplier,
    climateSpec.label,
    currentRoundIndex,
    driver1?.code,
    driver1?.name,
    driver2?.code,
    driver2?.name,
    hasWetForecast,
    lastRace,
    peakProjectedWetness,
    playerWccPos,
    playerWccPts,
    seasonNumber,
    teamName,
  ]);

  const answeredCount = Object.keys(mediaDayBuffs.answeredQuestions).length;
  const allAnswered = answeredCount >= 3;

  const handleSelectOption = (questionIndex: number, choice: MediaDayChoiceType) => {
    const res = answerMediaDayQuestion(questionIndex, choice);
    if (res.newlyAnswered && choice === 'SPONSOR') {
      grantMediaDaySponsorBonus(250_000);
    }
  };

  const handleProceedToFP1 = () => {
    // Jika masih ada pertanyaan yang belum dijawab, jawab otomatis dengan opsi HUMBLE (aman)
    for (let i = 0; i < 3; i++) {
      if (!mediaDayBuffs.answeredQuestions[i]) {
        answerMediaDayQuestion(i, 'HUMBLE');
      }
    }
    proceedFromMediaDayToFP();
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto p-4 flex flex-col gap-5">
      {/* HEADER THURSDAY MEDIA DAY PRESS CONFERENCE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: `${teamColor}20`,
              borderColor: `${teamColor}60`,
            }}
          >
            <Mic className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-[10px] font-bold uppercase tracking-widest">
                THURSDAY MEDIA DAY • FIA PRESS CONFERENCE
              </span>
              <span className="text-xs font-mono text-zinc-400 uppercase">
                ROUND {currentRoundIndex + 1} / {seasonCalendar.length} • {circuit.officialName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
              Pre-Weekend Press Conference — {teamName}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Jawab 3 pertanyaan jurnalis F1 sebelum memulai sesi Free Practice. Setiap pernyataan memberikan efek langsung pada{' '}
              <strong className="text-zinc-200">Qualifying Pace</strong>,{' '}
              <strong className="text-zinc-200">Driver Consistency</strong>, atau{' '}
              <strong className="text-zinc-200">Bonus Sponsor & Kecepatan Kru Pit Stop</strong>!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">Team Reputation:</span>
            <strong className="text-amber-300">{mediaDayBuffs.teamReputation}%</strong>
          </div>

          <button
            type="button"
            onClick={handleProceedToFP1}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition cursor-pointer ${
              allAnswered
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            <span>
              {allAnswered
                ? 'Proceed to Free Practice (FP1)'
                : `Skip / Proceed to FP1 (${answeredCount}/3 Answered)`}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BAR RINGKASAN BUFF AKTIF AKHIR PEKAN INI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-400">
                Driver Morale (Qualy Pace)
              </div>
              <div className="font-mono text-sm font-extrabold text-white">
                {mediaDayBuffs.qualyPaceBonusSeconds > 0
                  ? `-${mediaDayBuffs.qualyPaceBonusSeconds.toFixed(2)}s / Lap`
                  : '0.00s (Neutral)'}
              </div>
            </div>
          </div>
          {mediaDayBuffs.highExpectationCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
              Target Top-6
            </span>
          )}
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-400">
                Driver Consistency (Crash Risk)
              </div>
              <div className="font-mono text-sm font-extrabold text-emerald-300">
                {mediaDayBuffs.consistencyCrashReduction > 0
                  ? `-${Math.round(mediaDayBuffs.consistencyCrashReduction * 100)}% Incident Risk`
                  : 'Standard Risk'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-400">
                Pit Crew Morale (Pit Stop Time)
              </div>
              <div className="font-mono text-sm font-extrabold text-sky-300">
                {mediaDayBuffs.pitStopTimeReductionSeconds > 0
                  ? `-${mediaDayBuffs.pitStopTimeReductionSeconds.toFixed(1)}s Faster Pit`
                  : 'Standard Pit Time'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-400">
                Instant Media Sponsor Cash
              </div>
              <div className="font-mono text-sm font-extrabold text-amber-300">
                +${mediaDayBuffs.sponsorBonusEarned.toLocaleString('en-US')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DAFTAR 3 PERTANYAAN JURNALIS F1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {questions.map((q) => {
          const selectedChoice = mediaDayBuffs.answeredQuestions[q.index];

          return (
            <div
              key={q.index}
              className={`bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between gap-4 transition ${
                selectedChoice
                  ? 'border-emerald-500/50 bg-zinc-900'
                  : 'border-zinc-800'
              }`}
            >
              {/* Header Jurnalis & Pertanyaan */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-sky-300 font-bold">
                      QUESTION #{q.index + 1} • {q.outlet}
                    </span>
                    <h3 className="text-sm font-extrabold text-white mt-1.5 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{q.journalistName}</span>
                    </h3>
                  </div>

                  {selectedChoice ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> ANSWERED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                      AWAITING RESPONSE
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-zinc-500" />
                    To: <strong className="text-zinc-200">{q.targetRole}</strong>
                  </span>
                  <span className="text-amber-300/90 font-semibold">{q.contextTag}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 text-xs sm:text-sm text-zinc-200 leading-relaxed italic">
                  &ldquo;{q.questionText}&rdquo;
                </div>
              </div>

              {/* 3 Pilihan Jawaban */}
              <div className="space-y-2.5 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                  Select Official Press Statement:
                </div>

                {q.options.map((opt) => {
                  const isChosen = selectedChoice === opt.type;
                  const isLockedOut = Boolean(selectedChoice && !isChosen);

                  const badgeColors =
                    opt.type === 'CONFIDENT'
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : opt.type === 'HUMBLE'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                  return (
                    <button
                      key={opt.type}
                      type="button"
                      disabled={Boolean(selectedChoice)}
                      onClick={() => handleSelectOption(q.index, opt.type)}
                      className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                        isChosen
                          ? 'bg-zinc-800/95 border-emerald-400'
                          : isLockedOut
                          ? 'bg-zinc-950/40 border-zinc-800/50 opacity-45 cursor-not-allowed'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border uppercase ${badgeColors}`}
                        >
                          {opt.badge}
                        </span>
                        {isChosen && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> SELECTED
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-200 leading-snug">{opt.quote}</p>

                      <div className="pt-1 border-t border-zinc-800 flex flex-col gap-0.5 font-mono text-[10px]">
                        <span className="text-emerald-400 font-bold">
                          ✦ {opt.effectSummary}
                        </span>
                        <span className="text-zinc-400">{opt.riskSummary}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER CALL TO ACTION */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-300">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            {allAnswered
              ? 'Seluruh pernyataan pers telah tercatat! Efek morale pembalap, konsistensi, dan bonus kru pit stop siap diterapkan sepanjang akhir pekan ini.'
              : `Jawab ketiga pertanyaan jurnalis di atas (${answeredCount}/3 terjawab) untuk mengaktifkan efek buff akhir pekan sebelum menuju Free Practice.`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleProceedToFP1}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition cursor-pointer"
        >
          <span>PROCEED TO FREE PRACTICE (FP1)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
