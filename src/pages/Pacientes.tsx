import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Edit, User, ChevronLeft, ChevronRight, Minus, Shield, Stethoscope, Ambulance,
} from "lucide-react";
import { toast } from "sonner";
import { matchPaciente } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import { HistoriaClinicaDialog } from "@/components/consultas/historia-clinica-dialog";
import { SalvoconductoForm } from "@/components/consultas/salvoconducto-form";
import {
  TIPOS_PACIENTE, labelTipoPaciente, usePacientes, useCambiarEstadoPaciente, type Paciente,
} from "@/api/pacientes";
import { useUltimasAtenciones } from "@/api/consultas";

const POR_PAGINA = 24;

const FILTROS_ATENCION = [
  { value: "todos", label: "Con o sin atención" },
  { value: "hoy", label: "Atendidos: hoy" },
  { value: "semana", label: "Atendidos: última semana" },
  { value: "mes", label: "Atendidos: último mes" },
  { value: "alguna_vez", label: "Atendidos: alguna vez" },
] as const;

type FiltroAtencion = (typeof FILTROS_ATENCION)[number]["value"];

function fmtFecha(f: string | null): string {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

function fechaHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Pacientes() {
  const { hasPermission, canView, canDelete } = usePermissions();
  const canEdit = hasPermission("pacientes", "editar");
  // Dar de baja es una decisión de padrón (afecta a control de peso): solo admin.
  const puedeDarDeBaja = canDelete("pacientes");
  const veHistoria = canView("consultas");
  // El salvoconducto lo expide el profesional o la enfermera de turno.
  const puedeExpedirSalvoconducto = hasPermission("consultas", "editar");

  const { data: pacientes = [], isLoading } = usePacientes();
  const cambiarEstado = useCambiarEstadoPaciente();

  const [busqueda, setBusqueda] = useState("");
  const [tipoSel, setTipoSel] = useState("todos");
  const [estadoSel, setEstadoSel] = useState<"activos" | "inactivos" | "todos">("activos");
  // El filtro de atención puede venir preseleccionado desde el Dashboard (?atencion=hoy|mes|...)
  const [searchParams] = useSearchParams();
  const [atencionSel, setAtencionSel] = useState<FiltroAtencion>(() => {
    const p = searchParams.get("atencion");
    return FILTROS_ATENCION.some((f) => f.value === p) ? (p as FiltroAtencion) : "todos";
  });
  const [pagina, setPagina] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);
  const [historiaOpen, setHistoriaOpen] = useState(false);
  const [pacienteHistoria, setPacienteHistoria] = useState<Paciente | null>(null);
  const [pacienteSalvoconducto, setPacienteSalvoconducto] = useState<Paciente | null>(null);

  const busquedaDebounced = useDebounce(busqueda, 300);

  // Última consulta de cada paciente; se carga solo si el filtro lo necesita.
  const { data: ultimasAtenciones = {} } = useUltimasAtenciones(atencionSel !== "todos");

  const filtrados = useMemo(() => {
    const corte =
      atencionSel === "hoy" ? fechaHaceDias(0) :
      atencionSel === "semana" ? fechaHaceDias(7) :
      atencionSel === "mes" ? fechaHaceDias(30) : null;
    const lista = pacientes.filter((p) => {
      if (estadoSel === "activos" && !p.activo) return false;
      if (estadoSel === "inactivos" && p.activo) return false;
      if (tipoSel !== "todos" && (p.tipo || "").toLowerCase() !== tipoSel.toLowerCase()) return false;
      if (atencionSel !== "todos") {
        const ultima = ultimasAtenciones[p.id];
        if (!ultima) return false;
        if (corte && ultima < corte) return false;
      }
      return matchPaciente(p, busquedaDebounced);
    });
    // Con filtro de atención activo, los atendidos más recientemente van primero.
    if (atencionSel !== "todos") {
      lista.sort((a, b) => (ultimasAtenciones[b.id] || "").localeCompare(ultimasAtenciones[a.id] || ""));
    }
    return lista;
  }, [pacientes, busquedaDebounced, tipoSel, estadoSel, atencionSel, ultimasAtenciones]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  /** Datos secundarios de la tarjeta, según de qué tipo de paciente se trate. */
  const detalle = (p: Paciente): string => {
    const pTipo = (p.tipo || "").toLowerCase();
    // En el personal de la Academia, `unidad` guarda el cargo de la lista de
    // revista ("JEFE DE SECC. EDUCACION FISICA"); en un policía de afuera, su unidad.
    const esPersonalANP = ["oficial", "suboficial", "funcionario", "medico", "personal"].includes(pTipo);
    const partes =
      pTipo === "familiar"
        ? [p.familiar_de && `Familiar de: ${p.familiar_de}`, p.telefono && `Tel.: ${p.telefono}`]
        : pTipo === "civil"
          ? [p.telefono && `Tel.: ${p.telefono}`, p.direccion && p.direccion]
          : esPersonalANP || pTipo === "policia"
            ? [
                p.grado && `Grado: ${p.grado}`,
                p.unidad && `${esPersonalANP ? "Función" : "Unidad"}: ${p.unidad}`,
                p.telefono && `Tel.: ${p.telefono}`,
              ]
            : [p.grado && `Grado: ${p.grado}`, p.promocion && `Curso: ${p.promocion}`, p.unidad && `Sección: ${p.unidad}`];
    return [...partes, p.fecha_nacimiento && `Nac.: ${fmtFecha(p.fecha_nacimiento)}`]
      .filter(Boolean).join(" · ") || "Sin datos adicionales";
  };

  const handleToggleActivo = async (p: Paciente) => {
    try {
      await cambiarEstado.mutateAsync({ id: p.id, activo: !p.activo });
      toast.success(p.activo ? "Paciente desactivado." : "Paciente reactivado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Pacientes{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({filtrados.length} de {pacientes.length})
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Padrón de la Sanidad — cadetes, policías, familiares y civiles.
            </p>
          </div>
          {canEdit && (
            <Button className="gap-2" onClick={() => { setSeleccionado(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4" /> Registrar paciente
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, cédula, unidad o dependencia..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            />
          </div>
          <Select value={tipoSel} onValueChange={(v) => { setTipoSel(v); setPagina(1); }}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {TIPOS_PACIENTE.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={estadoSel} onValueChange={(v) => { setEstadoSel(v as typeof estadoSel); setPagina(1); }}>
            <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={atencionSel} onValueChange={(v) => { setAtencionSel(v as FiltroAtencion); setPagina(1); }}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILTROS_ATENCION.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Cargando pacientes...</p>
        ) : visibles.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {busquedaDebounced
                ? `No se encontró ningún paciente con «${busquedaDebounced}».`
                : "No se encontraron pacientes con esos filtros."}
            </p>
            {canEdit && (
              <Button
                className="gap-2 mt-4"
                onClick={() => { setSeleccionado(null); setFormOpen(true); }}
              >
                <Plus className="w-4 h-4" /> Registrar paciente nuevo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibles.map((p) => (
              <Card key={p.id} className={!p.activo ? "opacity-60" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-tight">
                    {p.apellidos}, {p.nombres}
                  </CardTitle>
                  <CardDescription>CI: {p.documento || "sin cédula"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{labelTipoPaciente(p.tipo)}</Badge>
                    {p.sexo && <Badge variant="outline">{p.sexo === "F" ? "Femenino" : "Masculino"}</Badge>}
                    {!p.activo && <Badge variant="destructive">Inactivo</Badge>}
                    {atencionSel !== "todos" && ultimasAtenciones[p.id] && (
                      <Badge className="bg-green-100 text-green-700 border-0 dark:bg-green-900/40 dark:text-green-200">
                        Atendido: {fmtFecha(ultimasAtenciones[p.id])}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{detalle(p)}</p>
                  {(canEdit || veHistoria || puedeDarDeBaja) && (
                    <div className="flex items-center gap-1 pt-2 border-t">
                      {veHistoria && (
                        <Button
                          variant="ghost" size="sm" title="Historia clínica"
                          onClick={() => { setPacienteHistoria(p); setHistoriaOpen(true); }}
                        >
                          <Stethoscope className="w-4 h-4" />
                        </Button>
                      )}
                      {puedeExpedirSalvoconducto && (
                        <Button
                          variant="ghost" size="sm"
                          title="Expedir salvoconducto (traslado al hospital o a estudios)"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setPacienteSalvoconducto(p)}
                        >
                          <Ambulance className="w-4 h-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost" size="sm" title="Editar paciente"
                          onClick={() => { setSeleccionado(p); setFormOpen(true); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {puedeDarDeBaja && (
                        <Button
                          variant="ghost" size="sm"
                          title={p.activo ? "Dar de baja" : "Reactivar"}
                          onClick={() => handleToggleActivo(p)}
                        >
                          {p.activo ? <Minus className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">{paginaActual} / {totalPaginas}</span>
            <Button variant="outline" size="sm" disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <PacienteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        paciente={seleccionado}
        busquedaInicial={seleccionado ? undefined : busquedaDebounced}
        onCreated={(nuevo) => {
          // Recién registrado: se abre su historia clínica para atenderlo enseguida.
          setBusqueda("");
          if (veHistoria) { setPacienteHistoria(nuevo); setHistoriaOpen(true); }
        }}
      />
      <HistoriaClinicaDialog open={historiaOpen} onOpenChange={setHistoriaOpen} paciente={pacienteHistoria} />
      <SalvoconductoForm
        open={!!pacienteSalvoconducto}
        onOpenChange={(abierto) => { if (!abierto) setPacienteSalvoconducto(null); }}
        paciente={pacienteSalvoconducto}
      />
    </AppLayout>
  );
}
