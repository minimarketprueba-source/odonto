import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, Upload, Trash2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmpresa, useActualizarEmpresa, achicarLogo } from "@/api/empresa";
import { usePermissions } from "@/hooks/use-permissions";
import { lineaContacto } from "@/lib/clinica";
import { LOGO_IMPRESION_PREDETERMINADO } from "@/lib/logo-impresion-base64";

/**
 * Los datos que salen impresos en todo lo que se le entrega al paciente:
 * presupuestos, comprobantes de pago, recetas, planillas.
 *
 * Solo el administrador: cambiar el nombre o el RUC cambia todos los
 * documentos del consultorio a la vez.
 */
export function DatosConsultorio() {
  const empresa = useEmpresa();
  const { isAdmin } = usePermissions();
  const guardar = useActualizarEmpresa();
  const inputArchivo = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState(empresa.nombre);
  const [ruc, setRuc] = useState(empresa.ruc ?? "");
  const [direccion, setDireccion] = useState(empresa.direccion ?? "");
  const [telefono, setTelefono] = useState(empresa.telefono ?? "");
  const [email, setEmail] = useState(empresa.email ?? "");
  const [logo, setLogo] = useState<string | null>(empresa.logo_url);
  const [subiendo, setSubiendo] = useState(false);

  // La consulta llega después del primer dibujado: cuando contesta, se rellena
  // el formulario. Sin esto los campos quedarían con los valores por omisión.
  useEffect(() => {
    setNombre(empresa.nombre);
    setRuc(empresa.ruc ?? "");
    setDireccion(empresa.direccion ?? "");
    setTelefono(empresa.telefono ?? "");
    setEmail(empresa.email ?? "");
    setLogo(empresa.logo_url);
  }, [empresa]);

  const elegirLogo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(true);
    try {
      setLogo(await achicarLogo(archivo));
      toast.success("Logo cargado. Falta guardar para que quede.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubiendo(false);
      if (inputArchivo.current) inputArchivo.current.value = "";
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre del consultorio no puede quedar vacío.");
      return;
    }
    try {
      await guardar.mutateAsync({ nombre, ruc, direccion, telefono, email, logo_url: logo });
      toast.success("Datos del consultorio guardados.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const vistaPrevia = lineaContacto({
    nombre, ruc: ruc || null, direccion: direccion || null,
    telefono: telefono || null, email: email || null, logo_url: logo,
  });

  if (!isAdmin) {
    return (
      <div className="flex gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Los datos del consultorio los edita el administrador. Salen impresos en los
          presupuestos, los comprobantes de pago y las recetas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h3 className="font-semibold">Datos del consultorio</h3>
          <p className="text-sm text-muted-foreground">
            Salen impresos en presupuestos, comprobantes de pago, recetas y planillas, y se
            ven en la pantalla de acceso.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="emp-nombre">Nombre del consultorio *</Label>
          <Input
            id="emp-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="CONSULTORIO ODONTOLÓGICO MOVA DENT"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="emp-ruc">RUC</Label>
          <Input
            id="emp-ruc"
            value={ruc}
            onChange={(e) => setRuc(e.target.value)}
            placeholder="80012345-6"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="emp-tel">Teléfono</Label>
          <Input
            id="emp-tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="0983 559 700"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="emp-dir">Dirección</Label>
          <Input
            id="emp-dir"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Av. Mcal. López 1234 c/ Sacramento — Asunción"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="emp-mail">Correo electrónico</Label>
          <Input
            id="emp-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@movadent.com.py"
          />
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg border bg-slate-900 p-2">
            <img
              src={logo || LOGO_IMPRESION_PREDETERMINADO}
              alt="Logo del consultorio"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={inputArchivo}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => elegirLogo(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={subiendo}
              onClick={() => inputArchivo.current?.click()}
            >
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {logo ? "Cambiar logo" : "Subir logo"}
            </Button>
            {logo && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-red-600 hover:text-red-700"
                onClick={() => setLogo(null)}
              >
                <Trash2 className="h-4 w-4" /> Quitar
              </Button>
            )}
            <p className="max-w-xs text-xs text-muted-foreground">
              {logo
                ? "Se achica solo a 600 px de ancho."
                : "Mientras no subas uno, se usa el de Mova Dent."}{" "}
              Conviene un PNG con fondo transparente y trazos oscuros: se imprime sobre
              papel blanco.
            </p>
          </div>
        </div>
      </div>

      {/* Cómo va a salir impreso, para no tener que imprimir para verlo. */}
      <div className="rounded-xl border bg-muted/20 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Así va a salir el encabezado
        </p>
        <div className="rounded-lg border bg-white p-4 text-center">
          {/* El mismo respaldo que usa el impreso: sin logo propio va el de
              Mova Dent, así la vista previa no miente. */}
          <img
            src={logo || LOGO_IMPRESION_PREDETERMINADO}
            alt=""
            className="mx-auto mb-1.5 max-h-12 max-w-[200px] object-contain"
          />
          <p className="text-base font-bold text-[#1e3a8a]">{nombre || "—"}</p>
          {vistaPrevia && <p className="mt-0.5 text-[11px] text-slate-500">{vistaPrevia}</p>}
          <p className="mt-1 text-sm font-semibold text-slate-800">RECETA ODONTOLÓGICA</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleGuardar} disabled={guardar.isPending || subiendo}>
          {guardar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar datos
        </Button>
      </div>
    </div>
  );
}
