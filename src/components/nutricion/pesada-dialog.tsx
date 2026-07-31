import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Apple, Activity, HeartPulse } from "lucide-react";
import { useCrearPesada, CadeteNutricion, calcularDxICC } from "@/api/nutricion";
import { calcularIMC, calcularPesoIdeal, clasificarIMC } from "@/lib/utils/imc-utils";
import { showSwalSuccess, showSwalError } from "@/lib/swal";

/** Valor de los desplegables cuando el parámetro no se evaluó en esta pesada. */
const SIN_EVALUAR = "sin_evaluar";

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
  const [dxBia, setDxBia] = useState<string>(SIN_EVALUAR);
  const [egs, setEgs] = useState<string>(SIN_EVALUAR);
  const [observaciones, setObservaciones] = useState<string>("");

  const crearPesada = useCrearPesada();
  // El foco va al peso al abrir: es el único campo obligatorio y ahora arranca
  // vacío. Se hace por ref y no con autoFocus (que además pelea con el Dialog).
  const pesoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => pesoRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (cadete) {
      // Los campos que se MIDEN hoy arrancan vacíos. Antes venía cargado el
      // peso de la pesada anterior y, si no se lo cambiaba, quedaba registrado
      // el peso viejo con la fecha de hoy.
      setPeso("");
      setCintura("");
      setCadera("");
      setPorcentajeMM("");
      setPorcentajeMG("");
      // La talla sí se arrastra: cambia poco y es un dato de la ficha, no de
      // la pesada. Si no está registrada queda vacía, no se supone 170 cm.
      setAltura(cadete.altura_cm ? String(cadete.altura_cm) : "");
      setDxBia(SIN_EVALUAR);
      setEgs(SIN_EVALUAR);
      setObservaciones("");
    }
  }, [cadete]);

  const numPeso = parseFloat(peso) || 0;
  const numAltura = parseFloat(altura) || 0;
  const numCintura = parseFloat(cintura) || 0;
  const numCadera = parseFloat(cadera) || 0;

  const imcCalculado = numPeso > 0 && numAltura > 0 ? calcularIMC(numPeso, numAltura) : null;
  const clasificacionIMC = imcCalculado ? clasificarIMC(imcCalculado) : null;

  // Cálculo de ICC
  const iccCalculado = numCintura > 0 && numCadera > 0 ? Number((numCintura / numCadera).toFixed(2)) : null;
  const dxIccCalculado = iccCalculado && cadete ? calcularDxICC(iccCalculado, cadete.sexo) : null;

  // Rango de peso saludable (IMC 18,5 a 24,9). Sin talla no hay rango.
  const rangoSaludable = numAltura > 0 ? calcularPesoIdeal(numAltura) : null;
  const excesoPeso = rangoSaludable && numPeso > 0 ? Number((numPeso - rangoSaludable.max).toFixed(1)) : 0;
  const faltaPeso = rangoSaludable && numPeso > 0 ? Number((rangoSaludable.min - numPeso).toFixed(1)) : 0;

  const pesoAnterior = cadete?.ultima_pesada?.peso_kg ?? null;
  const diferenciaConAnterior = pesoAnterior && numPeso > 0 ? Number((numPeso - pesoAnterior).toFixed(1)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadete) return;
    if (!numPeso || numPeso <= 0) {
      await showSwalError("Por favor ingrese un peso válido en kg");
      return;
    }

    try {
      await crearPesada.mutateAsync({
        cadete_id: cadete.id,
        peso_kg: numPeso,
        altura_cm: numAltura || undefined,
        cintura_cm: numCintura || undefined,
        cadera_cm: numCadera || undefined,
        porcentaje_mm: porcentajeMM ? parseFloat(porcentajeMM) : undefined,
        porcentaje_mg: porcentajeMG ? parseFloat(porcentajeMG) : undefined,
        // "Sin evaluar" no se guarda: es la diferencia entre no haberlo mirado
        // y haber diagnosticado que está normal.
        dx_bia: dxBia === SIN_EVALUAR ? undefined : dxBia,
        egs: egs === SIN_EVALUAR ? undefined : egs,
        observaciones: observaciones || undefined,
      });

      onOpenChange(false);
      await showSwalSuccess(`Ficha antropométrica registrada correctamente para ${cadete.nombre} ${cadete.apellido}`);
    } catch (error: any) {
      await showSwalError(error.message || "Error al registrar la pesada");
    }
  };

  if (!cadete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Apple className="w-5 h-5 text-primary" />
            Ficha Antropométrica - ISEPOL
          </DialogTitle>
          <DialogDescription>
            Paciente: <strong className="text-foreground">{cadete.nombre} {cadete.apellido}</strong> (DNI: {cadete.dni}){cadete.curso ? ` · Curso: ${cadete.curso}` : ""}
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
                ref={pesoRef}
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
              {!altura && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Sin talla no se puede calcular el IMC.
                </p>
              )}
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

              {rangoSaludable && excesoPeso > 0 ? (
                <div className="text-xs text-red-600 dark:text-red-400 font-medium flex justify-between pt-1 border-t border-primary/10">
                  <span>⚠️ Sobrepeso: bajar {excesoPeso} kg</span>
                  <span className="text-muted-foreground">Rango: {rangoSaludable.min} a {rangoSaludable.max} kg</span>
                </div>
              ) : rangoSaludable && faltaPeso > 0 ? (
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium flex justify-between pt-1 border-t border-primary/10">
                  <span>⚠️ Bajo peso: subir {faltaPeso} kg</span>
                  <span className="text-muted-foreground">Rango: {rangoSaludable.min} a {rangoSaludable.max} kg</span>
                </div>
              ) : (
                <div className="text-xs text-green-600 dark:text-green-400 font-medium pt-1 border-t border-primary/10">
                  ✅ Peso saludable dentro del rango OMS
                </div>
              )}

              {diferenciaConAnterior !== null && (
                <div className="text-xs text-muted-foreground pt-1">
                  Pesada anterior: {pesoAnterior} kg ·{" "}
                  {diferenciaConAnterior === 0
                    ? "sin cambios"
                    : `${diferenciaConAnterior > 0 ? "+" : ""}${diferenciaConAnterior} kg`}
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
                  <SelectItem value={SIN_EVALUAR}>Sin evaluar</SelectItem>
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
                  <SelectItem value={SIN_EVALUAR}>Sin evaluar</SelectItem>
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
