import { useEffect, useMemo, useState } from "react";
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
import { HeartPulse, Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { matchPaciente } from "@/lib/utils";
import { sanitizePlainText, sanitizeMultilineText } from "@/lib/security";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { usePacientes, type Paciente } from "@/api/pacientes";
import { useNombrePerfil } from "@/api/perfil";
import { fechaHoyISO } from "@/api/citas";
import {
  DESTINOS_AMBULATORIO, TIPOS_ATENCION, useCrearAtencion,
} from "@/api/atenciones-enfermeria";
import { PacienteForm } from "@/components/pacientes/paciente-form";

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
  const { data: nombrePerfil } = useNombrePerfil(user);
  const crear = useCrearAtencion();

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

  const handleGuardar = async () => {
    if (!pacienteId) { toast.error("Selecciona el paciente atendido."); return; }
    if (!motivo.trim()) { toast.error("Indica el motivo de la atención."); return; }
    if (!enfermero.trim()) { toast.error("Indica quién atendió (nombre y apellido)."); return; }
    if (!hora) { toast.error("Indica la hora de la atención."); return; }

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
        toast.error(`Revise el valor de ${v.etiqueta}: «${v.texto.trim()}» no es un número.`);
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
      await crear.mutateAsync({
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
        pa_sistolica: entero(paSistolica),
        pa_diastolica: entero(paDiastolica),
        fc: entero(fc),
        fr: entero(fr),
        temp: numeroONull(temp),
        spo2: entero(spo2),
      });
      toast.success("Atención registrada. Queda pendiente de revisión médica.");
      if (destino === "cita_medico") {
        toast.info("Recuerde anotar al paciente en la Lista de espera para que el médico lo llame.");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
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
                  onChange={(e) => setFecha(e.target.value)} />
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
                <Select value={destino} onValueChange={setDestino}>
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

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label htmlFor="aa-obs" className="font-semibold text-sm">Observaciones</Label>
              <Textarea id="aa-obs" rows={2}
                placeholder="Indicaciones dadas, evolución, cualquier dato para el médico..."
                value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>

            <Button onClick={handleGuardar} disabled={crear.isPending} className="w-full h-11 font-semibold">
              {crear.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
