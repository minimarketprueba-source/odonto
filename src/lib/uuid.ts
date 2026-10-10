/**
 * Genera un UUID v4 incluso en navegadores que todavía no implementan
 * `crypto.randomUUID()` (por ejemplo, algunos WebViews Android antiguos).
 */
export function generarUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    // Último recurso para WebViews muy antiguos: mantiene IDs locales únicos.
    for (let indice = 0; indice < bytes.length; indice += 1) {
      bytes[indice] = Math.floor(Math.random() * 256)
    }
  }

  // UUID versión 4 (aleatorio), variante RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hexadecimal = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`
}
