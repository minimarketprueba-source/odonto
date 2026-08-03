'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'

type Theme = 'light' | 'dark' | 'system'

type ThemeProviderProps = React.PropsWithChildren<{
  attribute?: string
  defaultTheme?: Theme
}>

type ThemeContextValue = {
  theme: Theme | undefined
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<Theme | undefined>(() => {
    try {
      const stored = localStorage.getItem('theme') as Theme | null
      return stored ?? defaultTheme
    } catch {
      return defaultTheme
    }
  })

  const [mounted, setMounted] = useState(false)
  const themeRef = useRef<Theme | undefined>(theme)
  const initialThemeLoadedRef = useRef(false)

  const persistThemeSelection = useCallback(
    async (selectedTheme: Theme) => {
      if (!user) return false

      const timestamp = new Date().toISOString()

      try {
        // Guardar preferencia en la tabla `config_peso` (fuente de la verdad solicitada)
        const upsertPayload: Record<string, any> = {
          user_id: user.id,
          tema_preferido: selectedTheme,
          updated_at: timestamp,
        }

        const { error } = await supabase.from('config_peso').upsert(upsertPayload, { onConflict: 'user_id' })

        if (error) {
          console.error('Error al guardar tema en config_peso:', error)
          toast({ title: 'Error', description: 'No se pudo guardar la preferencia de tema.', variant: 'destructive' })
          return false
        }

        toast({ title: 'Tema guardado', description: 'La preferencia de tema se guardó correctamente.' })
        return true
      } catch (error) {
        console.error('Error inesperado al guardar tema en config_peso:', error)
        toast({ title: 'Error', description: 'Ocurrió un error al guardar la preferencia de tema.', variant: 'destructive' })
        return false
      }
    },
    [user]
  )

  const applyTheme = useCallback(
    (nextTheme: Theme, options?: { persist?: boolean }) => {
      if (themeRef.current === nextTheme) {
        return
      }

      setThemeState(nextTheme)

      const shouldPersist = options?.persist ?? true
      if (shouldPersist) {
        persistThemeSelection(nextTheme).catch((err) => {
          console.error('Error al persistir tema:', err)
          toast({ title: 'Error', description: 'No se pudo guardar la preferencia de tema.', variant: 'destructive' })
        })
      }
    },
    [persistThemeSelection]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    initialThemeLoadedRef.current = false
  }, [user?.id])

  // Cargar y sincronizar el tema del usuario autenticado (desde `config_peso.tema_preferido`)
  useEffect(() => {
    if (!user || initialThemeLoadedRef.current) return

    let isCancelled = false
    const themeBeforeLoad = themeRef.current

    const loadThemeFromPreferences = async () => {
      try {
        const { data: configData, error: configError } = await supabase
          .from('config_peso')
          .select('tema_preferido')
          .eq('user_id', user.id)
          .maybeSingle()

        if (isCancelled) return

        if (configError && configError.code !== 'PGRST116') {
          console.error('Error al cargar tema desde config_peso:', configError)
        }

        const resolvedTheme = configData?.tema_preferido as Theme | undefined

        // Si el usuario cambió el tema manualmente mientras se cargaba, no lo sobreescribimos.
        if (themeRef.current !== themeBeforeLoad) {
          initialThemeLoadedRef.current = true
          return
        }

        if (resolvedTheme && resolvedTheme !== themeRef.current) {
          applyTheme(resolvedTheme, { persist: false })
        }

        initialThemeLoadedRef.current = true
      } catch (error) {
        if (!isCancelled) {
          console.error('Error al sincronizar tema desde config_peso:', error)
        }
      } finally {
        if (!isCancelled && !initialThemeLoadedRef.current) {
          initialThemeLoadedRef.current = true
        }
      }
    }

    loadThemeFromPreferences()

    return () => {
      isCancelled = true
    }
  }, [user, applyTheme])

  useEffect(() => {
    if (!mounted) return

    try {
      const root = document.documentElement

      // Remover clases anteriores
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        // Detectar preferencia del sistema
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else if (theme) {
        root.classList.add(theme)
      }

      localStorage.setItem('theme', theme ?? 'system')
    } catch { /* noop */ }
  }, [theme, mounted])

  // Escuchar cambios en la preferencia del sistema
  useEffect(() => {
    if (!mounted || theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(mediaQuery.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { theme: 'system' as Theme, setTheme: (_: Theme) => { } }
  }
  return ctx
}
