import type React from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth, ROLES_CLINICA } from "@/context/auth-context"
import { usePermissions } from "@/hooks/use-permissions"
import { useRealtimeSubscriptions } from "@/hooks/use-realtime-subscriptions"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogOut } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  moduleKey?: string
}

/** Usuario autenticado pero sin un rol que dé acceso a la clínica. */
function SinAcceso() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 rounded-xl border bg-card text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Sin acceso al sistema</h2>
        <p className="text-sm text-muted-foreground">
          La cuenta {user?.email} no tiene un rol asignado en el sistema de la clínica
          odontológica. Si crees que es un error, contacta al administrador.
        </p>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children, moduleKey }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth()
  const { canView } = usePermissions()
  const navigate = useNavigate()

  const esPersonalClinica = !!role && ROLES_CLINICA.includes(role)

  // Suscripción automática a Realtime Postgres Changes
  useRealtimeSubscriptions(!!user && esPersonalClinica)

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth/login")
    } else if (esPersonalClinica && moduleKey && !canView(moduleKey)) {
      // Si el usuario está autenticado pero no tiene permiso para el módulo
      navigate("/", { replace: true })
    }
  }, [user, isLoading, navigate, moduleKey, canView, esPersonalClinica])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Autenticado pero con rol ajeno (o sin rol): pantalla de sin acceso.
  if (user && !esPersonalClinica) {
    return <SinAcceso />
  }

  // Mientras se procesa la redirección en el useEffect, mostramos un estado de carga
  // para evitar el flash de contenido antes de navegar
  if (!user || (moduleKey && !canView(moduleKey))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}
