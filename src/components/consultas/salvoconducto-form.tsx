import { useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Ambulance, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sanitizePlainText } from "@/lib/security";
import { useAuth } from "@/context/auth-context";
import { MedicoSelector } from "@/components/consultas/medico-selector";
import { fechaHoyISO } from "@/api/citas";
import { labelTipoPaciente, type Paciente } from "@/api/pacientes";
import {
  DESTINOS_SALVOCONDUCTO, labelDestino, useCreateSalvoconducto, type Salvoconducto,
} from "@/api/salvoconductos";
import { cleanQrText, imprimirSalvoconducto } from "@/lib/imprimir";

interface SalvoconductoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Paciente | null;
}

function horaAhora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtFecha(f: string | null): string {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

export function SalvoconductoForm({ open, onOpenChange, paciente }: SalvoconductoFormProps) {
  const { user } = useAuth();
  const crear = useCreateSalvoconducto();

  const [medicoId, setMedicoId] = useState("");
  const [destino, setDestino] = useState<string>("hospital_policia");
  const [destinoDetalle, setDestinoDetalle] = useState("");
  const [motivo, setMotivo] = useState("");
  const [urgente, setUrgente] = useState(true);
  const [acompanante, setAcompanante] = useState("");
  const [fecha, setFecha] = useState(fechaHoyISO());
  const [hora, setHora] = useState(horaAhora());
  const [retornoFecha, setRetornoFecha] = useState("");
  const [retornoHora, setRetornoHora] = useState("");

  useEffect(() => {
    if (!open) return;
    // Si quien usa el sistema es un profesional, MedicoSelector lo fija como tratante.
    setMedicoId("");
    setDestino("hospital_policia");
    setDestinoDetalle("");
    setMotivo("");
    setUrgente(true);
    setAcompanante("");
    setFecha(fechaHoyISO());
    setHora(horaAhora());
    setRetornoFecha("");
    setRetornoHora("");
  }, [open]);

  const imprimir = (sc: Salvoconducto, p: Paciente) => {
    const destinoTexto = labelDestino(sc.destino, sc.destino_detalle);
    const retornoTexto = sc.retorno_fecha
      ? `${fmtFecha(sc.retorno_fecha)}${sc.retorno_hora ? ` — ${sc.retorno_hora.slice(0, 5)} hs` : ""}`
      : null;
    const profesional = sc.medico
      ? `Dr(a). ${sc.medico.apellidos}, ${sc.medico.nombres}`
      : "Profesional de turno";

    const qrSvgHtml = renderToStaticMarkup(
      <QRCodeSVG
        value={cleanQrText([
          "SANIDAD POLICIAL - ACADEMIA NACIONAL DE POLICIA",
          "DOCUMENTO: SALVOCONDUCTO MEDICO",
          `Numero: ${sc.numero}`,
          `Paciente: ${p.apellidos}, ${p.nombres} (CI: ${p.documento || "sin cedula"})`,
          `Destino: ${destinoTexto}`,
          `Salida: ${fmtFecha(sc.fecha)} ${sc.hora.slice(0, 5)} hs`,
          `Retorno: ${retornoTexto || "Segun indicacion medica"}`,
          `Profesional: ${profesional}`,
          sc.urgente ? "CARACTER: URGENCIA" : "CARACTER: PROGRAMADO",
        ].join("\n"))}
        size={105}
        level="M"
      />
    );

    imprimirSalvoconducto({
      numero: sc.numero,
      pacienteNombre: `${p.apellidos}, ${p.nombres}`,
      pacienteDocumento: p.documento,
      pacienteTipo: labelTipoPaciente(p.tipo),
      pacienteGrado: p.grado,
      pacienteUnidad: p.unidad,
      pacientePromocion: p.promocion,
      destino: destinoTexto,
      motivo: sc.motivo,
      urgente: sc.urgente,
      acompanante: sc.acompanante,
      fechaSalida: fmtFecha(sc.fecha),
      horaSalida: sc.hora.slice(0, 5),
      retornoTexto,
      profesionalNombre: profesional,
      expedidoPor: sc.expedido_por?.split("@")[0] ?? null,
      qrSvgHtml,
    });
  };

  const handleExpedir = async () => {
    if (!paciente) return;
    if (!medicoId) { toast.error("Indique el profesional tratante que autoriza el traslado."); return; }
    if (destino === "otro" && !destinoDetalle.trim()) {
      toast.error("Escriba a dónde se traslada al paciente.");
      return;
    }
    if (!motivo.trim()) { toast.error("Indique el motivo médico del traslado."); return; }
    if (retornoFecha && retornoFecha < fecha) {
      toast.error("La fecha de retorno no puede ser anterior a la de salida.");
      return;
    }
    try {
      const sc = await crear.mutateAsync({
        paciente_id: paciente.id,
        medico_id: Number(medicoId),
        expedido_por: user?.email ?? null,
        fecha,
        hora,
        destino,
        destino_detalle: sanitizePlainText(destinoDetalle) || null,
        motivo: sanitizePlainText(motivo) || null,
        urgente,
        acompanante: sanitizePlainText(acompanante) || null,
        retorno_fecha: retornoFecha || null,
        retorno_hora: retornoHora || null,
      });
      toast.success(`Salvoconducto ${sc.numero} expedido. Se abre para imprimir.`);
      onOpenChange(false);
      setTimeout(() => imprimir(sc, paciente), 300);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ambulance className="w-5 h-5 text-red-600" />
            Salvoconducto médico
          </DialogTitle>
          <DialogDescription>
            Autoriza la salida de {paciente ? `${paciente.apellidos}, ${paciente.nombres}` : "el paciente"} de
            la Academia por razones médicas. Al guardar se abre para imprimir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/20">
            <Switch id="sc-urgente" checked={urgente} onCheckedChange={setUrgente} />
            <Label htmlFor="sc-urgente" className="cursor-pointer">
              <span className="font-medium">Traslado de urgencia</span>
              <span className="block text-xs text-muted-foreground font-normal">
                {urgente
                  ? "El documento sale destacado como urgencia, para que la guardia dé curso sin demora."
                  : "Traslado programado (por ejemplo, un estudio con fecha)."}
              </span>
            </Label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sc-destino">Destino *</Label>
              <Combobox
                id="sc-destino"
                value={destino}
                onChange={setDestino}
                buscarPlaceholder="Buscar destino..."
                vacioTexto="No hay ningún destino con ese nombre."
                opciones={DESTINOS_SALVOCONDUCTO.map((d) => ({
                  value: d.value,
                  label: d.label,
                  // El nombre completo del impreso también sirve para buscar.
                  buscarPor: d.oficial,
                }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sc-medico">Profesional tratante *</Label>
              <MedicoSelector id="sc-medico" value={medicoId} onChange={setMedicoId} placeholder="Seleccione" />
            </div>
          </div>

          {(destino === "otro" || destino === "estudios") && (
            <div className="space-y-1">
              <Label htmlFor="sc-destino-detalle">
                {destino === "otro" ? "¿A dónde se traslada? *" : "¿Qué estudio? (opcional)"}
              </Label>
              <Input
                id="sc-destino-detalle"
                placeholder={destino === "otro" ? "Ej: Hospital Nacional de Itauguá" : "Ej: Radiografía de tórax"}
                value={destinoDetalle}
                onChange={(e) => setDestinoDetalle(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="sc-motivo">Motivo médico *</Label>
            <Textarea
              id="sc-motivo"
              rows={2}
              placeholder="Ej: Dolor abdominal agudo, requiere evaluación por especialista."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sc-fecha">Fecha de salida *</Label>
              <Input id="sc-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sc-hora">Hora de salida *</Label>
              <Input id="sc-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sc-retorno-fecha">Retorno previsto (fecha)</Label>
              <Input id="sc-retorno-fecha" type="date" min={fecha} value={retornoFecha} onChange={(e) => setRetornoFecha(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sc-retorno-hora">Retorno previsto (hora)</Label>
              <Input id="sc-retorno-hora" type="time" value={retornoHora} onChange={(e) => setRetornoHora(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Si lo deja vacío, el documento dice «Según indicación médica».
          </p>

          <div className="space-y-1">
            <Label htmlFor="sc-acompanante">Acompañante</Label>
            <Input
              id="sc-acompanante"
              placeholder="Nombre de quien lo traslada (enfermero/a, familiar)"
              value={acompanante}
              onChange={(e) => setAcompanante(e.target.value)}
            />
          </div>

          <Button onClick={handleExpedir} disabled={crear.isPending} className="w-full gap-2">
            {crear.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Expidiendo...</>
              : <><Ambulance className="w-4 h-4" /> Expedir e imprimir</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
