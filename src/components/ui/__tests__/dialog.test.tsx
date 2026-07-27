import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// Este error volvió tres veces (salvoconducto, receta, ficha de RAC): el
// componente base traía `sm:max-w-lg`, tailwind-merge no lo ve en conflicto con
// un `max-w-4xl` sin prefijo, y la media query ganaba siempre. Resultado: todos
// los diálogos se mostraban a 512px y el contenido quedaba encimado.
describe("ancho del diálogo", () => {
  const abrir = (clase: string) =>
    render(
      <Dialog open>
        <DialogContent className={clase}>
          <DialogTitle>Prueba</DialogTitle>
          <DialogDescription>Contenido de prueba</DialogDescription>
        </DialogContent>
      </Dialog>
    );

  it("respeta el ancho que pide quien lo usa", () => {
    abrir("max-w-4xl");
    const dialogo = screen.getByRole("dialog");
    expect(dialogo.className).toContain("max-w-4xl");
    expect(dialogo.className).not.toContain("max-w-lg");
  });

  it("no vuelve a traer un max-w con prefijo de pantalla en el componente base", () => {
    abrir("max-w-2xl");
    const dialogo = screen.getByRole("dialog");
    // Un `sm:max-w-*` propio del base pisaría en silencio a todos los que llaman.
    expect(dialogo.className).not.toMatch(/\bsm:max-w-/);
    expect(dialogo.className).toContain("max-w-2xl");
  });

  it("sin clase propia, mantiene el ancho por defecto", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Prueba</DialogTitle>
          <DialogDescription>Contenido de prueba</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole("dialog").className).toContain("max-w-lg");
  });

  it("deja margen en pantallas chicas", () => {
    abrir("max-w-4xl");
    expect(screen.getByRole("dialog").className).toContain("w-[calc(100%-2rem)]");
  });
});
