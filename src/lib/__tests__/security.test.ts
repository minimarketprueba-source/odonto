import { describe, it, expect } from 'vitest'
import { sanitizePlainText, sanitizeIdentifier, requireSanitizedValue } from '../security'

describe('sanitizePlainText', () => {
    it('elimina tags <script>', () => {
        expect(sanitizePlainText('<script>alert(1)</script>texto')).toBe('texto')
    })

    it('elimina event handlers', () => {
        expect(sanitizePlainText('<div onclick="evil()">hola</div>')).toBe('hola')
    })

    it('limpia caracteres de control', () => {
        expect(sanitizePlainText('texto\x00con\x1Fcontrol')).toBe('texto con control')
    })

    it('retorna string vacío para null', () => {
        expect(sanitizePlainText(null)).toBe('')
    })

    it('retorna string vacío para undefined', () => {
        expect(sanitizePlainText(undefined)).toBe('')
    })

    it('preserva texto normal', () => {
        expect(sanitizePlainText('Juan Pérez')).toBe('Juan Pérez')
    })
})

describe('sanitizeIdentifier', () => {
    it('solo deja alfanuméricos', () => {
        expect(sanitizeIdentifier('abc-123!@#')).toBe('abc123')
    })

    it('elimina espacios', () => {
        expect(sanitizeIdentifier('hola mundo')).toBe('holamundo')
    })

    it('retorna vacío para null', () => {
        expect(sanitizeIdentifier(null)).toBe('')
    })
})

describe('requireSanitizedValue', () => {
    it('retorna el valor sanitizado si no está vacío', () => {
        expect(requireSanitizedValue('Juan', 'nombre')).toBe('Juan')
    })

    it('lanza error si el resultado sanitizado es vacío', () => {
        expect(() => requireSanitizedValue('<script></script>', 'campo')).toThrow('campo contiene caracteres no permitidos')
    })

    it('lanza error con el nombre del campo correcto', () => {
        expect(() => requireSanitizedValue('', 'grado')).toThrow('grado contiene caracteres no permitidos')
    })
})
