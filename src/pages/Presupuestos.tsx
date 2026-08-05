import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePresupuestos, useOdontoPrecios, useSaveOdontoPrecio } from "@/api/odontologia";
import {
  DollarSign,
  Search,
  Edit2,
  ListCollapse,
  FileText,
  User,
  Calendar,
  RefreshCw,
  SlidersHorizontal,
  Bookmark
} from "lucide-react";
import { toast } from "sonner";

export default function Presupuestos() {
  const { data: presupuestos = [], isLoading: loadingPres } = usePresupuestos();
  const { data: precios = [], isLoading: loadingPrecios } = useOdontoPrecios();
  const savePrecio = useSaveOdontoPrecio();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  // Price Catalog Form State
  const [editingPrecioId, setEditingPrecioId] = useState<number | null>(null);
  const [precioCodigo, setPrecioCodigo] = useState("");
  const [precioNombre, setPrecioNombre] = useState("");
  const [precioCosto, setPrecioCosto] = useState("");

  const handleSavePrecio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!precioCodigo || !precioNombre || !precioCosto) return;

    try {
      await savePrecio.mutateAsync({
        id: editingPrecioId || undefined,
        codigo: precioCodigo,
        nombre: precioNombre,
        costo: Number(precioCosto),
        activo: true,
      });

      toast.success(editingPrecioId ? "Procedimiento actualizado." : "Procedimiento agregado al catálogo.");
      setPrecioCodigo("");
      setPrecioNombre("");
      setPrecioCosto("");
      setEditingPrecioId(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleEditPrecioClick = (p: any) => {
    setEditingPrecioId(p.id);
    setPrecioCodigo(p.codigo);
    setPrecioNombre(p.nombre);
    setPrecioCosto(String(p.costo));
  };

  const handleTogglePrecioActivo = async (p: any) => {
    try {
      await savePrecio.mutateAsync({
        ...p,
        activo: !p.activo,
      });
      toast.success(p.activo ? "Procedimiento desactivado." : "Procedimiento reactivado.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filteredPresupuestos = presupuestos.filter((p) => {
    const nombres = `${p.pacientes?.nombres || ""} ${p.pacientes?.apellidos || ""}`.toLowerCase();
    const doc = (p.pacientes?.documento || "").toLowerCase();
    const titulo = p.titulo.toLowerCase();
    const matchesSearch = nombres.includes(search.toLowerCase()) || doc.includes(search.toLowerCase()) || titulo.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "todos" || p.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Presupuestos y Aranceles
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestione presupuestos generales de tratamientos dentales y configure el tarifario de aranceles.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="presupuestos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md h-auto p-1 bg-muted rounded-xl">
            <TabsTrigger value="presupuestos" className="rounded-lg py-2 text-xs font-semibold gap-1.5">
              <FileText className="w-4 h-4" /> Presupuestos Clínicos
            </TabsTrigger>
            <TabsTrigger value="tarifas" className="rounded-lg py-2 text-xs font-semibold gap-1.5">
              <ListCollapse className="w-4 h-4" /> Lista de Precios
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Presupuestos list */}
          <TabsContent value="presupuestos" className="pt-3 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por paciente, cédula o título del plan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingPres ? (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p>Cargando presupuestos...</p>
              </div>
            ) : filteredPresupuestos.length === 0 ? (
              <Card className="border-dashed py-16 text-center text-muted-foreground bg-card">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-semibold text-sm">No se encontraron presupuestos.</p>
                <p className="text-xs mt-1">Cree planes de tratamiento ingresando a la ficha dental de cada paciente.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPresupuestos.map((p) => {
                  const pagado = p.total - p.saldo_pendiente;
                  return (
                    <Card key={p.id} className="shadow-sm hover:border-primary/40 transition-colors relative overflow-hidden bg-card">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base font-bold truncate max-w-[200px]">{p.titulo}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(p.created_at).toLocaleDateString("es-ES")}
                            </CardDescription>
                          </div>
                          <Badge
                            className={
                              p.estado === "aprobado"
                                ? "bg-emerald-100 text-emerald-800 border-0"
                                : p.estado === "finalizado"
                                  ? "bg-blue-100 text-blue-800 border-0"
                                  : p.estado === "rechazado"
                                    ? "bg-red-100 text-red-800 border-0"
                                    : "bg-slate-100 text-slate-800 border-0"
                            }
                          >
                            {p.estado}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Patient info */}
                        <div className="flex items-center gap-2 p-2 border rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs">
                          <User className="w-4 h-4 text-primary" />
                          <div className="truncate">
                            <p className="font-semibold text-foreground">
                              {p.pacientes?.apellidos}, {p.pacientes?.nombres}
                            </p>
                            <p className="text-[10px] text-muted-foreground">CI: {p.pacientes?.documento || "Sin cédula"}</p>
                          </div>
                        </div>

                        {/* Financial summary */}
                        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                          <div className="p-2 border rounded-xl bg-card">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Total</p>
                            <p className="font-bold text-foreground truncate">{p.total.toLocaleString()} ₲</p>
                          </div>
                          <div className="p-2 border rounded-xl bg-card">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Abonado</p>
                            <p className="font-bold text-emerald-600 truncate">{pagado.toLocaleString()} ₲</p>
                          </div>
                          <div className="p-2 border rounded-xl bg-card">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Saldo</p>
                            <p className="font-bold text-destructive truncate">{p.saldo_pendiente.toLocaleString()} ₲</p>
                          </div>
                        </div>

                        {/* Action link */}
                        <div className="flex justify-end pt-2 border-t">
                          <Button size="sm" variant="outline" className="w-full text-xs font-semibold" asChild>
                            <Link to={`/pacientes/${p.paciente_id}`}>Ver Ficha Paciente</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Aranceles List */}
          <TabsContent value="tarifas" className="pt-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Creator Form */}
              <div className="lg:col-span-1">
                <Card className="shadow-sm border-primary/20">
                  <CardHeader className="bg-primary/5 pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      {editingPrecioId ? "Editar Arancel" : "Registrar Arancel"}
                    </CardTitle>
                    <CardDescription>
                      Configure los aranceles base para los tratamientos de la clínica.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <form onSubmit={handleSavePrecio} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="pre_codigo">Código Único (Identificador)</Label>
                        <Input
                          id="pre_codigo"
                          placeholder="Ej. EMP-01"
                          required
                          value={precioCodigo}
                          onChange={(e) => setPrecioCodigo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pre_nombre">Nombre del Procedimiento</Label>
                        <Input
                          id="pre_nombre"
                          placeholder="Ej. Resina / Obturación"
                          required
                          value={precioNombre}
                          onChange={(e) => setPrecioNombre(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pre_costo">Costo del Arancel (₲)</Label>
                        <Input
                          id="pre_costo"
                          placeholder="0"
                          type="text"
                          inputMode="numeric"
                          required
                          value={precioCosto}
                          onChange={(e) => setPrecioCosto(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button type="submit" className="flex-1" disabled={savePrecio.isPending}>
                          {savePrecio.isPending ? "Guardando..." : "Guardar Arancel"}
                        </Button>
                        {editingPrecioId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingPrecioId(null);
                              setPrecioCodigo("");
                              setPrecioNombre("");
                              setPrecioCosto("");
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Price list grid */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Bookmark className="w-5 h-5 text-muted-foreground" />
                      Tarifario Centralizado de Odontología
                    </CardTitle>
                    <CardDescription>Lista completa de tratamientos dentales cotizados.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingPrecios ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <p className="text-xs">Cargando tarifario...</p>
                      </div>
                    ) : precios.length === 0 ? (
                      <p className="text-xs text-center py-8 text-muted-foreground italic">No hay aranceles cargados.</p>
                    ) : (
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-muted border-b">
                            <tr>
                              <th className="p-3 font-semibold">Código</th>
                              <th className="p-3 font-semibold">Procedimiento</th>
                              <th className="p-3 font-semibold text-right">Precio Base</th>
                              <th className="p-3 font-semibold text-center">Estado</th>
                              <th className="p-3 font-semibold text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y bg-card">
                            {precios.map((pr) => (
                              <tr key={pr.id} className={!pr.activo ? "opacity-50" : ""}>
                                <td className="p-3 font-bold">{pr.codigo}</td>
                                <td className="p-3">{pr.nombre}</td>
                                <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                  {pr.costo.toLocaleString()} ₲
                                </td>
                                <td className="p-3 text-center">
                                  <Badge className={pr.activo ? "bg-emerald-100 text-emerald-800 border-0" : "bg-red-100 text-red-800 border-0"}>
                                    {pr.activo ? "Activo" : "Inactivo"}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center flex justify-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-primary"
                                    onClick={() => handleEditPrecioClick(pr)}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 ${pr.activo ? "text-destructive" : "text-emerald-600"}`}
                                    onClick={() => handleTogglePrecioActivo(pr)}
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
