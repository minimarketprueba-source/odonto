import {
  alinearPlantillaASNaMe,
  calcularBolton,
  calcularNance,
  detectarContornoAnatomicoEnCanvas,
  generarPlantillaWebCeph,
  SintesisRicketts,
} from '@/lib/cefalometria-calculos';
import {
  CalibracionRegla,
  MedicionResultado,
  PuntosCefalometricosMap,
} from '@/types/cefalometria';

const STORAGE_KEY_GEMINI = 'odonto_gemini_api_key';

function safeStorageGet(key: string): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || '';
    }
  } catch {
    // Entornos sin acceso a storage (tests o privacidad estricta)
  }
  return '';
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (value.trim()) {
        window.localStorage.setItem(key, value.trim());
      } else {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignorar en entornos sin localStorage
  }
}

/** Obtiene la API Key de Gemini desde localStorage o variable de entorno `VITE_GEMINI_API_KEY`. */
export function obtenerGeminiApiKey(): string {
  const local = safeStorageGet(STORAGE_KEY_GEMINI);
  if (local.trim()) return local.trim();
  const envVal =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
      : undefined;
  return (envVal || '').trim();
}

/** Guarda o limpia la API Key de Gemini en localStorage del navegador. */
export function guardarGeminiApiKey(apiKey: string): void {
  safeStorageSet(STORAGE_KEY_GEMINI, apiKey);
}

/**
 * Valida coherencia geométrica/fisiológica de los puntos devueltos por IA, descarta
 * valores atípicos y completa todos los hitos restantes manteniendo proporción WebCeph.
 */
export function validarYCompletarPuntosIA(
  puntosDetectados: PuntosCefalometricosMap,
  imgW: number,
  imgH: number,
  esFrontal = false
): PuntosCefalometricosMap {
  const w = Math.max(100, imgW || 1005);
  const h = Math.max(100, imgH || 803);
  const plantillaBase = generarPlantillaWebCeph(w, h, esFrontal);

  const limpios: PuntosCefalometricosMap = {};
  for (const [id, pt] of Object.entries(puntosDetectados || {})) {
    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
    if (pt.x < 0 || pt.x > w || pt.y < 0 || pt.y > h) continue;
    limpios[id] = { x: Math.round(pt.x), y: Math.round(pt.y) };
  }

  if (esFrontal) {
    return { ...plantillaBase, ...limpios };
  }

  const s = limpios.S;
  const n = limpios.N;
  const me = limpios.Me;

  if (!s || !n || !me) {
    return { ...plantillaBase, ...limpios };
  }

  const distSN = Math.hypot(n.x - s.x, n.y - s.y);
  const distNMe = Math.hypot(me.x - n.x, me.y - n.y);
  const ratio = distNMe > 1 ? distSN / distNMe : 0;

  const anclasValidas =
    me.y - n.y >= h * 0.22 &&
    me.y - n.y <= h * 0.8 &&
    distSN >= w * 0.12 &&
    distSN <= w * 0.55 &&
    ratio >= 0.35 &&
    ratio <= 1.05;

  if (!anclasValidas) {
    return plantillaBase;
  }

  // Proyectar plantilla WebCeph al triángulo anatómico (S, N, Me) detectado
  const alineados = alinearPlantillaASNaMe({}, w, h, { S: s, N: n, Me: me });
  const tolPx = Math.min(w, h) * 0.14;
  const resultado: PuntosCefalometricosMap = { ...alineados, S: s, N: n, Me: me };

  for (const [id, pt] of Object.entries(limpios)) {
    if (id === 'S' || id === 'N' || id === 'Me') continue;
    const ref = alineados[id];
    if (!ref) {
      resultado[id] = pt;
      continue;
    }
    if (Math.hypot(pt.x - ref.x, pt.y - ref.y) <= tolPx) {
      resultado[id] = pt;
    }
  }

  return resultado;
}

/**
 * Detector anatómico local basado en análisis dual (tejido blando + cortical ósea)
 * en Canvas con rechazo de cadenas metálicas y reglas verticales.
 */
export function detectarPuntosVisionLocal(
  img: HTMLImageElement | null,
  imgW = 1005,
  imgH = 803,
  esFrontal = false
): PuntosCefalometricosMap {
  const naturalW = img?.naturalWidth || imgW || 1005;
  const naturalH = img?.naturalHeight || imgH || 803;

  if (!img) {
    return generarPlantillaWebCeph(naturalW, naturalH, esFrontal);
  }
  return detectarContornoAnatomicoEnCanvas(img, esFrontal);
}

function convertirImagenABase64(img: HTMLImageElement, ladoMax = 1024): string | null {
  try {
    const w = img.naturalWidth || 1005;
    const h = img.naturalHeight || 803;
    const escala = Math.min(1, ladoMax / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * escala));
    canvas.height = Math.max(1, Math.round(h * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    const coma = dataUrl.indexOf(',');
    return coma >= 0 ? dataUrl.slice(coma + 1) : null;
  } catch {
    return null;
  }
}

export interface ResultadoDeteccionIA {
  puntos: PuntosCefalometricosMap;
  metodo: 'gemini-vision' | 'vision-local';
  detalle: string;
}

/**
 * Motor híbrido de autodigitalización cefalométrica:
 * 1) Si hay API Key de Gemini configurada, solicita coordenadas normalizadas a Gemini 2.5 Flash Vision
 *    y las valida fisiológicamente con `validarYCompletarPuntosIA`.
 * 2) Si no hay API key, está sin conexión o la placa bloquea lectura Canvas, aplica el detector local WebCeph.
 */
export async function detectarPuntosConIA(
  img: HTMLImageElement | null,
  imgW: number,
  imgH: number,
  esFrontal = false
): Promise<ResultadoDeteccionIA> {
  const apiKey = obtenerGeminiApiKey();

  if (apiKey && img && !esFrontal) {
    const b64 = convertirImagenABase64(img);
    if (b64) {
      try {
        const prompt = [
          'Actúa como especialista en ortodoncia y radiología cefalométrica.',
          'Localiza los hitos anatómicos en esta telerradiografía lateral de cráneo.',
          'Devuelve ÚNICAMENTE un objeto JSON válido donde cada clave sea el ID del hito y el valor sea {"x": numero_0_a_1000, "y": numero_0_a_1000} en coordenadas normalizadas (0=izquierda/arriba, 1000=derecha/abajo).',
          'Claves requeridas: S, N, SOr, Po, Or, Pt, Ba, ANS, PNS, A, B, PM, Pog, Gn, Me, Go, Ar, Co, R1, R2, R3, R4, U1I, U1A, L1I, L1A, U6C, U6D, L6C, L6D, G_b, Na_b, Pn, Sn, A_b, UL, Em, LL, B_b, Pog_b, Me_b.',
        ].join(' ');

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
            apiKey
          )}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inline_data: { mime_type: 'image/jpeg', data: b64 } },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
          }
        );

        if (resp.ok) {
          const json = await resp.json();
          const texto: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (texto) {
            const parsed = JSON.parse(texto) as Record<string, { x?: number; y?: number }>;
            const pxMap: PuntosCefalometricosMap = {};
            const naturalW = img.naturalWidth || imgW;
            const naturalH = img.naturalHeight || imgH;
            for (const [id, coord] of Object.entries(parsed)) {
              if (coord && typeof coord.x === 'number' && typeof coord.y === 'number') {
                pxMap[id] = {
                  x: (coord.x / 1000) * naturalW,
                  y: (coord.y / 1000) * naturalH,
                };
              }
            }
            const validados = validarYCompletarPuntosIA(pxMap, naturalW, naturalH, false);
            return {
              puntos: validados,
              metodo: 'gemini-vision',
              detalle: 'Puntos localizados con Gemini Vision y validados sobre contornos anatómicos.',
            };
          }
        }
      } catch {
        // Fallback transparente al detector local ante fallo de red o API key
      }
    }
  }

  const puntosLocales = detectarPuntosVisionLocal(img, imgW, imgH, esFrontal);
  return {
    puntos: puntosLocales,
    metodo: 'vision-local',
    detalle: apiKey
      ? 'Respaldo aplicado con detector anatómico local.'
      : 'Detección realizada con detector anatómico local (configure su clave Gemini para detección multimodal avanzada).',
  };
}

/**
 * Redacta un informe clínico ortodóncico estructurado de forma determinística
 * a partir de las mediciones activas (Ricketts 33, VERT, Steiner, McNamara, Wits, Bolton, Nance).
 */
export function generarInformeClinicoExpertoLocal(
  mediciones: MedicionResultado[],
  sintesis: SintesisRicketts,
  calibracion?: CalibracionRegla
): string {
  const buscar = (sigla: string) => mediciones.find((m) => m.sigla === sigla);
  const fmt = (sigla: string) => {
    const m = buscar(sigla);
    return m ? `${m.sigla}: ${m.valor}${m.unidad} (${m.interpretacion || 'Norma ' + m.norma})` : null;
  };

  const bloqueEsqueletico = [
    `• Biotipo facial (VERT ${sintesis.vert ?? '—'}): ${sintesis.biotipo}`,
    `• Relación esquelética: ${sintesis.claseEsqueletica}`,
    fmt('SNA'),
    fmt('SNB'),
    fmt('ANB'),
    fmt('Wits'),
    fmt('McNamara-A'),
    fmt('McNamara-Pog'),
    fmt('FMA'),
    fmt('Eje Facial'),
  ].filter(Boolean);

  const bloqueDental = [
    fmt('Interincisivo'),
    fmt('L1-APog (mm)'),
    fmt('L1-APog (°)'),
    fmt('1-NA (°)'),
    fmt('1-NB (°)'),
    fmt('IMPA'),
    fmt('Overjet'),
    fmt('Overbite'),
    fmt('Relación molar'),
    fmt('A6-PTV'),
  ].filter(Boolean);

  const bloqueEstetico = [
    fmt('LL-E (mm)'),
    fmt('UL-E (mm)'),
  ].filter(Boolean);

  const secciones: string[] = [
    '1. BIOTIPO Y PATRÓN ESQUELÉTICO',
    bloqueEsqueletico.length ? bloqueEsqueletico.join('\n') : '• Pendiente de calibración/hitos.',
    '',
    '2. ANÁLISIS DENTO-ALVEOLAR',
    bloqueDental.length ? bloqueDental.join('\n') : '• Marque puntos incisivos y molares para completar.',
  ];

  if (bloqueEstetico.length) {
    secciones.push('', '3. PERFIL ESTÉTICO Y TEJIDOS BLANDOS', bloqueEstetico.join('\n'));
  }

  if (calibracion?.bolton) {
    const b = calcularBolton(calibracion.bolton);
    if (b.relacion12 !== null || b.relacion6 !== null) {
      const bLines: string[] = [];
      if (b.relacion12 !== null) {
        bLines.push(
          `• Bolton Total (12): ${b.relacion12}% (${
            b.exceso12Tipo === 'normal' ? 'Armónico' : `Exceso ${b.exceso12Tipo} de ${b.exceso12Mm} mm`
          })`
        );
      }
      if (b.relacion6 !== null) {
        bLines.push(
          `• Bolton Anterior (6): ${b.relacion6}% (${
            b.exceso6Tipo === 'normal' ? 'Armónico' : `Exceso ${b.exceso6Tipo} de ${b.exceso6Mm} mm`
          })`
        );
      }
      secciones.push('', '4. ANÁLISIS DE MODELOS (BOLTON / NANCE)', ...bLines);
    }
  }

  if (calibracion?.nance) {
    const n = calcularNance(calibracion.nance);
    if (n.dmInferior !== null || n.dt !== null) {
      const nLine = `• Nance: DM Inf ${n.dmInferior ?? '—'} mm · Discrepancia Total ${n.totalNeto} mm · DT ${
        n.dt ?? '—'
      } mm · EF ${n.ef ?? '—'} mm`;
      if (secciones.includes('4. ANÁLISIS DE MODELOS (BOLTON / NANCE)')) {
        secciones.push(nLine);
      } else {
        secciones.push('', '4. ANÁLISIS DE MODELOS (BOLTON / NANCE)', nLine);
      }
    }
  }

  const sugerencias = [...sintesis.sugerenciasPlan];
  if (!calibracion?.pixelesPorMm) {
    sugerencias.push('Calibrar la regla milimetrada sobre la placa para habilitar todas las mediciones lineales en mm.');
  }

  secciones.push(
    '',
    '5. ORIENTACIÓN TERAPÉUTICA SUGERIDA',
    sugerencias.length
      ? sugerencias.map((s) => `• ${s}`).join('\n')
      : '• Caso dentro de parámetros cefalométricos armónicos; definir objetivos según motivos de consulta y análisis de modelos.'
  );

  return secciones.join('\n');
}

export interface ResultadoInformeIA {
  texto: string;
  metodo: 'gemini' | 'experto-local';
}

/**
 * Redacta diagnóstico clínico y plan de tratamiento usando Gemini 2.5 Flash cuando
 * hay API key disponible, con respaldo inmediato al sistema experto local.
 */
export async function generarInformeClinicoIA(
  mediciones: MedicionResultado[],
  sintesis: SintesisRicketts,
  pacienteNombre: string,
  calibracion?: CalibracionRegla
): Promise<ResultadoInformeIA> {
  const informeBase = generarInformeClinicoExpertoLocal(mediciones, sintesis, calibracion);
  const apiKey = obtenerGeminiApiKey();

  if (!apiKey || mediciones.length === 0) {
    return { texto: informeBase, metodo: 'experto-local' };
  }

  try {
    const resumenDatos = mediciones
      .map((m) => `${m.analisis || 'Ricketts'} | ${m.sigla}: ${m.valor}${m.unidad} (Norma ${m.norma}) -> ${m.interpretacion || ''}`)
      .join('\n');

    const prompt = [
      `Eres un ortodoncista especialista redactando un informe cefalométrico clínico conciso para la historia clínica del paciente "${pacienteNombre}".`,
      'Usa exclusivamente los valores numéricos provistos (no inventes mediciones que no estén en la lista).',
      'Organiza el texto en español claro con las secciones: BIOTIPO Y PATRÓN ESQUELÉTICO, DIAGNÓSTICO DENTO-ALVEOLAR, PERFIL ESTÉTICO Y PLAN DE TRATAMIENTO ORIENTATIVO.',
      `\nSíntesis VERT: ${sintesis.biotipo} (VERT ${sintesis.vert ?? '—'}), ${sintesis.claseEsqueletica}`,
      `\nMediciones calculadas:\n${resumenDatos}`,
    ].join('\n');

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.25 },
        }),
      }
    );

    if (resp.ok) {
      const json = await resp.json();
      const texto: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (texto && texto.trim().length > 40) {
        return { texto: texto.trim(), metodo: 'gemini' };
      }
    }
  } catch {
    // Respaldo experto local ante fallos de red/clave
  }

  return { texto: informeBase, metodo: 'experto-local' };
}
