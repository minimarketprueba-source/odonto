import { describe, expect, it, vi } from 'vitest';
import {
  PUNTOS_CEFALOMETRICOS,
  SECUENCIA_RICKETTS,
  alinearPlantillaASNaMe,
  calcularAnalisisCefalometrico,
  calcularAnalisisFrontalRicketts,
  calcularBolton,
  calcularNance,
  calcularSintesisRicketts,
  detectarContornoAnatomicoEnCanvas,
  generarContornosAnatomicosSvg,
  generarPlantillaCanonica,
} from '../cefalometria-calculos';
import {
  generarInformeClinicoExpertoLocal,
  validarYCompletarPuntosIA,
} from '../cefalometria-ia';
import type { CoordenadaPunto, PuntosCefalometricosMap } from '@/types/cefalometria';

// Coordenadas de imagen: x hacia la derecha, y hacia ABAJO, como en la pantalla.
// Un vector que forma `grados` con la horizontal hacia adelante, apuntando arriba.
function desde(p: CoordenadaPunto, largo: number, grados: number): CoordenadaPunto {
  const r = (grados * Math.PI) / 180;
  return { x: p.x + largo * Math.cos(r), y: p.y - largo * Math.sin(r) };
}

const medir = (puntos: PuntosCefalometricosMap, sigla: string, pxPorMm?: number) =>
  calcularAnalisisCefalometrico(puntos, { distanciaRealMm: 10, pixelesPorMm: pxPorMm }).find(
    (m) => m.sigla === sigla
  );

function espejo(puntos: PuntosCefalometricosMap): PuntosCefalometricosMap {
  return Object.fromEntries(Object.entries(puntos).map(([k, p]) => [k, { x: 1000 - p.x, y: p.y }]));
}

describe('ángulos que pasan de 90°', () => {
  // Incisivo superior inclinado 20° hacia adelante (borde abajo-adelante) e
  // inferior 30° hacia adelante (borde arriba-adelante): entre los dos hay
  // 180 - 20 - 30 = 130°, un interincisivo normal.
  const U1A = { x: 500, y: 400 };
  const L1A = { x: 500, y: 600 };
  const puntos: PuntosCefalometricosMap = {
    U1A,
    U1I: desde(U1A, 100, -(90 - 20)),
    L1A,
    L1I: desde(L1A, 100, 90 - 30),
    Me: { x: 520, y: 650 },
    Go: { x: 300, y: 650 },
  };

  it('interincisivo normal da ~130°, no un ángulo agudo', () => {
    const m = medir(puntos, 'Interincisivo');
    expect(m?.valor).toBeCloseTo(130, 0);
    expect(m?.interpretacion).toBe('Inclinación normal');
  });

  it('IMPA de un incisivo proinclinado pasa de 90°', () => {
    // Plano mandibular horizontal: el incisivo a 60° del piso hacia adelante
    // forma 180 - 60 = 120° con la parte posterior del plano.
    const m = medir(puntos, 'IMPA');
    expect(m?.valor).toBeCloseTo(120, 0);
    expect(m?.interpretacion).toBe('Proinclinación inferior');
  });

  it('da lo mismo si el paciente mira hacia el otro lado', () => {
    const e = espejo(puntos);
    expect(medir(e, 'Interincisivo')?.valor).toBeCloseTo(130, 0);
    expect(medir(e, 'IMPA')?.valor).toBeCloseTo(120, 0);
  });
});

describe('diagnóstico esquelético principal', () => {
  it('calcula ANB cuando están marcados S, N, A y B', () => {
    const m = medir(
      {
        S: { x: 0, y: 0 },
        N: { x: 100, y: 0 },
        A: { x: 150, y: 50 },
        B: { x: 150, y: 100 },
      },
      'ANB'
    );

    expect(m?.interpretacion).toBe('Clase II Esquelética');
  });

  it('calcula FMA cuando están marcados Po, Or, Go y Me', () => {
    const m = medir(
      {
        Po: { x: 0, y: 0 },
        Or: { x: 100, y: 0 },
        Go: { x: 0, y: 0 },
        Me: { x: 100, y: 100 },
      },
      'FMA'
    );

    expect(m?.interpretacion).toBe('Hiperdivergente (Mordida abierta / Dolicofacial)');
  });
});

describe('eje facial de Ricketts', () => {
  const base: PuntosCefalometricosMap = {
    Ba: { x: 300, y: 500 },
    N: { x: 700, y: 500 }, // Ba-N horizontal
    Pt: { x: 450, y: 450 },
  };

  it('Pt-Gn perpendicular a Ba-N da 90°', () => {
    const m = medir({ ...base, Gn: { x: 450, y: 800 } }, 'Eje Facial');
    expect(m?.valor).toBeCloseTo(90, 0);
  });

  it('mentón hacia adelante da más de 90° (crecimiento horizontal)', () => {
    const m = medir({ ...base, Gn: { x: 550, y: 800 } }, 'Eje Facial');
    expect(m!.valor).toBeGreaterThan(93);
    expect(m?.interpretacion).toBe('Crecimiento horizontal / Cierre');
  });
});

describe('labios a la línea E', () => {
  // Línea E vertical en x = 600; 10 px = 1 mm.
  const puntos: PuntosCefalometricosMap = {
    S: { x: 300, y: 300 },
    N: { x: 600, y: 280 }, // mira a la derecha
    Pn: { x: 600, y: 400 },
    Pog_b: { x: 600, y: 700 },
    UL: { x: 560, y: 520 }, // 4 mm por detrás
    LL: { x: 610, y: 580 }, // 1 mm por delante
  };

  it('conserva el signo: detrás es negativo, delante positivo', () => {
    expect(medir(puntos, 'UL-E (mm)', 10)?.valor).toBe(-4);
    expect(medir(puntos, 'LL-E (mm)', 10)?.valor).toBe(1);
    expect(medir(puntos, 'LL-E (mm)', 10)?.interpretacion).toBe('Labio inferior protrusivo');
  });

  it('el signo no depende de hacia dónde mira el paciente', () => {
    const e = espejo(puntos);
    expect(medir(e, 'UL-E (mm)', 10)?.valor).toBe(-4);
    expect(medir(e, 'LL-E (mm)', 10)?.valor).toBe(1);
  });

  it('sin calibrar no informa milímetros', () => {
    expect(medir(puntos, 'UL-E (mm)')).toBeUndefined();
  });
});

describe('análisis de Ricketts', () => {
  // Paciente mirando a la derecha. Frankfort horizontal (Po → Or hacia adelante).
  const base: PuntosCefalometricosMap = {
    S: { x: 300, y: 250 },
    Po: { x: 200, y: 400 },
    Or: { x: 600, y: 400 },
    N: { x: 650, y: 300 },
  };

  it('ángulo facial: 90° con N-Pog perpendicular a Frankfort', () => {
    const m = medir({ ...base, Pog: { x: 650, y: 800 } }, 'Ángulo facial');
    expect(m?.valor).toBeCloseTo(90, 0);
  });

  it('ángulo facial: crece con el mentón adelantado (tendencia Clase III)', () => {
    const atras = medir({ ...base, Pog: { x: 560, y: 800 } }, 'Ángulo facial')!;
    const adelante = medir({ ...base, Pog: { x: 700, y: 800 } }, 'Ángulo facial')!;
    expect(adelante.valor).toBeGreaterThan(atras.valor);
    expect(atras.interpretacion).toMatch(/retruida/);
  });

  it('profundidad maxilar: crece con A adelante', () => {
    const atras = medir({ ...base, A: { x: 630, y: 550 } }, 'Prof. maxilar')!;
    const adelante = medir({ ...base, A: { x: 680, y: 550 } }, 'Prof. maxilar')!;
    expect(adelante.valor).toBeGreaterThan(atras.valor);
  });

  it('altura facial inferior: el ángulo ANS-Xi-PM', () => {
    // Xi en el origen, ANS a 0° y PM a -47° (hacia abajo y adelante).
    const Xi = { x: 300, y: 500 };
    const rad = (47 * Math.PI) / 180;
    const m = medir({ ...base, Xi, ANS: { x: 500, y: 500 },
      PM: { x: 300 + 200 * Math.cos(rad), y: 500 + 200 * Math.sin(rad) } }, 'AFI');
    expect(m?.valor).toBeCloseTo(47, 0);
    expect(m?.interpretacion).toBe('Altura facial inferior normal');
  });

  it('arco mandibular: 26° cuando el cuerpo se desvía 26° del eje del cóndilo', () => {
    // DC arriba-atrás de Xi: la prolongación DC→Xi baja a 45° hacia adelante.
    // El cuerpo (Xi→PM) va 26° más horizontal: a 19° por debajo de la horizontal.
    const Xi = { x: 300, y: 500 };
    const DC = { x: 200, y: 400 };
    const rad = (19 * Math.PI) / 180;
    const PM = { x: 300 + 200 * Math.cos(rad), y: 500 + 200 * Math.sin(rad) };
    const m = medir({ ...base, Xi, DC, PM }, 'Arco mandibular');
    expect(m?.valor).toBeCloseTo(26, 0);
    expect(m?.interpretacion).toBe('Arco mandibular normal');
  });

  it('convexidad: A por delante de N-Pog es positiva, por detrás negativa', () => {
    const plano = { ...base, Pog: { x: 650, y: 800 } };
    expect(medir({ ...plano, A: { x: 670, y: 550 } }, 'Convexidad', 10)?.valor).toBe(2);
    expect(medir({ ...plano, A: { x: 630, y: 550 } }, 'Convexidad', 10)?.valor).toBe(-2);
  });

  it('las medidas quedan agrupadas por análisis', () => {
    const r = calcularAnalisisCefalometrico(
      { ...base, A: { x: 660, y: 550 }, B: { x: 640, y: 750 }, Pog: { x: 650, y: 800 } },
      { distanciaRealMm: 10 }
    );
    expect(r.find((m) => m.sigla === 'ANB')?.analisis).toBe('Steiner');
    expect(r.find((m) => m.sigla === 'Ángulo facial')?.analisis).toBe('Ricketts');
  });

  it('calcula los 33 factores completos de Ricketts y genera síntesis VERT para plan de tratamiento', () => {
    const completos: PuntosCefalometricosMap = {
      S: { x: 350, y: 280 },
      N: { x: 750, y: 280 },
      Ba: { x: 250, y: 480 },
      Po: { x: 200, y: 400 },
      Or: { x: 650, y: 400 },
      Pt: { x: 500, y: 360 },
      DC: { x: 300, y: 460 },
      Xi: { x: 420, y: 580 },
      ANS: { x: 730, y: 490 },
      PNS: { x: 480, y: 490 },
      A: { x: 720, y: 530 },
      U6D: { x: 570, y: 580 },
      L6D: { x: 600, y: 620 },
      U6C: { x: 590, y: 595 },
      L6C: { x: 590, y: 605 },
      PmO: { x: 660, y: 600 },
      U3C: { x: 675, y: 595 },
      L3C: { x: 695, y: 605 },
      U1A: { x: 680, y: 510 },
      U1I: { x: 730, y: 615 },
      L1I: { x: 705, y: 590 },
      L1A: { x: 670, y: 710 },
      B: { x: 690, y: 690 },
      PM: { x: 705, y: 720 },
      Pog: { x: 710, y: 750 },
      Gn: { x: 700, y: 780 },
      Me: { x: 680, y: 790 },
      Go: { x: 380, y: 690 },
      Pn: { x: 850, y: 460 },
      UL: { x: 800, y: 560 },
      Em: { x: 790, y: 590 },
      LL: { x: 810, y: 625 },
      Pog_b: { x: 790, y: 750 },
    };

    const res = calcularAnalisisCefalometrico(completos, { distanciaRealMm: 10, pixelesPorMm: 10 });
    const factores = res.filter((m) => m.factorNumero != null).map((m) => m.factorNumero);
    expect(factores).toHaveLength(33);
    for (let i = 1; i <= 33; i++) {
      expect(factores).toContain(i);
    }

    // Verificar medidas dentarias sobre plano oclusal horizontal
    expect(res.find((m) => m.sigla === 'Relación molar')?.valor).toBe(-3);
    expect(res.find((m) => m.sigla === 'Relación canina')?.valor).toBe(-2);
    expect(res.find((m) => m.sigla === 'Overjet')?.valor).toBe(2.5);
    expect(res.find((m) => m.sigla === 'Overbite')?.valor).toBe(2.5);

    const sintesis = calcularSintesisRicketts(res);
    expect(sintesis.factoresMedidos).toBe(33);
    expect(sintesis.vert).not.toBeNull();
    expect(sintesis.biotipo).not.toMatch(/Pendiente/);

    // McNamara, Steiner extra y Wits
    expect(res.find((m) => m.sigla === 'McNamara-A')?.analisis).toBe('McNamara');
    expect(res.find((m) => m.sigla === 'McNamara-Pog')?.analisis).toBe('McNamara');
    expect(res.find((m) => m.sigla === 'Wits')?.analisis).toBe('Wits');
    expect(res.find((m) => m.sigla === 'Go-Gn-Sn')?.analisis).toBe('Steiner');
    const u1pp = res.find((m) => m.sigla === '1-Plano Maxilar');
    expect(u1pp?.analisis).toBe('Steiner');
    expect(u1pp?.valor).toBeGreaterThan(100);
    expect(res.find((m) => m.sigla === 'FM')?.analisis).toBe('Steiner');
    expect(res.find((m) => m.sigla === 'MM')?.analisis).toBe('Steiner');
    expect(res.find((m) => m.sigla === '1 Plano Mandib.')?.analisis).toBe('Steiner');
    expect(res.find((m) => m.sigla === '1-NA (mm)')?.analisis).toBe('Steiner');
    expect(res.find((m) => m.sigla === '1-NB (mm)')?.analisis).toBe('Steiner');

    for (const id of ['SOr', 'R1', 'R2', 'R3', 'R4']) {
      expect(PUNTOS_CEFALOMETRICOS.some((p) => p.id === id)).toBe(true);
      expect(SECUENCIA_RICKETTS).toContain(id);
    }
    expect(SECUENCIA_RICKETTS[0]).toBe('S');
  });

  it('calcula los 18 factores del Análisis Frontal de Ricketts', () => {
    const frontal: PuntosCefalometricosMap = {
      Z_izq: { x: 200, y: 200 },
      Z_der: { x: 800, y: 200 },
      ZA_izq: { x: 100, y: 300 },
      ZA_der: { x: 900, y: 300 },
      Cg: { x: 500, y: 150 },
      NC_izq: { x: 420, y: 350 },
      NC_der: { x: 580, y: 350 },
      ANS_f: { x: 500, y: 450 },
      J_izq: { x: 320, y: 460 },
      J_der: { x: 680, y: 460 },
      Ag_izq: { x: 280, y: 650 },
      Ag_der: { x: 720, y: 650 },
      Me_f: { x: 500, y: 780 },
      U6_izq: { x: 340, y: 550 },
      U6_der: { x: 660, y: 550 },
      L6_izq: { x: 355, y: 560 },
      L6_der: { x: 645, y: 560 },
      L3_izq: { x: 430, y: 570 },
      L3_der: { x: 570, y: 570 },
      U1M: { x: 500, y: 565 },
      L1M: { x: 500, y: 575 },
    };

    const res = calcularAnalisisFrontalRicketts(frontal, { distanciaRealMm: 10, pixelesPorMm: 10 });
    expect(res).toHaveLength(18);
    expect(res.every((m) => m.analisis === 'Ricketts Frontal')).toBe(true);
    for (let i = 1; i <= 18; i++) {
      expect(res.some((m) => m.factorNumero === i)).toBe(true);
    }

    // Mordida cruzada posterior izquierda: U6_izq más medial (hacia el centro) que L6_izq
    const cruzada = calcularAnalisisFrontalRicketts(
      { ...frontal, U6_izq: { x: 370, y: 550 }, L6_izq: { x: 340, y: 560 } },
      { distanciaRealMm: 10, pixelesPorMm: 10 }
    );
    const relIzq = cruzada.find((m) => m.sigla === 'Rel. molar izq.');
    expect(relIzq?.valor).toBe(-3);
    expect(relIzq?.enNorma).toBe(false);
    expect(relIzq?.interpretacion).toBe('Mordida cruzada posterior izq.');
  });

  it('calcula análisis de Bolton (total 91,3% y anterior 77,2%) según tabla UAP', () => {
    // Max 12 = 94 (tabla mand = 85.8); paciente mand = 88.8 -> exceso mandibular 3.0 mm
    const excMand = calcularBolton({ max12: 94, mand12: 88.8, max6: 46, mand6: 35.5 });
    expect(excMand.relacion12).toBe(94.5);
    expect(excMand.exceso12Tipo).toBe('mandibular');
    expect(excMand.exceso12Tabla).toBe(85.8);
    expect(excMand.exceso12Mm).toBe(3);
    expect(excMand.relacion6).toBe(77.2);
    expect(excMand.exceso6Tipo).toBe('normal');

    // Max 12 = 98, Mand 12 = 85.8 (< 91.3%) -> exceso maxilar: 98 - 94 = 4.0 mm
    const excMax = calcularBolton({ max12: 98, mand12: 85.8, max6: 48, mand6: 34.7 });
    expect(excMax.exceso12Tipo).toBe('maxilar');
    expect(excMax.exceso12Tabla).toBe(94);
    expect(excMax.exceso12Mm).toBe(4);
    expect(excMax.exceso6Tipo).toBe('maxilar');
    expect(excMax.exceso6Tabla).toBe(45);
    expect(excMax.exceso6Mm).toBe(3);
  });

  it('calcula análisis de Nance y discrepancia total/final', () => {
    const nance = calcularNance({
      epSuperior: 72,
      erSuperior: 75,
      epInferior: 64,
      erInferior: 68,
      filas: {
        discrepancia_33: { negativo: 4 },
        curva_spee: { negativo: 1.5 },
        stripping: { positivo: 2 },
        expansion: { positivo: 1.5 },
      },
      dc: -2,
      exod: 14,
    });
    expect(nance.dmSuperior).toBe(-3);
    expect(nance.dmInferior).toBe(-4);
    expect(nance.totalPositivo).toBe(3.5);
    expect(nance.totalNegativo).toBe(5.5);
    expect(nance.totalNeto).toBe(-2);
    expect(nance.dt).toBe(-6);
    expect(nance.ef).toBe(8);
  });

  it('genera plantilla canónica con proporciones anatómicas reales y alinea a S-Na-Me', () => {
    const puntos = generarPlantillaCanonica(1000, 800, false);
    const escala = 800 / 230; // ~3.478 px/mm
    const res = calcularAnalisisCefalometrico(puntos, {
      distanciaRealMm: 30,
      pixelesPorMm: escala,
    });

    const val = (sigla: string) => res.find((m) => m.sigla === sigla)?.valor;
    expect(res.filter((m) => m.factorNumero != null)).toHaveLength(33);
    expect(val('SNA')).toBeCloseTo(82, 0);
    expect(val('SNB')).toBeCloseTo(80, 0);
    expect(val('ANB')).toBeCloseTo(2, 0);
    expect(val('Eje Facial')).toBeCloseTo(90, 0);
    expect(val('Ángulo facial')).toBeCloseTo(87, 0);
    expect(val('Plano mandibular')).toBeCloseTo(26, 0);
    expect(val('AFI')).toBeCloseTo(47, 0);
    expect(val('Interincisivo')).toBeCloseTo(130, 0);
    expect(val('Overjet')).toBeCloseTo(2.5, 0);
    expect(val('Overbite')).toBeCloseTo(2.5, 0);
    expect(val('Relación molar')).toBeCloseTo(-3, 0);

    // Mover anclas S, N, Me traslada/escala los demás puntos y respeta ignorarIds
    const aManual = { x: 777, y: 444 };
    const reubicados = alinearPlantillaASNaMe(
      { ...puntos, A: aManual },
      1000,
      800,
      {
        S: { x: puntos.S.x + 30, y: puntos.S.y + 20 },
        N: { x: puntos.N.x + 30, y: puntos.N.y + 20 },
        Me: { x: puntos.Me.x + 30, y: puntos.Me.y + 20 },
      },
      new Set(['A'])
    );
    expect(reubicados.A).toEqual(aManual);
    expect(reubicados.U1I.x).toBe(puntos.U1I.x + 30);
    expect(reubicados.U1I.y).toBe(puntos.U1I.y + 20);
  });

  it('genera contornos anatómicos SVG estilo WebCeph a partir de la plantilla', () => {
    const puntos = generarPlantillaCanonica(1000, 800, false);
    const contornos = generarContornosAnatomicosSvg(puntos);
    const ids = contornos.map((c) => c.id);
    for (const esperado of ['perfil_blando', 'mandibula', 'maxilar', 'incisivo_sup', 'incisivo_inf']) {
      expect(ids).toContain(esperado);
    }
    expect(contornos.every((c) => c.d.startsWith('M '))).toBe(true);
  });

  it('valida puntos devueltos por IA, descarta atípicos y genera informe clínico experto', () => {
    const validados = validarYCompletarPuntosIA(
      {
        S: { x: 507, y: 180 },
        N: { x: 763, y: 127 },
        Me: { x: 752, y: 574 },
        A: { x: 795, y: 345 }, // dentro de tolerancia anatómica
        Pog: { x: 40, y: 40 }, // valor atípico en esquina superior izquierda -> debe descartarse
      },
      1005,
      803,
      false
    );

    expect(validados.A).toEqual({ x: 795, y: 345 });
    expect(validados.Pog.x).toBeGreaterThan(700);
    expect(Object.keys(validados).length).toBeGreaterThanOrEqual(40);

    const cal = { distanciaRealMm: 30, pixelesPorMm: 3.77 };
    const med = calcularAnalisisCefalometrico(validados, cal);
    const sint = calcularSintesisRicketts(med);
    const informe = generarInformeClinicoExpertoLocal(med, sint, cal);

    expect(informe).toContain('BIOTIPO Y PATRÓN ESQUELÉTICO');
    expect(informe).toContain('ANÁLISIS DENTO-ALVEOLAR');
    expect(informe).toContain('ORIENTACIÓN TERAPÉUTICA SUGERIDA');
  });

  it('detecta el contorno facial y cortical ósea desplazados e ignora cadena metálica lateral', () => {
    const dim = 200;
    const data = new Uint8ClampedArray(dim * dim * 4);
    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        let lum = 12; // aire de fondo
        // Perfil craneofacial sintético desplazado a la izquierda (Sn ≈ 132, Pn ≈ 146, Pog_b ≈ 134)
        let bordeBlando = -1;
        if (y >= 40 && y < 74) bordeBlando = 126 + Math.round(((y - 40) / 34) * 20); // dorso nasal hasta Pn=146
        else if (y >= 74 && y < 90) bordeBlando = 146 - Math.round(((y - 74) / 16) * 14); // Pn -> Sn=132
        else if (y >= 90 && y < 104) bordeBlando = 132 + Math.round(Math.sin(((y - 90) / 14) * Math.PI) * 5); // labio sup
        else if (y >= 104 && y < 118) bordeBlando = 131 + Math.round(Math.sin(((y - 104) / 14) * Math.PI) * 5); // labio inf
        else if (y >= 118 && y < 130) bordeBlando = 126; // surco B'
        else if (y >= 130 && y <= 165) bordeBlando = 134 - Math.round(((y - 130) / 35) * 8); // Pog' hasta mentón inferior

        if (x >= 25 && bordeBlando > 0 && x <= bordeBlando) {
          lum = x <= bordeBlando - 10 ? 185 : 90; // hueso cortical detrás de tejido blando
        }
        // Cadena metálica vertical fina (3px de ancho) delante del rostro en x=176..178
        if (x >= 176 && x <= 178 && y >= 20 && y <= 185) {
          lum = 240;
        }
        const i = (y * dim + x) * 4;
        data[i] = lum;
        data[i + 1] = lum;
        data[i + 2] = lum;
        data[i + 3] = 255;
      }
    }

    const origCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: dim,
          height: dim,
          getContext: () => ({
            drawImage: () => {},
            getImageData: () => ({ data }),
          }),
        } as unknown as HTMLCanvasElement;
      }
      return origCreate(tag);
    }) as typeof document.createElement);

    try {
      const fakeImg = { naturalWidth: 1000, naturalHeight: 800 } as HTMLImageElement;
      const detectados = detectarContornoAnatomicoEnCanvas(fakeImg, false);
      // En una placa desplazada a la izquierda, Pn debe seguir x ≈ 146/200*1000 = 730 (NO quedarse en 876 ni atraparse en cadena x=885)
      expect(detectados.Pn.x).toBeGreaterThan(700);
      expect(detectados.Pn.x).toBeLessThan(770);
      expect(detectados.Sn.x).toBeLessThan(detectados.Pn.x);
      expect(detectados.Pog.x).toBeLessThan(detectados.Pog_b.x);
    } finally {
      spy.mockRestore();
    }
  });
});
