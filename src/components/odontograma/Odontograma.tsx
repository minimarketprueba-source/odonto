import React, { useState, useMemo } from "react";
import { useOdontograma, useSaveOdontogramaRegistro, OdontogramaRegistro } from "@/api/odontologia";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, Plus, Calendar, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface OdontogramaProps {
  pacienteId: number;
}

// FDI Notation Groups
const DIENTES_ADULTOS_ARRIBA_DER = [18, 17, 16, 15, 14, 13, 12, 11];
const DIENTES_ADULTOS_ARRIBA_IZQ = [21, 22, 23, 24, 25, 26, 27, 28];
const DIENTES_ADULTOS_ABAJO_DER = [48, 47, 46, 45, 44, 43, 42, 41];
const DIENTES_ADULTOS_ABAJO_IZQ = [31, 32, 33, 34, 35, 36, 37, 38];

const DIENTES_NINOS_ARRIBA_DER = [55, 54, 53, 52, 51];
const DIENTES_NINOS_ARRIBA_IZQ = [61, 62, 63, 64, 65];
const DIENTES_NINOS_ABAJO_DER = [85, 84, 83, 82, 81];
const DIENTES_NINOS_ABAJO_IZQ = [71, 72, 73, 74, 75];

const DIAGNOSTICOS = [
  { value: "caries", label: "Caries (Patología)" },
  { value: "fractura", label: "Fractura (Patología)" },
  { value: "ausente", label: "Pieza Ausente" },
  { value: "movilidad", label: "Movilidad" },
  { value: "sano", label: "Sano / Sin Novedad" },
];

const TRATAMIENTOS = [
  { value: "empaste", label: "Resina / Obturación" },
  { value: "endodoncia", label: "Endodoncia" },
  { value: "corona", label: "Corona Protésica" },
  { value: "implante", label: "Implante Dental" },
  { value: "sellador", label: "Sellador de Fosas" },
  { value: "extraccion", label: "Extracción Indicada" },
  { value: "ninguno", label: "Ninguno" },
];

export function Odontograma({ pacienteId }: OdontogramaProps) {
  const { data: registros = [], isLoading } = useOdontograma(pacienteId);
  const saveRegistro = useSaveOdontogramaRegistro();

  const [tipoDenticion, setTipoDenticion] = useState<"adulto" | "infantil">("adulto");
  const [piezaSel, setPiezaSel] = useState<number | null>(null);
  const [caraSel, setCaraSel] = useState<string | null>(null);

  // Form states
  const [diagnostico, setDiagnostico] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [estado, setEstado] = useState<"pendiente" | "realizado">("pendiente");
  const [notas, setNotas] = useState("");

  // Map the latest state of each tooth-face
  const estadoOdontograma = useMemo(() => {
    const map: Record<string, { diagnostico: string; tratamiento: string; estado: string; color: string }> = {};

    // Sort by date ascending to let later records overwrite earlier ones
    const sorted = [...registros].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    for (const r of sorted) {
      const key = `${r.pieza}_${r.cara}`;
      let color = "#cbd5e1"; // color por defecto (gris)
      
      if (r.diagnostico === "sano" || r.tratamiento === "ninguno") {
        color = "#cbd5e1";
      } else if (r.estado === "pendiente") {
        color = "#ef4444"; // rojo (requiere atención/patología)
      } else if (r.estado === "realizado") {
        color = "#3b82f6"; // azul (tratamiento realizado)
      }

      map[key] = {
        diagnostico: r.diagnostico || "",
        tratamiento: r.tratamiento || "",
        estado: r.estado,
        color,
      };

      // Si es un diagnóstico/tratamiento completo de la pieza, aplicamos a todas las caras
      if (r.cara === "completo") {
        const caras = ["vestibular", "palatina", "oclusal", "mesial", "distal"];
        for (const c of caras) {
          map[`${r.pieza}_${c}`] = {
            diagnostico: r.diagnostico || "",
            tratamiento: r.tratamiento || "",
            estado: r.estado,
            color,
          };
        }
      }
    }
    return map;
  }, [registros]);

  const handleSelectFace = (pieza: number, cara: string) => {
    setPiezaSel(pieza);
    setCaraSel(cara);

    // Pre-fill form if there is an existing state
    const key = `${pieza}_${cara}`;
    const existente = estadoOdontograma[key];
    if (existente) {
      setDiagnostico(existente.diagnostico);
      setTratamiento(existente.tratamiento);
      setEstado(existente.estado as "pendiente" | "realizado");
    } else {
      setDiagnostico("");
      setTratamiento("");
      setEstado("pendiente");
    }
    setNotas("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!piezaSel || !caraSel) return;

    try {
      const payload: OdontogramaRegistro = {
        paciente_id: pacienteId,
        pieza: piezaSel,
        cara: caraSel,
        diagnostico: diagnostico || null,
        tratamiento: tratamiento || null,
        estado,
        color: estado === "pendiente" ? "rojo" : "azul",
        notas: notas || null,
      };

      await saveRegistro.mutateAsync(payload);
      toast.success("Registro del odontograma guardado correctamente.");
      setNotas("");
      setPiezaSel(null);
      setCaraSel(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // SVG Diente Component
  const DienteSVG = ({ numero }: { numero: number }) => {
    const cVestibular = estadoOdontograma[`${numero}_vestibular`]?.color || "#cbd5e1";
    const cPalatina = estadoOdontograma[`${numero}_palatina`]?.color || "#cbd5e1";
    const cOclusal = estadoOdontograma[`${numero}_oclusal`]?.color || "#cbd5e1";
    const cMesial = estadoOdontograma[`${numero}_mesial`]?.color || "#cbd5e1";
    const cDistal = estadoOdontograma[`${numero}_distal`]?.color || "#cbd5e1";

    const isSelected = piezaSel === numero;

    // Detectar si el diente está ausente
    const esAusente = registros.find(r => r.pieza === numero && r.diagnostico === "ausente");
    const esImplante = registros.find(r => r.pieza === numero && r.tratamiento === "implante" && r.estado === "realizado");

    return (
      <div className="flex flex-col items-center p-1.5 border border-border/40 rounded-lg hover:bg-accent/40 transition-all duration-200">
        <span className="text-xs font-semibold mb-1 text-muted-foreground">{numero}</span>
        <div className="relative w-11 h-11">
          {esAusente ? (
            <svg viewBox="0 0 40 40" className="w-full h-full text-destructive">
              <line x1="5" y1="5" x2="35" y2="35" stroke="currentColor" strokeWidth="3" />
              <line x1="35" y1="5" x2="5" y2="35" stroke="currentColor" strokeWidth="3" />
            </svg>
          ) : esImplante ? (
            <svg viewBox="0 0 40 40" className="w-full h-full text-blue-600">
              {/* Icono de tornillo implante */}
              <rect x="18" y="10" width="4" height="20" fill="currentColor" />
              <line x1="14" y1="12" x2="26" y2="12" stroke="currentColor" strokeWidth="2" />
              <line x1="14" y1="17" x2="26" y2="17" stroke="currentColor" strokeWidth="2" />
              <line x1="14" y1="22" x2="26" y2="22" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8 C12 8, 20 2, 28 8 L28 10 L12 10 Z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 40 40" className="w-full h-full cursor-pointer overflow-visible">
              {/* Cara Vestibular (Top) */}
              <polygon
                points="0,0 40,0 30,10 10,10"
                fill={cVestibular}
                stroke="#64748b"
                strokeWidth="1"
                className={`hover:brightness-90 transition-all duration-150 ${
                  isSelected && caraSel === "vestibular" ? "stroke-primary stroke-2" : ""
                }`}
                onClick={() => handleSelectFace(numero, "vestibular")}
              />
              {/* Cara Distal (Right para cuadrantes derechos, Mesial para izquierdos...) */}
              <polygon
                points="40,0 40,40 30,30 30,10"
                fill={cDistal}
                stroke="#64748b"
                strokeWidth="1"
                className={`hover:brightness-90 transition-all duration-150 ${
                  isSelected && caraSel === "distal" ? "stroke-primary stroke-2" : ""
                }`}
                onClick={() => handleSelectFace(numero, "distal")}
              />
              {/* Cara Palatina/Lingual (Bottom) */}
              <polygon
                points="0,40 40,40 30,30 10,30"
                fill={cPalatina}
                stroke="#64748b"
                strokeWidth="1"
                className={`hover:brightness-90 transition-all duration-150 ${
                  isSelected && caraSel === "palatina" ? "stroke-primary stroke-2" : ""
                }`}
                onClick={() => handleSelectFace(numero, "palatina")}
              />
              {/* Cara Mesial (Left) */}
              <polygon
                points="0,0 0,40 10,30 10,10"
                fill={cMesial}
                stroke="#64748b"
                strokeWidth="1"
                className={`hover:brightness-90 transition-all duration-150 ${
                  isSelected && caraSel === "mesial" ? "stroke-primary stroke-2" : ""
                }`}
                onClick={() => handleSelectFace(numero, "mesial")}
              />
              {/* Cara Oclusal/Incisal (Center) */}
              <polygon
                points="10,10 30,10 30,30 10,30"
                fill={cOclusal}
                stroke="#64748b"
                strokeWidth="1"
                className={`hover:brightness-90 transition-all duration-150 ${
                  isSelected && caraSel === "oclusal" ? "stroke-primary stroke-2" : ""
                }`}
                onClick={() => handleSelectFace(numero, "oclusal")}
              />
            </svg>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1 mt-1 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => handleSelectFace(numero, "completo")}
        >
          Comp.
        </Button>
      </div>
    );
  };

  const getDientesCuadrante = (dientes: number[]) => {
    return (
      <div className="flex gap-1.5 flex-wrap justify-center">
        {dientes.map((n) => (
          <DienteSVG key={n} numero={n} />
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Visual Dental Chart */}
      <Card className="xl:col-span-2 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Odontograma Digital Interactivo</CardTitle>
            <CardDescription>
              Haga clic sobre una de las 5 caras de cualquier diente para registrar diagnósticos o tratamientos.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={tipoDenticion === "adulto" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoDenticion("adulto")}
            >
              Permanente (Adultos)
            </Button>
            <Button
              variant={tipoDenticion === "infantil" ? "default" : "outline"}
              size="sm"
              onClick={() => setTipoDenticion("infantil")}
            >
              Decidua (Infantil)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mr-3" />
              <p className="text-muted-foreground">Cargando odontograma...</p>
            </div>
          ) : (
            <div className="min-w-[650px] space-y-8 py-4">
              {tipoDenticion === "adulto" ? (
                <>
                  {/* Cuadrantes Superiores Adulto */}
                  <div className="relative border-b pb-6">
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-muted-foreground/30 -translate-x-1/2" />
                    <div className="grid grid-cols-2 gap-4">
                      {/* Cuadrante 1 (Superior Derecho) */}
                      <div className="flex flex-col items-end pr-2">
                        <span className="text-[10px] font-bold text-muted-foreground mr-1.5 mb-1">Cuadrante 1 (Der)</span>
                        {getDientesCuadrante(DIENTES_ADULTOS_ARRIBA_DER)}
                      </div>
                      {/* Cuadrante 2 (Superior Izquierdo) */}
                      <div className="flex flex-col items-start pl-2">
                        <span className="text-[10px] font-bold text-muted-foreground ml-1.5 mb-1">Cuadrante 2 (Izq)</span>
                        {getDientesCuadrante(DIENTES_ADULTOS_ARRIBA_IZQ)}
                      </div>
                    </div>
                  </div>

                  {/* Cuadrantes Inferiores Adulto */}
                  <div className="relative pt-2">
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-muted-foreground/30 -translate-x-1/2" />
                    <div className="grid grid-cols-2 gap-4">
                      {/* Cuadrante 4 (Inferior Derecho) */}
                      <div className="flex flex-col items-end pr-2">
                        {getDientesCuadrante(DIENTES_ADULTOS_ABAJO_DER)}
                        <span className="text-[10px] font-bold text-muted-foreground mr-1.5 mt-2">Cuadrante 4 (Der)</span>
                      </div>
                      {/* Cuadrante 3 (Inferior Izquierdo) */}
                      <div className="flex flex-col items-start pl-2">
                        {getDientesCuadrante(DIENTES_ADULTOS_ABAJO_IZQ)}
                        <span className="text-[10px] font-bold text-muted-foreground ml-1.5 mt-2">Cuadrante 3 (Izq)</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Cuadrantes Superiores Niño */}
                  <div className="relative border-b pb-6">
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-muted-foreground/30 -translate-x-1/2" />
                    <div className="grid grid-cols-2 gap-4">
                      {/* Cuadrante 5 (Superior Derecho) */}
                      <div className="flex flex-col items-end pr-2">
                        <span className="text-[10px] font-bold text-muted-foreground mr-1.5 mb-1">Cuadrante 5 (Der)</span>
                        {getDientesCuadrante(DIENTES_NINOS_ARRIBA_DER)}
                      </div>
                      {/* Cuadrante 6 (Superior Izquierdo) */}
                      <div className="flex flex-col items-start pl-2">
                        <span className="text-[10px] font-bold text-muted-foreground ml-1.5 mb-1">Cuadrante 6 (Izq)</span>
                        {getDientesCuadrante(DIENTES_NINOS_ARRIBA_IZQ)}
                      </div>
                    </div>
                  </div>

                  {/* Cuadrantes Inferiores Niño */}
                  <div className="relative pt-2">
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-muted-foreground/30 -translate-x-1/2" />
                    <div className="grid grid-cols-2 gap-4">
                      {/* Cuadrante 8 (Inferior Derecho) */}
                      <div className="flex flex-col items-end pr-2">
                        {getDientesCuadrante(DIENTES_NINOS_ABAJO_DER)}
                        <span className="text-[10px] font-bold text-muted-foreground mr-1.5 mt-2">Cuadrante 8 (Der)</span>
                      </div>
                      {/* Cuadrante 7 (Inferior Izquierdo) */}
                      <div className="flex flex-col items-start pl-2">
                        {getDientesCuadrante(DIENTES_NINOS_ABAJO_IZQ)}
                        <span className="text-[10px] font-bold text-muted-foreground ml-1.5 mt-2">Cuadrante 7 (Izq)</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Leyenda de Colores */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#ef4444] rounded border border-red-600" />
                  <span className="font-medium">Patología Detectada / Requerido (Rojo)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#3b82f6] rounded border border-blue-600" />
                  <span className="font-medium">Tratamiento Realizado (Azul)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#cbd5e1] rounded border border-slate-400" />
                  <span className="font-medium">Sano / Sin novedades (Gris)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor & History panel */}
      <div className="space-y-6">
        {/* Editor Form */}
        <Card className="shadow-sm border-primary/20">
          <CardHeader className="bg-primary/5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              {piezaSel ? `Editar Pieza ${piezaSel} — Cara ${caraSel}` : "Seleccione un diente"}
            </CardTitle>
            <CardDescription>
              {piezaSel ? "Indique patología o tratamiento para registrar." : "Haga clic en un elemento gráfico de la izquierda."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {piezaSel ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnostico">Patología / Diagnóstico</Label>
                  <Select value={diagnostico} onValueChange={setDiagnostico}>
                    <SelectTrigger id="diagnostico">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAGNOSTICOS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tratamiento">Tratamiento Clínico</Label>
                  <Select value={tratamiento} onValueChange={setTratamiento}>
                    <SelectTrigger id="tratamiento">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TRATAMIENTOS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado de la intervención</Label>
                  <Tabs value={estado} onValueChange={(v) => setEstado(v as "pendiente" | "realizado")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="pendiente" className="text-destructive data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
                        Pendiente / Requerido
                      </TabsTrigger>
                      <TabsTrigger value="realizado" className="text-blue-600 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                        Realizado
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notas">Notas de Evolución</Label>
                  <Textarea
                    id="notas"
                    placeholder="Detalles específicos del estado o plan..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1" disabled={saveRegistro.isPending}>
                    {saveRegistro.isPending ? "Guardando..." : "Guardar Registro"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPiezaSel(null);
                      setCaraSel(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 text-muted-foreground/75" />
                <p className="text-sm">Haga clic en una cara del diente para habilitar este formulario.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Log */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Historial Clínico de Piezas
            </CardTitle>
            <CardDescription>Registro cronológico de evoluciones dentales.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto pr-1">
            {registros.length === 0 ? (
              <p className="text-sm text-center py-8 text-muted-foreground">No hay registros previos cargados.</p>
            ) : (
              <div className="space-y-3">
                {registros.map((r, i) => (
                  <div key={r.id || i} className="p-3 border rounded-xl text-xs space-y-1 relative bg-card hover:bg-accent/10 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <Badge variant="outline" className="font-semibold text-primary">
                        Diente {r.pieza} ({r.cara})
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          r.estado === "pendiente"
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                        }
                      >
                        {r.estado === "pendiente" ? "Requerido" : "Realizado"}
                      </Badge>
                    </div>
                    {r.diagnostico && (
                      <p>
                        <span className="font-medium text-muted-foreground">Diagnóstico:</span>{" "}
                        <span className="capitalize">{r.diagnostico}</span>
                      </p>
                    )}
                    {r.tratamiento && r.tratamiento !== "ninguno" && (
                      <p>
                        <span className="font-medium text-muted-foreground">Tratamiento:</span>{" "}
                        <span className="capitalize">{r.tratamiento}</span>
                      </p>
                    )}
                    {r.notas && (
                      <p className="italic text-muted-foreground mt-1 bg-accent/20 p-1.5 rounded-lg border border-border/50 text-[11px]">
                        "{r.notas}"
                      </p>
                    )}
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1.5 border-t">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(r.created_at || "").toLocaleDateString("es-ES")}
                      </span>
                      {r.registrado_por && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Odontólogo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
