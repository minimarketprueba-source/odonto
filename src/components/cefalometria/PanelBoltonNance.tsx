import React, { useMemo, useState } from 'react';
import {
  DatosBolton,
  DatosNance,
  MedicionResultado,
} from '@/types/cefalometria';
import {
  FILAS_NANCE,
  TABLA_BOLTON_12,
  TABLA_BOLTON_6,
  calcularBolton,
  calcularNance,
} from '@/lib/cefalometria-calculos';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PanelBoltonNanceProps {
  mediciones: MedicionResultado[];
  bolton?: DatosBolton;
  nance?: DatosNance;
  onChangeBolton: (next: DatosBolton) => void;
  onChangeNance: (next: DatosNance) => void;
  tema?: 'dark' | 'light';
  subtabInicial?: 'uap' | 'bolton' | 'nance';
}

const DIENTES_SUP_12 = ['16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26'];
const DIENTES_INF_12 = ['46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36'];
const DIENTES_SUP_6 = new Set(['13', '12', '11', '21', '22', '23']);
const DIENTES_INF_6 = new Set(['43', '42', '41', '31', '32', '33']);

interface FilaUap {
  etiqueta: string;
  sigla?: string;
  norma: string;
  desv: string;
  cambio: string;
}

const SECCIONES_UAP: { titulo: string; filas: FilaUap[] }[] = [
  {
    titulo: 'RICKETTS · Maxilar Inferior',
    filas: [
      { etiqueta: 'Eje Facial', sigla: 'Eje Facial', norma: '90°', desv: '± 3°', cambio: 'Const.' },
      { etiqueta: 'Profundidad Facial', sigla: 'Ángulo facial', norma: '87°', desv: '± 3°', cambio: '+ 0.33°' },
      { etiqueta: 'Ang. Plano mandibular', sigla: 'Plano mandibular', norma: '26°', desv: '± 4.5°', cambio: '- 0.33°' },
      { etiqueta: 'Altura Facial Inferior', sigla: 'AFI', norma: '47°', desv: '± 4°', cambio: 'Const.' },
      { etiqueta: 'Arco Mandibular', sigla: 'Arco mandibular', norma: '26°', desv: '± 4°', cambio: '+ 0.5°' },
    ],
  },
  {
    titulo: 'RICKETTS · Maxilar Superior',
    filas: [
      { etiqueta: 'Convexidad Facial', sigla: 'Convexidad', norma: '2 mm', desv: '± 2 mm', cambio: '- 0.33°' },
      { etiqueta: 'Profundidad Maxilar', sigla: 'Prof. maxilar', norma: '90°', desv: '± 3°', cambio: 'Const.' },
    ],
  },
  {
    titulo: 'RICKETTS · Dientes y Perfil',
    filas: [
      { etiqueta: 'Incis. Inf. – A Po', sigla: 'L1-APog (mm)', norma: '1 mm', desv: '± 2 mm', cambio: '—' },
      { etiqueta: 'Inclinación Incis. Inferior', sigla: 'L1-APog (°)', norma: '22°', desv: '± 4°', cambio: '—' },
      { etiqueta: 'Ángulo interincisivo', sigla: 'Interincisivo', norma: '130°', desv: '± 6°', cambio: '—' },
      { etiqueta: 'Incis. Inf. – Pl. Oclusal', sigla: 'Extrusión L1', norma: '1.25 mm', desv: '± 2 mm', cambio: '—' },
      { etiqueta: 'Molar superior – PTV', sigla: 'A6-PTV', norma: 'Edad+3', desv: '± 3 mm', cambio: 'Variable' },
      { etiqueta: 'Labio Inf. – Pl. Estético', sigla: 'LL-E (mm)', norma: '- 2 mm', desv: '± 2 mm', cambio: '- 0.2 mm' },
    ],
  },
  {
    titulo: 'MC NAMARA',
    filas: [
      { etiqueta: 'Lín. McNamara – Punto A', sigla: 'McNamara-A', norma: '0 mm ± 1', desv: '± 1 mm', cambio: '—' },
      { etiqueta: 'Lín. McNamara – a Pog.', sigla: 'McNamara-Pog', norma: '-8 a -6 mm', desv: '-4 a 0 mm', cambio: '—' },
    ],
  },
  {
    titulo: 'STEINER',
    filas: [
      { etiqueta: 'SNA', sigla: 'SNA', norma: '82°', desv: '± 2°', cambio: '—' },
      { etiqueta: 'SNB', sigla: 'SNB', norma: '80°', desv: '± 2°', cambio: '—' },
      { etiqueta: 'ANB', sigla: 'ANB', norma: '2°', desv: '± 2°', cambio: '—' },
      { etiqueta: 'Go-Gn-Sn', sigla: 'Go-Gn-Sn', norma: '32°', desv: '± 4°', cambio: '—' },
      { etiqueta: 'FM', sigla: 'FM', norma: '26°', desv: '± 3°', cambio: '—' },
      { etiqueta: 'MM', sigla: 'MM', norma: '28°', desv: '± 3°', cambio: '—' },
      { etiqueta: '1 Plano Maxilar', sigla: '1-Plano Maxilar', norma: '110°', desv: '± 5°', cambio: '—' },
      { etiqueta: '1 Plano Mandib.', sigla: '1 Plano Mandib.', norma: '95°', desv: '± 5°', cambio: '—' },
    ],
  },
  {
    titulo: 'WITS',
    filas: [
      { etiqueta: 'Evaluación de Wits (AO-BO)', sigla: 'Wits', norma: '-1 mm', desv: '± 2 mm', cambio: '—' },
    ],
  },
];

const numOrUndef = (val: string): number | undefined => {
  if (val.trim() === '') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
};

export const PanelBoltonNance: React.FC<PanelBoltonNanceProps> = ({
  mediciones,
  bolton = {},
  nance = {},
  onChangeBolton,
  onChangeNance,
  tema = 'dark',
  subtabInicial = 'uap',
}) => {
  const [subtab, setSubtab] = useState<'uap' | 'bolton' | 'nance'>(subtabInicial);
  const [mostrarDientesBolton, setMostrarDientesBolton] = useState(false);
  const [mostrarTablaBolton, setMostrarTablaBolton] = useState(false);

  const resBolton = useMemo(() => calcularBolton(bolton), [bolton]);
  const resNance = useMemo(() => calcularNance(nance), [nance]);

  const dark = tema === 'dark';
  const cardCls = dark
    ? 'rounded-xl border border-slate-700/60 bg-slate-800/60 p-3 space-y-2.5'
    : 'rounded-xl border bg-card p-4 shadow-sm space-y-3';
  const inputCls = dark
    ? 'h-7 bg-slate-900 border-slate-700 text-xs text-slate-100 px-2'
    : 'h-8 text-xs px-2';
  const mutedCls = dark ? 'text-slate-400' : 'text-muted-foreground';

  const buscarMedicion = (sigla?: string) =>
    sigla ? mediciones.find((m) => m.sigla === sigla) : undefined;

  const actualizarDienteBolton = (pieza: string, valStr: string) => {
    const dientes = { ...(bolton.dientes || {}) };
    const n = numOrUndef(valStr);
    if (n === undefined) delete dientes[pieza];
    else dientes[pieza] = n;

    const sumar = (lista: string[]) =>
      Number(lista.reduce((acc, id) => acc + (dientes[id] || 0), 0).toFixed(1));

    const sumMax12 = sumar(DIENTES_SUP_12);
    const sumMand12 = sumar(DIENTES_INF_12);
    const sumMax6 = sumar(DIENTES_SUP_12.filter((d) => DIENTES_SUP_6.has(d)));
    const sumMand6 = sumar(DIENTES_INF_12.filter((d) => DIENTES_INF_6.has(d)));

    onChangeBolton({
      ...bolton,
      dientes,
      max12: sumMax12 > 0 ? sumMax12 : bolton.max12,
      mand12: sumMand12 > 0 ? sumMand12 : bolton.mand12,
      max6: sumMax6 > 0 ? sumMax6 : bolton.max6,
      mand6: sumMand6 > 0 ? sumMand6 : bolton.mand6,
    });
  };

  const importarDcDesdeCefalometria = () => {
    const l1 = buscarMedicion('L1-APog (mm)');
    if (!l1) return;
    // Regla clínica estándar de Nance/Tweed: 2 * (1 - L1_a_APog) o desviación * 2
    const dcSugerido = Number(((1 - l1.valor) * 2).toFixed(1));
    onChangeNance({ ...nance, dc: dcSugerido });
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Selector de sub-apartado */}
      <div
        className={`flex gap-1 p-1 rounded-lg ${
          dark ? 'bg-slate-800' : 'bg-muted'
        }`}
      >
        {(
          [
            { id: 'uap', label: 'Post-grado UAP' },
            { id: 'bolton', label: 'Bolton' },
            { id: 'nance', label: 'Nance' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubtab(t.id)}
            className={`flex-1 py-1.5 px-2 rounded text-[11px] font-semibold transition-colors ${
              subtab === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : dark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: CEFALOMETRÍA POST-GRADO UAP */}
      {subtab === 'uap' && (
        <div className="space-y-3">
          {SECCIONES_UAP.map((sec) => (
            <div key={sec.titulo} className={cardCls}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                {sec.titulo}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className={`border-b ${dark ? 'border-slate-700/70' : 'border-border'} ${mutedCls}`}>
                      <th className="py-1 text-left font-medium">Medida</th>
                      <th className="py-1 text-center font-medium">Norma</th>
                      <th className="py-1 text-center font-medium">Cambio/año</th>
                      <th className="py-1 text-right font-medium">Inicial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.filas.map((f) => {
                      const m = buscarMedicion(f.sigla);
                      return (
                        <tr
                          key={f.etiqueta}
                          className={`border-b last:border-0 ${
                            dark ? 'border-slate-800' : 'border-border/50'
                          }`}
                        >
                          <td className="py-1.5 pr-1 font-medium">{f.etiqueta}</td>
                          <td className={`py-1.5 text-center ${mutedCls}`}>{f.norma}</td>
                          <td className={`py-1.5 text-center text-[10px] ${mutedCls}`}>{f.cambio}</td>
                          <td className="py-1.5 text-right font-mono font-bold">
                            {m ? (
                              <span
                                className={
                                  m.enNorma === false
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {m.valor} {m.unidad}
                              </span>
                            ) : (
                              <span className={mutedCls}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 2: ANÁLISIS DE BOLTON */}
      {subtab === 'bolton' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMostrarDientesBolton((v) => !v)}
              className="h-7 text-[11px]"
            >
              {mostrarDientesBolton ? 'Ocultar medida por diente' : 'Cargar diente por diente'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMostrarTablaBolton((v) => !v)}
              className="h-7 text-[11px]"
            >
              {mostrarTablaBolton ? 'Ocultar tabla UAP' : 'Ver tabla oficial UAP'}
            </Button>
          </div>

          {mostrarDientesBolton && (
            <div className={cardCls}>
              <p className="font-bold text-cyan-400 text-[11px]">
                Diámetros mesiodistales por pieza (mm)
              </p>
              <div className="space-y-2">
                <p className={`text-[10px] ${mutedCls}`}>Maxilar superior (16 a 26)</p>
                <div className="grid grid-cols-6 gap-1">
                  {DIENTES_SUP_12.map((pieza) => (
                    <div key={pieza} className="space-y-0.5 text-center">
                      <span className={`text-[9px] font-mono ${mutedCls}`}>{pieza}</span>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="mm"
                        value={bolton.dientes?.[pieza] ?? ''}
                        onChange={(e) => actualizarDienteBolton(pieza, e.target.value)}
                        className={`${inputCls} text-center px-1`}
                      />
                    </div>
                  ))}
                </div>
                <p className={`text-[10px] ${mutedCls}`}>Mandíbula inferior (46 a 36)</p>
                <div className="grid grid-cols-6 gap-1">
                  {DIENTES_INF_12.map((pieza) => (
                    <div key={pieza} className="space-y-0.5 text-center">
                      <span className={`text-[9px] font-mono ${mutedCls}`}>{pieza}</span>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="mm"
                        value={bolton.dientes?.[pieza] ?? ''}
                        onChange={(e) => actualizarDienteBolton(pieza, e.target.value)}
                        className={`${inputCls} text-center px-1`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* A - Relación Total 12 dientes */}
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-cyan-400">
                A · Relación Total (12 dientes)
              </span>
              <Badge variant="outline" className="text-[10px]">
                Media 91,3%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className={`block text-[10px] ${mutedCls}`}>12 mand. (mm)</span>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 85.8"
                  value={bolton.mand12 ?? ''}
                  onChange={(e) =>
                    onChangeBolton({ ...bolton, mand12: numOrUndef(e.target.value) })
                  }
                  className={inputCls}
                />
              </label>
              <label className="space-y-1">
                <span className={`block text-[10px] ${mutedCls}`}>12 Max. (mm)</span>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 94.0"
                  value={bolton.max12 ?? ''}
                  onChange={(e) =>
                    onChangeBolton({ ...bolton, max12: numOrUndef(e.target.value) })
                  }
                  className={inputCls}
                />
              </label>
            </div>
            {resBolton.relacion12 !== null && (
              <div
                className={`rounded-lg p-2 text-[11px] ${
                  dark ? 'bg-slate-900/80' : 'bg-muted/60'
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>Índice Total:</span>
                  <span
                    className={
                      resBolton.exceso12Tipo === 'normal'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }
                  >
                    {resBolton.relacion12}%
                  </span>
                </div>
                {resBolton.exceso12Tipo === 'mandibular' && (
                  <p className="mt-1 text-amber-400">
                    &gt; 91,3%: Exceso mandibular de{' '}
                    <strong>{resBolton.exceso12Mm} mm</strong> (paciente {bolton.mand12} − tabla{' '}
                    {resBolton.exceso12Tabla})
                  </p>
                )}
                {resBolton.exceso12Tipo === 'maxilar' && (
                  <p className="mt-1 text-amber-400">
                    &lt; 91,3%: Exceso maxilar de{' '}
                    <strong>{resBolton.exceso12Mm} mm</strong> (paciente {bolton.max12} − tabla{' '}
                    {resBolton.exceso12Tabla})
                  </p>
                )}
                {resBolton.exceso12Tipo === 'normal' && (
                  <p className="mt-1 text-emerald-400">Proporción dentaria total armónica.</p>
                )}
              </div>
            )}
          </div>

          {/* B - Relación Anterior 6 dientes */}
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-cyan-400">
                B · Sector Anterior (6 dientes)
              </span>
              <Badge variant="outline" className="text-[10px]">
                Media 77,2%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className={`block text-[10px] ${mutedCls}`}>6 mand. (mm)</span>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 35.5"
                  value={bolton.mand6 ?? ''}
                  onChange={(e) =>
                    onChangeBolton({ ...bolton, mand6: numOrUndef(e.target.value) })
                  }
                  className={inputCls}
                />
              </label>
              <label className="space-y-1">
                <span className={`block text-[10px] ${mutedCls}`}>6 máx. (mm)</span>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 46.0"
                  value={bolton.max6 ?? ''}
                  onChange={(e) =>
                    onChangeBolton({ ...bolton, max6: numOrUndef(e.target.value) })
                  }
                  className={inputCls}
                />
              </label>
            </div>
            {resBolton.relacion6 !== null && (
              <div
                className={`rounded-lg p-2 text-[11px] ${
                  dark ? 'bg-slate-900/80' : 'bg-muted/60'
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>Índice Anterior:</span>
                  <span
                    className={
                      resBolton.exceso6Tipo === 'normal'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }
                  >
                    {resBolton.relacion6}%
                  </span>
                </div>
                {resBolton.exceso6Tipo === 'mandibular' && (
                  <p className="mt-1 text-amber-400">
                    &gt; 77,2%: Exceso mandibular anterior de{' '}
                    <strong>{resBolton.exceso6Mm} mm</strong> (paciente {bolton.mand6} − tabla{' '}
                    {resBolton.exceso6Tabla})
                  </p>
                )}
                {resBolton.exceso6Tipo === 'maxilar' && (
                  <p className="mt-1 text-amber-400">
                    &lt; 77,2%: Exceso maxilar anterior de{' '}
                    <strong>{resBolton.exceso6Mm} mm</strong> (paciente {bolton.max6} − tabla{' '}
                    {resBolton.exceso6Tabla})
                  </p>
                )}
                {resBolton.exceso6Tipo === 'normal' && (
                  <p className="mt-1 text-emerald-400">Proporción anterior armónica.</p>
                )}
              </div>
            )}
          </div>

          {mostrarTablaBolton && (
            <div className={cardCls}>
              <p className="font-bold text-[11px] text-cyan-400">Tabla de Bolton (UAP)</p>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div>
                  <p className={`font-sans font-semibold mb-1 ${mutedCls}`}>12 Dientes (91,3%)</p>
                  <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                    {TABLA_BOLTON_12.map((r) => (
                      <div key={r.max} className="flex justify-between">
                        <span>Max {r.max}</span>
                        <span>Mand {r.mand.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className={`font-sans font-semibold mb-1 ${mutedCls}`}>6 Dientes (77,2%)</p>
                  <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                    {TABLA_BOLTON_6.map((r) => (
                      <div key={r.max} className="flex justify-between">
                        <span>Max {r.max.toFixed(1)}</span>
                        <span>Mand {r.mand.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: ANÁLISIS DE NANCE */}
      {subtab === 'nance' && (
        <div className="space-y-3">
          {/* Maxilar Superior y Mandibular */}
          <div className={cardCls}>
            <p className="font-bold text-[11px] text-cyan-400">
              Análisis de Nance · Modelos (mm)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="font-semibold text-[10px]">MAXILAR SUPERIOR</p>
                <label className="block">
                  <span className={`text-[10px] ${mutedCls}`}>Espacio Presente (E.P.)</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={nance.epSuperior ?? ''}
                    onChange={(e) =>
                      onChangeNance({ ...nance, epSuperior: numOrUndef(e.target.value) })
                    }
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={`text-[10px] ${mutedCls}`}>Espacio Requerido (E.R.)</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={nance.erSuperior ?? ''}
                    onChange={(e) =>
                      onChangeNance({ ...nance, erSuperior: numOrUndef(e.target.value) })
                    }
                    className={inputCls}
                  />
                </label>
                <div className="flex justify-between text-[11px] pt-0.5">
                  <span className={mutedCls}>D.M. Sup:</span>
                  <span className="font-mono font-bold">
                    {resNance.dmSuperior !== null ? `${resNance.dmSuperior} mm` : '—'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-[10px]">MANDIBULAR</p>
                <label className="block">
                  <span className={`text-[10px] ${mutedCls}`}>Espacio Presente (E.P.)</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={nance.epInferior ?? ''}
                    onChange={(e) =>
                      onChangeNance({ ...nance, epInferior: numOrUndef(e.target.value) })
                    }
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={`text-[10px] ${mutedCls}`}>Espacio Requerido (E.R.)</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={nance.erInferior ?? ''}
                    onChange={(e) =>
                      onChangeNance({ ...nance, erInferior: numOrUndef(e.target.value) })
                    }
                    className={inputCls}
                  />
                </label>
                <div className="flex justify-between text-[11px] pt-0.5">
                  <span className={mutedCls}>D.M. Inf:</span>
                  <span className="font-mono font-bold">
                    {resNance.dmInferior !== null ? `${resNance.dmInferior} mm` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de 11 filas Positivo (+) / Negativo (-) */}
          <div className={cardCls}>
            <p className="font-bold text-[11px] text-cyan-400">
              Balance de Discrepancias (Positivo + / Negativo -)
            </p>
            <div className="space-y-1">
              <div className={`grid grid-cols-[1fr_64px_64px] gap-1.5 text-[10px] font-semibold ${mutedCls}`}>
                <span>Concepto</span>
                <span className="text-center">Pos (+)</span>
                <span className="text-center">Neg (-)</span>
              </div>
              {FILAS_NANCE.map((fila) => {
                const fVal = nance.filas?.[fila.id] || {};
                const actualizar = (campo: 'positivo' | 'negativo', valStr: string) => {
                  const filas = { ...(nance.filas || {}) };
                  filas[fila.id] = { ...fVal, [campo]: numOrUndef(valStr) };
                  onChangeNance({ ...nance, filas });
                };
                return (
                  <div
                    key={fila.id}
                    className="grid grid-cols-[1fr_64px_64px] gap-1.5 items-center"
                  >
                    <span className="text-[11px] truncate" title={fila.label}>
                      {fila.label}
                    </span>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={fVal.positivo ?? ''}
                      onChange={(e) => actualizar('positivo', e.target.value)}
                      className={`${inputCls} text-center`}
                    />
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={fVal.negativo ?? ''}
                      onChange={(e) => actualizar('negativo', e.target.value)}
                      className={`${inputCls} text-center`}
                    />
                  </div>
                );
              })}

              <div
                className={`grid grid-cols-[1fr_64px_64px] gap-1.5 pt-1.5 mt-1 border-t font-bold text-[11px] ${
                  dark ? 'border-slate-700' : 'border-border'
                }`}
              >
                <span>Total Parcial</span>
                <span className="text-center font-mono text-emerald-400">
                  +{resNance.totalPositivo}
                </span>
                <span className="text-center font-mono text-amber-400">
                  -{resNance.totalNegativo}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 font-bold text-xs">
                <span>TOTAL</span>
                <span className="font-mono text-primary">
                  {resNance.totalNeto > 0 ? `+${resNance.totalNeto}` : resNance.totalNeto} mm
                </span>
              </div>
            </div>
          </div>

          {/* Recuadro CALCULO DE DISCREPANCIA */}
          <div className={cardCls}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[11px] text-cyan-400">
                Cálculo de Discrepancia
              </span>
              {buscarMedicion('L1-APog (mm)') && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={importarDcDesdeCefalometria}
                  className="h-6 text-[10px] px-2"
                >
                  Calcular DC de L1-APog
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-0.5">
                <span className={`text-[10px] ${mutedCls}`}>DM (mm)</span>
                <Input
                  type="number"
                  step="0.5"
                  placeholder={resNance.dmInferior !== null ? String(resNance.dmInferior) : '0'}
                  value={nance.dm ?? ''}
                  onChange={(e) => onChangeNance({ ...nance, dm: numOrUndef(e.target.value) })}
                  className={inputCls}
                />
              </label>
              <label className="space-y-0.5">
                <span className={`text-[10px] ${mutedCls}`}>DC (mm)</span>
                <Input
                  type="number"
                  step="0.5"
                  value={nance.dc ?? ''}
                  onChange={(e) => onChangeNance({ ...nance, dc: numOrUndef(e.target.value) })}
                  className={inputCls}
                />
              </label>
              <label className="space-y-0.5">
                <span className={`text-[10px] ${mutedCls}`}>EXOD. (mm)</span>
                <Input
                  type="number"
                  step="0.5"
                  value={nance.exod ?? ''}
                  onChange={(e) => onChangeNance({ ...nance, exod: numOrUndef(e.target.value) })}
                  className={inputCls}
                />
              </label>
            </div>
            <div
              className={`grid grid-cols-2 gap-2 pt-1.5 border-t text-[11px] font-bold ${
                dark ? 'border-slate-700' : 'border-border'
              }`}
            >
              <div className="flex justify-between">
                <span className={mutedCls}>DT (DM+DC):</span>
                <span className="font-mono">
                  {resNance.dt !== null ? `${resNance.dt} mm` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={mutedCls}>EF (Esp. Final):</span>
                <span className="font-mono text-primary">
                  {resNance.ef !== null ? `${resNance.ef} mm` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
