import { useLocation } from "react-router-dom"

export function usePageTitle() {
  const location = useLocation()
  const pathname = location.pathname

  const pageTitles: Record<string, string> = {
    "/": "Dashboard",
    "/cadetes": "Cadetes",
    "/historial-peso": "Historial Peso",
    "/seguimiento": "Seguimiento",
    "/ergometria": "Ergometría",
    "/oficiales": "Oficiales",
    "/informes": "Informes",
    "/notificaciones": "Notificaciones",
    "/usuarios": "Usuarios",
    "/respaldo": "Respaldo",
    "/configuracion": "Configuración",
  }

  return pageTitles[pathname] || "Dashboard"
}
