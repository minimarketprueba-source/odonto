import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { esErrorDeVersionNueva, recargarUnaVez } from "@/lib/recarga-por-version";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

describe("recargar cuando hay una versión nueva", () => {
  beforeEach(() => sessionStorage.clear());

  it("reconoce los errores de archivo de pantalla que ya no existe", () => {
    // Chrome, Firefox y Safari lo dicen distinto.
    expect(esErrorDeVersionNueva(new TypeError("Failed to fetch dynamically imported module: https://x/assets/Reportes-abc.js"))).toBe(true);
    expect(esErrorDeVersionNueva(new TypeError("error loading dynamically imported module"))).toBe(true);
    expect(esErrorDeVersionNueva(new TypeError("Importing a module script failed."))).toBe(true);
  });

  it("no confunde otros errores con una versión nueva", () => {
    expect(esErrorDeVersionNueva(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(esErrorDeVersionNueva(null)).toBe(false);
  });

  it("recarga una sola vez por minuto, para no quedar en un bucle", () => {
    const recargar = vi.fn();
    expect(recargarUnaVez(1_000_000, recargar)).toBe(true);
    expect(recargarUnaVez(1_030_000, recargar)).toBe(false); // 30 s después
    expect(recargarUnaVez(1_061_000, recargar)).toBe(true); // pasado el minuto
    expect(recargar).toHaveBeenCalledTimes(2);
  });
});

function Rompe(): JSX.Element {
  throw new Error("Cannot read properties of undefined (reading 'nombre')");
}

describe("ErrorBoundary", () => {
  it("una pantalla que falla muestra un aviso con Recargar, no la página en blanco", () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Rompe />
      </ErrorBoundary>
    );
    expect(screen.getByText("No se pudo mostrar esta pantalla")).toBeDefined();
    expect(screen.getByRole("button", { name: /recargar/i })).toBeDefined();
    expect(screen.getByText(/reading 'nombre'/)).toBeDefined();
    consola.mockRestore();
  });

  it("sin error, muestra la pantalla normal", () => {
    render(
      <ErrorBoundary>
        <p>Agenda del día</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("Agenda del día")).toBeDefined();
  });
});
