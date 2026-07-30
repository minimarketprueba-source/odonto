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
import { BedDouble, HeartPulse, Loader2, Printer, Search, ShieldAlert, UserPlus } from "lucide-react";
import { showSwalSuccess, showSwalError } from "@/lib/swal";
import { matchPaciente } from "@/lib/utils";
import { sanitizePlainText, sanitizeMultilineText } from "@/lib/security";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { usePacientes, type Paciente } from "@/api/pacientes";
import { usePerfilProfesional } from "@/api/perfil";
import { fechaHoyISO } from "@/api/citas";
import {
  DESTINOS_AMBULATORIO, TIPOS_ATENCION, destinoAmbulatorio, useCrearAtencion,
} from "@/api/atenciones-enfermeria";
import { useEnfermeriaCamas, useEnfermeriaIngresos, useIngresarPacienteCama } from "@/api/enfermeria";
import { imprimirConstanciaDeAtencion } from "./imprimir-constancia";
import { PacienteForm } from "@/components/pacientes/paciente-form";

function sumarDiasISO(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Cantidad de días contando ambos extremos (desde y hasta inclusive).
function diasEntre(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00`).getTime();
  const b = new Date(`${hasta}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

function horaAhora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Texto → número (acepta coma decimal) o null si está vacío o no es número. */
function numeroONull(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const n = Number(limpio.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

interface AtencionAmbulatoriaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se abre desde la tarjeta de un paciente, ya viene seleccionado. */
  pacienteInicial?: Paciente | null;
}

export function AtencionAmbulatoriaForm({ open, onOpenChange, pacienteInicial }: AtencionAmbulatoriaFormProps) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const puedeCrearPaciente = hasPermission("pacientes", "editar");
  const { data: pacientes = [] } = usePacientes();
  const { data: perfilProf } = usePerfilProfesional(user);
  const nombrePerfil = perfilProf?.nombre ?? null;
  // Va a la firma de la constancia; se toma del perfil de quien registra.
  const registroPerfil = perfilProf?.registro ?? null;
  const { data: camas = [] } = useEnfermeriaCamas();
  const { data: internaciones = [] } = useEnfermeriaIngresos();
  const crear = useCrearAtencion();
  const internar = useIngresarPacienteCama();
  // Si la internación se creó y después falló la atención, no se crea de nuevo.
  const internacionCreada = useRef<number | null>(null);

  const [pacienteId, setPacienteId] = useState("");
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [altaPacienteOpen, setAltaPacienteOpen] = useState(false);
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [hora, setHora] = useState(horaAhora());
  const [tipo, setTipo] = useState("curacion");
  const [motivo, setMotivo] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [destino, setDestino] = useState("alta");
  const [reposoDias, setReposoDias] = useState("");
  const [reposoHasta, setReposoHasta] = useState("");
  const [camaId, setCamaId] = useState("");
  const [enfermero, setEnfermero] = useState("");
  const [paSistolica, setPaSistolica] = useState("");
  const [paDiastolica, setPaDiastolica] = useState("");
  const [fc, setFc] = useState("");
  const [fr, setFr] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");

  useEffect(() => {
    if (open) {
      if (pacienteInicial) {
        setPacienteId(String(pacienteInicial.id));
        setBusquedaPaciente(
          `${pacienteInicial.apellidos}, ${pacienteInicial.nombres} (CI: ${pacienteInicial.documento || "—"})`
        );
      } else {
        setPacienteId("");
        setBusquedaPaciente("");
      }
      setFecha(fechaHoyISO());
      setHora(horaAhora());
      setTipo("curacion");
      setMotivo("");
      setProcedimiento("");
      setObservaciones("");
      setDestino("alta");
      setReposoDias("");
      setReposoHasta("");
      setCamaId("");
      internacionCreada.current = null;
      // Se prellena con el nombre y apellido reales de la cuenta (perfil).
      // Queda editable: en una computadora compartida puede atender otra
      // persona; la cuenta siempre queda registrada aparte en registrado_por.
      setEnfermero(nombrePerfil ?? "");
      setPaSistolica(""); setPaDiastolica(""); setFc(""); setFr(""); setTemp(""); setSpo2("");
    }
    // nombrePerfil NO va en las dependencias: si llegara tarde, no debe
    // resetear un formulario que ya se está llenando (lo cubre el efecto de abajo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pacienteInicial]);

  // Si el nombre del perfil llega después de abrir, completa el campo solo
  // mientras siga vacío (no pisa nada que la enfermera haya escrito).
  useEffect(() => {
    if (open && nombrePerfil) setEnfermero((prev) => prev || nombrePerfil);
  }, [open, nombrePerfil]);

  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPaciente.trim()) return [];
    return pacientes
      .filter((p) => p.activo)
      .filter((p) => matchPaciente(p, busquedaPaciente))
      .slice(0, 8);
  }, [pacientes, busquedaPaciente]);

  const destinoSel = destinoAmbulatorio(destino);
  const guardando = crear.isPending || internar.isPending;

  // Camas sin internación activa, para el destino "queda en observación".
  const camasLibres = useMemo(() => {
    const ocupadas = new Set(internaciones.filter((i) => i.estado === "activo").map((i) => i.cama_id));
    return camas.filter((c) => !c.fuera_de_servicio && !ocupadas.has(c.id));
  }, [camas, internaciones]);

  const handleGuardar = async (opts?: { eImprimir?: boolean }) => {
    if (!pacienteId) { await showSwalError("Selecciona el paciente atendido."); return; }
    if (!motivo.trim()) { await showSwalError("Indica el motivo de la atención."); return; }
    if (!enfermero.trim()) { await showSwalError("Indica quién atendió (nombre y apellido)."); return; }
    if (!fecha) { await showSwalError("Indica la fecha de la atención."); return; }
    if (!hora) { await showSwalError("Indica la hora de la atención."); return; }
    if (destinoSel?.pideDias && reposoHasta && reposoHasta < fecha) {
      await showSwalError("La fecha 'hasta' no puede ser anterior a la atención.");
      return;
    }
    if (destinoSel?.pideCama && !camaId && !internacionCreada.current) {
      await showSwalError("Elija la cama donde queda en observación.");
      return;
    }

    // Un signo vital mal tecleado no se descarta en silencio: se avisa.
    const vitales: { etiqueta: string; texto: string; entero: boolean }[] = [
      { etiqueta: "la presión sistólica", texto: paSistolica, entero: true },
      { etiqueta: "la presión diastólica", texto: paDiastolica, entero: true },
      { etiqueta: "la frecuencia cardíaca", texto: fc, entero: true },
      { etiqueta: "la frecuencia respiratoria", texto: fr, entero: true },
      { etiqueta: "la temperatura", texto: temp, entero: false },
      { etiqueta: "la saturación (SpO2)", texto: spo2, entero: true },
    ];
    for (const v of vitales) {
      if (v.texto.trim() && numeroONull(v.texto) === null) {
        await showSwalError(`Revise el valor de ${v.etiqueta}: «${v.texto.trim()}» no es un número.`);
        return;
      }
    }
    // Las columnas de PA/FC/FR/SpO2 son enteras: un decimal se redondea acá
    // en vez de dejar que la base rechace todo el registro.
    const entero = (texto: string) => {
      const n = numeroONull(texto);
      return n === null ? null : Math.round(n);
    };

    try {
      // La observación interna de verdad. Va primero: es lo único que puede
      // chocar (cama ocupada); si después falla la atención, el reintento no
      // vuelve a ocupar la cama.
      if (destinoSel?.pideCama && !internacionCreada.current) {
        const creada = await internar.mutateAsync({
          paciente_id: Number(pacienteId),
          cama_id: Number(camaId),
          medico_id: null,
          ingresado_por: user?.email ?? null,
          fecha_ingreso: fecha,
          hora_ingreso: hora,
          diagnostico_ingreso: sanitizeMultilineText(motivo) || "En observación",
          motivo_observacion: sanitizeMultilineText(motivo) || null,
          enfermero_cargo: sanitizePlainText(enfermero) || null,
        });
        internacionCreada.current = creada.id;
      }

      const atencion = await crear.mutateAsync({
        paciente_id: Number(pacienteId),
        fecha,
        hora,
        enfermero: sanitizePlainText(enfermero) || null,
        registrado_por: user?.email ?? null,
        tipo_atencion: tipo,
        motivo: sanitizeMultilineText(motivo) || null,
        procedimiento: sanitizeMultilineText(procedimiento) || null,
        observaciones: sanitizeMultilineText(observaciones) || null,
        destino,
        enfermero_registro: registroPerfil,
        reposo_hasta: destinoSel?.pideDias ? reposoHasta || null : null,
        pa_sistolica: entero(paSistolica),
        pa_diastolica: entero(paDiastolica),
        fc: entero(fc),
        fr: entero(fr),
        temp: numeroONull(temp),
        spo2: entero(spo2),
      });

      if (opts?.eImprimir) imprimirConstanciaDeAtencion(atencion);

      onOpenChange(false);
      await showSwalSuccess(
        destinoSel?.pideCama
          ? "Atención registrada y paciente en observación. Ya aparece en las camas."
          : destino === "cita_medico"
            ? "Atención registrada, pendiente de revisión médica. Recuerde anotar al paciente en la Lista de espera para que el médico lo llame."
            : "Atención registrada. Queda pendiente de revisión médica."
      );
    } catch (e) {
      await showSwalError((e as Error).message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-teal-600" />
              Registrar atención ambulatoria
            </DialogTitle>
            <DialogDescription>
              Atención de enfermería sin médico de guardia (curación, medicación, control).
              Queda en la historia clínica como pendiente de revisión médica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Paciente */}
            <div className="space-y-1.5 relative">
              <Label htmlFor="aa-paciente" className="font-semibold text-sm">Paciente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="aa-paciente"
                  className="pl-9 h-10"
                  placeholder="Buscar por cédula, apellido o nombre..."
                  value={busquedaPaciente}
                  onChange={(e) => {
                    setBusquedaPaciente(e.target.value);
                    setPacienteId("");
                  }}
                />
              </div>
              {pacientesFiltrados.length > 0 && !pacienteId && busquedaPaciente.trim() && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-44 overflow-y-auto divide-y">
                  {pacientesFiltrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between"
                      onClick={() => {
                        setPacienteId(String(p.id));
                        setBusquedaPaciente(`${p.apellidos}, ${p.nombres} (CI: ${p.documento || "—"})`);
                        internacionCreada.current = null;
                      }}
                    >
                      <span className="font-semibold">{p.apellidos}, {p.nombres}</span>
                      <Badge variant="outline" className="text-xs">{p.documento || "—"}</Badge>
                    </button>
                  ))}
                </div>
              )}
              {busquedaPaciente.trim().length >= 2 && !pacienteId && pacientesFiltrados.length === 0 && (
                <div className="rounded-md border border-dashed p-3 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No hay ningún paciente con «{busquedaPaciente.trim()}».
                  </p>
                  {puedeCrearPaciente && (
                    <Button variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setAltaPacienteOpen(true)}>
                      <UserPlus className="w-4 h-4" /> Registrar paciente nuevo
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Fecha, hora y tipo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="aa-fecha" className="font-semibold text-sm">Fecha *</Label>
                <Input id="aa-fecha" type="date" className="h-10" value={fecha}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFecha(v);
                    // El reposo corre desde la fecha de la atención: si esta
                    // cambia, los días/hasta se recalculan para no guardar un
                    // rango distinto del que se ve en pantalla.
                    const n = Number(reposoDias);
                    if (v && reposoDias && Number.isInteger(n) && n >= 1) {
                      setReposoHasta(sumarDiasISO(v, n - 1));
                    } else if (v && reposoHasta) {
                      if (reposoHasta >= v) setReposoDias(String(diasEntre(v, reposoHasta)));
                      else { setReposoDias(""); setReposoHasta(""); }
                    }
                  }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aa-hora" className="font-semibold text-sm">Hora *</Label>
                <Input id="aa-hora" type="time" className="h-10" value={hora}
                  onChange={(e) => setHora(e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="aa-tipo" className="font-semibold text-sm">Tipo de atención *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger id="aa-tipo" className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_ATENCION.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <Label htmlFor="aa-motivo" className="font-semibold text-sm">Motivo de la atención *</Label>
              <Textarea id="aa-motivo" rows={2}
                placeholder="Ej: Herida cortante en mano derecha durante instrucción"
                value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>

            {/* Signos vitales */}
            <div className="rounded-lg border p-3.5 bg-muted/20 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Signos vitales (si se tomaron)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                <div className="space-y-1.5 col-span-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">PA (sist / diast)</Label>
                  <div className="flex items-center gap-1.5">
                    <Input inputMode="numeric" placeholder="120" value={paSistolica}
                      className="text-center font-mono" onChange={(e) => setPaSistolica(e.target.value)} />
                    <span className="text-muted-foreground font-bold text-sm">/</span>
                    <Input inputMode="numeric" placeholder="80" value={paDiastolica}
                      className="text-center font-mono" onChange={(e) => setPaDiastolica(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aa-fc" className="text-xs font-semibold">FC (lpm)</Label>
                  <Input id="aa-fc" inputMode="numeric" placeholder="72" value={fc}
                    className="font-mono text-center" onChange={(e) => setFc(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aa-fr" className="text-xs font-semibold">FR (rpm)</Label>
                  <Input id="aa-fr" inputMode="numeric" placeholder="16" value={fr}
                    className="font-mono text-center" onChange={(e) => setFr(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aa-spo2" className="text-xs font-semibold">SpO2 %</Label>
                  <Input id="aa-spo2" inputMode="numeric" placeholder="98" value={spo2}
                    className="font-mono text-center" onChange={(e) => setSpo2(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aa-temp" className="text-xs font-semibold">T° axilar (°C)</Label>
                  <Input id="aa-temp" inputMode="decimal" placeholder="36.5" value={temp}
                    className="font-mono text-center" onChange={(e) => setTemp(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Procedimiento */}
            <div className="space-y-1.5">
              <Label htmlFor="aa-procedimiento" className="font-semibold text-sm">Qué se hizo (procedimiento)</Label>
              <Textarea id="aa-procedimiento" rows={2}
                placeholder="Ej: Limpieza con suero fisiológico, antisepsia y vendaje"
                value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} />
            </div>

            {/* Destino y enfermero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="aa-destino" className="font-semibold text-sm">Cómo terminó *</Label>
                <Select value={destino} onValueChange={(v) => {
                  setDestino(v);
                  // Si tras un fallo parcial se cambia el destino, la próxima
                  // guardada no debe reutilizar una internación creada para
                  // otra cosa (la huérfana queda visible en camas).
                  internacionCreada.current = null;
                }}>
                  <SelectTrigger id="aa-destino" className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DESTINOS_AMBULATORIO.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aa-enfermero" className="font-semibold text-sm">Enfermero/a que atendió *</Label>
                <Input id="aa-enfermero" className="h-10" placeholder="Nombre y apellido"
                  value={enfermero} onChange={(e) => setEnfermero(e.target.value)} />
              </div>
            </div>

            {/* Reposo provisorio: desde la fecha de la atención hasta la elegida */}
            {destinoSel?.pideDias && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-3.5 bg-muted/20">
                <div className="space-y-1.5">
                  <Label htmlFor="aa-reposo-dias" className="font-semibold text-sm">Cantidad de días</Label>
                  <Input
                    id="aa-reposo-dias" type="number" className="h-10" min={1} placeholder="Ej: 2"
                    value={reposoDias}
                    onChange={(e) => {
                      const v = e.target.value;
                      setReposoDias(v);
                      const n = Number(v);
                      if (fecha && v && Number.isInteger(n) && n >= 1) {
                        setReposoHasta(sumarDiasISO(fecha, n - 1));
                      } else {
                        // Valor vacío o inválido: no dejar un "hasta" viejo
                        // que ya no corresponde a lo que se ve.
                        setReposoHasta("");
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aa-reposo-hasta" className="font-semibold text-sm">Hasta qué fecha (inclusive)</Label>
                  <Input
                    id="aa-reposo-hasta" type="date" className="h-10" min={fecha}
                    value={reposoHasta}
                    onChange={(e) => {
                      const v = e.target.value;
                      setReposoHasta(v);
                      setReposoDias(v && v >= fecha ? String(diasEntre(fecha, v)) : "");
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Si queda vacío, rige hasta la revisión del médico.
                  </p>
                </div>
              </div>
            )}

            {/* Observación: elige la cama y el paciente queda internado */}
            {destinoSel?.pideCama && (
              <div className="space-y-1.5 rounded-lg border p-3.5 bg-muted/20">
                <Label htmlFor="aa-cama" className="font-semibold text-sm flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-cyan-600" /> Cama de observación *
                </Label>
                <Select value={camaId} onValueChange={(v) => { setCamaId(v); internacionCreada.current = null; }}>
                  <SelectTrigger id="aa-cama" className="h-10">
                    <SelectValue placeholder={camasLibres.length ? "Elegir cama libre" : "No hay camas libres"} />
                  </SelectTrigger>
                  <SelectContent>
                    {camasLibres.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.codigo}{c.sala_nombre ? ` — ${c.sala_nombre}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Al guardar, el paciente aparece internado en la pestaña de camas.
                </p>
              </div>
            )}

            {/* Constancia provisoria para que el paciente muestre a sus superiores */}
            {destinoSel && (destinoSel.pideDias || destinoSel.pideCama) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900">
                <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Constancia provisoria de enfermería</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      Sale firmada por enfermería y marcada «pendiente de revisión médica»:
                      el médico la convalida en la próxima jornada.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3 gap-1.5 font-semibold text-xs text-amber-800 border-amber-300 bg-white hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100 shrink-0"
                  onClick={() => handleGuardar({ eImprimir: true })}
                  disabled={guardando}
                >
                  <Printer className="w-4 h-4" />
                  Registrar e imprimir constancia
                </Button>
              </div>
            )}

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label htmlFor="aa-obs" className="font-semibold text-sm">Observaciones</Label>
              <Textarea id="aa-obs" rows={2}
                placeholder="Indicaciones dadas, evolución, cualquier dato para el médico..."
                value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>

            <Button onClick={() => handleGuardar()} disabled={guardando} className="w-full h-11 font-semibold">
              {guardando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Registrar atención
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alta rápida de un paciente que todavía no está en el padrón. */}
      <PacienteForm
        open={altaPacienteOpen}
        onOpenChange={setAltaPacienteOpen}
        busquedaInicial={busquedaPaciente}
        onCreated={(nuevo) => {
          setPacienteId(String(nuevo.id));
          setBusquedaPaciente(`${nuevo.apellidos}, ${nuevo.nombres} (CI: ${nuevo.documento || "—"})`);
        }}
      />
    </>
  );
}
