import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateDisplay(
  dateString?: string | null,
  locale: string | string[] = 'es-ES',
  options: Intl.DateTimeFormatOptions = {}
) {
  if (!dateString) {
    return ''
  }

  const parts = dateString.split('-').map((part) => Number(part))
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return dateString
  }

  const [year, month, day] = parts
  const date = new Date(year, month - 1, day)

  try {
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch (error) {
    return dateString
  }
}

export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[,.-]/g, " ");
}

/**
 * Realiza una búsqueda flexible donde cada palabra ingresada en `query`
 * debe encontrarse en alguna parte de `targetText` (ignora tildes, puntuación y orden de palabras).
 */
export function matchTexto(targetText: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const qWords = normalizeText(query).split(/\s+/).filter(Boolean);
  if (qWords.length === 0) return true;

  const targetNorm = normalizeText(targetText);
  return qWords.every((word) => {
    const digits = word.replace(/\D/g, "");
    if (digits.length >= 2 && targetNorm.includes(digits)) return true;
    return targetNorm.includes(word);
  });
}

/**
 * Filtro flexible de pacientes para buscadores.
 * Permite buscar por apellidos, nombres, documento (con o sin puntos), unidad o promoción en cualquier orden.
 */
export function matchPaciente(
  p: {
    nombres: string;
    apellidos: string;
    documento?: string | null;
    unidad?: string | null;
    promocion?: string | null;
  },
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const docClean = (p.documento || "").replace(/\D/g, "");
  const targetText = `${p.apellidos} ${p.nombres} ${p.apellidos}, ${p.nombres} ${p.documento || ""} ${docClean} ${p.unidad || ""} ${p.promocion || ""}`;

  return matchTexto(targetText, query);
}
