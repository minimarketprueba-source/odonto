import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { usePerfilProfesional } from '@/api/perfil'
import { useAuth } from "@/context/auth-context"
import { useSidebar } from "@/context/sidebar-context"
import { Menu, X, Home, LogOut, Users, CalendarDays, Clock, BarChart2, Settings, Shield, ChevronLeft, ChevronRight, UserCircle2, DollarSign, Receipt } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { NOMBRE_CLINICA_CORTO } from "@/lib/clinica";
import { useEmpresa } from "@/api/empresa";

// Helper para obtener la ruta correcta del logo
const getLogoPath = () => {
  // El ícono cuadrado (la muela sobre fondo oscuro), no el logo ancho: acá
  // entra en un recuadro de 40x40 y el logo con el texto quedaría ilegible.
  // Trae su propio fondo oscuro, así que se ve igual en modo claro y oscuro.
  const archivo = 'mova-dent-icono.png';
  // En Electron, usar ruta relativa al index.html
  if (typeof window !== 'undefined' && (window as any).electron) {
    return `./${archivo}`;
  }
  // En web, usar ruta absoluta
  return `/${archivo}`;
};

export function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const { user, logout } = useAuth()
  const empresa = useEmpresa()
  // Nombre real de la persona, si lo cargó en Mi perfil o tiene ficha de
  // odontólogo. Si no hay ninguno, se cae al correo.
  const { data: perfil } = usePerfilProfesional(user)
  const nombreMostrado = perfil?.nombre?.trim() || null
  const { isOpen, setIsOpen, isCollapsed, setIsCollapsed } = useSidebar()
  const { canView } = usePermissions()

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home, badge: null as number | null },
    { name: "Pacientes", href: "/pacientes", icon: Users, badge: null as number | null, moduleKey: "pacientes" },
    { name: "Citas", href: "/citas", icon: CalendarDays, badge: null as number | null, moduleKey: "citas" },
    { name: "Horarios", href: "/horarios", icon: Clock, badge: null as number | null, moduleKey: "citas" },
    { name: "Presupuestos", href: "/presupuestos", icon: DollarSign, badge: null as number | null, moduleKey: "consultas" },
    { name: "Liquidaciones", href: "/liquidaciones", icon: Receipt, badge: null as number | null, moduleKey: "consultas" },
    { name: "Reportes", href: "/reportes", icon: BarChart2, badge: null as number | null, moduleKey: "reportes" },
    { name: "Mantenimiento", href: "/mantenimiento", icon: Settings, badge: null as number | null, moduleKey: "mantenimiento" },
    { name: "Usuarios", href: "/usuarios", icon: Shield, badge: null as number | null, moduleKey: "usuarios" },
    { name: "Mi perfil", href: "/perfil", icon: UserCircle2, badge: null as number | null },
  ]

  const visibleNavigation = navigation.filter(item => {
    if (!item.moduleKey) return true; // Dashboard y Notificaciones siempre visibles
    return canView(item.moduleKey);
  });

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:scale-110 transition-all duration-200 h-10 w-10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="relative w-6 h-6">
          <Menu className={cn(
            "h-6 w-6 transition-all duration-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
          )} />
          <X className={cn(
            "h-6 w-6 transition-all duration-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            isOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
          )} />
        </div>
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-card border-r border-border shadow-xl transform transition-all duration-300 ease-in-out md:translate-x-0 w-72",
          isCollapsed ? "md:w-20" : "md:w-64",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full relative">
          {/* Gradient overlay with breathing animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />

          {/* Subtle border animation */}
          <div className="absolute inset-0 border-l-2 border-gradient-to-b from-primary/20 via-accent/10 to-primary/20 pointer-events-none" />

          {/* Logo */}
          <div className={cn(
            "flex items-center p-6 border-b border-border/30 relative z-10",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            <div
              className={cn(
                "flex items-center overflow-hidden",
                isCollapsed ? "justify-center w-full cursor-pointer" : "gap-3"
              )}
              onClick={isCollapsed ? () => setIsCollapsed(false) : undefined}
              onKeyDown={isCollapsed ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsCollapsed(false); } } : undefined}
              role={isCollapsed ? "button" : undefined}
              tabIndex={isCollapsed ? 0 : undefined}
              title={isCollapsed ? "Expandir menú" : undefined}
            >
              {/* Con logo cargado: fondo oscuro propio y `object-contain`, porque
                  un logo ancho recortado a un cuadrado quedaría partido al medio.
                  Sin logo cargado: el ícono de Mova Dent, que ya viene cuadrado. */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden",
                empresa.logo_url && "bg-slate-900 p-1"
              )}>
                <img
                  src={empresa.logo_url || getLogoPath()}
                  alt={empresa.nombre}
                  className={cn("w-full h-full", empresa.logo_url ? "object-contain" : "object-cover")}
                />
              </div>
              {!isCollapsed && (
                <div className="transition-all duration-300 overflow-hidden w-auto opacity-100">
                  <h3 className="text-base font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent whitespace-nowrap">
                    {NOMBRE_CLINICA_CORTO}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium leading-tight">
                    Consultorio Odontológico
                  </p>
                </div>
              )}
            </div>
            {/* Botón para colapsar/expandir - Solo desktop */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hidden md:flex h-8 w-8 hover:bg-accent flex-shrink-0",
                isCollapsed && "absolute right-2 top-1/2 -translate-y-1/2"
              )}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 relative z-10 overflow-y-auto">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <div key={item.name} className="relative group">
                  <Link
                    to={item.href}
                    className={cn(
                      "group flex items-center rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden py-3",
                      // Colapsado: sin padding ni gap, si no el ícono queda corrido a la izquierda.
                      isCollapsed ? "justify-center gap-0 px-0" : "gap-3 px-4",
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg scale-105"
                        : "text-foreground dark:text-white hover:text-foreground hover:bg-accent hover:scale-102",
                    )}
                    title={isCollapsed ? item.name : undefined}
                    onClick={() => setIsOpen(false)}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse" />
                    )}
                    <item.icon className={cn(
                      "w-5 h-5 transition-all duration-200 relative z-10 flex-shrink-0",
                      isActive ? "text-white drop-shadow-sm" : "group-hover:scale-110"
                    )} />
                    <span className={cn(
                      "relative z-10 transition-all duration-300 overflow-hidden whitespace-nowrap",
                      isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                    )}>
                      {item.name}
                    </span>

                    {/* Badge/Notification indicator */}
                    {item.badge && (
                      <div className={cn(
                        "absolute flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full shadow-lg transition-all duration-200",
                        // Colapsado el ícono va centrado: el contador se corre a la esquina.
                        isCollapsed ? "right-0.5 top-0.5 scale-75" : "right-2 top-1/2 transform -translate-y-1/2",
                        isActive && "bg-white text-primary"
                      )}>
                        {item.badge}
                      </div>
                    )}

                    {isActive && !item.badge && !isCollapsed && (
                      <div className="absolute right-2 w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </Link>
                </div>
              )
            })}
          </nav>

          {/* User info */}
          <div className={cn(
            "p-4 border-t border-border/30 relative z-10",
            isCollapsed && "p-2"
          )}>
            <div className={cn(
              "flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 transition-all duration-300",
              isCollapsed && "justify-center p-2 mb-2 rounded-full border-0 bg-transparent"
            )}>
              <div className="relative w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center shadow-md ring-2 ring-white/20 flex-shrink-0">
                <span className="text-sm font-bold text-primary-foreground">
                  {(nombreMostrado?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                </span>
                {/* Online status indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
              </div>
              <div className={cn(
                "flex-1 min-w-0 transition-all duration-300 overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
              )}>
                {/* El nombre que la persona cargó en Mi perfil. Antes acá salía
                    siempre la parte del correo antes de la arroba ("admin"), asi
                    que guardar el nombre no se veía reflejado en ningún lado y
                    parecía que no se había guardado. */}
                <p className="text-sm font-semibold text-foreground dark:text-white truncate">
                  {nombreMostrado || user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-muted-foreground dark:text-white truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full text-foreground dark:text-white hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-xl py-3 gap-3",
                isCollapsed ? "justify-center px-2 py-2" : "justify-start"
              )}
              onClick={logout}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className={cn(
                "font-medium transition-all duration-300 overflow-hidden whitespace-nowrap",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
              )}>
                Cerrar Sesión
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsOpen(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(false); } }} role="button" tabIndex={0} />}
    </>
  )
}
