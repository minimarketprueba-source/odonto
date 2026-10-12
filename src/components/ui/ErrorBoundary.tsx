import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { esErrorDeVersionNueva, recargarUnaVez } from "@/lib/recarga-por-version";
import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Atrapa cualquier error al dibujar una pantalla. Antes no había ninguno en
 * toda la app: si algo fallaba, la página quedaba en blanco, sin aviso y sin
 * forma de salir salvo cerrar y abrir el navegador (en el celular, ni eso era
 * obvio).
 *
 * Si el error es porque se publicó una versión nueva mientras la app estaba
 * abierta, recarga sola. Si no, muestra un aviso con un botón para recargar.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("Error al mostrar la pantalla:", error, info.componentStack);
    if (esErrorDeVersionNueva(error)) recargarUnaVez();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const versionNueva = esErrorDeVersionNueva(error);
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-bold">
            {versionNueva ? "Hay una versión nueva del sistema" : "No se pudo mostrar esta pantalla"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {versionNueva
              ? "Recargue la página para seguir trabajando. Lo que ya estaba guardado no se pierde."
              : "Recargue la página. Si vuelve a pasar, avise indicando qué estaba haciendo."}
          </p>
          {!versionNueva && (
            <p className="break-words rounded bg-muted p-2 text-left font-mono text-xs text-muted-foreground">
              {error.message || "Error desconocido"}
            </p>
          )}
          <Button className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> Recargar
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
