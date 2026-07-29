import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { AlertTriangle, Loader2, Printer, Search, X, UserCheck, HeartPulse, Stethoscope, LogOut, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn, matchPaciente } from "@/lib/utils";
import { sanitizePlainText, sanitizeMultilineText } from "@/lib/security";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/context/auth-context";
import { useNombrePerfil } from "@/api/perfil";
import { imprimirFichaRac } from "@/lib/imprimir";
import { labelTipoPaciente, usePacientes, type Paciente } from "@/api/pacientes";
import { MedicoSelector } from "@/components/consultas/medico-selector";
import { useMedicosActivos, fechaHoyISO } from "@/api/citas";
import { useSearchCie10, type Cie10 } from "@/api/consultas";
import { useEnfermeriaCamas, useEnfermeriaIngresos, useIngresarPacienteCama } from "@/api/enfermeria";
import {
  DESTINOS_RAC, NIVELES_TRIAJE, numeroRac, triaje as nivelTriaje,
  useAbrirFichaRac, useCerrarFichaRac,
  type DestinoRac, type FichaRac, type NivelTriaje,
} from "@/api/rac";

function horaAhora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function edadDe(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return "";
  const [y, m, d] = fechaNacimiento.split("-").map(Number);
  if (!y) return "";
  const hoy = new Date();
  let edad = hoy.getFullYear() - y;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
  return edad >= 0 && edad < 120 ? `${edad} años` : "";
}

/** Solo dígitos; devuelve null si queda vacío, para no mandar 0 por error. */
function numeroONull(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const n = Number(limpio.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const VACIO = {
  // 1. Admisión
  hora_admision: "", jerarquia: "", domicilio: "", barrio_compania: "",
  localidad: "", referencia_domiciliaria: "", telefono: "",
  // 2. Enfermería
  hora_enfermeria: "", pa_sistolica: "", pa_diastolica: "", fc: "", fr: "",
  spo2: "", temp: "", motivo_consulta: "", discriminante: "", enfermero: "",
  // 3. Médico
  hora_medico: "", patologia_previa: "", alergias: "", examen_fisico: "",
  laboratorio: "", radiologia: "", diagnostico: "", tratamiento: "",
  evolucion: "", plan: "",
  // 4. Destino
  hora_destino: "", destino_dias: "",
};

interface RacFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = abrir una ficha nueva; con ficha = atenderla o verla. */
  ficha?: FichaRac | null;
  pacienteInicial?: Paciente | null;
}

export function RacForm({ open, onOpenChange, ficha, pacienteInicial }: RacFormProps) {
  const { user } = useAuth();
  const { data: nombrePerfil } = useNombrePerfil(user);
  const { data: pacientes = [] } = usePacientes();
  const { data: medicos = [] } = useMedicosActivos();
  const { data: camas = [] } = useEnfermeriaCamas();
  const { data: internaciones = [] } = useEnfermeriaIngresos();
  const abrir = useAbrirFichaRac();
  const cerrar = useCerrarFichaRac();
  const internar = useIngresarPacienteCama();

  const modo: "nueva" | "atender" | "ver" =
    !ficha ? "nueva" : ficha.estado === "espera" ? "atender" : "ver";

  const [form, setForm] = useState(VACIO);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [triajeSel, setTriajeSel] = useState<NivelTriaje | "">("");
  const [medicoId, setMedicoId] = useState("");
  const [cieBusqueda, setCieBusqueda] = useState("");
  const [cieLista, setCieLista] = useState<Cie10[]>([]);
  const [destino, setDestino] = useState<DestinoRac | "">("");
  const [camaId, setCamaId] = useState("");

  // Si la internación se creó y después falló el cierre, no se crea de nuevo.
  const internacionCreada = useRef<number | null>(null);

  const cieDebounced = useDebounce(cieBusqueda, 300);
  const { data: cieOpciones = [] } = useSearchCie10(cieDebounced);
  const busquedaPacienteDebounced = useDebounce(busquedaPaciente, 300);

  useEffect(() => {
    if (!open) return;
    internacionCreada.current = null;
    setCieBusqueda("");
    setBusquedaPaciente("");
    setCamaId("");

    if (ficha) {
      const p = ficha.paciente ?? null;
      setPaciente(p);
      setForm({
        hora_admision: ficha.hora_admision?.slice(0, 5) ?? "",
        jerarquia: ficha.jerarquia ?? "",
        domicilio: ficha.domicilio ?? "",
        barrio_compania: ficha.barrio_compania ?? "",
        localidad: ficha.localidad ?? "",
        referencia_domiciliaria: ficha.referencia_domiciliaria ?? "",
        telefono: ficha.telefono ?? "",
        hora_enfermeria: ficha.hora_enfermeria?.slice(0, 5) ?? "",
        pa_sistolica: ficha.pa_sistolica?.toString() ?? "",
        pa_diastolica: ficha.pa_diastolica?.toString() ?? "",
        fc: ficha.fc?.toString() ?? "",
        fr: ficha.fr?.toString() ?? "",
        spo2: ficha.spo2?.toString() ?? "",
        temp: ficha.temp?.toString() ?? "",
        motivo_consulta: ficha.motivo_consulta ?? "",
        discriminante: ficha.discriminante ?? "",
        enfermero: ficha.enfermero ?? "",
        hora_medico: ficha.hora_medico?.slice(0, 5) ?? horaAhora(),
        patologia_previa: ficha.patologia_previa ?? "",
        alergias: ficha.alergias ?? "",
        examen_fisico: ficha.examen_fisico ?? "",
        laboratorio: ficha.laboratorio ?? "",
        radiologia: ficha.radiologia ?? "",
        diagnostico: ficha.diagnostico ?? "",
        tratamiento: ficha.tratamiento ?? "",
        evolucion: ficha.evolucion ?? "",
        plan: ficha.plan ?? "",
        hora_destino: ficha.hora_destino?.slice(0, 5) ?? horaAhora(),
        destino_dias: ficha.destino_dias?.toString() ?? "",
      });
      setTriajeSel(ficha.triaje ?? "");
      setMedicoId(ficha.medico_id?.toString() ?? "");
      setDestino(ficha.destino ?? "");
      return;
    }

    const p = pacienteInicial ?? null;
    setPaciente(p);
    setTriajeSel("");
    setMedicoId("");
    setDestino("");
    setCieLista([]);
    setForm({
      ...VACIO,
      hora_admision: horaAhora(),
      hora_enfermeria: horaAhora(),
      jerarquia: p?.grado ?? "",
      domicilio: p?.direccion ?? "",
      telefono: p?.telefono ?? "",
      // Nombre real de la cuenta; si el perfil no lo tiene, la cuenta.
      enfermero: nombrePerfil || user?.email || "",
    });
  }, [open, ficha, pacienteInicial, user?.email, nombrePerfil]);

  const set = (campo: keyof typeof VACIO) => (valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPacienteDebounced.trim()) return [];
    return pacientes
      .filter((p) => p.activo && matchPaciente(p, busquedaPacienteDebounced))
      .slice(0, 8);
  }, [pacientes, busquedaPacienteDebounced]);

  const medicoSel = useMemo(
    () => medicos.find((m) => String(m.id) === medicoId) ?? null,
    [medicos, medicoId]
  );

  const camasLibres = useMemo(() => {
    const ocupadas = new Set(internaciones.map((i) => i.cama_id));
    return camas.filter((c) => !c.fuera_de_servicio && !ocupadas.has(c.id));
  }, [camas, internaciones]);

  const destinoSel = DESTINOS_RAC.find((d) => d.value === destino) ?? null;
  const guardando = abrir.isPending || cerrar.isPending || internar.isPending;

  // --- Etapa 1 y 2: abrir la ficha ------------------------------------------
  const handleAbrir = async () => {
    if (!paciente) { toast.error("Elija el paciente que llegó."); return; }
    if (!form.hora_admision) { toast.error("Indique la hora de admisión."); return; }
    if (!triajeSel) { toast.error("Clasifique al paciente (triaje) antes de guardar."); return; }
    if (!form.motivo_consulta.trim()) { toast.error("Escriba el motivo de consulta."); return; }

    try {
      await abrir.mutateAsync({
        paciente_id: paciente.id,
        fecha: fechaHoyISO(),
        hora_admision: form.hora_admision,
        admitida_por: user?.email ?? null,
        jerarquia: sanitizePlainText(form.jerarquia) || null,
        domicilio: sanitizePlainText(form.domicilio) || null,
        barrio_compania: sanitizePlainText(form.barrio_compania) || null,
        localidad: sanitizePlainText(form.localidad) || null,
        referencia_domiciliaria: sanitizePlainText(form.referencia_domiciliaria) || null,
        telefono: sanitizePlainText(form.telefono) || null,
        hora_enfermeria: form.hora_enfermeria || null,
        pa_sistolica: numeroONull(form.pa_sistolica),
        pa_diastolica: numeroONull(form.pa_diastolica),
        fc: numeroONull(form.fc),
        fr: numeroONull(form.fr),
        spo2: numeroONull(form.spo2),
        temp: numeroONull(form.temp),
        motivo_consulta: sanitizeMultilineText(form.motivo_consulta) || null,
        discriminante: sanitizePlainText(form.discriminante) || null,
        triaje: triajeSel,
        enfermero: sanitizePlainText(form.enfermero) || null,
      });
      toast.success("Ficha abierta. El paciente quedó en espera del médico.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // --- Etapa 3 y 4: cerrar la ficha -----------------------------------------
  const handleCerrar = async () => {
    if (!ficha || !paciente) return;
    if (!medicoId) { toast.error("Indique el médico que atendió."); return; }
    if (cieLista.length === 0) { toast.error("Elija al menos un diagnóstico CIE-10."); return; }
    if (!destino) { toast.error("Indique el destino del paciente."); return; }
    if (destinoSel?.pideDias && !numeroONull(form.destino_dias)) {
      toast.error(`Indique cuántos días de ${destinoSel.label.toLowerCase()}.`);
      return;
    }
    if (destino === "internacion" && !camaId && !internacionCreada.current) {
      toast.error("Elija la cama donde queda internado.");
      return;
    }

    const cieTexto = cieLista.map((c) => `[${c.codigo}] ${c.descripcion}`).join(" / ");
    const diagFinal = form.diagnostico.trim()
      ? `${cieTexto} — ${sanitizePlainText(form.diagnostico)}`
      : cieTexto;

    try {
      // La internación va primero: es lo que puede chocar (cama ya ocupada).
      if (destino === "internacion" && !internacionCreada.current) {
        const creada = await internar.mutateAsync({
          paciente_id: paciente.id,
          cama_id: Number(camaId),
          medico_id: Number(medicoId),
          ingresado_por: user?.email ?? null,
          fecha_ingreso: ficha.fecha,
          hora_ingreso: form.hora_destino || horaAhora(),
          diagnostico_ingreso: diagFinal,
          motivo_observacion: sanitizeMultilineText(form.motivo_consulta) || null,
          enfermero_cargo: sanitizePlainText(form.enfermero) || null,
        });
        internacionCreada.current = creada.id;
      }

      await cerrar.mutateAsync({
        id: ficha.id,
        paciente_id: paciente.id,
        fecha: ficha.fecha,
        hora_medico: form.hora_medico || horaAhora(),
        medico_id: Number(medicoId),
        patologia_previa: sanitizeMultilineText(form.patologia_previa) || null,
        alergias: sanitizeMultilineText(form.alergias) || null,
        examen_fisico: sanitizeMultilineText(form.examen_fisico) || null,
        laboratorio: sanitizeMultilineText(form.laboratorio) || null,
        radiologia: sanitizeMultilineText(form.radiologia) || null,
        diagnostico: diagFinal,
        cie10_id: cieLista[0]?.id ?? null,
        tratamiento: sanitizeMultilineText(form.tratamiento) || null,
        evolucion: sanitizeMultilineText(form.evolucion) || null,
        plan: sanitizeMultilineText(form.plan) || null,
        hora_destino: form.hora_destino || horaAhora(),
        destino,
        destino_dias: numeroONull(form.destino_dias),
        motivo_consulta: ficha.motivo_consulta,
        internacion_id: internacionCreada.current,
      });
      toast.success("Ficha cerrada y consulta registrada en la historia clínica.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleImprimir = () => {
    if (!paciente) return;
    const nivel = nivelTriaje(ficha?.triaje ?? triajeSel);
    const pa = form.pa_sistolica && form.pa_diastolica
      ? `${form.pa_sistolica}/${form.pa_diastolica}`
      : form.pa_sistolica || "";
    imprimirFichaRac({
      numero: ficha ? numeroRac(ficha.numero) : "—",
      fecha: (ficha?.fecha ?? fechaHoyISO()).split("-").reverse().join("/"),
      edad: edadDe(paciente.fecha_nacimiento),
      sexo: paciente.sexo === "F" ? "Femenino" : paciente.sexo === "M" ? "Masculino" : "",
      pacienteNombre: `${paciente.apellidos}, ${paciente.nombres}`,
      pacienteDocumento: paciente.documento,
      jerarquia: form.jerarquia || paciente.grado,
      domicilio: form.domicilio,
      barrioCompania: form.barrio_compania,
      localidad: form.localidad,
      referenciaDomiciliaria: form.referencia_domiciliaria,
      telefono: form.telefono,
      horaAdmision: form.hora_admision,
      horaEnfermeria: form.hora_enfermeria,
      presionArterial: pa,
      fc: form.fc, fr: form.fr, spo2: form.spo2, temp: form.temp,
      motivoConsulta: form.motivo_consulta,
      discriminante: form.discriminante,
      triajeLabel: nivel?.value.toUpperCase() ?? null,
      triajeHex: nivel?.hex ?? null,
      enfermero: form.enfermero,
      horaMedico: ficha?.hora_medico ? form.hora_medico : null,
      patologiaPrevia: form.patologia_previa,
      alergias: form.alergias,
      examenFisico: form.examen_fisico,
      laboratorio: form.laboratorio,
      radiologia: form.radiologia,
      diagnostico: ficha?.diagnostico ?? form.diagnostico,
      tratamiento: form.tratamiento,
      evolucion: form.evolucion,
      plan: form.plan,
      horaDestino: ficha?.hora_destino ? form.hora_destino : null,
      destino: ficha?.destino ?? destino ?? null,
      destinoDias: numeroONull(form.destino_dias),
      profesionalNombre: medicoSel ? `Dr(a). ${medicoSel.nombres} ${medicoSel.apellidos}` : null,
    });
  };

  const soloLectura = modo === "ver";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-6 rounded-xl border shadow-xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2.5 flex-wrap text-xl font-bold">
            <FileText className="w-5 h-5 text-primary" />
            Ficha de RAC (Urgencias)
            {ficha && <Badge variant="outline" className="font-mono">{numeroRac(ficha.numero)}</Badge>}
            {ficha?.triaje && (
              <Badge className={cn("border font-medium", nivelTriaje(ficha.triaje)?.clase)}>
                {nivelTriaje(ficha.triaje)?.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {modo === "nueva" && "Admisión y clasificación de enfermería. Al guardar, el paciente queda en espera del médico."}
            {modo === "atender" && "Complete la evaluación médica y el destino. Al cerrar se registra la consulta en la historia clínica."}
            {modo === "ver" && "Ficha ya cerrada. Se puede consultar o imprimir."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ---------------- 1. ADMISIÓN ---------------- */}
          <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary border-b pb-2">
              <UserCheck className="w-4 h-4 text-primary" />
              <span>1. Admisión del Paciente</span>
            </div>

            {modo === "nueva" && !paciente && (
              <div className="space-y-2">
                <Label htmlFor="rac-buscar" className="font-medium text-sm">Paciente *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="rac-buscar"
                    className="pl-9 h-10"
                    placeholder="Buscar por nombre o cédula de identidad..."
                    value={busquedaPaciente}
                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                  />
                </div>
                {pacientesFiltrados.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-52 overflow-y-auto bg-background shadow-md mt-1">
                    {pacientesFiltrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3.5 py-2.5 hover:bg-muted/70 transition-colors text-sm flex items-center justify-between"
                        onClick={() => {
                          setPaciente(p);
                          setForm((f) => ({
                            ...f,
                            jerarquia: p.grado ?? "",
                            domicilio: p.direccion ?? "",
                            telefono: p.telefono ?? "",
                          }));
                        }}
                      >
                        <div>
                          <span className="font-semibold block">{p.apellidos}, {p.nombres}</span>
                          <span className="text-muted-foreground text-xs">
                            CI {p.documento || "s/n"} · {labelTipoPaciente(p.tipo)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">Seleccionar</Badge>
                      </button>
                    ))}
                  </div>
                )}
                {busquedaPacienteDebounced && pacientesFiltrados.length === 0 && (
                  <p className="text-sm text-muted-foreground pt-1">
                    No se encontró ningún paciente activo con «{busquedaPacienteDebounced}».
                  </p>
                )}
              </div>
            )}

            {paciente && (
              <div className="rounded-lg border bg-muted/40 p-3.5 flex items-start justify-between gap-3 shadow-xs">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {paciente.apellidos}, {paciente.nombres}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    C.I. <span className="font-semibold text-foreground">{paciente.documento || "sin cédula"}</span> · {labelTipoPaciente(paciente.tipo)}
                    {edadDe(paciente.fecha_nacimiento) && ` · ${edadDe(paciente.fecha_nacimiento)}`}
                    {paciente.sexo && ` · ${paciente.sexo === "F" ? "Femenino" : "Masculino"}`}
                  </p>
                </div>
                {modo === "nueva" && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setPaciente(null)}>
                    <X className="w-4 h-4" /> Cambiar
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rac-hora" className="text-xs font-semibold">Hora de admisión *</Label>
                <Input id="rac-hora" type="time" value={form.hora_admision}
                  disabled={modo !== "nueva"} onChange={(e) => set("hora_admision")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rac-jerarquia" className="text-xs font-semibold">Jerarquía / Grado</Label>
                <Input id="rac-jerarquia" placeholder="Ej: Oficial, Cadete, Subof." value={form.jerarquia}
                  disabled={modo !== "nueva"} onChange={(e) => set("jerarquia")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rac-tel" className="text-xs font-semibold">Teléfono / Celular</Label>
                <Input id="rac-tel" placeholder="0981..." value={form.telefono}
                  disabled={modo !== "nueva"} onChange={(e) => set("telefono")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rac-localidad" className="text-xs font-semibold">Localidad / Ciudad</Label>
                <Input id="rac-localidad" placeholder="Ej: Luque, Asunción" value={form.localidad}
                  disabled={modo !== "nueva"} onChange={(e) => set("localidad")(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rac-domicilio" className="text-xs font-semibold">Domicilio particular</Label>
                <Input id="rac-domicilio" placeholder="Dirección exacta" value={form.domicilio}
                  disabled={modo !== "nueva"} onChange={(e) => set("domicilio")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rac-barrio" className="text-xs font-semibold">Barrio o Compañía</Label>
                <Input id="rac-barrio" placeholder="Barrio" value={form.barrio_compania}
                  disabled={modo !== "nueva"} onChange={(e) => set("barrio_compania")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rac-ref" className="text-xs font-semibold">Referencia domiciliaria</Label>
                <Input id="rac-ref" placeholder="Cerca de..." value={form.referencia_domiciliaria}
                  disabled={modo !== "nueva"} onChange={(e) => set("referencia_domiciliaria")(e.target.value)} />
              </div>
            </div>
          </section>

          {/* ---------------- 2. ENFERMERÍA ---------------- */}
          <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 border-b pb-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>2. Enfermería — Signos Vitales y Triaje</span>
            </div>

            {/* Signos Vitales Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="rac-hora-enf" className="text-xs font-semibold">Hora Enf.</Label>
                <Input id="rac-hora-enf" type="time" value={form.hora_enfermeria}
                  disabled={modo !== "nueva"} onChange={(e) => set("hora_enfermeria")(e.target.value)} />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-2">
                <Label className="text-xs font-semibold">PA (sist / diast)</Label>
                <div className="flex items-center gap-1.5">
                  <Input inputMode="numeric" placeholder="120" value={form.pa_sistolica} className="text-center font-mono"
                    disabled={modo !== "nueva"} onChange={(e) => set("pa_sistolica")(e.target.value)} />
                  <span className="text-muted-foreground font-bold text-sm">/</span>
                  <Input inputMode="numeric" placeholder="80" value={form.pa_diastolica} className="text-center font-mono"
                    disabled={modo !== "nueva"} onChange={(e) => set("pa_diastolica")(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rac-fc" className="text-xs font-semibold">FC (lpm)</Label>
                <Input id="rac-fc" inputMode="numeric" placeholder="72" value={form.fc} className="font-mono text-center"
                  disabled={modo !== "nueva"} onChange={(e) => set("fc")(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rac-fr" className="text-xs font-semibold">FR (rpm)</Label>
                <Input id="rac-fr" inputMode="numeric" placeholder="16" value={form.fr} className="font-mono text-center"
                  disabled={modo !== "nueva"} onChange={(e) => set("fr")(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rac-spo2" className="text-xs font-semibold">SPO2 %</Label>
                <Input id="rac-spo2" inputMode="numeric" placeholder="98" value={form.spo2} className="font-mono text-center"
                  disabled={modo !== "nueva"} onChange={(e) => set("spo2")(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rac-temp" className="text-xs font-semibold">T° axilar (°C)</Label>
                <Input id="rac-temp" inputMode="decimal" placeholder="36.5" value={form.temp} className="font-mono text-center"
                  disabled={modo !== "nueva"} onChange={(e) => set("temp")(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="rac-motivo" className="text-xs font-semibold">Motivo de consulta {modo === "nueva" && "*"}</Label>
                <Textarea id="rac-motivo" rows={2.5} placeholder="Síntomas principales o motivo por el que acude..." value={form.motivo_consulta}
                  disabled={modo !== "nueva"} onChange={(e) => set("motivo_consulta")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rac-discriminante" className="text-xs font-semibold">Discriminante (Signo de alarma)</Label>
                <Textarea id="rac-discriminante" rows={2.5} value={form.discriminante}
                  disabled={modo !== "nueva"} onChange={(e) => set("discriminante")(e.target.value)}
                  placeholder="Dolor torácico, dificultad respiratoria, sangrado abundante..." />
              </div>
            </div>

            {/* Clasificación / Triaje */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-bold uppercase tracking-wider block text-foreground">
                Clasificación de Triaje {modo === "nueva" && "*"}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {NIVELES_TRIAJE.map((n) => {
                  const seleccionado = triajeSel === n.value;
                  const coloresEspeciales =
                    n.value === "rojo"
                      ? "border-red-500/60 bg-red-50/70 text-red-950 dark:bg-red-950/40 dark:text-red-200"
                      : n.value === "amarillo"
                      ? "border-amber-500/60 bg-amber-50/70 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200"
                      : n.value === "verde"
                      ? "border-emerald-500/60 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-blue-500/60 bg-blue-50/70 text-blue-950 dark:bg-blue-950/40 dark:text-blue-200";

                  return (
                    <button
                      key={n.value}
                      type="button"
                      disabled={modo !== "nueva"}
                      onClick={() => setTriajeSel(n.value)}
                      className={cn(
                        "rounded-xl border-2 p-3 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs relative overflow-hidden",
                        seleccionado
                          ? cn(coloresEspeciales, "ring-2 ring-primary ring-offset-1 font-semibold")
                          : "bg-background hover:bg-muted/60 border-border"
                      )}
                    >
                      <span className="block text-sm font-bold">{n.label}</span>
                      <span className="block text-xs opacity-90 mt-0.5">{n.espera}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ---------------- 3 y 4: MÉDICO Y DESTINO ---------------- */}
          {modo !== "nueva" && (
            <>
              <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b pb-2">
                  <Stethoscope className="w-4 h-4 text-blue-500" />
                  <span>3. Evaluación Médica</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-hora-med" className="text-xs font-semibold">Hora atención médica</Label>
                    <Input id="rac-hora-med" type="time" value={form.hora_medico}
                      disabled={soloLectura} onChange={(e) => set("hora_medico")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="rac-medico" className="text-xs font-semibold">Médico tratante *</Label>
                    <MedicoSelector
                      id="rac-medico"
                      value={medicoId}
                      onChange={setMedicoId}
                      disabled={soloLectura}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-patologia" className="text-xs font-semibold">Patología previa / Tratamiento actual</Label>
                    <Textarea id="rac-patologia" rows={2} value={form.patologia_previa}
                      disabled={soloLectura} onChange={(e) => set("patologia_previa")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-alergias" className="text-xs font-semibold">Alergias conocidas</Label>
                    <Textarea id="rac-alergias" rows={2} value={form.alergias}
                      disabled={soloLectura} onChange={(e) => set("alergias")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="rac-examen" className="text-xs font-semibold">Examen físico</Label>
                    <Textarea id="rac-examen" rows={2.5} value={form.examen_fisico}
                      disabled={soloLectura} onChange={(e) => set("examen_fisico")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-lab" className="text-xs font-semibold">Laboratorio</Label>
                    <Input id="rac-lab" value={form.laboratorio} placeholder="Resultados relevantes..."
                      disabled={soloLectura} onChange={(e) => set("laboratorio")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-rx" className="text-xs font-semibold">Radiología / Imagen</Label>
                    <Input id="rac-rx" value={form.radiologia} placeholder="Estudios de imagen..."
                      disabled={soloLectura} onChange={(e) => set("radiologia")(e.target.value)} />
                  </div>
                </div>

                {/* Diagnóstico CIE-10 */}
                {!soloLectura && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="rac-cie" className="text-xs font-semibold">Diagnóstico CIE-10 *</Label>
                    <Input id="rac-cie" placeholder="Buscar por código o descripción..."
                      value={cieBusqueda} onChange={(e) => setCieBusqueda(e.target.value)} />
                    {cieOpciones.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-40 overflow-y-auto bg-background shadow-md">
                        {cieOpciones.map((c) => (
                          <button key={c.id} type="button"
                            className="w-full text-left px-3.5 py-2 hover:bg-muted text-sm flex items-center justify-between"
                            onClick={() => {
                              setCieLista((l) => (l.some((x) => x.id === c.id) ? l : [...l, c]));
                              setCieBusqueda("");
                            }}>
                            <span><strong className="font-mono text-xs mr-2 text-primary">{c.codigo}</strong>{c.descripcion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {cieLista.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cieLista.map((c) => (
                          <Badge key={c.id} variant="secondary" className="gap-1.5 py-1 px-2.5">
                            <span className="font-mono font-bold">{c.codigo}</span> {c.descripcion}
                            <button type="button" className="p-1.5 -m-1" onClick={() => setCieLista((l) => l.filter((x) => x.id !== c.id))}>
                              <X className="w-3.5 h-3.5 hover:text-destructive transition-colors" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-diag" className="text-xs font-semibold">
                      {soloLectura ? "Diagnóstico" : "Detalle del diagnóstico (opcional)"}
                    </Label>
                    <Textarea id="rac-diag" rows={2}
                      value={soloLectura ? ficha?.diagnostico ?? "" : form.diagnostico}
                      disabled={soloLectura} onChange={(e) => set("diagnostico")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-trat" className="text-xs font-semibold">Tratamiento / Suministro en consultorio</Label>
                    <Textarea id="rac-trat" rows={2} value={form.tratamiento}
                      disabled={soloLectura} onChange={(e) => set("tratamiento")(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="rac-evol" className="text-xs font-semibold">Evolución</Label>
                      <Textarea id="rac-evol" rows={2} value={form.evolucion}
                        disabled={soloLectura} onChange={(e) => set("evolucion")(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rac-plan" className="text-xs font-semibold">Plan de manejo</Label>
                      <Textarea id="rac-plan" rows={2} value={form.plan}
                        disabled={soloLectura} onChange={(e) => set("plan")(e.target.value)} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border-b pb-2">
                  <LogOut className="w-4 h-4 text-amber-500" />
                  <span>4. Destino y Novedad</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-hora-dest" className="text-xs font-semibold">Hora de alta / destino</Label>
                    <Input id="rac-hora-dest" type="time" value={form.hora_destino}
                      disabled={soloLectura} onChange={(e) => set("hora_destino")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rac-destino" className="text-xs font-semibold">Destino del Paciente *</Label>
                    <Combobox
                      id="rac-destino"
                      value={destino}
                      onChange={(v) => setDestino(v as DestinoRac)}
                      disabled={soloLectura}
                      placeholder="Elija el destino"
                      buscarPlaceholder="Buscar destino..."
                      vacioTexto="No hay ningún destino con ese nombre."
                      opciones={DESTINOS_RAC.map((d) => ({ value: d.value, label: d.label }))}
                    />
                  </div>
                  {destinoSel?.pideDias && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rac-dias" className="text-xs font-semibold">Cantidad de días *</Label>
                      <Input id="rac-dias" inputMode="numeric" value={form.destino_dias} placeholder="Ej: 3"
                        disabled={soloLectura} onChange={(e) => set("destino_dias")(e.target.value)} />
                    </div>
                  )}
                </div>

                {destino === "internacion" && !soloLectura && (
                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="rac-cama" className="text-xs font-semibold">Cama asignada *</Label>
                    <Combobox
                      id="rac-cama"
                      value={camaId}
                      onChange={setCamaId}
                      placeholder={
                        camasLibres.length ? "Elija la cama libre" : "No hay camas libres disponibles"
                      }
                      buscarPlaceholder="Buscar cama..."
                      vacioTexto="No hay camas libres."
                      opciones={camasLibres.map((c) => ({
                        value: String(c.id),
                        label: c.codigo,
                        detalle: c.sala_nombre || null,
                      }))}
                    />
                  </div>
                )}

                {destinoSel?.reposo && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <span>
                      Este destino otorga <strong>reposo médico</strong> y deja al paciente exento de actividad física por los
                      días indicados. Se reflejará automáticamente en la historia clínica.
                    </span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 border-t">
          {modo === "nueva" && (
            <Button className="flex-1 h-11 text-sm font-semibold shadow-sm" onClick={handleAbrir} disabled={guardando}>
              {guardando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando Ficha...</>
                : "Guardar y dejar en espera del médico"}
            </Button>
          )}
          {modo === "atender" && (
            <Button className="flex-1 h-11 text-sm font-semibold shadow-sm" onClick={handleCerrar} disabled={guardando}>
              {guardando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando Consulta...</>
                : "Cerrar ficha y registrar la consulta"}
            </Button>
          )}
          {ficha && (
            <Button variant="outline" className="h-11 gap-2 border-primary/30" onClick={handleImprimir}>
              <Printer className="w-4 h-4 text-primary" /> Imprimir Ficha RAC
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

