import { describe, expect, it } from 'vitest'
import { queryClient } from '@/lib/query-client'

describe('configuración de lecturas', () => {
  it('relee al volver a la ventana si los datos tienen más de un minuto', () => {
    // Red de seguridad por si los avisos en vivo no llegan: un saldo o una
    // agenda de hace 5 minutos en recepción es un cobro o un turno mal dado.
    const lecturas = queryClient.getDefaultOptions().queries
    expect(lecturas?.refetchOnWindowFocus).toBe(true)
    expect(lecturas?.staleTime).toBeLessThanOrEqual(60 * 1000)
  })
})

describe('configuración de escrituras', () => {
  it('no reintenta mutaciones para evitar registros duplicados', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0)
  })
})
