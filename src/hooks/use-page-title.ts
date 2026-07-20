import { useLocation } from "react-router-dom"

export function usePageTitle() {
  const location = useLocation()
  const pathname = location.pathname

  const pageTitles: Record<string, string> = {
    "/": "Dashboard",
    "/pacientes": "Pacientes",
    "/citas": "Agenda de citas",
    "/horarios": "Horarios de atención",
    "/lista-espera": "Lista de espera",
    "/reportes": "Reportes",
    "/mantenimiento": "Mantenimiento",
    "/usuarios": "Usuarios",
    "/perfil": "Mi perfil",
  }

  return pageTitles[pathname] || "Dashboard"
}
