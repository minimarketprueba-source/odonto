import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Printer, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn, matchPaciente, matchTexto } from "@/lib/utils";
import { sanitizePlainText } from "@/lib/security";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/context/auth-context";
import { imprimirFichaRac } from "@/lib/imprimir";
import { labelTipoPaciente, usePacientes, type Paciente } from "@/api/pacientes";
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
  const [busquedaMedico, setBusquedaMedico] = useState("");
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
    setBusquedaMedico("");
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
      enfermero: user?.email ?? "",
    });
  }, [open, ficha, pacienteInicial, user?.email]);

  const set = (campo: keyof typeof VACIO) => (valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPacienteDebounced.trim()) return [];
    return pacientes
      .filter((p) => p.activo && matchPaciente(p, busquedaPacienteDebounced))
      .slice(0, 8);
  }, [pacientes, busquedaPacienteDebounced]);

  const medicosFiltrados = useMemo(() => {
    if (!busquedaMedico.trim()) return medicos;
    return medicos.filter((m) =>
      matchTexto(`${m.apellidos} ${m.nombres} ${m.especialidad?.nombre || ""}`, busquedaMedico)
    );
  }, [medicos, busquedaMedico]);

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
        motivo_consulta: sanitizePlainText(form.motivo_consulta) || null,
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
          motivo_observacion: sanitizePlainText(form.motivo_consulta) || null,
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
        patologia_previa: sanitizePlainText(form.patologia_previa) || null,
        alergias: sanitizePlainText(form.alergias) || null,
        examen_fisico: sanitizePlainText(form.examen_fisico) || null,
        laboratorio: sanitizePlainText(form.laboratorio) || null,
        radiologia: sanitizePlainText(form.radiologia) || null,
        diagnostico: diagFinal,
        cie10_id: cieLista[0]?.id ?? null,
        tratamiento: sanitizePlainText(form.tratamiento) || null,
        evolucion: sanitizePlainText(form.evolucion) || null,
        plan: sanitizePlainText(form.plan) || null,
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
  const tituloSeccion = "text-xs font-bold uppercase tracking-wide text-muted-foreground border-b pb-1 mb-2";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Ficha de RAC
            {ficha && <Badge variant="outline">{numeroRac(ficha.numero)}</Badge>}
            {ficha?.triaje && (
              <Badge className={cn("border", nivelTriaje(ficha.triaje)?.clase)}>
                {nivelTriaje(ficha.triaje)?.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {modo === "nueva" && "Admisión y clasificación de enfermería. Al guardar, el paciente queda en espera del médico."}
            {modo === "atender" && "Complete la evaluación médica y el destino. Al cerrar se registra la consulta en la historia clínica."}
            {modo === "ver" && "Ficha ya cerrada. Se puede imprimir."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ---------------- 1. ADMISIÓN ---------------- */}
          <section>
            <p className={tituloSeccion}>1. Admisión</p>

            {modo === "nueva" && !paciente && (
              <div className="space-y-2">
                <Label htmlFor="rac-buscar">Paciente *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="rac-buscar"
                    className="pl-9"
                    placeholder="Buscar por nombre o cédula..."
                    value={busquedaPaciente}
                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                  />
                </div>
                {pacientesFiltrados.length > 0 && (
                  <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
                    {pacientesFiltrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
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
                        <span className="font-medium">{p.apellidos}, {p.nombres}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          CI {p.documento || "s/n"} · {labelTipoPaciente(p.tipo)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {busquedaPacienteDebounced && pacientesFiltrados.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No se encontró ningún paciente con «{busquedaPacienteDebounced}».
                  </p>
                )}
              </div>
            )}

            {paciente && (
              <div className="rounded-md border bg-muted/40 p-3 mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{paciente.apellidos}, {paciente.nombres}</p>
                  <p className="text-xs text-muted-foreground">
                    CI {paciente.documento || "sin cédula"} · {labelTipoPaciente(paciente.tipo)}
                    {edadDe(paciente.fecha_nacimiento) && ` · ${edadDe(paciente.fecha_nacimiento)}`}
                    {paciente.sexo && ` · ${paciente.sexo === "F" ? "Femenino" : "Masculino"}`}
                  </p>
                </div>
                {modo === "nueva" && (
                  <Button variant="ghost" size="sm" onClick={() => setPaciente(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rac-hora">Hora de admisión *</Label>
                <Input id="rac-hora" type="time" value={form.hora_admision}
                  disabled={modo !== "nueva"} onChange={(e) => set("hora_admision")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-jerarquia">Jerarquía</Label>
                <Input id="rac-jerarquia" value={form.jerarquia}
                  disabled={modo !== "nueva"} onChange={(e) => set("jerarquia")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-tel">Tel./Cel.</Label>
                <Input id="rac-tel" value={form.telefono}
                  disabled={modo !== "nueva"} onChange={(e) => set("telefono")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-localidad">Localidad</Label>
                <Input id="rac-localidad" value={form.localidad}
                  disabled={modo !== "nueva"} onChange={(e) => set("localidad")(e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="rac-domicilio">Domicilio</Label>
                <Input id="rac-domicilio" value={form.domicilio}
                  disabled={modo !== "nueva"} onChange={(e) => set("domicilio")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-barrio">Barrio o Compañía</Label>
                <Input id="rac-barrio" value={form.barrio_compania}
                  disabled={modo !== "nueva"} onChange={(e) => set("barrio_compania")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-ref">Referencia domiciliaria</Label>
                <Input id="rac-ref" value={form.referencia_domiciliaria}
                  disabled={modo !== "nueva"} onChange={(e) => set("referencia_domiciliaria")(e.target.value)} />
              </div>
            </div>
          </section>

          {/* ---------------- 2. ENFERMERÍA ---------------- */}
          <section>
            <p className={tituloSeccion}>2. Enfermería — signos vitales y clasificación</p>
            {/* La PA ocupa dos columnas: son dos casillas y una barra en el medio. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rac-hora-enf">Hora</Label>
                <Input id="rac-hora-enf" type="time" value={form.hora_enfermeria}
                  disabled={modo !== "nueva"} onChange={(e) => set("hora_enfermeria")(e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>PA (sist./diast.)</Label>
                <div className="flex items-center gap-1">
                  <Input inputMode="numeric" placeholder="120" value={form.pa_sistolica}
                    disabled={modo !== "nueva"} onChange={(e) => set("pa_sistolica")(e.target.value)} />
                  <span className="text-muted-foreground">/</span>
                  <Input inputMode="numeric" placeholder="80" value={form.pa_diastolica}
                    disabled={modo !== "nueva"} onChange={(e) => set("pa_diastolica")(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-fc">FC</Label>
                <Input id="rac-fc" inputMode="numeric" placeholder="72" value={form.fc}
                  disabled={modo !== "nueva"} onChange={(e) => set("fc")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-fr">FR</Label>
                <Input id="rac-fr" inputMode="numeric" placeholder="16" value={form.fr}
                  disabled={modo !== "nueva"} onChange={(e) => set("fr")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-spo2">SPO2 %</Label>
                <Input id="rac-spo2" inputMode="numeric" placeholder="98" value={form.spo2}
                  disabled={modo !== "nueva"} onChange={(e) => set("spo2")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-temp">T° axilar</Label>
                <Input id="rac-temp" inputMode="decimal" placeholder="36.5" value={form.temp}
                  disabled={modo !== "nueva"} onChange={(e) => set("temp")(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="space-y-1">
                <Label htmlFor="rac-motivo">Motivo de consulta {modo === "nueva" && "*"}</Label>
                <Textarea id="rac-motivo" rows={2} value={form.motivo_consulta}
                  disabled={modo !== "nueva"} onChange={(e) => set("motivo_consulta")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rac-discriminante">Discriminante</Label>
                <Textarea id="rac-discriminante" rows={2} value={form.discriminante}
                  disabled={modo !== "nueva"} onChange={(e) => set("discriminante")(e.target.value)}
                  placeholder="Dolor torácico, dificultad respiratoria, sangrado..." />
              </div>
            </div>

            <div className="mt-3">
              <Label className="mb-2 block">Clasificación (triaje) {modo === "nueva" && "*"}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {NIVELES_TRIAJE.map((n) => (
                  <button
                    key={n.value}
                    type="button"
                    disabled={modo !== "nueva"}
                    onClick={() => setTriajeSel(n.value)}
                    className={cn(
                      "rounded-md border-2 p-2 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                      triajeSel === n.value
                        ? cn(n.clase, "ring-2 ring-offset-1 ring-foreground/40")
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <span className="block text-sm font-bold">{n.label}</span>
                    <span className="block text-xs opacity-90">{n.espera}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------- 3 y 4: MÉDICO Y DESTINO ---------------- */}
          {modo !== "nueva" && (
            <>
              <section>
                <p className={tituloSeccion}>3. Médico</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <div className="space-y-1">
                    <Label htmlFor="rac-hora-med">Hora</Label>
                    <Input id="rac-hora-med" type="time" value={form.hora_medico}
                      disabled={soloLectura} onChange={(e) => set("hora_medico")(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Médico que atiende *</Label>
                    {medicoSel ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 rounded-md border px-3 py-2 text-sm truncate">
                          {medicoSel.nombres} {medicoSel.apellidos}
                          <span className="text-muted-foreground text-xs ml-2">
                            {medicoSel.especialidad?.nombre}
                          </span>
                        </div>
                        {!soloLectura && (
                          <Button variant="outline" size="sm" onClick={() => setMedicoId("")}>
                            Cambiar
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        <Input placeholder="Buscar profesional..." value={busquedaMedico}
                          onChange={(e) => setBusquedaMedico(e.target.value)} />
                        <div className="border rounded-md divide-y max-h-40 overflow-y-auto mt-1">
                          {medicosFiltrados.map((m) => (
                            <button key={m.id} type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                              onClick={() => setMedicoId(String(m.id))}>
                              {m.nombres} {m.apellidos}
                              <span className="text-muted-foreground text-xs ml-2">
                                {m.especialidad?.nombre}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="rac-patologia">Patología previa y tratamiento actual</Label>
                    <Textarea id="rac-patologia" rows={2} value={form.patologia_previa}
                      disabled={soloLectura} onChange={(e) => set("patologia_previa")(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rac-alergias">Alergias</Label>
                    <Textarea id="rac-alergias" rows={2} value={form.alergias}
                      disabled={soloLectura} onChange={(e) => set("alergias")(e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="rac-examen">Examen físico</Label>
                    <Textarea id="rac-examen" rows={2} value={form.examen_fisico}
                      disabled={soloLectura} onChange={(e) => set("examen_fisico")(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rac-lab">Laboratorio</Label>
                    <Input id="rac-lab" value={form.laboratorio}
                      disabled={soloLectura} onChange={(e) => set("laboratorio")(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rac-rx">Radiología</Label>
                    <Input id="rac-rx" value={form.radiologia}
                      disabled={soloLectura} onChange={(e) => set("radiologia")(e.target.value)} />
                  </div>
                </div>

                {/* Diagnóstico CIE-10 */}
                {!soloLectura && (
                  <div className="space-y-1 mt-2">
                    <Label htmlFor="rac-cie">Diagnóstico CIE-10 *</Label>
                    <Input id="rac-cie" placeholder="Buscar por código o descripción..."
                      value={cieBusqueda} onChange={(e) => setCieBusqueda(e.target.value)} />
                    {cieOpciones.length > 0 && (
                      <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                        {cieOpciones.map((c) => (
                          <button key={c.id} type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => {
                              setCieLista((l) => (l.some((x) => x.id === c.id) ? l : [...l, c]));
                              setCieBusqueda("");
                            }}>
                            <span className="font-mono text-xs mr-2">{c.codigo}</span>
                            {c.descripcion}
                          </button>
                        ))}
                      </div>
                    )}
                    {cieLista.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {cieLista.map((c) => (
                          <Badge key={c.id} variant="secondary" className="gap-1">
                            {c.codigo}
                            <button type="button" onClick={() => setCieLista((l) => l.filter((x) => x.id !== c.id))}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="rac-diag">
                      {soloLectura ? "Diagnóstico" : "Detalle del diagnóstico (opcional)"}
                    </Label>
                    <Textarea id="rac-diag" rows={2}
                      value={soloLectura ? ficha?.diagnostico ?? "" : form.diagnostico}
                      disabled={soloLectura} onChange={(e) => set("diagnostico")(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rac-trat">Tratamiento / suministro en consultorio</Label>
                    <Textarea id="rac-trat" rows={2} value={form.tratamiento}
                      disabled={soloLectura} onChange={(e) => set("tratamiento")(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="rac-evol">Evolución</Label>
                      <Textarea id="rac-evol" rows={2} value={form.evolucion}
                        disabled={soloLectura} onChange={(e) => set("evolucion")(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rac-plan">Plan</Label>
                      <Textarea id="rac-plan" rows={2} value={form.plan}
                        disabled={soloLectura} onChange={(e) => set("plan")(e.target.value)} />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <p className={tituloSeccion}>4. Destino / novedad</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="rac-hora-dest">Hora</Label>
                    <Input id="rac-hora-dest" type="time" value={form.hora_destino}
                      disabled={soloLectura} onChange={(e) => set("hora_destino")(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Destino *</Label>
                    <Select value={destino} onValueChange={(v) => setDestino(v as DestinoRac)}
                      disabled={soloLectura}>
                      <SelectTrigger><SelectValue placeholder="Elija el destino" /></SelectTrigger>
                      <SelectContent>
                        {DESTINOS_RAC.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {destinoSel?.pideDias && (
                    <div className="space-y-1">
                      <Label htmlFor="rac-dias">Cantidad de días *</Label>
                      <Input id="rac-dias" inputMode="numeric" value={form.destino_dias}
                        disabled={soloLectura} onChange={(e) => set("destino_dias")(e.target.value)} />
                    </div>
                  )}
                </div>

                {destino === "internacion" && !soloLectura && (
                  <div className="space-y-1 mt-2">
                    <Label>Cama *</Label>
                    <Select value={camaId} onValueChange={setCamaId}>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          camasLibres.length ? "Elija la cama libre" : "No hay camas libres"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {camasLibres.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.codigo}{c.sala_nombre ? ` — ${c.sala_nombre}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {destinoSel?.reposo && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Este destino deja al paciente <strong>exento de actividad física</strong> por los
                      días indicados. Se avisa a los administradores y se refleja en Control de Peso.
                    </span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {modo === "nueva" && (
            <Button className="flex-1" onClick={handleAbrir} disabled={guardando}>
              {guardando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                : "Guardar y dejar en espera del médico"}
            </Button>
          )}
          {modo === "atender" && (
            <Button className="flex-1" onClick={handleCerrar} disabled={guardando}>
              {guardando
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                : "Cerrar ficha y registrar la consulta"}
            </Button>
          )}
          {ficha && (
            <Button variant="outline" className="gap-2" onClick={handleImprimir}>
              <Printer className="w-4 h-4" /> Imprimir ficha
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
