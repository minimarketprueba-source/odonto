import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Activity, HeartPulse } from "lucide-react";
import { useCrearPesada, CadeteNutricion, calcularDxICC } from "@/api/nutricion";
import { calcularIMC, clasificarIMC } from "@/lib/utils/imc-utils";
import { toast } from "sonner";

interface PesadaDialogProps {
  cadete: CadeteNutricion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PesadaDialog({ cadete, open, onOpenChange }: PesadaDialogProps) {
  const [peso, setPeso] = useState<string>("");
  const [altura, setAltura] = useState<string>("");
  const [cintura, setCintura] = useState<string>("");
  const [cadera, setCadera] = useState<string>("");
  const [porcentajeMM, setPorcentajeMM] = useState<string>("");
  const [porcentajeMG, setPorcentajeMG] = useState<string>("");
  const [dxBia, setDxBia] = useState<string>("Normal");
  const [egs, setEgs] = useState<string>("A");
  const [observaciones, setObservaciones] = useState<string>("");

  const crearPesada = useCrearPesada();

  useEffect(() => {
    if (cadete) {
      setPeso(cadete.ultima_pesada?.peso_kg ? String(cadete.ultima_pesada.peso_kg) : "");
      setAltura(cadete.altura_cm ? String(cadete.altura_cm) : "170");
      setCintura(cadete.ultima_pesada?.cintura_cm ? String(cadete.ultima_pesada.cintura_cm) : "");
      setCadera(cadete.ultima_pesada?.cadera_cm ? String(cadete.ultima_pesada.cadera_cm) : "");
      setPorcentajeMM(cadete.ultima_pesada?.porcentaje_mm ? String(cadete.ultima_pesada.porcentaje_mm) : "");
      setPorcentajeMG(cadete.ultima_pesada?.porcentaje_mg ? String(cadete.ultima_pesada.porcentaje_mg) : "");
      setDxBia(cadete.ultima_pesada?.dx_bia || "Normal");
      setEgs(cadete.ultima_pesada?.egs || "A");
      setObservaciones("");
    }
  }, [cadete]);

  const numPeso = parseFloat(peso) || 0;
  const numAltura = parseFloat(altura) || 170;
  const numCintura = parseFloat(cintura) || 0;
  const numCadera = parseFloat(cadera) || 0;

  const imcCalculado = numPeso > 0 && numAltura > 0 ? calcularIMC(numPeso, numAltura) : null;
  const clasificacionIMC = imcCalculado ? clasificarIMC(imcCalculado) : null;

  // Cálculo de ICC
  const iccCalculado = numCintura > 0 && numCadera > 0 ? Number((numCintura / numCadera).toFixed(2)) : null;
  const dxIccCalculado = iccCalculado && cadete ? calcularDxICC(iccCalculado, cadete.sexo) : null;

  // Peso ideal sugerido (IMC 24.9)
  const pesoIdealMax = Number((24.9 * Math.pow(numAltura / 100, 2)).toFixed(1));
  const diferenciaPeso = numPeso > 0 ? Number((numPeso - pesoIdealMax).toFixed(1)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadete) return;
    if (!numPeso || numPeso <= 0) {
      toast.error("Por favor ingrese un peso válido en kg");
      return;
    }

    try {
      await crearPesada.mutateAsync({
        cadete_id: cadete.id,
        peso_kg: numPeso,
        altura_cm: numAltura,
        cintura_cm: numCintura || undefined,
        cadera_cm: numCadera || undefined,
        porcentaje_mm: porcentajeMM ? parseFloat(porcentajeMM) : undefined,
        porcentaje_mg: porcentajeMG ? parseFloat(porcentajeMG) : undefined,
        dx_bia: dxBia,
        egs: egs,
        observaciones: observaciones || undefined,
      });

      toast.success(`Ficha antropométrica guardada para ${cadete.nombre} ${cadete.apellido}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al registrar la pesada");
    }
  };

  if (!cadete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Scale className="w-5 h-5 text-primary" />
            Ficha Antropométrica - ISEPOL
          </DialogTitle>
          <DialogDescription>
            Paciente: <strong className="text-foreground">{cadete.nombre} {cadete.apellido}</strong> (DNI: {cadete.dni}) · Curso: {cadete.curso}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Bloque 1: Peso y Talla */}
          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border">
            <div className="space-y-1.5">
              <Label htmlFor="peso" className="font-semibold text-xs">Peso (kg) *</Label>
              <Input
                id="peso"
                type="number"
                step="0.1"
                placeholder="Ej. 78.5"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="altura" className="font-semibold text-xs">Talla / Altura (cm)</Label>
              <Input
                id="altura"
                type="number"
                step="1"
                placeholder="Ej. 175"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
              />
            </div>
          </div>

          {/* IMC Calculado preview */}
          {imcCalculado && clasificacionIMC && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                  <Activity className="w-4 h-4 text-primary" /> IMC Calculado:
                </span>
                <Badge
                  style={{
                    backgroundColor: clasificacionIMC.color + "20",
                    color: clasificacionIMC.color,
                    borderColor: clasificacionIMC.color,
                  }}
                  className="font-semibold text-xs border"
                >
                  {imcCalculado} - {clasificacionIMC.label}
                </Badge>
              </div>

              {diferenciaPeso > 0 ? (
                <div className="text-xs text-red-600 dark:text-red-400 font-medium flex justify-between pt-1 border-t border-primary/10">
                  <span>⚠️ Sobrepeso: Bajar {diferenciaPeso} kg</span>
                  <span className="text-muted-foreground">Meta: {pesoIdealMax} kg</span>
                </div>
              ) : (
                <div className="text-xs text-green-600 dark:text-green-400 font-medium pt-1 border-t border-primary/10">
                  ✅ Peso Saludable dentro del rango OMS
                </div>
              )}
            </div>
          )}

          {/* Bloque 2: Cintura, Cadera e ICC */}
          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border">
            <div className="space-y-1.5">
              <Label htmlFor="cintura" className="text-xs">Cintura (cm)</Label>
              <Input
                id="cintura"
                type="number"
                step="0.1"
                placeholder="Ej. 82.0"
                value={cintura}
                onChange={(e) => setCintura(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadera" className="text-xs">Cadera (cm)</Label>
              <Input
                id="cadera"
                type="number"
                step="0.1"
                placeholder="Ej. 98.0"
                value={cadera}
                onChange={(e) => setCadera(e.target.value)}
              />
            </div>

            {iccCalculado && dxIccCalculado && (
              <div className="col-span-2 flex items-center justify-between bg-background p-2 rounded border text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-primary" /> ICC: <strong>{iccCalculado}</strong>
                </span>
                <Badge
                  variant={dxIccCalculado.riesgo === "alto" ? "destructive" : dxIccCalculado.riesgo === "medio" ? "secondary" : "outline"}
                  className="text-xs"
                >
                  DX ICC: {dxIccCalculado.label}
                </Badge>
              </div>
            )}
          </div>

          {/* Bloque 3: %MM, %MG, DX BIA, EGS */}
          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border">
            <div className="space-y-1.5">
              <Label htmlFor="porcentajeMM" className="text-xs">%MM (% Masa Muscular)</Label>
              <Input
                id="porcentajeMM"
                type="number"
                step="0.1"
                placeholder="Ej. 42.5%"
                value={porcentajeMM}
                onChange={(e) => setPorcentajeMM(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="porcentajeMG" className="text-xs">%MG (% Masa Grasa)</Label>
              <Input
                id="porcentajeMG"
                type="number"
                step="0.1"
                placeholder="Ej. 18.0%"
                value={porcentajeMG}
                onChange={(e) => setPorcentajeMG(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">DX BIA (Grasa Visceral)</Label>
              <Select value={dxBia} onValueChange={setDxBia}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar DX BIA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal (1-9)</SelectItem>
                  <SelectItem value="Elevada">Grasa Visceral Elevada (10-14)</SelectItem>
                  <SelectItem value="Muy Elevada">Grasa Visceral Muy Elevada (15+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">EGS (Eval. Global Subjetiva)</Label>
              <Select value={egs} onValueChange={setEgs}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Seleccionar EGS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A - Bien nutrido</SelectItem>
                  <SelectItem value="B">B - Sospecha / Desnutrición moderada</SelectItem>
                  <SelectItem value="C">C - Desnutrición severa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-xs">Observaciones / Plan de Alimentación</Label>
            <Textarea
              id="observaciones"
              placeholder="Notas nutricionales, suplementación, dieta asignada..."
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crearPesada.isPending}>
              {crearPesada.isPending ? "Guardando..." : "Guardar en Ficha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
