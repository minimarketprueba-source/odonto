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
