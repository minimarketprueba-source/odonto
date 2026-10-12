import { Copy, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCodigoAcceso, useEmpresa } from "@/api/empresa";
import { enlaceDeIngreso } from "@/lib/codigo-acceso";

/**
 * El enlace de ingreso propio del consultorio. Quien entra por acá ve el logo
 * del consultorio en la pantalla de ingreso desde el primer momento, en
 * cualquier celular o computadora, y el equipo lo recuerda para la próxima.
 * Sin él, un equipo nuevo muestra la pantalla neutra (con varias empresas en
 * el sistema, antes de entrar no se sabe de cuál es la persona).
 */
export function EnlaceIngreso() {
  const empresa = useEmpresa();
  const { data: codigo, isLoading } = useCodigoAcceso();

  if (isLoading) return null;
  if (!codigo) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        El enlace de ingreso propio del consultorio todavía no está disponible: falta aplicar{" "}
        <code>supabase/migrations/marca_publica.sql</code> en Supabase.
      </p>
    );
  }

  const enlace = enlaceDeIngreso(codigo);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar. Mantenga apretado el enlace para copiarlo.");
    }
  };
  const mensaje = encodeURIComponent(
    `Para entrar al sistema de ${empresa.nombre_corto || empresa.nombre}, usá este enlace ` +
      `(guardalo en favoritos o en la pantalla de inicio del celular):\n${enlace}`
  );

  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Enlace de ingreso del consultorio</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Páselo a todo el personal. Quien entre por este enlace ve el logo del consultorio en la
        pantalla de ingreso desde el primer momento, en cualquier celular o computadora.
      </p>
      <p className="break-all rounded-md border bg-background px-3 py-2 font-mono text-sm">{enlace}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={copiar}>
          <Copy className="h-4 w-4" /> Copiar enlace
        </Button>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href={`https://wa.me/?text=${mensaje}`} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
