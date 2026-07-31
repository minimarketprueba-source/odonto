import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Loader2 } from "lucide-react";
import { showSwalSuccess, showSwalError } from "@/lib/swal";
import { sanitizePlainText, sanitizeMultilineText } from "@/lib/security";
import { useAuth } from "@/context/auth-context";
import { usePerfilProfesional } from "@/api/perfil";
import { useGuardarPreconsulta, type Cita } from "@/api/citas";

/** Texto → número (acepta coma decimal) o null si está vacío o no es número. */
function numeroONull(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const n = Number(limpio.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const vacio = (v: number | null | undefined) => (v == null ? "" : String(v));

interface PreconsultaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cita: Cita | null;
}

/**
 * Signos vitales que enfermería toma mientras el paciente espera al médico.
 * Quedan en la cita y el médico los ve al registrar la consulta.
 */
export function PreconsultaDialog({ open, onOpenChange, cita }: PreconsultaDialogProps) {
  const { user } = useAuth();
  const { data: perfilProf } = usePerfilProfesional(user);
  const guardar = useGuardarPreconsulta();

  const [paSistolica, setPaSistolica] = useState("");
  const [paDiastolica, setPaDiastolica] = useState("");
  const [fc, setFc] = useState("");
  const [fr, setFr] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [peso, setPeso] = useState("");
  const [talla, setTalla] = useState("");
  const [nota, setNota] = useState("");
  const [enfermero, setEnfermero] = useState("");

  useEffect(() => {
    if (!open || !cita) return;
    // Si ya se cargaron antes, se muestran para poder corregirlos.
    setPaSistolica(vacio(cita.pa_sistolica));
    setPaDiastolica(vacio(cita.pa_diastolica));
    setFc(vacio(cita.fc));
    setFr(vacio(cita.fr));
    setTemp(vacio(cita.temp));
    setSpo2(vacio(cita.spo2));
    setPeso(vacio(cita.peso_kg));
    setTalla(vacio(cita.talla_cm));
    setNota(cita.preconsulta_nota ?? "");
    setEnfermero(cita.preconsulta_enfermero || perfilProf?.nombre || "");
  }, [open, cita, perfilProf?.nombre]);

  const handleGuardar = async () => {
    if (!cita) return;
    if (!enfermero.trim()) {
      await showSwalError("Indique quién tomó los signos vitales.");
      return;
    }

    // Un valor mal tecleado no se descarta en silencio: se avisa.
    const campos: { etiqueta: string; texto: string; entero: boolean }[] = [
      { etiqueta: "la presión sistólica", texto: paSistolica, entero: true },
      { etiqueta: "la presión diastólica", texto: paDiastolica, entero: true },
      { etiqueta: "la frecuencia cardíaca", texto: fc, entero: true },
      { etiqueta: "la frecuencia respiratoria", texto: fr, entero: true },
      { etiqueta: "la temperatura", texto: temp, entero: false },
      { etiqueta: "la saturación (SpO2)", texto: spo2, entero: true },
      { etiqueta: "el peso", texto: peso, entero: false },
      { etiqueta: "la talla", texto: talla, entero: true },
    ];
    for (const c of campos) {
      if (c.texto.trim() && numeroONull(c.texto) === null) {
        await showSwalError(`Revise el valor de ${c.etiqueta}: «${c.texto.trim()}» no es un número.`);
        return;
      }
    }
    const entero = (texto: string) => {
      const n = numeroONull(texto);
      return n === null ? null : Math.round(n);
    };

    if (!campos.some((c) => c.texto.trim())) {
      await showSwalError("Cargue al menos un signo vital.");
      return;
    }

    try {
      await guardar.mutateAsync({
        cita_id: cita.id,
        enfermero: sanitizePlainText(enfermero) || null,
        nota: sanitizeMultilineText(nota) || null,
        pa_sistolica: entero(paSistolica),
        pa_diastolica: entero(paDiastolica),
        fc: entero(fc),
        fr: entero(fr),
        temp: numeroONull(temp),
        spo2: entero(spo2),
        peso_kg: numeroONull(peso),
        talla_cm: entero(talla),
      });
      onOpenChange(false);
      await showSwalSuccess("Signos vitales guardados. El médico los verá al atender al paciente.");
    } catch (e) {
      await showSwalError((e as Error).message);
    }
  };

  const paciente = cita?.paciente
    ? `${cita.paciente.apellidos}, ${cita.paciente.nombres}`
    : "el paciente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-600" />
            Signos vitales antes de la consulta
          </DialogTitle>
          <DialogDescription>
            {paciente} — {cita?.hora?.slice(0, 5)} hs. Los toma enfermería mientras espera;
            el médico los ve al registrar la consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
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
              <Label htmlFor="pc-fc" className="text-xs font-semibold">FC (lpm)</Label>
              <Input id="pc-fc" inputMode="numeric" placeholder="72" value={fc}
                className="font-mono text-center" onChange={(e) => setFc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-fr" className="text-xs font-semibold">FR (rpm)</Label>
              <Input id="pc-fr" inputMode="numeric" placeholder="16" value={fr}
                className="font-mono text-center" onChange={(e) => setFr(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-temp" className="text-xs font-semibold">T° axilar (°C)</Label>
              <Input id="pc-temp" inputMode="decimal" placeholder="36.5" value={temp}
                className="font-mono text-center" onChange={(e) => setTemp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-spo2" className="text-xs font-semibold">SpO2 %</Label>
              <Input id="pc-spo2" inputMode="numeric" placeholder="98" value={spo2}
                className="font-mono text-center" onChange={(e) => setSpo2(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-peso" className="text-xs font-semibold">Peso (kg)</Label>
              <Input id="pc-peso" inputMode="decimal" placeholder="72.5" value={peso}
                className="font-mono text-center" onChange={(e) => setPeso(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc-talla" className="text-xs font-semibold">Talla (cm)</Label>
              <Input id="pc-talla" inputMode="numeric" placeholder="175" value={talla}
                className="font-mono text-center" onChange={(e) => setTalla(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pc-nota" className="font-semibold text-sm">Observación para el médico</Label>
            <Textarea id="pc-nota" rows={2}
              placeholder="Ej: refiere dolor de cabeza desde ayer, vino en ayunas..."
              value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pc-enfermero" className="font-semibold text-sm">Tomados por *</Label>
            <Input id="pc-enfermero" className="h-10" placeholder="Nombre y apellido"
              value={enfermero} onChange={(e) => setEnfermero(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardar.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={guardar.isPending} className="gap-2">
            {guardar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Guardar signos vitales
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
