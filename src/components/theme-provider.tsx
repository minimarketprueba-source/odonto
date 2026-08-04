'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/auth-context'

type Theme = 'light' | 'dark' | 'system'

/**
 * Clave del tema en el navegador. Va por usuario para que en una computadora
 * compartida (recepción, sala de espera) el tema de una persona no le cambie
 * la pantalla a la siguiente. Sin sesión se usa la clave suelta de siempre.
 */
function claveTema(userId?: string): string {
  return userId ? `theme:${userId}` : 'theme'
}

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
      // El tema se guarda en el navegador, no en la base.
      //
      // Antes iba a la tabla `config_peso`, que no existe en esta base: cada
      // cambio de tema tiraba un 404 a la consola y un cartel rojo de "no se
      // pudo guardar", aunque el tema sí se aplicaba. Es una preferencia de
      // pantalla, propia de cada computadora, así que el navegador es el lugar
      // correcto para guardarla.
      try {
        localStorage.setItem(claveTema(user?.id), selectedTheme)
        return true
      } catch (error) {
        // Modo incógnito o almacenamiento lleno: el tema se aplica igual, solo
        // que no se recuerda en la próxima visita. No vale un cartel de error.
        console.warn('No se pudo recordar la preferencia de tema:', error)
        return false
      }
    },
    [user?.id]
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

  // Al iniciar sesión, recuperar el tema que esa persona eligió en esta
  // computadora. Es una lectura local, así que no hay pedido de red que pueda
  // fallar ni estado de carga que esperar.
  useEffect(() => {
    if (!user || initialThemeLoadedRef.current) return
    initialThemeLoadedRef.current = true

    try {
      const guardado = localStorage.getItem(claveTema(user.id)) as Theme | null
      if (guardado && guardado !== themeRef.current) {
        applyTheme(guardado, { persist: false })
      }
    } catch {
      /* sin almacenamiento: queda el tema por defecto */
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

      // Clave suelta `theme` = último tema usado en esta computadora. Sirve para
      // pintar la pantalla de login con el tema correcto, antes de saber quién
      // se va a loguear. La preferencia por persona vive aparte, en
      // `theme:<id>` (ver claveTema), y pisa a esta apenas hay sesión.
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
