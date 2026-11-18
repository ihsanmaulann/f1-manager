/**
 * Data SVG Unik untuk 24 Sirkuit Resmi Kalender F1 2026
 * ViewBox standar: 0 0 800 500
 * Setiap sirkuit memiliki siluet lintasan ikonik, jalur Pit Lane paralel,
 * nama tikungan ikonik, serta penanda zona sektor.
 */

export interface IconicCornerMarker {
  name: string;
  /** Persentase posisi sepanjang SVG path (0 - 100) */
  pct: number;
  dx?: number;
  dy?: number;
}

export interface TrackSvgGeometry {
  svgPath: string;
  pitLanePath: string;
  tagline: string;
  iconicCorners: IconicCornerMarker[];
}

export const TRACK_SVG_PATHS: Record<string, TrackSvgGeometry> = {
  // 1. Australia - Albert Park (Melbourne): Danau di tengah, lurusan cepat & chicane teknis
  australia: {
    svgPath:
      'M 210 385 L 430 385 C 455 385, 465 360, 485 350 L 535 355 C 565 360, 585 385, 620 375 C 660 365, 685 320, 675 275 L 650 225 C 635 190, 665 155, 645 120 C 625 90, 565 85, 530 110 L 455 150 C 415 170, 355 150, 315 115 C 275 85, 220 80, 185 105 L 145 145 C 125 170, 155 205, 130 235 C 105 265, 95 310, 115 345 C 135 375, 170 385, 210 385 Z',
    pitLanePath: 'M 235 385 L 255 360 L 405 360 L 425 385',
    tagline: 'LAKESIDE FAST STREET CIRCUIT',
    iconicCorners: [
      { name: 'Jones / Brabham', pct: 18, dy: 16 },
      { name: 'Clark Chicane', pct: 50, dy: -14 },
      { name: 'Ascari Fast Sweep', pct: 76, dy: -14 },
    ],
  },

  // 2. China - Shanghai International Circuit: Tikungan spiral snail T1-T3 ikonik & back straight 1.17km
  china: {
    svgPath:
      'M 220 390 L 470 390 C 555 390, 595 335, 560 285 C 535 250, 480 265, 485 305 C 490 335, 540 345, 590 325 C 655 300, 695 220, 665 160 C 635 105, 545 95, 480 120 C 425 140, 385 185, 345 180 C 305 175, 285 115, 230 95 C 175 75, 115 105, 105 155 C 95 205, 155 225, 200 235 L 545 205 L 175 295 C 125 310, 105 350, 135 375 C 155 390, 185 390, 220 390 Z',
    pitLanePath: 'M 240 390 L 260 366 L 440 366 L 460 390',
    tagline: 'SHANGHAI SPIRAL & KM BACKSTRAIGHT',
    iconicCorners: [
      { name: 'The Snail (T1-T3)', pct: 19, dy: 16 },
      { name: 'Back Straight (1.17km)', pct: 68, dy: -14 },
      { name: 'Final Hairpin', pct: 86, dy: 16 },
    ],
  },

  // 3. Japan - Suzuka: Sirkuit angka 8 (crossover bridge) + Esses + Spoon Curve + 130R
  suzuka: {
    svgPath:
      'M 380 355 L 615 355 C 670 355, 695 315, 675 265 C 655 225, 610 235, 585 205 C 565 180, 585 145, 560 120 C 535 95, 495 105, 470 130 L 395 215 L 315 295 C 275 330, 215 335, 180 305 C 145 275, 155 225, 195 200 L 250 170 C 285 150, 290 105, 250 85 C 205 65, 125 85, 100 135 C 75 185, 115 235, 175 245 L 330 220 L 440 285 C 460 305, 435 355, 380 355 Z',
    pitLanePath: 'M 420 355 L 440 378 L 585 378 L 605 355',
    tagline: 'ICONIC FIGURE-8 CROSSOVER CIRCUIT',
    iconicCorners: [
      { name: 'S-Curves', pct: 22, dy: -14 },
      { name: 'Spoon Curve', pct: 58, dy: -14 },
      { name: '130R & Casio Triangle', pct: 80, dy: 16 },
    ],
  },

  // 4. Bahrain - Sakhir: Hairpin T1 tajam, bagian tengah teknis berliku, dan 3 lurusan DRS
  bahrain: {
    svgPath:
      'M 190 400 L 570 400 C 600 400, 610 380, 585 360 L 515 315 C 480 295, 505 265, 545 255 L 635 235 C 675 225, 685 170, 650 135 C 615 100, 550 100, 505 125 L 415 175 C 380 195, 345 175, 355 140 C 365 105, 325 80, 285 95 C 245 110, 255 165, 290 195 C 315 215, 285 245, 240 245 L 155 245 C 110 245, 95 290, 120 330 L 145 370 C 160 392, 175 400, 190 400 Z',
    pitLanePath: 'M 235 400 L 255 376 L 525 376 L 545 400',
    tagline: 'SAKHIR DESERT NIGHT CHALLENGE',
    iconicCorners: [
      { name: 'Turn 1 Hairpin', pct: 18, dy: 16 },
      { name: 'Turn 10 Double Apex', pct: 56, dy: -14 },
      { name: 'Final Corner', pct: 86, dy: 16 },
    ],
  },

  // 5. Saudi Arabia - Jeddah Corniche: Siluet pipih memanjang super cepat menyusuri Laut Merah
  jeddah: {
    svgPath:
      'M 135 340 L 385 330 C 445 325, 495 295, 560 295 L 655 295 C 705 295, 725 250, 695 210 C 670 175, 620 185, 575 205 L 485 225 C 430 235, 385 210, 330 210 C 275 210, 235 230, 185 205 C 145 185, 110 175, 95 210 C 75 250, 85 340, 135 340 Z',
    pitLanePath: 'M 155 340 L 175 316 L 350 310 L 370 332',
    tagline: 'HIGH-SPEED RED SEA CORNICHE RIBBON',
    iconicCorners: [
      { name: 'T1-T2 Chicane', pct: 18, dy: 16 },
      { name: 'T13 Banked Hairpin', pct: 46, dy: -14 },
      { name: 'T27 Sweeper', pct: 84, dy: -14 },
    ],
  },

  // 6. Miami - Hard Rock Stadium: Mengelilingi stadion dengan 3 zona lurus panjang & chicane lambat
  miami: {
    svgPath:
      'M 180 375 L 545 375 C 595 375, 625 340, 600 300 C 580 265, 535 280, 515 250 C 495 220, 555 205, 595 190 C 645 170, 665 115, 615 95 L 470 95 C 425 95, 395 145, 345 145 C 295 145, 275 110, 225 110 C 175 110, 145 140, 155 175 L 180 235 C 195 270, 145 270, 120 295 C 95 320, 125 375, 180 375 Z',
    pitLanePath: 'M 225 375 L 245 352 L 505 352 L 525 375',
    tagline: 'HARD ROCK STADIUM STREET SPRINT',
    iconicCorners: [
      { name: 'Turn 1 Sweeper', pct: 20, dy: 16 },
      { name: 'T14-T15 Chicane', pct: 54, dy: -14 },
      { name: 'Backstraight (T17)', pct: 78, dy: -14 },
    ],
  },

  // 7. Canada - Gilles-Villeneuve (Montreal): Pulau lurus memanjang, hairpin & Wall of Champions
  montreal: {
    svgPath:
      'M 145 335 L 335 335 C 370 335, 380 365, 415 365 C 450 365, 470 335, 505 335 L 620 335 C 675 335, 705 290, 675 245 C 645 205, 580 230, 535 215 C 485 200, 445 170, 390 170 C 335 170, 295 195, 240 190 C 185 185, 145 145, 110 175 C 75 205, 85 260, 105 300 C 115 325, 125 335, 145 335 Z',
    pitLanePath: 'M 170 335 L 190 312 L 320 312 L 335 335',
    tagline: 'ILE NOTRE-DAME & WALL OF CHAMPIONS',
    iconicCorners: [
      { name: 'Senna S-Bend', pct: 18, dy: 16 },
      { name: 'Epingle Hairpin', pct: 46, dy: -14 },
      { name: 'Wall of Champions', pct: 90, dy: 16 },
    ],
  },

  // 8. Monaco - Monte Carlo: Berkelok rapat mengelilingi pelabuhan, Loews Hairpin & Terowongan
  monaco: {
    svgPath:
      'M 190 375 L 350 310 C 380 295, 395 265, 375 235 L 325 185 C 305 165, 345 130, 395 115 C 445 100, 505 100, 540 125 C 565 145, 525 175, 545 195 C 565 215, 610 195, 635 215 C 660 235, 650 280, 605 295 L 495 315 C 455 322, 435 355, 385 370 C 335 385, 280 390, 235 410 C 195 425, 145 415, 140 390 C 135 370, 165 385, 190 375 Z',
    pitLanePath: 'M 215 385 L 245 408 L 350 375 L 375 355',
    tagline: 'MONTE CARLO HARBOR & TIGHT BARRIERS',
    iconicCorners: [
      { name: 'Sainte Devote & Casino', pct: 24, dy: -14 },
      { name: 'Grand Hotel Hairpin', pct: 45, dy: -14 },
      { name: 'Swimming Pool & Rascasse', pct: 78, dy: 16 },
    ],
  },

  // 9. Barcelona-Catalunya: Teknis cepat dengan tikungan panjang T3 & Elf hairpin T10
  barcelona: {
    svgPath:
      'M 210 385 L 555 385 C 605 385, 635 345, 615 300 C 595 255, 545 270, 525 230 C 505 190, 570 155, 550 115 C 530 75, 455 75, 405 105 L 315 160 C 275 185, 215 145, 175 160 C 135 175, 145 225, 175 255 C 205 285, 125 305, 115 340 C 105 370, 155 385, 210 385 Z',
    pitLanePath: 'M 245 385 L 265 362 L 515 362 L 535 385',
    tagline: 'AERO BENCHMARK & LONG RIGHT-HANDERS',
    iconicCorners: [
      { name: 'Turn 3 Sweeper', pct: 26, dy: 16 },
      { name: 'Campsa High-Speed', pct: 54, dy: -14 },
      { name: 'Final Two Corners', pct: 88, dy: 16 },
    ],
  },

  // 10. Austria - Red Bull Ring (Spielberg): Segitiga pegunungan pendek, 3 lurusan cepat
  austria: {
    svgPath:
      'M 185 375 L 550 375 C 595 375, 615 335, 590 295 L 445 140 C 415 105, 365 95, 325 120 L 220 185 C 185 205, 225 255, 185 280 L 125 315 C 95 335, 125 375, 185 375 Z',
    pitLanePath: 'M 225 375 L 245 350 L 505 350 L 525 375',
    tagline: 'STYRIAN ALPS SHORT POWER TRACK',
    iconicCorners: [
      { name: 'Niki Lauda Kurve (T1)', pct: 22, dy: 16 },
      { name: 'Remus Uphill Hairpin', pct: 42, dy: -14 },
      { name: 'Rindt Fast Sweeper', pct: 84, dy: 16 },
    ],
  },

  // 11. Silverstone: Maggotts-Becketts-Chapel yang mengalir cepat & Hangar Straight
  silverstone: {
    svgPath:
      'M 210 390 L 455 390 C 495 390, 515 350, 485 320 L 440 275 C 415 250, 455 215, 495 225 C 535 235, 575 265, 625 245 C 675 225, 690 155, 640 120 L 525 85 C 475 70, 440 120, 390 135 C 340 150, 295 105, 240 105 C 185 105, 145 150, 165 205 L 200 285 C 215 315, 155 335, 150 365 C 145 385, 175 390, 210 390 Z',
    pitLanePath: 'M 235 390 L 255 366 L 425 366 L 445 390',
    tagline: 'HOME OF BRITISH MOTORSPORT',
    iconicCorners: [
      { name: 'Copse Corner', pct: 24, dy: 16 },
      { name: 'Maggotts & Becketts', pct: 48, dy: -14 },
      { name: 'Hangar Straight & Stowe', pct: 72, dy: -14 },
    ],
  },

  // 12. Belgium - Spa-Francorchamps: Siluet memanjang ikonik Eau Rouge, Kemmel, Pouhon, Bus Stop
  spa: {
    svgPath:
      'M 170 365 L 265 365 C 295 365, 315 340, 330 310 L 375 225 C 395 190, 435 160, 485 140 L 635 90 C 675 78, 705 110, 685 150 C 665 185, 605 185, 565 220 C 525 255, 545 305, 495 330 L 385 375 C 345 390, 305 420, 250 420 L 145 415 C 100 412, 95 365, 170 365 Z',
    pitLanePath: 'M 155 365 L 175 342 L 265 342 L 285 365',
    tagline: 'EAU ROUGE • KEMMEL STRAIGHT • ARDENNES',
    iconicCorners: [
      { name: 'Eau Rouge & Raidillon', pct: 18, dy: 16 },
      { name: 'Les Combes / Kemmel', pct: 40, dy: -14 },
      { name: 'Pouhon & Bus Stop', pct: 78, dy: 16 },
    ],
  },

  // 13. Hungary - Hungaroring: Tikungan beruntun rapat bergaya gokart teknis
  hungary: {
    svgPath:
      'M 210 380 L 535 380 C 585 380, 610 335, 580 295 C 550 260, 495 275, 470 245 C 445 215, 505 170, 545 145 C 585 120, 570 80, 515 80 C 465 80, 435 125, 390 125 C 345 125, 325 90, 275 100 C 225 110, 215 165, 255 195 C 285 218, 235 255, 195 265 C 155 275, 115 310, 130 350 C 145 375, 175 380, 210 380 Z',
    pitLanePath: 'M 245 380 L 265 356 L 495 356 L 515 380',
    tagline: 'BUDAPEST TECHNICAL TWISTY BOWL',
    iconicCorners: [
      { name: 'Turn 1 Hairpin', pct: 22, dy: 16 },
      { name: 'Turn 4 Blind Crest', pct: 46, dy: -14 },
      { name: 'Final Sector Loop', pct: 84, dy: 16 },
    ],
  },

  // 14. Netherlands - Zandvoort: Tikungan miring (banked) Tarzan & jalur pesisir bukit pasir
  zandvoort: {
    svgPath:
      'M 205 385 L 545 385 C 600 385, 625 335, 595 295 C 565 255, 505 275, 490 230 C 475 185, 560 155, 545 110 C 530 70, 455 75, 415 105 C 375 135, 335 175, 285 160 C 235 145, 215 95, 165 115 C 115 135, 125 205, 155 245 C 185 285, 120 315, 125 355 C 130 380, 165 385, 205 385 Z',
    pitLanePath: 'M 240 385 L 260 362 L 505 362 L 525 385',
    tagline: 'BANKED DUNES & ARIE LUYENDYK',
    iconicCorners: [
      { name: 'Tarzanbocht (T1)', pct: 22, dy: 16 },
      { name: 'Scheivlak Dunes', pct: 52, dy: -14 },
      { name: 'Banked Final Bend', pct: 86, dy: 16 },
    ],
  },

  // 15. Italy - Monza: Bentuk sepatu bot ikonik berkecepatan puncak tertinggi
  monza: {
    svgPath:
      'M 210 385 L 585 385 C 640 385, 665 355, 645 320 L 620 295 C 605 280, 625 255, 645 235 C 675 200, 665 120, 595 95 L 495 75 C 455 68, 435 90, 415 105 C 395 120, 375 80, 335 78 L 265 82 C 225 85, 210 120, 200 155 L 170 230 C 155 265, 125 260, 110 290 C 90 335, 130 385, 210 385 Z',
    pitLanePath: 'M 245 385 L 265 360 L 535 360 L 555 385',
    tagline: 'TEMPLE OF SPEED • HIGH VELOCITY',
    iconicCorners: [
      { name: 'Variante del Rettifilo', pct: 20, dy: 16 },
      { name: 'Lesmo 1 & 2', pct: 46, dy: -14 },
      { name: 'Ascari & Parabolica', pct: 82, dy: 16 },
    ],
  },

  // 16. Spain (Madrid 2026) - Madring Street Circuit: Arena pameran IFEMA & bagian miring monumental
  madrid: {
    svgPath:
      'M 190 370 L 495 370 C 545 370, 575 335, 560 290 L 545 245 C 530 205, 595 190, 625 155 C 655 120, 620 80, 560 85 L 420 105 C 365 115, 330 165, 275 160 C 220 155, 185 115, 140 135 C 95 155, 110 220, 140 265 L 155 320 C 160 350, 170 370, 190 370 Z',
    pitLanePath: 'M 225 370 L 245 346 L 460 346 L 480 370',
    tagline: 'NEW 2026 IFEMA MADRING HYBRID',
    iconicCorners: [
      { name: 'Valdebebas Banked', pct: 34, dy: -14 },
      { name: 'IFEMA North Loop', pct: 62, dy: -14 },
      { name: 'Paddock Chicane', pct: 86, dy: 16 },
    ],
  },

  // 17. Azerbaijan - Baku City Circuit: Sudut siku 90 derajat kota tua & main straight 2.2km
  baku: {
    svgPath:
      'M 160 385 L 615 385 C 650 385, 670 360, 665 325 L 650 260 C 640 225, 585 225, 550 250 L 485 290 C 445 310, 420 275, 425 235 L 430 175 C 435 135, 385 115, 335 120 L 220 130 C 175 135, 155 170, 165 210 L 185 275 C 195 305, 145 315, 125 340 C 110 365, 130 385, 160 385 Z',
    pitLanePath: 'M 215 385 L 235 362 L 560 362 L 580 385',
    tagline: 'CASTLE WALLS & 2.2KM MAIN STRAIGHT',
    iconicCorners: [
      { name: 'Turn 1 Braking Zone', pct: 24, dy: 16 },
      { name: 'Old City Castle (T8)', pct: 58, dy: -14 },
      { name: 'Flat-Out T16–T20', pct: 86, dy: 16 },
    ],
  },

  // 18. Singapore - Marina Bay: Sirkuit malam tepi teluk dengan banyak tikungan 90 derajat
  singapore: {
    svgPath:
      'M 195 375 L 485 375 C 525 375, 555 345, 540 310 L 515 265 C 500 240, 560 225, 610 215 C 660 205, 675 150, 635 120 C 595 90, 520 95, 475 125 L 395 175 C 360 195, 325 145, 275 135 C 225 125, 175 150, 165 190 L 150 255 C 140 295, 115 315, 125 350 C 135 370, 165 375, 195 375 Z',
    pitLanePath: 'M 225 375 L 245 352 L 450 352 L 470 375',
    tagline: 'MARINA BAY NIGHT LIGHTS CIRCUIT',
    iconicCorners: [
      { name: 'Sheares & Memorial', pct: 22, dy: 16 },
      { name: 'Raffles Boulevard', pct: 48, dy: -14 },
      { name: 'Anderson Bridge', pct: 80, dy: 16 },
    ],
  },

  // 19. USA - COTA (Austin): Tanjakan Turn 1 tajam, Maggotts-style Esses, back straight panjang
  cota: {
    svgPath:
      'M 185 385 L 485 385 C 515 385, 525 360, 495 340 L 420 290 C 390 270, 420 235, 460 225 C 500 215, 535 235, 580 215 C 625 195, 665 135, 630 100 C 595 65, 515 95, 465 135 L 305 245 C 265 270, 215 225, 175 235 C 135 245, 115 290, 130 335 C 140 370, 160 385, 185 385 Z',
    pitLanePath: 'M 220 385 L 240 362 L 445 362 L 465 385',
    tagline: 'BIG RED TURN 1 & AUSTIN S-CURVES',
    iconicCorners: [
      { name: 'Steep Turn 1 Hairpin', pct: 19, dy: 16 },
      { name: 'Austin S-Curves', pct: 42, dy: -14 },
      { name: 'T12 Hairpin & Stadium', pct: 76, dy: 16 },
    ],
  },

  // 20. Mexico - Autodromo Hermanos Rodriguez: Lurus panjang + S-curves + Stadion Foro Sol
  mexico: {
    svgPath:
      'M 165 380 L 580 380 C 625 380, 645 340, 620 305 L 555 245 C 525 215, 565 170, 540 135 C 515 100, 445 105, 405 135 L 330 190 C 295 215, 250 185, 215 205 C 180 225, 185 265, 155 290 L 115 320 C 90 340, 115 380, 165 380 Z',
    pitLanePath: 'M 210 380 L 230 356 L 530 356 L 550 380',
    tagline: 'HIGH ALTITUDE & FORO SOL STADIUM',
    iconicCorners: [
      { name: 'T1–T3 Complex', pct: 24, dy: 16 },
      { name: 'High-Speed Esses', pct: 52, dy: -14 },
      { name: 'Foro Sol Stadium', pct: 84, dy: 16 },
    ],
  },

  // 21. Brazil - Interlagos (Sao Paulo): Senna S menurun, Laranjinha, & menanjak lurus ke garis finis
  interlagos: {
    svgPath:
      'M 210 380 L 530 380 C 575 380, 595 340, 570 305 C 545 270, 495 295, 470 265 C 445 235, 515 185, 555 150 C 595 115, 560 75, 495 85 L 350 115 C 295 128, 255 185, 210 210 C 165 235, 115 255, 115 305 C 115 350, 155 380, 210 380 Z',
    pitLanePath: 'M 245 380 L 265 356 L 490 356 L 510 380',
    tagline: 'SENNA S & ANTI-CLOCKWISE ROLLERCOASTER',
    iconicCorners: [
      { name: 'Senna S (T1–T2)', pct: 20, dy: 16 },
      { name: 'Descida do Lago', pct: 46, dy: -14 },
      { name: 'Juncao & Subida', pct: 84, dy: 16 },
    ],
  },

  // 22. USA - Las Vegas Strip Circuit: Lurus Strip super panjang + Sphere loop
  'las-vegas': {
    svgPath:
      'M 165 355 L 485 355 C 545 355, 585 320, 625 295 C 675 265, 695 205, 650 165 C 605 125, 535 145, 490 165 L 185 185 C 130 190, 105 225, 120 265 L 135 315 C 145 342, 150 355, 165 355 Z',
    pitLanePath: 'M 195 355 L 215 332 L 450 332 L 470 355',
    tagline: 'LAS VEGAS BOULEVARD NIGHT SPRINT',
    iconicCorners: [
      { name: 'MSG Sphere Loop', pct: 28, dy: 16 },
      { name: 'The Strip (1.9km)', pct: 60, dy: -14 },
      { name: 'Final Chicane (T14)', pct: 86, dy: 16 },
    ],
  },

  // 23. Qatar - Lusail International Circuit: Tikungan medium-fast mengalir konstan & main straight panjang
  lusail: {
    svgPath:
      'M 190 385 L 575 385 C 630 385, 660 340, 635 295 C 610 250, 540 270, 520 230 C 500 190, 585 160, 575 115 C 565 75, 475 80, 425 110 C 375 140, 325 185, 265 180 C 205 175, 160 130, 130 165 C 100 200, 135 255, 140 305 C 145 345, 155 385, 190 385 Z',
    pitLanePath: 'M 235 385 L 255 362 L 530 362 L 550 385',
    tagline: 'HIGH-DOWNFORCE FLOWING DESERT CORNERS',
    iconicCorners: [
      { name: 'Turn 1 Braking', pct: 22, dy: 16 },
      { name: 'Triple Apex Right (T12–T14)', pct: 56, dy: -14 },
      { name: 'Turn 16 Exit', pct: 88, dy: 16 },
    ],
  },

  // 24. Abu Dhabi - Yas Marina Circuit: Hairpin Utara, Back Straight & Marina Hotel
  'yas-marina': {
    svgPath:
      'M 195 375 L 475 375 C 520 375, 540 345, 515 310 L 475 260 C 455 235, 495 190, 550 185 L 635 180 C 685 175, 700 115, 650 95 L 340 105 C 280 108, 250 160, 200 175 C 150 190, 115 225, 125 275 L 145 335 C 155 362, 175 375, 195 375 Z',
    pitLanePath: 'M 225 375 L 245 352 L 440 352 L 460 375',
    tagline: 'YAS ISLAND TWILIGHT FINALE',
    iconicCorners: [
      { name: 'North Hairpin (T5)', pct: 28, dy: 16 },
      { name: 'Back Straight (T9)', pct: 54, dy: -14 },
      { name: 'Yas Hotel Marina', pct: 86, dy: 16 },
    ],
  },
};

export const DEFAULT_TRACK_GEOMETRY: TrackSvgGeometry = TRACK_SVG_PATHS.monza;

export const getTrackGeometryById = (circuitId: string): TrackSvgGeometry => {
  return TRACK_SVG_PATHS[circuitId] ?? DEFAULT_TRACK_GEOMETRY;
};

