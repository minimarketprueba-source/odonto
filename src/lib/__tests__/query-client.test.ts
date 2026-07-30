import { describe, expect, it } from 'vitest'
import { queryClient } from '@/lib/query-client'

describe('configuración de escrituras', () => {
  it('no reintenta mutaciones para evitar registros duplicados', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(0)
  })
})
