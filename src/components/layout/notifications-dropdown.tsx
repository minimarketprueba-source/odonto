import { Link } from "react-router-dom"
import { Bell, Check, HeartPulse } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotificaciones, useMarcarLeida, useMarcarTodasLeidas } from "@/api/notificaciones"

/** "hace 5 minutos", "hace 2 horas", "ayer"... */
function haceCuanto(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  return dias === 1 ? "ayer" : `hace ${dias} días`
}

export function NotificationsDropdown() {
  const { data: avisos = [] } = useNotificaciones()
  const marcarLeida = useMarcarLeida()
  const marcarTodas = useMarcarTodasLeidas()

  const sinLeer = avisos.filter((a) => !a.leido)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/10">
          <Bell className="h-4 w-4" />
          {sinLeer.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
            >
              {sinLeer.length > 9 ? "9+" : sinLeer.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Avisos</span>
          {sinLeer.length > 0 && (
            <Button
              variant="ghost" size="sm" className="h-7 text-xs gap-1"
              onClick={() => marcarTodas.mutate(sinLeer.map((a) => a.id))}
            >
              <Check className="w-3.5 h-3.5" /> Marcar todos como leídos
            </Button>
          )}
        </DropdownMenuLabel>

        {avisos.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No hay avisos por ahora. Acá va a aparecer, por ejemplo, cuando una
            doctora indique reposo a un cadete.
          </div>
        ) : (
          <div className="divide-y">
            {avisos.slice(0, 20).map((a) => {
              const contenido = (
                <div className={`p-3 space-y-0.5 ${a.leido ? "opacity-60" : "bg-primary/5"}`}>
                  <div className="flex items-start gap-2">
                    <HeartPulse className={`w-4 h-4 mt-0.5 flex-shrink-0 ${a.leido ? "text-muted-foreground" : "text-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">{a.mensaje}</p>
                      <p className="text-[11px] text-muted-foreground pt-0.5">{haceCuanto(a.created_at)}</p>
                    </div>
                    {!a.leido && (
                      <button
                        type="button"
                        title="Marcar como leído"
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); marcarLeida.mutate(a.id) }}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
              return a.link
                ? <Link key={a.id} to={a.link} className="block hover:bg-accent">{contenido}</Link>
                : <div key={a.id}>{contenido}</div>
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
