import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Edit, User, ChevronLeft, ChevronRight, Minus, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeText } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { PacienteForm } from "@/components/pacientes/paciente-form";
import {
  TIPOS_PACIENTE, usePacientes, useCambiarEstadoPaciente, type Paciente,
} from "@/api/pacientes";

const POR_PAGINA = 12;

function fmtFecha(f: string | null): string {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

export default function Pacientes() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("pacientes", "editar");

  const { data: pacientes = [], isLoading } = usePacientes();
  const cambiarEstado = useCambiarEstadoPaciente();

  const [busqueda, setBusqueda] = useState("");
  const [tipoSel, setTipoSel] = useState("todos");
  const [estadoSel, setEstadoSel] = useState<"activos" | "inactivos" | "todos">("activos");
  const [pagina, setPagina] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);

  const busquedaDebounced = useDebounce(busqueda, 300);

  const filtrados = useMemo(() => {
    const q = normalizeText(busquedaDebounced.trim());
    return pacientes.filter((p) => {
      if (estadoSel === "activos" && !p.activo) return false;
      if (estadoSel === "inactivos" && p.activo) return false;
      if (tipoSel !== "todos" && p.tipo !== tipoSel) return false;
      if (!q) return true;
      return (
        normalizeText(`${p.nombres} ${p.apellidos}`).includes(q) ||
        normalizeText(p.documento || "").includes(q) ||
        normalizeText(p.unidad || "").includes(q)
      );
    });
  }, [pacientes, busquedaDebounced, tipoSel, estadoSel]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const tipoLabel = (tipo: string) =>
    TIPOS_PACIENTE.find((t) => t.value === tipo)?.label ?? tipo;

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
              Padrón de la Sanidad — cadetes, oficiales, personal y familiares.
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
              placeholder="Buscar por nombre, documento o unidad..."
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
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Cargando pacientes...</p>
        ) : visibles.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No se encontraron pacientes con esos filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibles.map((p) => (
              <Card key={p.id} className={!p.activo ? "opacity-60" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-tight">
                    {p.apellidos}, {p.nombres}
                  </CardTitle>
                  <CardDescription>CI: {p.documento}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{tipoLabel(p.tipo)}</Badge>
                    {p.sexo && <Badge variant="outline">{p.sexo === "F" ? "Femenino" : "Masculino"}</Badge>}
                    {!p.activo && <Badge variant="destructive">Inactivo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[p.promocion && `Curso: ${p.promocion}`, p.unidad && `Sección: ${p.unidad}`, p.fecha_nacimiento && `Nac.: ${fmtFecha(p.fecha_nacimiento)}`]
                      .filter(Boolean).join(" · ") || "Sin datos adicionales"}
                  </p>
                  {canEdit && (
                    <div className="flex items-center gap-1 pt-2 border-t">
                      <Button
                        variant="ghost" size="sm" title="Editar paciente"
                        onClick={() => { setSeleccionado(p); setFormOpen(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        title={p.activo ? "Desactivar" : "Reactivar"}
                        onClick={() => handleToggleActivo(p)}
                      >
                        {p.activo ? <Minus className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </Button>
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

      <PacienteForm open={formOpen} onOpenChange={setFormOpen} paciente={seleccionado} />
    </AppLayout>
  );
}
