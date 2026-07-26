import { Link } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Users, Stethoscope, HeartPulse, ClipboardCheck } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { usePacientes } from "@/api/pacientes"
import { useCitasDelDia, useMiMedico, fechaHoyISO } from "@/api/citas"
import { useAtenciones } from "@/api/consultas"

function pacientesDistintos(regs: { paciente_id: number; fecha: string }[], desde?: string): number {
  const ids = new Set<number>()
  for (const r of regs) {
    if (!desde || r.fecha >= desde) ids.add(r.paciente_id)
  }
  return ids.size
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data: pacientes = [] } = usePacientes()
  const { data: citasHoy = [] } = useCitasDelDia(fechaHoyISO())
  const { data: miMedico } = useMiMedico(user?.id)
  const { data: atenciones = [] } = useAtenciones()

  const hoy = fechaHoyISO()
  const inicioMes = `${hoy.slice(0, 7)}-01`

  const misCitasHoy = miMedico ? citasHoy.filter((c) => c.medico_id === miMedico.id) : []
  const misEnEspera = misCitasHoy
    .filter((c) => c.estado === "admitida")
    .sort((a, b) => (a.orden_llegada ?? 999) - (b.orden_llegada ?? 999))
  const misPorLlegar = misCitasHoy.filter((c) => c.estado === "pendiente" || c.estado === "confirmada")
  const misAtendidas = misCitasHoy.filter((c) => c.estado === "atendida")

  const stats = [
    { valor: pacientes.filter((p) => p.activo).length, etiqueta: "pacientes activos", href: "/pacientes" },
    { valor: citasHoy.length, etiqueta: "citas hoy", href: "/citas" },
    { valor: citasHoy.filter((c) => c.estado === "pendiente" || c.estado === "confirmada" || c.estado === "admitida").length, etiqueta: "por atender hoy", href: "/citas" },
    { valor: pacientesDistintos(atenciones, hoy), etiqueta: "atendidos hoy", href: "/pacientes?atencion=hoy" },
    { valor: pacientesDistintos(atenciones, inicioMes), etiqueta: "atendidos este mes", href: "/pacientes?atencion=mes" },
    { valor: pacientesDistintos(atenciones), etiqueta: "atendidos hasta la fecha", href: "/pacientes?atencion=alguna_vez" },
  ]

  const modulos = [
    {
      nombre: "Pacientes",
      descripcion: "Padrón de pacientes de la Sanidad (cadetes, oficiales, personal y familiares).",
      icon: Users,
      href: "/pacientes",
    },
    {
      nombre: "Agenda de citas",
      descripcion: "Agendar, confirmar, atender y cancelar citas médicas.",
      icon: CalendarDays,
      href: "/citas",
    },
    {
      nombre: "Consultas",
      descripcion: "Se registran al atender una cita, o desde la historia clínica del paciente.",
      icon: Stethoscope,
      href: "/pacientes",
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {miMedico && (
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Mi día — {miMedico.apellidos}, {miMedico.nombres}
                {miMedico.especialidad ? ` (${miMedico.especialidad.nombre})` : ""}
              </CardTitle>
              <CardDescription>
                {misCitasHoy.length === 0
                  ? "No tiene citas agendadas para hoy."
                  : `${misCitasHoy.length} cita${misCitasHoy.length === 1 ? "" : "s"} hoy · ${misPorLlegar.length} por llegar · ${misEnEspera.length} en espera · ${misAtendidas.length} atendida${misAtendidas.length === 1 ? "" : "s"}`}
              </CardDescription>
            </CardHeader>
            {misEnEspera.length > 0 && (
              <CardContent className="space-y-2">
                <p className="text-sm font-medium">En sala de espera:</p>
                {misEnEspera.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex-shrink-0">
                      {c.orden_llegada}
                    </span>
                    <span className="truncate">
                      {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : `Paciente #${c.paciente_id}`}
                    </span>
                    {c.admitida_at && (
                      <Badge variant="outline" className="ml-auto flex-shrink-0">
                        llegó {new Date(c.admitida_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </Badge>
                    )}
                  </div>
                ))}
                <Link to="/citas" className="text-sm text-primary hover:underline inline-block pt-1">
                  Ir a mi agenda →
                </Link>
              </CardContent>
            )}
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="w-6 h-6 text-primary" />
              Sección Sanidad — Academia Nacional de Policía
            </CardTitle>
            <CardDescription>Sesión iniciada como {user?.email ?? "—"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {stats.map((s) => (
                <Link key={s.etiqueta} to={s.href} className="block p-3 rounded-lg border bg-muted/30 text-center hover:border-primary/60 transition-colors">
                  <div className="text-2xl font-bold">{s.valor}</div>
                  <div className="text-xs text-muted-foreground">{s.etiqueta}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulos.map((m) => {
            const tarjeta = (
              <Card key={m.nombre} className={m.href ? "hover:border-primary/60 transition-colors h-full" : "opacity-70 h-full"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <m.icon className="w-5 h-5 text-primary" />
                    {m.nombre}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{m.descripcion}</p>
                </CardContent>
              </Card>
            )
            return m.href
              ? <Link key={m.nombre} to={m.href} className="block">{tarjeta}</Link>
              : tarjeta
          })}
        </div>
      </div>
    </AppLayout>
  )
}
