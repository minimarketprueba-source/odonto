import { useEffect, useRef, useState } from "react";
import { showSwalSuccess, showSwalError, showSwalInfo } from "@/lib/swal";
import { Building2, Loader2, Upload, Trash2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmpresa, useActualizarEmpresa, achicarLogo, achicarIcono } from "@/api/empresa";
import { usePermissions } from "@/hooks/use-permissions";
import { lineaContacto, aclararColor, EMPRESA_PREDETERMINADA } from "@/lib/clinica";
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
  const inputIcono = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState(empresa.nombre);
  const [ruc, setRuc] = useState(empresa.ruc ?? "");
  const [direccion, setDireccion] = useState(empresa.direccion ?? "");
  const [telefono, setTelefono] = useState(empresa.telefono ?? "");
  const [email, setEmail] = useState(empresa.email ?? "");
  const [logo, setLogo] = useState<string | null>(empresa.logo_url);
  const [icono, setIcono] = useState<string | null>(empresa.icono_url);
  const [nombreCorto, setNombreCorto] = useState(empresa.nombre_corto);
  const [color, setColor] = useState(empresa.color_primario);
  const [subiendo, setSubiendo] = useState<"logo" | "icono" | null>(null);

  // La consulta llega después del primer dibujado: cuando contesta, se rellena
  // el formulario. Sin esto los campos quedarían con los valores por omisión.
  useEffect(() => {
    setNombre(empresa.nombre);
    setRuc(empresa.ruc ?? "");
    setDireccion(empresa.direccion ?? "");
    setTelefono(empresa.telefono ?? "");
    setEmail(empresa.email ?? "");
    setLogo(empresa.logo_url);
    setIcono(empresa.icono_url);
    setNombreCorto(empresa.nombre_corto);
    setColor(empresa.color_primario);
  }, [empresa]);

  const elegirImagen = async (cual: "logo" | "icono", archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(cual);
    try {
      if (cual === "logo") setLogo(await achicarLogo(archivo));
      else setIcono(await achicarIcono(archivo));
      // Todavía NO está guardado: se avisa para que no se vaya de la pantalla
      // creyendo que ya quedó.
      await showSwalInfo(
        `${cual === "logo" ? "Logo" : "Ícono"} cargado. Todavía falta apretar «Guardar datos».`
      );
    } catch (e) {
      await showSwalError((e as Error).message);
    } finally {
      setSubiendo(null);
      const input = cual === "logo" ? inputArchivo.current : inputIcono.current;
      if (input) input.value = "";
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      await showSwalError("El nombre del consultorio no puede quedar vacío.");
      return;
    }
    try {
      await guardar.mutateAsync({
        nombre, nombre_corto: nombreCorto, ruc, direccion, telefono, email,
        logo_url: logo, icono_url: icono, color_primario: color,
      });
      await showSwalSuccess(
        "Los datos del consultorio se guardaron. Ya salen en los impresos y en la pantalla de acceso."
      );
    } catch (e) {
      await showSwalError((e as Error).message);
    }
  };

  const vistaPrevia = lineaContacto({
    ...EMPRESA_PREDETERMINADA,
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
          <Label htmlFor="emp-corto">Nombre corto</Label>
          <Input
            id="emp-corto"
            value={nombreCorto}
            onChange={(e) => setNombreCorto(e.target.value)}
            placeholder="Mova Dent"
          />
          <p className="text-xs text-muted-foreground">
            Para el menú lateral y la pestaña del navegador, donde el nombre completo no entra.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="emp-color">Color de la marca</Label>
          <div className="flex items-center gap-2">
            <input
              id="emp-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border bg-background p-1"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#0e7490"
              className="font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            La banda de la receta y el nombre en los impresos.
          </p>
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

      {/* Las dos imágenes */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Logo (ancho)</Label>
          <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border bg-slate-900 p-2">
            <img
              src={logo || LOGO_IMPRESION_PREDETERMINADO}
              alt="Logo del consultorio"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <input
            ref={inputArchivo}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => elegirImagen("logo", e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" className="gap-2"
              disabled={subiendo !== null}
              onClick={() => inputArchivo.current?.click()}
            >
              {subiendo === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {logo ? "Cambiar" : "Subir"}
            </Button>
            {logo && (
              <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700"
                onClick={() => setLogo(null)}>
                <Trash2 className="h-4 w-4" /> Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Va en la pantalla de acceso, el membrete de los impresos y la banda de la receta.
            Conviene un PNG con fondo transparente y trazos oscuros: se imprime sobre papel blanco.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Ícono (cuadrado)</Label>
          <div className="flex h-20 items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-slate-900">
              <img
                src={icono || "/mova-dent-icono.png"}
                alt="Ícono del consultorio"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border bg-slate-900">
              <img src={icono || "/mova-dent-icono.png"} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
          <input
            ref={inputIcono}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => elegirImagen("icono", e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" className="gap-2"
              disabled={subiendo !== null}
              onClick={() => inputIcono.current?.click()}
            >
              {subiendo === "icono" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {icono ? "Cambiar" : "Subir"}
            </Button>
            {icono && (
              <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700"
                onClick={() => setIcono(null)}>
                <Trash2 className="h-4 w-4" /> Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Va en el menú lateral y en la pestaña del navegador. Si la imagen no es
            cuadrada se recorta el centro. Se ve chiquito: conviene un símbolo, no el
            nombre escrito.
          </p>
        </div>
      </div>

      {/* Cómo va a salir impreso, para no tener que imprimir para verlo. */}
      <div className="rounded-xl border bg-muted/20 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Así va a salir el encabezado
        </p>
        <div
          className="mb-3 flex items-center justify-between gap-3 rounded-t-lg px-3 py-2"
          style={{ background: `linear-gradient(90deg, ${color} 0%, ${aclararColor(color)} 100%)` }}
        >
          <img src={logo || LOGO_IMPRESION_PREDETERMINADO} alt="" className="h-8 object-contain" />
          <span className="text-xs font-bold text-white">{telefono || " "}</span>
        </div>
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
        <Button onClick={handleGuardar} disabled={guardar.isPending || subiendo !== null}>
          {guardar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Guardar datos
        </Button>
      </div>
    </div>
  );
}
