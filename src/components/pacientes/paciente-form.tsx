import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sanitizePlainText } from "@/lib/security";
import {
  TIPOS_PACIENTE, useCreatePaciente, useUpdatePaciente, type Paciente,
} from "@/api/pacientes";

interface PacienteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente?: Paciente | null; // null/undefined = alta
}

const VACIO = {
  nombres: "", apellidos: "", documento: "", tipo: "cadete",
  grado: "", promocion: "", unidad: "", fecha_nacimiento: "", sexo: "",
  email: "", telefono: "", direccion: "",
};

export function PacienteForm({ open, onOpenChange, paciente }: PacienteFormProps) {
  const [form, setForm] = useState(VACIO);
  const crear = useCreatePaciente();
  const actualizar = useUpdatePaciente();
  const guardando = crear.isPending || actualizar.isPending;

  useEffect(() => {
    if (open) {
      setForm(paciente ? {
        nombres: paciente.nombres ?? "",
        apellidos: paciente.apellidos ?? "",
        documento: paciente.documento ?? "",
        tipo: paciente.tipo ?? "cadete",
        grado: paciente.grado ?? "",
        promocion: paciente.promocion ?? "",
        unidad: paciente.unidad ?? "",
        fecha_nacimiento: paciente.fecha_nacimiento ?? "",
        sexo: paciente.sexo ?? "",
        email: paciente.email ?? "",
        telefono: paciente.telefono ?? "",
        direccion: paciente.direccion ?? "",
      } : VACIO);
    }
  }, [open, paciente]);

  const set = (campo: keyof typeof VACIO) => (valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const handleGuardar = async () => {
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.documento.trim()) {
      toast.error("Nombres, apellidos y documento son obligatorios.");
      return;
    }
    const payload = {
      nombres: sanitizePlainText(form.nombres),
      apellidos: sanitizePlainText(form.apellidos),
      documento: sanitizePlainText(form.documento),
      tipo: form.tipo,
      grado: sanitizePlainText(form.grado) || null,
      promocion: sanitizePlainText(form.promocion) || null,
      unidad: sanitizePlainText(form.unidad) || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      sexo: (form.sexo || null) as "M" | "F" | null,
      email: sanitizePlainText(form.email) || null,
      telefono: sanitizePlainText(form.telefono) || null,
      direccion: sanitizePlainText(form.direccion) || null,
    };
    try {
      if (paciente) {
        await actualizar.mutateAsync({ id: paciente.id, cambios: payload });
        toast.success("Paciente actualizado.");
      } else {
        await crear.mutateAsync(payload);
        toast.success("Paciente registrado.");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{paciente ? "Editar paciente" : "Registrar paciente"}</DialogTitle>
          <DialogDescription>
            Datos del paciente de la Sanidad. Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="p-nombres">Nombres *</Label>
            <Input id="p-nombres" value={form.nombres} onChange={(e) => set("nombres")(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-apellidos">Apellidos *</Label>
            <Input id="p-apellidos" value={form.apellidos} onChange={(e) => set("apellidos")(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-documento">Documento (CI) *</Label>
            <Input id="p-documento" value={form.documento} onChange={(e) => set("documento")(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-tipo">Tipo *</Label>
            <Select value={form.tipo} onValueChange={set("tipo")}>
              <SelectTrigger id="p-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_PACIENTE.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Label htmlFor="p-nac">Fecha de nacimiento</Label>
            <Input id="p-nac" type="date" value={form.fecha_nacimiento} onChange={(e) => set("fecha_nacimiento")(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-grado">Grado</Label>
            <Input id="p-grado" placeholder="Ej: Oficial 1ro" value={form.grado} onChange={(e) => set("grado")(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-promocion">Curso / Promoción</Label>
            <Input id="p-promocion" placeholder="Ej: 1er" value={form.promocion} onChange={(e) => set("promocion")(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-unidad">Unidad / Sección</Label>
            <Input id="p-unidad" placeholder="Ej: Primera" value={form.unidad} onChange={(e) => set("unidad")(e.target.value)} />
          </div>
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

        <Button onClick={handleGuardar} disabled={guardando} className="w-full">
          {guardando
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
            : paciente ? "Guardar cambios" : "Registrar paciente"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
