import { describe, it, expect } from 'vitest'
import { sanitizePlainText, sanitizeIdentifier, requireSanitizedValue, sanitizeMultilineText } from '../security'

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

describe('sanitizeMultilineText', () => {
    it('conserva los saltos de línea del tratamiento', () => {
        const receta = 'Ibuprofeno 600mg c/8hs\nReposo relativo 48hs\nControl en 3 días'
        expect(sanitizeMultilineText(receta)).toBe(receta)
    })

    it('sanitizePlainText en cambio los aplasta (por eso existe este otro)', () => {
        expect(sanitizePlainText('linea 1\nlinea 2')).toBe('linea 1 linea 2')
    })

    it('sigue eliminando tags <script>', () => {
        expect(sanitizeMultilineText('<script>alert(1)</script>uno\ndos')).toBe('uno\ndos')
    })

    it('elimina event handlers', () => {
        expect(sanitizeMultilineText('<div onclick="evil()">hola</div>\nchau')).toBe('hola\nchau')
    })

    it('limpia caracteres de control pero no el salto', () => {
        expect(sanitizeMultilineText('uno\x00dos\ntres')).toBe('uno dos\ntres')
    })

    it('normaliza los saltos de Windows', () => {
        expect(sanitizeMultilineText('uno\r\ndos')).toBe('uno\ndos')
    })

    it('recorta los renglones y limita los saltos seguidos', () => {
        expect(sanitizeMultilineText('  uno  \n\n\n\n  dos  ')).toBe('uno\n\ndos')
    })

    it('colapsa los espacios repetidos dentro del renglón', () => {
        expect(sanitizeMultilineText('uno    dos\ttres')).toBe('uno dos tres')
    })

    it('retorna vacío para null o undefined', () => {
        expect(sanitizeMultilineText(null)).toBe('')
        expect(sanitizeMultilineText(undefined)).toBe('')
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
