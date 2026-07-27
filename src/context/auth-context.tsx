"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"

import { supabase, clearProjectStorage, getProjectStorageInfo, isSupabaseConfigured } from "@/lib/supabase"
import type { User, Session } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"


interface AuthContextType {
  user: User | null
  role: string | null
  permissions: Record<string, string[]> | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearStorage: () => void
  isLoading: boolean
}

// Roles que pueden entrar a este sistema. Los roles de control de peso
// (analyst, viewer) NO tienen acceso a Sanidad; solo los admins son comunes
// a ambos sistemas.
export const ROLES_SANIDAD = ["admin", "medico", "recepcion"]

// Permisos por defecto cuando user_roles.permissions viene vacío.
const DEFAULT_PERMISOS_SANIDAD: Record<string, Record<string, string[]>> = {
  medico: {
    pacientes: ["ver", "editar"],
    citas: ["ver", "editar"],
    consultas: ["ver", "editar"],
    nutricion: ["ver", "editar"],
    recetas: ["ver", "editar"],
    lista_espera: ["ver", "editar"],
  },
  recepcion: {
    pacientes: ["ver", "editar"],
    citas: ["ver", "editar"],
    lista_espera: ["ver", "editar"],
  },
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Record<string, string[]> | null>(null)
  // true una vez que rol/permisos se resolvieron para el usuario actual.
  // Evita que ProtectedRoute redirija al Dashboard durante la ventana en que
  // la sesión ya cargó pero los permisos todavía no (p.ej. al recargar con F5).
  const [permissionsResolved, setPermissionsResolved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const syncedProfilesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Debug: Verificar storage al inicio y limpiar tokens de otros proyectos
    const debugStorage = () => {
      const { projectRef, legacyKeys } = getProjectStorageInfo()
      const keys = Object.keys(localStorage).filter(key =>
        key.includes('supabase') || key.includes('sb-') || key.includes('control-peso')
      )

      keys.forEach(key => {
        try {
          localStorage.getItem(key)
          if (key.startsWith('sb-') && projectRef && !key.includes(projectRef)) {
            localStorage.removeItem(key)
          }
          if (legacyKeys.includes(key)) {
            localStorage.removeItem(key)
          }
        } catch {
          // Ignorar accesos bloqueados (p.e., privacy mode)
        }
      })
    }
    debugStorage();

    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    // Suppress Supabase's console errors for refresh token failures
    // The errors will still be handled properly by our error handlers below
    const originalConsoleError = console.error;

    console.error = function (...args: any[]) {
      const suppressedErrors = ['AuthApiError', 'Invalid Refresh Token', 'refresh_token_not_found'];

      const shouldSuppress = args.some(arg => {
        if (typeof arg === 'string') {
          return suppressedErrors.some(err => arg.includes(err));
        }
        if (arg instanceof Error) {
          return suppressedErrors.some(err => arg.message.includes(err));
        }
        if (typeof arg === 'object' && arg !== null) {
          // Check message property or stringify for other objects
          const msg = arg.message || JSON.stringify(arg);
          return suppressedErrors.some(err => msg.includes(err));
        }
        return false;
      });

      if (!shouldSuppress) {
        originalConsoleError.apply(console, args);
      }
    };

    let isMounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        // Verificar si hay un token antes de intentar obtener la sesión
        // Esto nos ayuda a detectar cuando el refresco falla silenciosamente
        const { authStorageKey } = getProjectStorageInfo();
        const hasToken = typeof window !== 'undefined' && localStorage.getItem(authStorageKey);

        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          // Si hay error explícito en la sesión (token inválido), limpiar todo
          logger.error("Error obteniendo sesión:", error)
          await supabase.auth.signOut()
          clearProjectStorage()
          setUser(null)
          // Force redirect to login
          window.location.href = '/auth/login'
        } else if (hasToken && !session) {
          // Si había token pero no hay sesión, es un token inválido que Supabase no reportó como error
          logger.warn("Token existente detectado pero no se recuperó sesión. Limpiando almacenamiento corrupto.")
          await supabase.auth.signOut()
          clearProjectStorage()
          setUser(null)
        } else {
          setUser(session?.user ?? null)
        }
      } catch (err) {
        if (!isMounted) return;
        logger.error("Error crítico obteniendo sesión:", err)
        await supabase.auth.signOut()
        clearProjectStorage()
        setUser(null)
        // Force redirect to login
        window.location.href = '/auth/login'
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {

      // Si el evento es TOKEN_REFRESHED y falló, limpiar sesión
      if (event === 'TOKEN_REFRESHED' && !session) {
        logger.warn("Token refresh falló, limpiando sesión")
        await supabase.auth.signOut()
        clearProjectStorage()
        setUser(null)
        setIsLoading(false)
        return
      }

      // Si hay un error de autenticación, limpiar
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null)
        setRole(null)
        setPermissions(null)
        setIsLoading(false)
        return
      }

      // Solo actualizar el usuario, no resetear isLoading en cada cambio
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      console.error = originalConsoleError;
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    if (syncedProfilesRef.current.has(user.id)) {
      // Ya cargamos rol/permisos para este usuario en este ciclo de vida.
      setPermissionsResolved(true)
      return
    }
    setPermissionsResolved(false)

    let isActive = true
    const ensureProfileExists = async () => {
      try {
        // Validate UUID format before request
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(user.id)) {
          logger.error(`[AuthContext] Invalid UUID for user.id: ${user.id}`);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()

        if (error) {
          // 400/403 son comunes cuando RLS bloquea o el schema no coincide;
          // no las tratamos como errores críticos en producción.
          const isExpected = ['400', '403', '404'].includes(error.code || '')
          if (isExpected) {
            logger.warn("Error checking user profile (expected):", {
              code: error.code,
              message: error.message,
            });
          } else {
            logger.error("Error checking user profile:", {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
          }
          return
        }

        if (!data) {
          const payload: Record<string, any> = {
            id: user.id,
          }

          // Usar upsert con ignoreDuplicates para evitar errores si ya existe (race conditions)
          const { error: upsertError } = await supabase
            .from("profiles")
            .upsert(payload, { onConflict: 'id', ignoreDuplicates: true })

          if (upsertError) {
            // Ignorar error de duplicado (postgres code 23505) o Bad Request (400) si es por concurrencia
            if (upsertError.code !== '23505' && upsertError.code !== '409' && upsertError.code !== '400') {
              logger.error("No se pudo crear el perfil del usuario:", {
                message: upsertError.message,
                code: upsertError.code,
                details: upsertError.details
              })
            } else {
              // Si dió error de duplicado/400, asumimos que ya existe y lo marcamos como 'synced'
              logger.warn("Perfil ya existente o conflicto al crear (ignorado):", upsertError.code);
            }
            // Aun si falla, marcamos como synced para no reintentar infinitamente en este render
          }
        }

        // Cargar Rol y Permisos despues de asegurar que el perfil existe
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) {
          logger.error("Error cargando rol del usuario:", {
            message: roleError.message,
            code: roleError.code,
            details: roleError.details,
            hint: roleError.hint,
            status: (roleError as any).status
          });
        } else if (roleData) {
          const rol = roleData.role ? roleData.role.toLowerCase() : null;
          setRole(rol);
          setPermissions(
            (roleData.permissions as Record<string, string[]> | null) ??
              (rol ? (DEFAULT_PERMISOS_SANIDAD[rol] ?? null) : null)
          );
        } else {
          // Sin rol asignado: sin acceso a Sanidad. No se auto-asigna nada;
          // ProtectedRoute mostrará la pantalla de "sin acceso".
          setRole(null);
          setPermissions(null);
        }

        if (isActive) {
          syncedProfilesRef.current.add(user.id)
        }
      } catch (syncError) {
        console.error("[DEBUG] Error sincronizando el perfil del usuario:", syncError)
        logger.error("Error sincronizando el perfil del usuario:", syncError)
      } finally {
        // Siempre marcar como resuelto para no dejar el loader colgado.
        // Si rol/permisos no cargaron, ProtectedRoute decidirá con lo que haya.
        if (isActive) setPermissionsResolved(true)
      }
    }

    ensureProfileExists()

    return () => {
      isActive = false
    }
  }, [user])

  const login = async (email: string, password: string) => {
    clearProjectStorage()
    syncedProfilesRef.current.clear()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      console.error("[DEBUG] Login error details:", error)
      throw error
    }
  }

  const logout = async () => {
    const signOutPromise = supabase.auth.signOut()
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000))
    const result = await Promise.race([signOutPromise, timeout])

    if (result === 'timeout') {
      clearProjectStorage()
      setUser(null)
      setRole(null)
      setPermissions(null)
      return
    }

    const { error } = result as any
    setUser(null)
    setRole(null)
    setPermissions(null)
    clearProjectStorage()
    if (error) {
      return
    }
  }

  const clearStorage = () => {
    clearProjectStorage()
  }

  // El loader debe mantenerse mientras haya sesión pero los permisos no se hayan
  // resuelto, para que ProtectedRoute no redirija prematuramente al Dashboard.
  const effectiveLoading = isLoading || (!!user && !permissionsResolved)

  return <AuthContext.Provider value={{ user, role, permissions, login, logout, clearStorage, isLoading: effectiveLoading }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
