import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Settings, Plus, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sanitizePlainText } from "@/lib/security";
import { queryKeys } from "@/lib/query-client";
import {
  useEspecialidades, useMedicosAdmin, useCountCie10, useMantenimientoMutation, useCuentasVinculables,
  createEspecialidad, updateEspecialidad, createMedico, updateMedico, createCie10,
  type MedicoAdmin,
} from "@/api/mantenimiento";

const MEDICO_VACIO = {
  nombres: "", apellidos: "", documento: "", email: "", telefono: "",
  especialidad_id: "", numero_colegiatura: "", user_id: "",
};

export default function Mantenimiento() {
  const { data: medicos = [], isLoading: cargandoMedicos } = useMedicosAdmin();
  const { data: especialidades = [] } = useEspecialidades();
  const { data: totalCie10 } = useCountCie10();

  // --- Médicos ---
  const [medicoOpen, setMedicoOpen] = useState(false);
  // Las cuentas se cargan solo al abrir el diálogo: es una consulta de admin
  // que no hace falta para el listado.
  const [medicoSel, setMedicoSel] = useState<MedicoAdmin | null>(null);
  const [formMedico, setFormMedico] = useState(MEDICO_VACIO);
  const [soloActivos, setSoloActivos] = useState(true);
  const { data: cuentas = [] } = useCuentasVinculables(medicoOpen);

  const guardarMedico = useMantenimientoMutation(
    async (args: { id: string | null; datos: typeof MEDICO_VACIO }) => {
      const payload = {
        nombres: sanitizePlainText(args.datos.nombres),
        apellidos: sanitizePlainText(args.datos.apellidos),
        documento: sanitizePlainText(args.datos.documento) || null,
        email: sanitizePlainText(args.datos.email) || null,
        telefono: sanitizePlainText(args.datos.telefono) || null,
        // El id de la especialidad es un UUID. Acá decía `Number(...)`, que
        // sobre un UUID da NaN y hacía fallar el alta entera.
        especialidad_id: args.datos.especialidad_id || null,
        numero_colegiatura: sanitizePlainText(args.datos.numero_colegiatura) || null,
        user_id: args.datos.user_id || null,
      };
      if (args.id) await updateMedico(args.id, payload);
      else await createMedico(payload);
    },
    [queryKeys.medicos.all]
  );

  const toggleMedico = useMantenimientoMutation(
    async (m: MedicoAdmin) => updateMedico(m.id, { activo: !m.activo }),
    [queryKeys.medicos.all]
  );

  useEffect(() => {
    if (medicoOpen) {
      setFormMedico(medicoSel ? {
        nombres: medicoSel.nombres ?? "",
        apellidos: medicoSel.apellidos ?? "",
        documento: medicoSel.documento ?? "",
        email: medicoSel.email ?? "",
        telefono: medicoSel.telefono ?? "",
        especialidad_id: medicoSel.especialidad_id ? String(medicoSel.especialidad_id) : "",
        numero_colegiatura: medicoSel.numero_colegiatura ?? "",
        user_id: medicoSel.user_id ?? "",
      } : MEDICO_VACIO);
    }
  }, [medicoOpen, medicoSel]);

  const handleGuardarMedico = async () => {
    if (!formMedico.nombres.trim() || !formMedico.apellidos.trim()) {
      toast.error("Nombres y apellidos son obligatorios.");
      return;
    }
    try {
      await guardarMedico.mutateAsync({ id: medicoSel?.id ?? null, datos: formMedico });
      toast.success(medicoSel ? "Médico actualizado." : "Médico registrado.");
      setMedicoOpen(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  // --- Especialidades ---
  const [nuevaEsp, setNuevaEsp] = useState("");
  const [colorEsp, setColorEsp] = useState("#3b82f6");

  const crearEsp = useMantenimientoMutation(
    async (args: { nombre: string; color: string }) => createEspecialidad(args.nombre, args.color),
    [queryKeys.especialidades.all]
  );
  const toggleEsp = useMantenimientoMutation(
    async (args: { id: string; activo: boolean }) => updateEspecialidad(args.id, { activo: args.activo }),
    [queryKeys.especialidades.all]
  );

  const handleCrearEsp = async () => {
    if (!nuevaEsp.trim()) { toast.error("Escribe el nombre de la especialidad."); return; }
    try {
      await crearEsp.mutateAsync({ nombre: sanitizePlainText(nuevaEsp), color: colorEsp });
      toast.success("Especialidad creada.");
      setNuevaEsp("");
    } catch (e) { toast.error((e as Error).message); }
  };

  // --- CIE-10 ---
  const [cieCodigo, setCieCodigo] = useState("");
  const [cieDesc, setCieDesc] = useState("");
  const [cieCat, setCieCat] = useState("");

  const crearCie = useMantenimientoMutation(
    async (args: { codigo: string; descripcion: string; categoria: string | null }) =>
      createCie10(args.codigo, args.descripcion, args.categoria),
    [queryKeys.cie10.all]
  );

  const handleCrearCie = async () => {
    if (!cieCodigo.trim() || !cieDesc.trim()) { toast.error("Código y descripción son obligatorios."); return; }
    try {
      await crearCie.mutateAsync({
        codigo: sanitizePlainText(cieCodigo).toUpperCase(),
        descripcion: sanitizePlainText(cieDesc),
        categoria: sanitizePlainText(cieCat) || null,
      });
      toast.success("Código agregado al catálogo.");
      setCieCodigo(""); setCieDesc(""); setCieCat("");
    } catch (e) { toast.error((e as Error).message); }
  };

  const medicosVisibles = soloActivos ? medicos.filter((m) => m.activo) : medicos;

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Mantenimiento
        </h2>

        <Tabs defaultValue="medicos">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="medicos">Médicos</TabsTrigger>
            <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
            <TabsTrigger value="cie10">CIE-10</TabsTrigger>
          </TabsList>

          <TabsContent value="medicos" className="space-y-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {medicosVisibles.length} médico{medicosVisibles.length !== 1 ? "s" : ""}
                {soloActivos ? " activos" : " en total"} ·{" "}
                <button className="underline py-2 -my-2" onClick={() => setSoloActivos(!soloActivos)}>
                  {soloActivos ? "ver todos" : "ver solo activos"}
                </button>
              </p>
              <Button className="gap-2" onClick={() => { setMedicoSel(null); setMedicoOpen(true); }}>
                <Plus className="w-4 h-4" /> Registrar médico
              </Button>
            </div>
            {cargandoMedicos ? (
              <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
            ) : (
              <div className="space-y-2">
                {medicosVisibles.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg border flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {m.apellidos}, {m.nombres}
                        {!m.activo && <Badge variant="destructive" className="ml-2">Inactivo</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        {[m.especialidad?.nombre, m.numero_colegiatura && `Colegiatura ${m.numero_colegiatura}`, m.email]
                          .filter(Boolean).join(" · ") || "Sin especialidad"}
                        {m.user_id && " · cuenta vinculada"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setMedicoSel(m); setMedicoOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleMedico.mutateAsync(m).then(() => toast.success("Estado cambiado.")).catch((e) => toast.error((e as Error).message))}>
                      {m.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="especialidades" className="space-y-3 py-3">
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border bg-muted/20">
              <div className="space-y-1 flex-1 min-w-40">
                <Label htmlFor="esp-nombre">Nueva especialidad</Label>
                <Input id="esp-nombre" placeholder="Ej: Traumatología" value={nuevaEsp} onChange={(e) => setNuevaEsp(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="esp-color">Color</Label>
                <Input id="esp-color" type="color" className="w-16 p-1" value={colorEsp} onChange={(e) => setColorEsp(e.target.value)} />
              </div>
              <Button onClick={handleCrearEsp} disabled={crearEsp.isPending} className="gap-2">
                {crearEsp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear
              </Button>
            </div>
            <div className="space-y-2">
              {especialidades.map((e) => (
                <div key={e.id} className="p-3 rounded-lg border flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: e.color || "#94a3b8" }} />
                  <span className="flex-1 text-sm font-medium">
                    {e.nombre}
                    {!e.activo && <Badge variant="destructive" className="ml-2">Inactiva</Badge>}
                  </span>
                  <Button variant="outline" size="sm"
                    onClick={() => toggleEsp.mutateAsync({ id: e.id, activo: !e.activo }).then(() => toast.success("Estado cambiado.")).catch((err) => toast.error((err as Error).message))}>
                    {e.activo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cie10" className="space-y-3 py-3">
            <p className="text-sm text-muted-foreground">
              El catálogo tiene <span className="font-semibold text-foreground">{totalCie10 ?? "…"}</span> códigos
              activos. Se buscan desde el formulario de consulta; aquí puedes agregar los que falten.
            </p>
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border bg-muted/20">
              <div className="space-y-1 w-28">
                <Label htmlFor="cie-cod">Código</Label>
                <Input id="cie-cod" placeholder="J00" value={cieCodigo} onChange={(e) => setCieCodigo(e.target.value)} />
              </div>
              <div className="space-y-1 flex-1 min-w-52">
                <Label htmlFor="cie-desc">Descripción</Label>
                <Input id="cie-desc" placeholder="Rinofaringitis aguda" value={cieDesc} onChange={(e) => setCieDesc(e.target.value)} />
              </div>
              <div className="space-y-1 w-44">
                <Label htmlFor="cie-cat">Categoría</Label>
                <Input id="cie-cat" placeholder="Respiratorio" value={cieCat} onChange={(e) => setCieCat(e.target.value)} />
              </div>
              <Button onClick={handleCrearCie} disabled={crearCie.isPending} className="gap-2">
                {crearCie.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={medicoOpen} onOpenChange={setMedicoOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{medicoSel ? "Editar médico" : "Registrar médico"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="m-nombres">Nombres *</Label>
              <Input id="m-nombres" value={formMedico.nombres} onChange={(e) => setFormMedico((f) => ({ ...f, nombres: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-apellidos">Apellidos *</Label>
              <Input id="m-apellidos" value={formMedico.apellidos} onChange={(e) => setFormMedico((f) => ({ ...f, apellidos: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-esp">Especialidad</Label>
              <Select
                value={formMedico.especialidad_id || "ninguna"}
                onValueChange={(v) => setFormMedico((f) => ({ ...f, especialidad_id: v === "ninguna" ? "" : v }))}
              >
                <SelectTrigger id="m-esp"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguna">Sin especialidad</SelectItem>
                  {especialidades.filter((e) => e.activo).map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-col">N° colegiatura</Label>
              <Input id="m-col" value={formMedico.numero_colegiatura} onChange={(e) => setFormMedico((f) => ({ ...f, numero_colegiatura: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-doc">Documento</Label>
              <Input id="m-doc" value={formMedico.documento} onChange={(e) => setFormMedico((f) => ({ ...f, documento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-tel">Teléfono</Label>
              <Input id="m-tel" value={formMedico.telefono} onChange={(e) => setFormMedico((f) => ({ ...f, telefono: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="m-email">Email</Label>
              <Input id="m-email" type="email" value={formMedico.email} onChange={(e) => setFormMedico((f) => ({ ...f, email: e.target.value }))} />
            </div>

            {/* La ficha y la cuenta de acceso son cosas distintas: sin este
                vínculo el profesional no puede corregir su propia ficha desde
                «Mi perfil» y su firma no queda fija en los documentos. */}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="m-cuenta">Cuenta de acceso</Label>
              <Select
                value={formMedico.user_id || "ninguna"}
                onValueChange={(v) => setFormMedico((f) => ({ ...f, user_id: v === "ninguna" ? "" : v }))}
              >
                <SelectTrigger id="m-cuenta">
                  <SelectValue placeholder="Sin cuenta vinculada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguna">Sin cuenta vinculada</SelectItem>
                  {cuentas.map((c) => {
                    // Una cuenta ya usada por OTRA ficha no se puede reasignar:
                    // dos profesionales compartiendo cuenta firmarían igual.
                    const ocupada = Boolean(c.tomadaPor) && c.id !== medicoSel?.user_id;
                    return (
                      <SelectItem key={c.id} value={c.id} disabled={ocupada}>
                        {c.email}
                        {c.nombre ? ` — ${c.nombre}` : ""}
                        {ocupada ? ` (ya es de ${c.tomadaPor})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Con qué usuario entra al sistema. Al vincularla, esta persona podrá
                corregir su propia ficha desde «Mi perfil» y sus documentos saldrán
                firmados a su nombre.
              </p>
            </div>
          </div>
          <Button onClick={handleGuardarMedico} disabled={guardarMedico.isPending} className="w-full">
            {guardarMedico.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
              : medicoSel ? "Guardar cambios" : "Registrar médico"}
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
