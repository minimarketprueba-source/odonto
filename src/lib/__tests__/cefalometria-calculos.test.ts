import { describe, expect, it } from 'vitest';
import { calcularAnalisisCefalometrico } from '../cefalometria-calculos';
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
});
