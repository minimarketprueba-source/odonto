import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Trash2, Building2, Palette, FileText, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { achicarLogo, achicarIcono } from "@/api/empresa";
import { iconoDesdeLogo } from "@/lib/icono-desde-logo";
import { aclararColor, lineaContacto, EMPRESA_PREDETERMINADA } from "@/lib/clinica";
import { useActualizarEmpresaPorId, type EmpresaDelSistema } from "@/api/empresas";

interface ModalEditarEmpresaProps {
  empresa: EmpresaDelSistema | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModalEditarEmpresa({ empresa, open, onOpenChange }: ModalEditarEmpresaProps) {
  const actualizar = useActualizarEmpresaPorId();
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const inputIconoRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState("");
  const [nombreCorto, setNombreCorto] = useState("");
  const [color, setColor] = useState("#0e7490");
  const [ruc, setRuc] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [icono, setIcono] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<"logo" | "icono" | "generar-icono" | null>(null);

  useEffect(() => {
    if (empresa && open) {
      setNombre(empresa.nombre || "");
      setNombreCorto(empresa.nombre_corto || "");
      setColor(empresa.color_primario || "#0e7490");
      setRuc(empresa.ruc || "");
      setTelefono(empresa.telefono || "");
      setDireccion(empresa.direccion || "");
      setEmail(empresa.email || "");
      setLogo(empresa.logo_url || null);
      setIcono(empresa.icono_url || null);
    }
  }, [empresa, open]);

  if (!empresa) return null;

  const handleElegirImagen = async (cual: "logo" | "icono", archivo?: File) => {
    if (!archivo) return;
    setProcesando(cual);
    try {
      if (cual === "logo") {
        const nuevo = await achicarLogo(archivo);
        setLogo(nuevo);
        // Si no tiene ícono propio, armarlo automáticamente
        if (!icono) {
          const autoIcono = await iconoDesdeLogo(nuevo, {
            nombre: nombreCorto || nombre,
            color,
          });
          if (autoIcono) setIcono(autoIcono);
        }
        toast.info("Logo cargado. Guarda los cambios para aplicar.");
      } else {
        const nuevoIcono = await achicarIcono(archivo);
        setIcono(nuevoIcono);
        toast.info("Ícono cargado. Guarda los cambios para aplicar.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo procesar la imagen.");
    } finally {
      setProcesando(null);
      const input = cual === "logo" ? inputLogoRef.current : inputIconoRef.current;
      if (input) input.value = "";
    }
  };

  const handleGenerarIconoDesdeLogo = async () => {
    if (!logo) {
      toast.error("Primero debes cargar un logo para generar su ícono.");
      return;
    }
    setProcesando("generar-icono");
    try {
      const autoIcono = await iconoDesdeLogo(logo, {
        nombre: nombreCorto || nombre,
        color,
      });
      if (autoIcono) {
        setIcono(autoIcono);
        toast.success("Ícono generado a partir del logo.");
      } else {
        toast.warning("No se pudo extraer un símbolo nítido; se usó la inicial.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar ícono.");
    } finally {
      setProcesando(null);
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre de la empresa no puede quedar vacío.");
      return;
    }

    try {
      await actualizar.mutateAsync({
        clinicaId: empresa.clinica_id,
        nombre: nombre.trim(),
        nombre_corto: nombreCorto.trim() || null,
        color_primario: color,
        ruc: ruc.trim() || null,
        telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
        email: email.trim() || null,
        logo_url: logo,
        icono_url: icono,
      });

      toast.success(`Datos y logos de ${nombreCorto || nombre} actualizados con éxito.`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    }
  };

  const vistaPreviaContacto = lineaContacto({
    ...EMPRESA_PREDETERMINADA,
    nombre,
    ruc: ruc || null,
    direccion: direccion || null,
    telefono: telefono || null,
    email: email || null,
    logo_url: logo,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Building2 className="h-5 w-5 text-primary" />
            Configurar marca y datos: {empresa.nombre_corto || empresa.nombre}
          </DialogTitle>
          <DialogDescription>
            Personaliza el logo, ícono, colores y datos de contacto de esta empresa. Todos los
            documentos emitidos por este consultorio usarán estos datos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="datos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="datos" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Datos de la Empresa
            </TabsTrigger>
            <TabsTrigger value="logos" className="gap-1.5">
              <Palette className="h-4 w-4" /> Logos e Íconos
            </TabsTrigger>
            <TabsTrigger value="impresos" className="gap-1.5">
              <FileText className="h-4 w-4" /> Vista Previa
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DATOS */}
          <TabsContent value="datos" className="space-y-4 pt-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-nombre">Nombre oficial del consultorio / clínica *</Label>
                <Input
                  id="edit-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="CONSULTORIO ODONTOLÓGICO SAN RAFAEL"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-corto">Nombre corto</Label>
                <Input
                  id="edit-corto"
                  value={nombreCorto}
                  onChange={(e) => setNombreCorto(e.target.value)}
                  placeholder="San Rafael"
                />
                <p className="text-[11px] text-muted-foreground">
                  Se usa en el menú lateral y pestañas donde no entra el nombre completo.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-color">Color de la marca</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border bg-background p-1"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#0e7490"
                    className="font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Se aplica a la banda de recetas y títulos de impresos.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-ruc">RUC / Registro fiscal</Label>
                <Input
                  id="edit-ruc"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="80012345-6"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-tel">Teléfono / WhatsApp</Label>
                <Input
                  id="edit-tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="0981 123 456"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-dir">Dirección física</Label>
                <Input
                  id="edit-dir"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Avda. España 123 c/ Brasilia — Asunción"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-mail">Correo electrónico institucional</Label>
                <Input
                  id="edit-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@sanrafael.com.py"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: LOGOS E ÍCONOS */}
          <TabsContent value="logos" className="space-y-6 pt-3">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* LOGO ANCHO */}
              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-foreground">Logo Principal (ancho)</Label>
                  <span className="text-[11px] text-muted-foreground">Impresos y Login</span>
                </div>

                <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border bg-slate-950 p-2">
                  {logo ? (
                    <img
                      src={logo}
                      alt="Logo de la empresa"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-xs text-slate-500">
                      Sin logo cargado
                      <p className="text-[10px] text-slate-600">(Se usará el nombre en texto)</p>
                    </div>
                  )}
                </div>

                <input
                  ref={inputLogoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleElegirImagen("logo", e.target.files?.[0])}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={procesando !== null}
                    onClick={() => inputLogoRef.current?.click()}
                  >
                    {procesando === "logo" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {logo ? "Cambiar logo" : "Subir logo"}
                  </Button>
                  {logo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-red-500 hover:text-red-600"
                      onClick={() => setLogo(null)}
                    >
                      <Trash2 className="h-4 w-4" /> Quitar
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Se optimiza y achica automáticamente a un PNG liviano en alta resolución.
                </p>
              </div>

              {/* ÍCONO CUADRADO */}
              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-foreground">Ícono Cuadrado</Label>
                  <span className="text-[11px] text-muted-foreground">Menú y Navegador</span>
                </div>

                <div className="flex h-28 items-center justify-center gap-4 rounded-lg border bg-slate-950 p-2">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                    {icono ? (
                      <img src={icono} alt="Ícono" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-slate-400">
                        {nombreCorto?.charAt(0) || "C"}
                      </span>
                    )}
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-slate-900">
                    {icono ? (
                      <img src={icono} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        {nombreCorto?.charAt(0) || "C"}
                      </span>
                    )}
                  </div>
                </div>

                <input
                  ref={inputIconoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleElegirImagen("icono", e.target.files?.[0])}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={procesando !== null}
                    onClick={() => inputIconoRef.current?.click()}
                  >
                    {procesando === "icono" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {icono ? "Cambiar ícono" : "Subir ícono"}
                  </Button>

                  {logo && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 text-xs"
                      disabled={procesando !== null}
                      onClick={handleGenerarIconoDesdeLogo}
                    >
                      {procesando === "generar-icono" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      )}
                      Crear del logo
                    </Button>
                  )}

                  {icono && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-red-500 hover:text-red-600"
                      onClick={() => setIcono(null)}
                    >
                      <Trash2 className="h-4 w-4" /> Quitar
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Ícono cuadrado para la barra de navegación y pestaña del explorador.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: VISTA PREVIA IMPRESOS */}
          <TabsContent value="impresos" className="space-y-4 pt-3">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Encabezado de la Receta Médica
              </p>
              <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                <div
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                  style={{
                    background: `linear-gradient(90deg, ${color} 0%, ${aclararColor(color)} 100%)`,
                  }}
                >
                  {logo ? (
                    <span className="inline-block rounded bg-white px-2 py-1 leading-none">
                      <img src={logo} alt="" className="h-7 max-w-[150px] object-contain" />
                    </span>
                  ) : (
                    <span className="text-sm font-extrabold text-white">
                      {nombreCorto || nombre || "CONSULTORIO"}
                    </span>
                  )}
                  <span className="text-[11px] font-bold tracking-wide text-white">
                    {telefono || "Tel: Sin registrar"}
                  </span>
                </div>
                {direccion && (
                  <div
                    className="px-3 py-1 text-center text-[10px] font-bold text-slate-900"
                    style={{ background: aclararColor(color) }}
                  >
                    {direccion}
                  </div>
                )}
                <div className="p-3 text-slate-800">
                  <p className="text-[10px] tracking-wide" style={{ color }}>
                    PACIENTE:{" "}
                    <span className="border-b border-slate-300 px-12 text-slate-900">&nbsp;</span>
                  </p>
                  <p className="mt-2 font-serif text-base" style={{ color }}>
                    RP/
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Membrete de Presupuestos y Comprobantes
              </p>
              <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
                {logo && (
                  <img
                    src={logo}
                    alt=""
                    className="mx-auto mb-1.5 max-h-12 max-w-[200px] object-contain"
                  />
                )}
                <p className="text-base font-bold" style={{ color }}>
                  {nombre || "CONSULTORIO ODONTOLÓGICO"}
                </p>
                {vistaPreviaContacto && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{vistaPreviaContacto}</p>
                )}
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  COMPROBANTE OFICIAL DE ATENCIÓN
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={actualizar.isPending || procesando !== null}>
            {actualizar.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
