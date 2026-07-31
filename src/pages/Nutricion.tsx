import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PesadaDialog } from "@/components/nutricion/pesada-dialog";
import { useCadetesNutricion, CadeteNutricion } from "@/api/nutricion";
import { calcularPesoIdeal, getColorIMC } from "@/lib/utils/imc-utils";
import { imprimirFichaAntropometrica } from "@/lib/imprimir";
import {
  Search,
  Users,
  Apple,
  Filter,
  User,
  Shield,
  Minus,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/** La fecha llega en ISO desde la base; sin pesada no se inventa ninguna. */
function fmtFechaPesada(fecha?: string | null): string {
  if (!fecha) return "Sin registro";
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? "Sin registro" : d.toLocaleDateString("es-PY");
}

export default function Nutricion() {
  const [searchParams] = useSearchParams();
  const queryInicial = searchParams.get("q") || searchParams.get("busqueda") || "";
  const { data: cadetes = [], isLoading, isError, refetch } = useCadetesNutricion();

  // Estados de filtros
  const [busqueda, setBusqueda] = useState(queryInicial);
  const [filtroEstado, setFiltroEstado] = useState<"activos" | "inactivos" | "todos">("activos");
  const [filtroSeccion, setFiltroSeccion] = useState<string>("todas");
  const [filtroClasificacion, setFiltroClasificacion] = useState<string>("todas");
  const [filtroCurso, setFiltroCurso] = useState<string>("todos");

  // Estado de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(12);

  // Estado para el modal de pesada
  const [cadeteSeleccionado, setCadeteSeleccionado] = useState<CadeteNutricion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Conteo por estado
  const conteoActivos = useMemo(() => cadetes.filter((c) => c.activo).length, [cadetes]);
  const conteoInactivos = useMemo(() => cadetes.filter((c) => !c.activo).length, [cadetes]);
  const conteoTotal = cadetes.length;

  // Conteo con sobrepeso / obesidad
  const conteoSobrepeso = useMemo(() => {
    return cadetes.filter((c) => {
      const imc = c.ultima_pesada?.imc;
      return imc && imc >= 25;
    }).length;
  }, [cadetes]);

  // Lista filtrada
  const cadetesFiltrados = useMemo(() => {
    return cadetes.filter((cadete) => {
      // Filtro por estado
      if (filtroEstado === "activos" && !cadete.activo) return false;
      if (filtroEstado === "inactivos" && cadete.activo) return false;

      // Filtro por búsqueda
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase();
        const coincideNombre = `${cadete.nombre} ${cadete.apellido}`.toLowerCase().includes(query);
        const coincideDni = cadete.dni.toLowerCase().includes(query);
        const coincideCurso = (cadete.curso || "").toLowerCase().includes(query);
        if (!coincideNombre && !coincideDni && !coincideCurso) return false;
      }

      // Filtro por sección
      if (filtroSeccion !== "todas" && cadete.seccion !== filtroSeccion) return false;

      // Filtro por curso
      if (filtroCurso !== "todos" && cadete.curso !== filtroCurso) return false;

      // Filtro por clasificación IMC
      if (filtroClasificacion !== "todas") {
        const imc = cadete.ultima_pesada?.imc;
        if (!imc) return false;
        if (filtroClasificacion === "normal" && (imc < 18.5 || imc >= 25)) return false;
        if (filtroClasificacion === "sobrepeso" && (imc < 25 || imc >= 30)) return false;
        if (filtroClasificacion === "obesidad" && imc < 30) return false;
      }

      return true;
    });
  }, [cadetes, filtroEstado, busqueda, filtroSeccion, filtroClasificacion, filtroCurso]);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroEstado, filtroSeccion, filtroClasificacion, filtroCurso, porPagina]);

  // Cálculos de paginación
  const totalPaginas = Math.max(1, Math.ceil(cadetesFiltrados.length / porPagina));
  const inicioIndex = (paginaActual - 1) * porPagina;
  const finIndex = Math.min(inicioIndex + porPagina, cadetesFiltrados.length);

  const cadetesPaginados = useMemo(() => {
    return cadetesFiltrados.slice(inicioIndex, finIndex);
  }, [cadetesFiltrados, inicioIndex, finIndex]);

  const handleAbrirPesada = (cadete: CadeteNutricion) => {
    setCadeteSeleccionado(cadete);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Encabezado y botones principales */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-balance mb-0.5 sm:mb-2">
              Gestión Nutricional
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground text-pretty">
              Control antropométrico y seguimiento nutricional de cadetes del instituto
            </p>
          </div>
        </div>

        {/* Buscador y estado */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, DNI o curso..."
                className="pl-10 text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {/* Pestañas de estado (Activos / Inactivos / Todos) */}
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant={filtroEstado === "activos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroEstado("activos")}
                className="gap-1 text-xs sm:text-sm px-2 sm:px-3 h-8 flex-1 sm:flex-none"
              >
                <User className="w-3 h-3" />
                <span className="hidden sm:inline">Activos</span> ({conteoActivos})
              </Button>
              <Button
                variant={filtroEstado === "inactivos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroEstado("inactivos")}
                className="gap-1 text-xs sm:text-sm px-2 sm:px-3 h-8 flex-1 sm:flex-none"
              >
                <Minus className="w-3 h-3" />
                <span className="hidden sm:inline">Inactivos</span> ({conteoInactivos})
              </Button>
              <Button
                variant={filtroEstado === "todos" ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroEstado("todos")}
                className="gap-1 text-xs sm:text-sm px-2 sm:px-3 h-8 flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Todos</span>
                <span className="sm:hidden">All</span> ({conteoTotal})
              </Button>
            </div>
          </div>

          {/* Filtros desplegables — grid 2 col en móvil, fila en sm+ */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-3">
            <Filter className="hidden sm:block w-4 h-4 text-muted-foreground flex-shrink-0" />

            <Select value={filtroSeccion} onValueChange={setFiltroSeccion}>
              <SelectTrigger className="w-full bg-muted/30 text-xs sm:text-sm h-9">
                <SelectValue placeholder="Todas las secciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las secciones</SelectItem>
                <SelectItem value="Primera">Primera</SelectItem>
                <SelectItem value="Segunda">Segunda</SelectItem>
                <SelectItem value="Tercera">Tercera</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroClasificacion} onValueChange={setFiltroClasificacion}>
              <SelectTrigger className="w-full bg-muted/30 text-xs sm:text-sm h-9">
                <SelectValue placeholder="Clasificación IMC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las clasificaciones</SelectItem>
                <SelectItem value="normal">Peso normal</SelectItem>
                <SelectItem value="sobrepeso">Sobrepeso</SelectItem>
                <SelectItem value="obesidad">Obesidad</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroCurso} onValueChange={setFiltroCurso}>
              <SelectTrigger className="w-full bg-muted/30 text-xs sm:text-sm h-9">
                <SelectValue placeholder="Todos los cursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los cursos</SelectItem>
                <SelectItem value="1er Año">1er Año</SelectItem>
                <SelectItem value="2do Año">2do Año</SelectItem>
                <SelectItem value="3er Año">3er Año</SelectItem>
                <SelectItem value="4to Año">4to Año</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant="secondary" className="gap-1 text-xs py-1 px-2.5 justify-center sm:justify-start">
              <User className="w-3 h-3" />
              {cadetesFiltrados.length} cadetes
            </Badge>
          </div>
        </div>

        {/* Alerta de sobrepeso */}
        {conteoSobrepeso > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              ⚠️ {conteoSobrepeso} con Sobrepeso / Obesidad
            </span>
          </div>
        )}

        {/* Carga o Estado Vacío */}
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground text-sm">Cargando fichas nutricionales...</p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center">
            <p className="text-red-500 mb-2">No se pudieron cargar los datos de nutrición.</p>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : cadetesFiltrados.length === 0 ? (
          <div className="py-12 text-center border border-dashed rounded-xl p-8 bg-muted/20">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-base">No se encontraron cadetes</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Pruebe ajustando los filtros de búsqueda o cambiando el estado seleccionado.
            </p>
          </div>
        ) : (
          /* Grilla de Tarjetas Antropométricas */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {cadetesPaginados.map((cadete) => {
                const pesada = cadete.ultima_pesada;
                // Sin talla medida no hay IMC ni peso meta: antes se suponían
                // 170 cm y salía un IMC que parecía real.
                const altura = cadete.altura_cm;
                const imc = pesada?.imc ?? null;
                const colorImc = imc ? getColorIMC(imc) : "#6b7280";

                // Rango de peso saludable (IMC 18,5 a 24,9)
                const rango = altura ? calcularPesoIdeal(altura) : null;
                const peso = pesada?.peso_kg ?? null;
                const excesoPeso = rango && peso ? Number((peso - rango.max).toFixed(1)) : 0;
                const faltaPeso = rango && peso ? Number((rango.min - peso).toFixed(1)) : 0;

                return (
                  <Card
                    key={cadete.id}
                    className="hover:shadow-lg transition-shadow h-full flex flex-col justify-between"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                          {cadete.foto_url ? (
                            <img src={cadete.foto_url} alt={cadete.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="font-semibold text-base leading-tight mb-1 break-words">
                            {cadete.nombre} {cadete.apellido}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                            <span>DNI: {cadete.dni}</span>
                            <div className="flex items-center gap-1 text-[11px]">
                              <Shield className="w-3 h-3 text-primary" />
                              <span className="truncate">{cadete.rango || "Cadete"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px]">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span className="truncate">{cadete.curso} · {cadete.seccion}</span>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 flex-1 flex flex-col pt-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {cadete.sexo === "F" ? "♀ Femenino" : "♂ Masculino"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {altura ? `${altura} cm` : "Sin talla"}
                        </span>
                      </div>

                      {/* Caja de Datos Antropométricos (%MG, %MM, ICC, DX BIA, EGS) */}
                      <div className="space-y-2 text-sm flex-1 p-3 bg-muted/30 rounded-lg border border-border/40">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Última pesada:</span>
                          <span className="font-medium">{fmtFechaPesada(pesada?.fecha)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Peso / Talla:</span>
                          <span className="font-semibold text-xs">
                            {peso ? `${peso} kg` : "—"} · {altura ? `${altura} cm` : "sin talla"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">IMC:</span>
                          {imc ? (
                            <Badge
                              style={{
                                borderColor: colorImc,
                                color: colorImc,
                                backgroundColor: colorImc + "15",
                              }}
                              className="text-xs font-semibold border"
                            >
                              {imc} - {pesada?.clasificacion}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              {peso && !altura ? "Falta la talla" : "—"}
                            </span>
                          )}
                        </div>

                        {/* Parámetros de la Ficha Antropométrica Oficial ISEPOL */}
                        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border/40 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">%MM (Muscular):</span>
                            <span className="font-medium">{pesada?.porcentaje_mm ? `${pesada.porcentaje_mm}%` : "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">%MG (Grasa):</span>
                            <span className="font-medium">{pesada?.porcentaje_mg ? `${pesada.porcentaje_mg}%` : "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">ICC:</span>
                            <span className="font-medium">{pesada?.icc ? `${pesada.icc}${pesada.dx_icc ? ` (${pesada.dx_icc})` : ""}` : "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">DX BIA / EGS:</span>
                            <span className="font-medium">
                              {pesada?.dx_bia || "—"} · EGS {pesada?.egs || "—"}
                            </span>
                          </div>
                        </div>

                        {/* Caja de Meta Nutricional. Sin talla no hay rango
                            saludable que comparar, así que no se muestra. */}
                        {peso && rango && (
                          <div className="mt-2 pt-2 border-t border-border/50 text-center">
                            {excesoPeso > 0 ? (
                              <>
                                <span className="text-red-600 dark:text-red-400 font-semibold text-xs block">
                                  ⚠️ Bajar {excesoPeso} kg
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  Rango saludable: {rango.min} a {rango.max} kg
                                </span>
                              </>
                            ) : faltaPeso > 0 ? (
                              <>
                                <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs block">
                                  ⚠️ Bajo peso: subir {faltaPeso} kg
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  Rango saludable: {rango.min} a {rango.max} kg
                                </span>
                              </>
                            ) : (
                              <span className="text-green-600 dark:text-green-400 font-medium text-xs">
                                ✅ Peso Saludable
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Fila de botones de acción */}
                      <div className="flex items-center gap-1.5 pt-3 border-t border-border mt-auto">
                        <Button
                          size="sm"
                          onClick={() => handleAbrirPesada(cadete)}
                          className="flex-1 gap-1 h-8 text-xs"
                          title="Registrar pesada"
                        >
                          <Apple className="w-3.5 h-3.5" />
                          Pesar
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Imprimir Ficha Antropométrica"
                          onClick={() => imprimirFichaAntropometrica(cadete)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Barra de Paginación */}
            {cadetesFiltrados.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60 mt-6">
                <div className="text-xs text-muted-foreground order-2 sm:order-1">
                  Mostrando <strong className="text-foreground font-medium">{inicioIndex + 1}</strong> a{" "}
                  <strong className="text-foreground font-medium">{finIndex}</strong> de{" "}
                  <strong className="text-foreground font-medium">{cadetesFiltrados.length}</strong> cadetes
                </div>

                <div className="flex items-center gap-2 order-1 sm:order-2 flex-wrap justify-center">
                  {/* Desplegable de items por página */}
                  <div className="flex items-center gap-1.5 mr-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Mostrar:</span>
                    <Select value={String(porPagina)} onValueChange={(val) => setPorPagina(Number(val))}>
                      <SelectTrigger className="h-8 w-[105px] text-xs bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 por pág.</SelectItem>
                        <SelectItem value="24">24 por pág.</SelectItem>
                        <SelectItem value="48">48 por pág.</SelectItem>
                        <SelectItem value="96">96 por pág.</SelectItem>
                        <SelectItem value="5000">Todos ({cadetesFiltrados.length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botones de Paginación */}
                  {totalPaginas > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={paginaActual === 1}
                        onClick={() => setPaginaActual(1)}
                        title="Primera página"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={paginaActual === 1}
                        onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                        title="Página anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      {/* Números de página */}
                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaActual) <= 1)
                          .reduce<(number | string)[]>((acc, p, idx, arr) => {
                            if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                              acc.push("...");
                            }
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, idx) =>
                            p === "..." ? (
                              <span key={`dots-${idx}`} className="text-xs text-muted-foreground px-1">
                                ...
                              </span>
                            ) : (
                              <Button
                                key={`page-${p}`}
                                variant={p === paginaActual ? "default" : "outline"}
                                size="icon"
                                className="h-8 w-8 text-xs"
                                onClick={() => setPaginaActual(Number(p))}
                              >
                                {p}
                              </Button>
                            )
                          )}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={paginaActual === totalPaginas}
                        onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                        title="Página siguiente"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={paginaActual === totalPaginas}
                        onClick={() => setPaginaActual(totalPaginas)}
                        title="Última página"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal para registrar control antropométrico */}
        <PesadaDialog
          cadete={cadeteSeleccionado}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
