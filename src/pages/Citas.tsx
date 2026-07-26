import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ClipboardCheck,
  Plus, Printer, CheckCircle2, Search, Stethoscope, UserCheck, UserX, XCircle, CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { matchTexto } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/context/auth-context";
import { CitaForm } from "@/components/citas/cita-form";
import { ReagendarDialog } from "@/components/citas/reagendar-dialog";
import { ConsultaForm } from "@/components/consultas/consulta-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ESTADOS_CITA, fechaHoyISO, turnoDeHora, useAdmitirCita, useCambiarEstadoCita,
  useCitasDelDia, useCitasRango, useMiMedico,
  type Cita, type EstadoCita,
} from "@/api/citas";

const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  confirmada: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  admitida: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
  atendida: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  no_acudio: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
};

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tituloFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function mesActualISO(): string {
  return fechaHoyISO().slice(0, 7); // yyyy-mm
}

function rangoDelMes(mes: string): { desde: string; hasta: string } {
  const [anho, m] = mes.split("-").map(Number);
  const ultimo = new Date(anho, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

function coincideBusqueda(cita: Cita, q: string): boolean {
  if (!q || !q.trim()) return true;
  const texto = `${cita.paciente?.apellidos || ""} ${cita.paciente?.nombres || ""} ${cita.paciente?.apellidos || ""}, ${cita.paciente?.nombres || ""} ${cita.paciente?.documento || ""} ${cita.medico?.nombres || ""} ${cita.medico?.apellidos || ""} ${cita.medico?.especialidad?.nombre || ""}`;
  return matchTexto(texto, q);
}

export default function Citas() {
  const { hasPermission, isMedico } = usePermissions();
  const { user } = useAuth();
  const canEdit = hasPermission("citas", "editar");
  const atiendeConsultas = hasPermission("consultas", "editar");

  const [vista, setVista] = useState<"dia" | "mes">("dia");
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [mes, setMes] = useState(mesActualISO());
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [consultaCita, setConsultaCita] = useState<Cita | null>(null);
  const [reagendarCita, setReagendarCita] = useState<Cita | null>(null);
  const [soloMias, setSoloMias] = useState(isMedico);

  const { data: citasDelDia = [], isLoading: cargandoDia } = useCitasDelDia(fecha);
  const { desde, hasta } = rangoDelMes(mes);
  const { data: citasDelMes = [], isLoading: cargandoMes } = useCitasRango(
    vista === "mes" ? desde : "",
    vista === "mes" ? hasta : ""
  );
  const { data: miMedico } = useMiMedico(user?.id);
  const cambiarEstado = useCambiarEstadoCita();
  const admitir = useAdmitirCita();

  const filtrar = (lista: Cita[]) => {
    let r = lista;
    if (soloMias && miMedico) r = r.filter((c) => c.medico_id === miMedico.id);
    return r.filter((c) => coincideBusqueda(c, busqueda));
  };

  const citas = filtrar(citasDelDia);
  const citasMes = filtrar(citasDelMes);
  const enEspera = citas
    .filter((c) => c.estado === "admitida")
    .sort((a, b) => (a.orden_llegada ?? 999) - (b.orden_llegada ?? 999));

  const handleEstado = async (cita: Cita, estado: EstadoCita) => {
    try {
      await cambiarEstado.mutateAsync({ id: cita.id, estado });
      toast.success(`Cita ${ESTADOS_CITA.find((e) => e.value === estado)?.label.toLowerCase()}.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleAdmitir = async (cita: Cita) => {
    try {
      await admitir.mutateAsync(cita);
      toast.success("Paciente admitido: entró a la sala de espera.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resumen = ESTADOS_CITA.map((e) => ({
    ...e,
    total: citas.filter((c) => c.estado === e.value).length,
  }));

  const accionesCita = (c: Cita) => (
    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap no-print">
      {canEdit && c.estado === "pendiente" && (
        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleEstado(c, "confirmada")}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
        </Button>
      )}
      {canEdit && (c.estado === "pendiente" || c.estado === "confirmada") && (
        <Button size="sm" className="gap-1" onClick={() => handleAdmitir(c)} title="El paciente llegó: pasa a la sala de espera con su orden">
          <UserCheck className="w-3.5 h-3.5" /> Admitir
        </Button>
      )}
      {canEdit && (c.estado === "pendiente" || c.estado === "confirmada" || c.estado === "admitida") && (
        <>
          <Button
            variant="outline" size="sm" className="gap-1"
            onClick={() => atiendeConsultas ? setConsultaCita(c) : handleEstado(c, "atendida")}
            title={atiendeConsultas ? "Registrar consulta y marcar atendida" : "Marcar atendida"}
          >
            <Stethoscope className="w-3.5 h-3.5" /> Atender
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setReagendarCita(c)}>
            <CalendarClock className="w-3.5 h-3.5" /> Reagendar
          </Button>
          {(c.estado === "pendiente" || c.estado === "confirmada") && (
            <Button
              variant="ghost" size="sm"
              className="text-gray-500 hover:text-gray-700 gap-1"
              onClick={() => handleEstado(c, "no_acudio")}
              title="El paciente no acudió a la cita"
            >
              <UserX className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost" size="sm"
            className="text-red-500 hover:text-red-600 gap-1"
            onClick={() => handleEstado(c, "cancelada")}
            title="Cancelar cita"
          >
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  );

  const filaCita = (c: Cita, mostrarFecha = false) => (
    <div key={c.id} className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="font-mono text-sm font-semibold w-24 flex-shrink-0">
        {mostrarFecha && <div className="text-xs text-muted-foreground">{c.fecha}</div>}
        {(c.hora || "").slice(0, 5)}
        <span className="ml-1 text-[10px] font-sans text-muted-foreground">{turnoDeHora(c.hora)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {c.orden_llegada != null && (
            <span className="inline-flex items-center justify-center w-5 h-5 mr-1.5 rounded-full bg-cyan-600 text-white text-xs font-bold align-middle">
              {c.orden_llegada}
            </span>
          )}
          {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : `Paciente #${c.paciente_id}`}
          {c.paciente && <span className="text-muted-foreground font-normal"> · CI {c.paciente.documento}</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {c.medico ? `Dr(a). ${c.medico.apellidos}, ${c.medico.nombres}` : `Médico #${c.medico_id}`}
          {c.medico?.especialidad ? ` — ${c.medico.especialidad.nombre}` : ""}
          {c.motivo ? ` · ${c.motivo}` : ""}
          {c.agendado_por ? ` · agendó: ${c.agendado_por.split("@")[0]}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge className={`border-0 ${COLOR_ESTADO[c.estado] || ""}`}>
          {ESTADOS_CITA.find((e) => e.value === c.estado)?.label ?? c.estado}
        </Badge>
        {accionesCita(c)}
      </div>
    </div>
  );

  const citasPorFecha = useMemo(() => {
    const grupos = new Map<string, Cita[]>();
    for (const c of citasMes) {
      const lista = grupos.get(c.fecha) || [];
      lista.push(c);
      grupos.set(c.fecha, lista);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [citasMes]);

  return (
    <AppLayout>
      <div className="space-y-4" id="agenda-imprimible">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Agenda
            </h2>
            <p className="text-sm text-muted-foreground capitalize">
              {vista === "dia" ? tituloFecha(fecha) : `Mes: ${mes}`}
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
            {canEdit && (
              <Button className="gap-2" onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4" /> Agendar cita
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={vista === "dia" ? "default" : "ghost"} size="sm" className="rounded-none gap-1"
              onClick={() => setVista("dia")}
            >
              <CalendarDays className="w-4 h-4" /> Día
            </Button>
            <Button
              variant={vista === "mes" ? "default" : "ghost"} size="sm" className="rounded-none gap-1"
              onClick={() => setVista("mes")}
            >
              <CalendarRange className="w-4 h-4" /> Mes
            </Button>
          </div>

          {vista === "dia" ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setFecha(sumarDias(fecha, -1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Input type="date" className="w-40" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => setFecha(sumarDias(fecha, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFecha(fechaHoyISO())}>Hoy</Button>
            </>
          ) : (
            <Input type="month" className="w-44" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
          )}

          <div className="relative flex-1 min-w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por paciente, CI, profesional o especialidad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {miMedico && (
            <div className="flex items-center gap-2">
              <Switch id="solo-mias" checked={soloMias} onCheckedChange={setSoloMias} />
              <Label htmlFor="solo-mias" className="text-sm">Solo mis citas</Label>
            </div>
          )}
        </div>

        {vista === "dia" && (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 no-print">
              {resumen.map((e) => (
                <div key={e.value} className="p-2 rounded-lg border bg-muted/30 text-center">
                  <div className="text-xl font-bold">{e.total}</div>
                  <div className="text-xs text-muted-foreground">{e.label}s</div>
                </div>
              ))}
            </div>

            {enEspera.length > 0 && (
              <div className="rounded-lg border border-cyan-300 dark:border-cyan-800 overflow-hidden">
                <div className="px-3 py-2 bg-cyan-50 dark:bg-cyan-950/40 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
                  <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                    Sala de espera — {enEspera.length} paciente{enEspera.length === 1 ? "" : "s"} (por orden de llegada)
                  </span>
                </div>
                <div className="divide-y">
                  {enEspera.map((c) => (
                    <div key={c.id} className="px-3 py-2 flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-cyan-600 text-white text-sm font-bold flex-shrink-0">
                        {c.orden_llegada}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.paciente ? `${c.paciente.apellidos}, ${c.paciente.nombres}` : `Paciente #${c.paciente_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.medico ? `Dr(a). ${c.medico.apellidos}` : ""}
                          {c.admitida_at ? ` · llegó ${new Date(c.admitida_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </p>
                      </div>
                      {canEdit && (
                        <Button size="sm" className="gap-1 no-print"
                          onClick={() => atiendeConsultas ? setConsultaCita(c) : handleEstado(c, "atendida")}>
                          <Stethoscope className="w-3.5 h-3.5" /> Atender
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cargandoDia ? (
              <p className="text-center text-sm text-muted-foreground py-12">Cargando agenda...</p>
            ) : citas.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Sin citas para este día.</p>
              </div>
            ) : (
              <div className="space-y-2">{citas.map((c) => filaCita(c))}</div>
            )}
          </>
        )}

        {vista === "mes" && (
          cargandoMes ? (
            <p className="text-center text-sm text-muted-foreground py-12">Cargando citas del mes...</p>
          ) : citasMes.length === 0 ? (
            <div className="text-center py-12">
              <CalendarRange className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Sin citas en este mes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {citasPorFecha.map(([f, lista]) => (
                <div key={f} className="space-y-2">
                  <h3 className="text-sm font-semibold capitalize border-b pb-1">
                    {tituloFecha(f)} <span className="text-muted-foreground font-normal">({lista.length})</span>
                  </h3>
                  {lista.map((c) => filaCita(c))}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <CitaForm open={formOpen} onOpenChange={setFormOpen} fechaInicial={vista === "dia" ? fecha : undefined} />
      <ReagendarDialog cita={reagendarCita} onOpenChange={(abierto) => { if (!abierto) setReagendarCita(null); }} />
      <ConsultaForm
        open={!!consultaCita}
        onOpenChange={(abierto) => { if (!abierto) setConsultaCita(null); }}
        pacienteId={consultaCita?.paciente_id ?? null}
        pacienteNombre={consultaCita?.paciente ? `${consultaCita.paciente.apellidos}, ${consultaCita.paciente.nombres}` : ""}
        cita={consultaCita}
      />
    </AppLayout>
  );
}
