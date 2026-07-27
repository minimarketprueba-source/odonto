import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sanitizePlainText } from "@/lib/security";
import { MOTIVOS_ANULACION } from "@/api/anulaciones";

interface AnularDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Qué se está anulando, para el título: "consulta" o "receta". */
  que: "consulta" | "receta";
  /** Descripción de lo que se anula (fecha, servicio, paciente). */
  detalle: string;
  /** La consulta tiene reposo: hay que avisar del efecto en actividad física. */
  tieneReposo?: boolean;
  /** La consulta vino de una cita: se ofrece devolverla a la agenda. */
  tieneCita?: boolean;
  guardando?: boolean;
  onConfirmar: (motivo: string, reabrirCita: boolean) => void;
}

export function AnularDialog({
  open, onOpenChange, que, detalle, tieneReposo, tieneCita, guardando, onConfirmar,
}: AnularDialogProps) {
  const [motivo, setMotivo] = useState<string>(MOTIVOS_ANULACION[0]);
  const [detalleMotivo, setDetalleMotivo] = useState("");
  const [reabrirCita, setReabrirCita] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivo(MOTIVOS_ANULACION[0]);
      setDetalleMotivo("");
      setReabrirCita(false);
    }
  }, [open]);

  const esOtro = motivo === "Otro motivo";

  const confirmar = () => {
    if (esOtro && detalleMotivo.trim().length < 5) {
      toast.error("Cuente un poco más, así después se entiende por qué se anuló.");
      return;
    }
    const texto = detalleMotivo.trim()
      ? `${motivo} — ${sanitizePlainText(detalleMotivo)}`
      : motivo;
    onConfirmar(texto, reabrirCita);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-600" />
            Anular esta {que}
          </DialogTitle>
          <DialogDescription>{detalle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <p>
              Va a dejar de aparecer en la historia clínica y no se va a poder imprimir.
              <strong> No se borra</strong>: queda guardada por si hay que restaurarla.
            </p>
            {tieneReposo && (
              <p className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Ojo: este paciente va a dejar de figurar con reposo, así que vuelve a estar
                  obligado a la actividad física en Control de Peso.
                </span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="an-motivo">Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="an-motivo"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOTIVOS_ANULACION.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="an-detalle">
              Detalle {esOtro ? "*" : "(opcional)"}
            </Label>
            <Input
              id="an-detalle"
              placeholder="Ej: era para Pérez, Juan (CI 1234567)"
              value={detalleMotivo}
              onChange={(e) => setDetalleMotivo(e.target.value)}
            />
          </div>

          {tieneCita && (
            <div className="flex items-center gap-3 p-3 rounded-md border">
              <Switch id="an-reabrir" checked={reabrirCita} onCheckedChange={setReabrirCita} />
              <Label htmlFor="an-reabrir" className="cursor-pointer">
                <span className="font-medium">Devolver la cita a la agenda</span>
                <span className="block text-xs text-muted-foreground font-normal">
                  Marque esto solo si el paciente todavía debe ser atendido.
                </span>
              </Label>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              No, dejar como está
            </Button>
            <Button variant="destructive" className="flex-1 gap-2" onClick={confirmar} disabled={guardando}>
              {guardando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Anulando...</>
                : <>Sí, anular</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
