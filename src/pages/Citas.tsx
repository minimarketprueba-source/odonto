import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarDays, CalendarRange, ClipboardCheck,
  Plus, Printer, CheckCircle2, Search, Stethoscope, UserCheck, UserX, XCircle, CalendarClock, Trash2, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { matchTexto } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/context/auth-context";
import { CitaForm } from "@/components/citas/cita-form";
import { ReagendarDialog } from "@/components/citas/reagendar-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ESTADOS_CITA, fechaHoyISO, turnoDeHora, tienePreconsulta, resumenPreconsulta,
  useAdmitirCita, useCambiarEstadoCita,
  useCitasDelDia, useCitasRango, useMiMedico,
  type Cita, type EstadoCita,
} from "@/api/citas";
import { PreconsultaDialog } from "@/components/citas/preconsulta-dialog";
import { useBorrarCita } from "@/api/anulaciones";

// Auxiliar para plurales simples en los avisos
function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

// Unir frases con comas y "y" al final
function unirFrase(partes: string[]): string {
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  return partes.slice(0, -1).join(", ") + " y " + partes[partes.length - 1];
}

// Funciones para calcular rangos del mes
function mesActualISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rangoDelMes(mesISO: string): { desde: string; hasta: string } {
  const [y, m] = mesISO.split("-").map(Number);
  const fin = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    desde: `${y}-${pad(m)}-01`,
    hasta: `${y}-${pad(m)}-${pad(fin)}`,
  };
}

function coincideBusqueda(cita: Cita, q: string): boolean {
  if (!q || !q.trim()) return true;
  const texto = `${cita.paciente?.apellidos || ""} ${cita.paciente?.nombres || ""} ${cita.paciente?.apellidos || ""}, ${cita.paciente?.nombres || ""} ${cita.paciente?.documento || ""} ${cita.medico?.nombres || ""} ${cita.medico?.apellidos || ""} ${cita.medico?.especialidad?.nombre || ""}`;
  return matchTexto(texto, q);
}

export default function Citas() {
  const navigate = useNavigate();
  const { hasPermission, isMedico, isAdmin } = usePermissions();
  const { user } = useAuth();
  const canEdit = hasPermission("citas", "editar");


  const [vista, setVista] = useState<"dia" | "mes">("dia");
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [mes, setMes] = useState(mesActualISO());
  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [reagendarCita, setReagendarCita] = useState<Cita | null>(null);
  const [preconsultaCita, setPreconsultaCita] = useState<Cita | null>(null);
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
  const borrar = useBorrarCita();

  const handleBorrarCita = async (cita: Cita) => {
    const quien = cita.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombres}` : "este paciente";
    const confirmado = window.confirm(
      `¿Borrar la cita del ${cita.fecha} a las ${(cita.hora || "").slice(0, 5)} de ${quien}?\n\n` +
      "Se borra para siempre y no queda ningún registro. Use esto solo si la cita se cargó por error.\n" +
      'Si el paciente no vino, es mejor "No acudió"; si se suspendió, "Cancelar".'
    );
    if (!confirmado) return;
    try {
      await borrar.mutateAsync(cita.id);
      toast.success("Cita borrada.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

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

  const esHoy = fecha === fechaHoyISO();
  const citasDeHoy = miMedico
    ? citasDelDia.filter((c) => c.medico_id === miMedico.id)
    : citasDelDia;
  const hoyEnEspera = citasDeHoy.filter((c) => c.estado === "admitida").length;
  const hoyPorLlegar = citasDeHoy.filter((c) => c.estado === "pendiente" || c.estado === "confirmada").length;
  const hoyAtendidas = citasDeHoy.filter((c) => c.estado === "atendida").length;
  const nombreSaludo = miMedico ? `, ${miMedico.nombres.split(" ")[0]}` : "";
  const posesivo = miMedico ? "tiene" : "hay";



  const detalleDia = unirFrase([
    hoyEnEspera > 0 ? `${plural(hoyEnEspera, "paciente esperando", "pacientes esperando")}` : "",
    hoyPorLlegar > 0 ? `${plural(hoyPorLlegar, "por llegar", "por llegar")}` : "",
    hoyAtendidas > 0 ? `${plural(hoyAtendidas, "ya atendido", "ya atendidos")}` : "",
  ].filter(Boolean));

  const mensajeDia =
    citasDeHoy.length === 0
      ? `Hoy no ${posesivo} citas agendadas.`
      : hoyEnEspera === 0 && hoyPorLlegar === 0
        ? `Hoy ${posesivo} ${plural(citasDeHoy.length, "cita", "citas")}. ¡Ya está todo atendido!`
        : `Hoy ${posesivo} ${plural(citasDeHoy.length, "cita", "citas")}: ${detalleDia}.`;

  const accionesCita = (c: Cita) => (
    <div className="flex items-center gap-1.5 flex-wrap no-print">
      {isAdmin && (
        <Button
          variant="ghost" size="icon"
          className="text-muted-foreground hover:text-red-600"
          title="Borrar esta cita (se cargó por error)"
          onClick={() => handleBorrarCita(c)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
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
            onClick={() => navigate(`/pacientes/${c.paciente_id}`)}
            title="Abrir Ficha Dental y atender"
          >
            <Stethoscope className="w-3.5 h-3.5" /> Atender
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setReagendarCita(c)}>
            <CalendarClock className="w-3.5 h-3.5" /> Reagendar
          </Button>
          <Button
            variant="outline" size="sm"
            className={tienePreconsulta(c)
              ? "gap-1 text-cyan-700 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800"
              : "gap-1"}
            onClick={() => setPreconsultaCita(c)}
            title={tienePreconsulta(c)
              ? `Signos vitales cargados: ${resumenPreconsulta(c) ?? ""}`
              : "Cargar signos vitales antes de la consulta"}
          >
            <Activity className="w-3.5 h-3.5" />
            {tienePreconsulta(c) ? "Signos ✓" : "Signos"}
          </Button>
          {(c.estado === "pendiente" || c.estado === "confirmada") && (
            <Button
              variant="ghost" size="icon"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => handleEstado(c, "no_acudio")}
              title="El paciente no acudió a la cita"
            >
              <UserX className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost" size="icon"
            className="text-red-500 hover:text-red-600"
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
        <p className="text-xs text-muted-foreground truncate">
          {c.medico && `Dr(a). ${c.medico.apellidos}`}
          {c.medico?.especialidad && ` (${c.medico.especialidad.nombre})`}
          {c.motivo && ` · Motivo: ${c.motivo}`}
        </p>
      </div>
      {accionesCita(c)}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">Citas y Agenda</h2>
            <p className="text-sm text-muted-foreground">
              Agenda de turnos de la clínica dental.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2 shadow-sm" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" /> Agendar cita
            </Button>
            <Button variant="outline" className="gap-2 shadow-sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          </div>
        </div>

        {/* Bienvenida y resumen */}
        {vista === "dia" && esHoy && (
          <div className="p-4 bg-muted/30 border rounded-2xl flex items-center gap-3">
            <CalendarDays className="w-10 h-10 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Hola{nombreSaludo}</h3>
              <p className="text-xs text-muted-foreground">{mensajeDia}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <div className="flex gap-1.5 bg-muted p-1 rounded-xl w-fit">
            <Button
              variant={vista === "dia" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-lg text-xs"
              onClick={() => setVista("dia")}
            >
              <CalendarDays className="w-4 h-4 mr-1.5" /> Vista por Día
            </Button>
            <Button
              variant={vista === "mes" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-lg text-xs"
              onClick={() => setVista("mes")}
            >
              <CalendarRange className="w-4 h-4 mr-1.5" /> Vista por Mes
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Buscar paciente, odontólogo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {isMedico && (
              <div className="flex items-center gap-2 border px-3 py-1.5 rounded-xl bg-card">
                <Switch id="solo-mias" checked={soloMias} onCheckedChange={setSoloMias} />
                <Label htmlFor="solo-mias" className="text-xs font-semibold cursor-pointer">Mis citas</Label>
              </div>
            )}
          </div>
        </div>

        {/* Agenda por Día */}
        {vista === "dia" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(fecha);
                d.setDate(d.getDate() - 1);
                setFecha(d.toISOString().split("T")[0]);
              }}>&lt;</Button>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40 h-9 font-semibold text-center" />
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(fecha);
                d.setDate(d.getDate() + 1);
                setFecha(d.toISOString().split("T")[0]);
              }}>&gt;</Button>
              <Button variant="ghost" size="sm" onClick={() => setFecha(fechaHoyISO())}>Hoy</Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
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
                          onClick={() => navigate(`/pacientes/${c.paciente_id}`)}>
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
              <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-card">
                <CalendarDays className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-muted-foreground">Sin citas para este día.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {citas.map((c) => filaCita(c))}
              </div>
            )}
          </div>
        )}

        {/* Agenda por Mes */}
        {vista === "mes" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44 h-9 font-semibold text-center" />
            </div>

            {cargandoMes ? (
              <p className="text-center text-sm text-muted-foreground py-12">Cargando agenda del mes...</p>
            ) : citasMes.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-card">
                <CalendarDays className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-muted-foreground">Sin citas para este mes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {citasMes.map((c) => filaCita(c, true))}
              </div>
            )}
          </div>
        )}
      </div>

      <CitaForm open={formOpen} onOpenChange={setFormOpen} fechaInicial={vista === "dia" ? fecha : undefined} />
      <PreconsultaDialog
        open={!!preconsultaCita}
        onOpenChange={(o) => { if (!o) setPreconsultaCita(null); }}
        cita={preconsultaCita}
      />
      <ReagendarDialog cita={reagendarCita} onOpenChange={(abierto) => { if (!abierto) setReagendarCita(null); }} />
    </AppLayout>
  );
}
