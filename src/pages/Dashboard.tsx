import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Users, Stethoscope, HeartPulse } from "lucide-react"
import { useAuth } from "@/context/auth-context"

// Fase 0: pantalla de bienvenida. En Fase 1 este dashboard mostrará las citas
// del día y los contadores reales (pacientes, citas pendientes, atendidas).
export default function Dashboard() {
  const { user } = useAuth()

  const modulos = [
    {
      nombre: "Pacientes",
      descripcion: "Padrón de pacientes de la Sanidad (cadetes, oficiales, personal y familiares).",
      icon: Users,
      fase: "Fase 1",
    },
    {
      nombre: "Agenda de citas",
      descripcion: "Agendar, confirmar, atender y cancelar citas médicas.",
      icon: CalendarDays,
      fase: "Fase 1",
    },
    {
      nombre: "Consultas",
      descripcion: "Historia clínica: motivo, diagnóstico CIE-10 y tratamiento.",
      icon: Stethoscope,
      fase: "Fase 2",
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="w-6 h-6 text-primary" />
              Bienvenido a Sanidad ISEPOL
            </CardTitle>
            <CardDescription>
              Sistema de citas médicas de la Sanidad Policial. Sesión iniciada como {user?.email ?? "—"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              El sistema se está construyendo por fases sobre la base de datos ya operativa
              (750 pacientes vinculados a control de peso). Los módulos se habilitarán aquí a
              medida que estén listos.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulos.map((m) => (
            <Card key={m.nombre} className="opacity-80">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <m.icon className="w-5 h-5 text-primary" />
                    {m.nombre}
                  </span>
                  <Badge variant="outline">{m.fase}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{m.descripcion}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
