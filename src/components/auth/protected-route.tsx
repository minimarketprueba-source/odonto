import type React from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth, ROLES_SANIDAD } from "@/context/auth-context"
import { usePermissions } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogOut } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  moduleKey?: string
}

/** Usuario autenticado pero sin rol de Sanidad (p. ej. personal de control de peso). */
function SinAcceso() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 rounded-xl border bg-card text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Sin acceso a Sanidad</h2>
        <p className="text-sm text-muted-foreground">
          La cuenta {user?.email} no tiene un rol asignado en el sistema de citas médicas de la
          Sanidad. Si crees que es un error, contacta al administrador.
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

  const esPersonalSanidad = !!role && ROLES_SANIDAD.includes(role)

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth/login")
    } else if (esPersonalSanidad && moduleKey && !canView(moduleKey)) {
      // Si el usuario está autenticado pero no tiene permiso para el módulo
      navigate("/", { replace: true })
    }
  }, [user, isLoading, navigate, moduleKey, canView, esPersonalSanidad])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Autenticado pero con rol ajeno a Sanidad (o sin rol): pantalla de sin acceso.
  if (user && !esPersonalSanidad) {
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
