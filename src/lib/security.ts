// Security helpers to sanitize user-provided values and keep logs safe.

import { logger } from "./logger";

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]+/g;
// Igual que el anterior pero dejando pasar el salto de línea (\n, \x0A).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_SIN_SALTO_REGEX = /[\x00-\x09\x0B-\x1F\x7F]+/g;
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_TAG_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const TAG_REGEX = /<[^>]*>/g;
const EVENT_HANDLER_ATTR_REGEX = /\son\w+\s*=\s*(['"]).*?\1/gi;

const DEV_MODE = Boolean(import.meta.env?.DEV);

/**
 * Remove control chars, HTML tags and common XSS vectors. Returns a trimmed string.
 */
export function sanitizePlainText(value?: string | null): string {
  if (typeof value !== "string") return "";

  let sanitized = value.replace(CONTROL_CHARS_REGEX, " ");
  sanitized = sanitized.replace(SCRIPT_TAG_REGEX, "");
  sanitized = sanitized.replace(STYLE_TAG_REGEX, "");
  sanitized = sanitized.replace(EVENT_HANDLER_ATTR_REGEX, "");
  sanitized = sanitized.replace(TAG_REGEX, "");

  return sanitized.replace(/\s+/g, " ").trim();
}

/**
 * Igual que sanitizePlainText pero conservando los saltos de línea.
 *
 * Para los campos largos de la historia clínica (motivo, examen físico,
 * tratamiento, evolución, indicaciones de la receta): el médico los escribe en
 * renglones o en lista y los impresos ya salen con `white-space: pre-wrap`.
 * Con el limpiador de una sola línea todo llegaba aplastado en un párrafo.
 *
 * Sigue sacando etiquetas HTML y demás caracteres de control; solo respeta el
 * \n. Los renglones se recortan a los costados y no se permiten más de dos
 * saltos seguidos.
 */
export function sanitizeMultilineText(value?: string | null): string {
  if (typeof value !== "string") return "";

  let sanitized = value.replace(/\r\n?/g, "\n");
  sanitized = sanitized.replace(CONTROL_CHARS_SIN_SALTO_REGEX, " ");
  sanitized = sanitized.replace(SCRIPT_TAG_REGEX, "");
  sanitized = sanitized.replace(STYLE_TAG_REGEX, "");
  sanitized = sanitized.replace(EVENT_HANDLER_ATTR_REGEX, "");
  sanitized = sanitized.replace(TAG_REGEX, "");

  return sanitized
    .split("\n")
    .map((linea) => linea.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Allow only alphanumeric chars (useful for DNI, codes, etc.).
 */
export function sanitizeIdentifier(value?: string | null): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^A-Za-z0-9]/g, "").trim();
}

/**
 * Sanitize optional text and return undefined when nothing safe remains.
 */
export function sanitizeOptionalText(value?: string | null): string | undefined {
  const sanitized = sanitizePlainText(value);
  return sanitized.length > 0 ? sanitized : undefined;
}

/**
 * Log only when running in dev mode so sensitive data does not leak in prod.
 */
export function secureLog(message?: unknown, ...optionalParams: unknown[]) {
  if (DEV_MODE) {
    logger.log(message, ...optionalParams);
  }
}

/**
 * Ensure a sanitized value is not empty. If the result is empty, throw an error.
 */
export function requireSanitizedValue(value: string, fieldName: string): string {
  const sanitized = sanitizePlainText(value);
  if (!sanitized) {
    throw new Error(`${fieldName} contiene caracteres no permitidos`);
  }
  return sanitized;
}
