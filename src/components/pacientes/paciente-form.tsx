import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { showSwalSuccess, showSwalError } from "@/lib/swal";
import { sanitizePlainText } from "@/lib/security";
import { normalizeDocumento } from "@/lib/utils";
import {
  TIPOS_PACIENTE, esPacienteExterno, usePacientes, useCreatePaciente,
  useUpdatePaciente, type Paciente,
} from "@/api/pacientes";

const VACIO = {
  nombres: "", apellidos: "", documento: "", tipo: "",
  grado: "", promocion: "", unidad: "", familiar_de: "",
  fecha_nacimiento: "", sexo: "", email: "", telefono: "", direccion: "",
};

interface PacienteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente?: Paciente | null; // null/undefined = alta
  /** Se llama con el paciente recién creado (para seleccionarlo donde se lo pidió). */
  onCreated?: (nuevo: Paciente) => void;
  /** Texto que se estaba buscando: precarga cédula o apellidos. */
  busquedaInicial?: string;
}

function etiquetaUnidad(tipo: string): string {
  // En el personal de la Academia este campo guarda el cargo de la lista de
  // revista; en un policía de afuera, la dependencia de la que viene.
  if (tipo === "oficial" || tipo === "suboficial") return "Cargo o función en la Academia";
  if (tipo === "policia") return "Dependencia / Comisaría / Unidad";
  if (tipo === "cadete") return "Sección / Batallón";
  if (tipo === "funcionario" || tipo === "medico") return "Departamento / Sección / Sanidad";
  return "Unidad / Sección";
}

export function PacienteForm({
  open, onOpenChange, paciente, onCreated, busquedaInicial,
}: PacienteFormProps) {
  const [form, setForm] = useState(VACIO);
  const { data: pacientes = [] } = usePacientes();
  const crear = useCreatePaciente();
  const actualizar = useUpdatePaciente();
  const guardando = crear.isPending || actualizar.isPending;

  useEffect(() => {
    if (!open) return;
    if (paciente) {
      setForm({
        nombres: paciente.nombres ?? "",
        apellidos: paciente.apellidos ?? "",
        documento: paciente.documento ?? "",
        tipo: paciente.tipo ?? "",
        grado: paciente.grado ?? "",
        promocion: paciente.promocion ?? "",
        unidad: paciente.unidad ?? "",
        familiar_de: paciente.familiar_de ?? "",
        fecha_nacimiento: paciente.fecha_nacimiento ?? "",
        sexo: paciente.sexo ?? "",
        email: paciente.email ?? "",
        telefono: paciente.telefono ?? "",
        direccion: paciente.direccion ?? "",
      });
      return;
    }
    // Alta: si venía buscando algo, se precarga para no escribirlo dos veces.
    const q = (busquedaInicial || "").trim();
    const pareceDocumento = q.length > 0 && /^[\d.\s-]+$/.test(q);
    setForm({
      ...VACIO,
      documento: pareceDocumento ? q.replace(/\D/g, "") : "",
      apellidos: !pareceDocumento ? q : "",
    });
  }, [open, paciente, busquedaInicial]);

  const set = (campo: keyof typeof VACIO) => (valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const externo = esPacienteExterno(form.tipo);

  // Aviso de cédula ya registrada (busca sobre la lista que ya está en memoria).
  const duplicado = useMemo(() => {
    const doc = normalizeDocumento(form.documento);
    if (doc.length < 3) return null;
    return pacientes.find(
      (p) => p.id !== paciente?.id && normalizeDocumento(p.documento) === doc
    ) ?? null;
  }, [pacientes, form.documento, paciente?.id]);

  const handleGuardar = async () => {
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      await showSwalError("Nombres y apellidos son obligatorios.");
      return;
    }
    if (!form.tipo) {
      await showSwalError("Elija el tipo de paciente (cadete, policía, familiar o civil).");
      return;
    }
    if (!externo && !form.documento.trim()) {
      await showSwalError("La cédula es obligatoria para cadetes y policías.");
      return;
    }
    if (externo && !form.documento.trim() && !form.fecha_nacimiento) {
      await showSwalError("Si no tiene cédula, indique la fecha de nacimiento para poder identificarlo.");
      return;
    }
    if (duplicado) {
      await showSwalError(
        `Esa cédula ya es de ${duplicado.apellidos}, ${duplicado.nombres}${duplicado.activo ? "" : " (ficha dada de baja)"}. Use esa ficha en vez de crear otra.`
      );
      return;
    }
    const payload = {
      nombres: sanitizePlainText(form.nombres),
      apellidos: sanitizePlainText(form.apellidos),
      documento: sanitizePlainText(form.documento) || null,
      tipo: form.tipo,
      grado: externo ? null : sanitizePlainText(form.grado) || null,
      promocion: form.tipo === "cadete" ? sanitizePlainText(form.promocion) || null : null,
      unidad: externo ? null : sanitizePlainText(form.unidad) || null,
      // Solo se envía si hay algo que guardar: así el alta funciona igual
      // aunque la columna todavía no exista en la base.
      ...(form.tipo === "familiar" && form.familiar_de.trim()
        ? { familiar_de: sanitizePlainText(form.familiar_de) }
        : paciente?.familiar_de
          ? { familiar_de: null }
          : {}),
      fecha_nacimiento: form.fecha_nacimiento || null,
      sexo: (form.sexo || null) as "M" | "F" | null,
      email: sanitizePlainText(form.email) || null,
      telefono: sanitizePlainText(form.telefono) || null,
      direccion: sanitizePlainText(form.direccion) || null,
    };
    try {
      if (paciente) {
        await actualizar.mutateAsync({ id: paciente.id, cambios: payload });
        onOpenChange(false);
        await showSwalSuccess(`Paciente actualizado: ${payload.apellidos}, ${payload.nombres}.`);
      } else {
        const nuevo = await crear.mutateAsync(payload);
        onOpenChange(false);
        onCreated?.(nuevo);
        await showSwalSuccess(
          `Paciente registrado: ${nuevo.apellidos}, ${nuevo.nombres} (CI: ${nuevo.documento || `P${nuevo.id}`}).`
        );
      }
    } catch (e) {
      await showSwalError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{paciente ? "Editar paciente" : "Registrar paciente"}</DialogTitle>
          <DialogDescription>
            Cadetes, policías, familiares y civiles atendidos por la Sanidad.
            Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="p-tipo">Tipo de paciente *</Label>
            <Select value={form.tipo} onValueChange={set("tipo")}>
              <SelectTrigger id="p-tipo">
                <SelectValue placeholder="Elija el tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PACIENTE.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-documento">
              Documento (CI) {externo ? "" : "*"}
            </Label>
            <Input id="p-documento" value={form.documento} onChange={(e) => set("documento")(e.target.value)} />
            {externo && (
              <p className="text-xs text-muted-foreground">
                Si no tiene cédula (por ejemplo un menor), déjelo vacío e indique la fecha de nacimiento.
              </p>
            )}
          </div>

          {duplicado && (
            <div className="sm:col-span-2 flex items-start gap-2 p-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Esa cédula ya está registrada a nombre de{" "}
                <strong>{duplicado.apellidos}, {duplicado.nombres}</strong>
                {duplicado.activo ? "" : " (ficha dada de baja)"}. Use esa ficha en vez de crear otra,
                así la historia clínica no queda partida en dos.
              </span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="p-nombres">Nombres *</Label>
            <Input id="p-nombres" value={form.nombres} onChange={(e) => set("nombres")(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-apellidos">Apellidos *</Label>
            <Input id="p-apellidos" value={form.apellidos} onChange={(e) => set("apellidos")(e.target.value)} />
          </div>

          {form.tipo === "familiar" && (
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="p-familiar-de">Familiar de</Label>
              <Input
                id="p-familiar-de"
                placeholder="Nombre y CI del policía o cadete titular"
                value={form.familiar_de}
                onChange={(e) => set("familiar_de")(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="p-sexo">Sexo</Label>
            <Select value={form.sexo || "no-indicado"} onValueChange={(v) => set("sexo")(v === "no-indicado" ? "" : v)}>
              <SelectTrigger id="p-sexo"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no-indicado">Sin indicar</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-nac">
              Fecha de nacimiento {externo && !form.documento.trim() ? "*" : ""}
            </Label>
            <Input id="p-nac" type="date" value={form.fecha_nacimiento} onChange={(e) => set("fecha_nacimiento")(e.target.value)} />
          </div>

          {!externo && (
            <>
              <div className="space-y-1">
                <Label htmlFor="p-grado">Grado</Label>
                <Input
                  id="p-grado"
                  placeholder={form.tipo === "policia" ? "Ej: Comisario, Oficial 1ro" : "Ej: Oficial 1ro"}
                  value={form.grado}
                  onChange={(e) => set("grado")(e.target.value)}
                />
              </div>
              {form.tipo === "cadete" && (
                <div className="space-y-1">
                  <Label htmlFor="p-promocion">Curso / Promoción</Label>
                  <Input id="p-promocion" placeholder="Ej: 1er" value={form.promocion} onChange={(e) => set("promocion")(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="p-unidad">{etiquetaUnidad(form.tipo)}</Label>
                <Input
                  id="p-unidad"
                  placeholder={form.tipo === "policia" ? "Ej: Comisaría 3ra" : "Ej: Primera"}
                  value={form.unidad}
                  onChange={(e) => set("unidad")(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor="p-telefono">Teléfono</Label>
            <Input id="p-telefono" value={form.telefono} onChange={(e) => set("telefono")(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="p-email">Email</Label>
            <Input id="p-email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="p-direccion">Dirección</Label>
            <Input id="p-direccion" value={form.direccion} onChange={(e) => set("direccion")(e.target.value)} />
          </div>
        </div>

        <Button onClick={handleGuardar} disabled={guardando || !!duplicado} className="w-full">
          {guardando
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
            : paciente ? "Guardar cambios" : "Registrar paciente"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
