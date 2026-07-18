import { Link } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, Users, Stethoscope, HeartPulse } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { usePacientes } from "@/api/pacientes"
import { useCitasDelDia, fechaHoyISO } from "@/api/citas"

export default function Dashboard() {
  const { user } = useAuth()
  const { data: pacientes = [] } = usePacientes()
  const { data: citasHoy = [] } = useCitasDelDia(fechaHoyISO())

  const stats = [
    { valor: pacientes.filter((p) => p.activo).length, etiqueta: "pacientes activos" },
    { valor: citasHoy.length, etiqueta: "citas hoy" },
    { valor: citasHoy.filter((c) => c.estado === "pendiente" || c.estado === "confirmada").length, etiqueta: "por atender hoy" },
    { valor: citasHoy.filter((c) => c.estado === "atendida").length, etiqueta: "atendidas hoy" },
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="w-6 h-6 text-primary" />
              Sanidad ISEPOL — Citas Médicas
            </CardTitle>
            <CardDescription>Sesión iniciada como {user?.email ?? "—"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.etiqueta} className="p-3 rounded-lg border bg-muted/30 text-center">
                  <div className="text-2xl font-bold">{s.valor}</div>
                  <div className="text-xs text-muted-foreground">{s.etiqueta}</div>
                </div>
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
