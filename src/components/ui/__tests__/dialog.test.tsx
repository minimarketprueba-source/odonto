import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

// Los avisos de SweetAlert2 se dibujan en el `body`, fuera del árbol del
// diálogo. Radix tomaba el clic en «Aceptar» como un clic afuera y cerraba el
// formulario entero: enfermería leía "revise los signos vitales" y perdía todo
// lo cargado. Reportado el 2026-07-31 en la atención ambulatoria.
describe("un aviso encima no cierra el diálogo", () => {
  const abrirConAviso = () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Registrar atención</DialogTitle>
          <DialogDescription>Formulario con datos cargados</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    return onOpenChange;
  };

  /** Radix engancha el listener de "clic afuera" en un setTimeout(0). */
  const dejarQueRadixEscuche = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  const montarAviso = () => {
    const contenedor = document.createElement("div");
    contenedor.className = "swal2-container";
    const aceptar = document.createElement("button");
    aceptar.className = "swal2-confirm";
    aceptar.textContent = "Aceptar";
    contenedor.appendChild(aceptar);
    document.body.appendChild(contenedor);
    return { contenedor, aceptar };
  };

  it("tocar «Aceptar» en el aviso deja el formulario abierto", async () => {
    const onOpenChange = abrirConAviso();
    const { contenedor, aceptar } = montarAviso();
    await dejarQueRadixEscuche();

    fireEvent.pointerDown(aceptar);

    expect(onOpenChange).not.toHaveBeenCalled();
    contenedor.remove();
  });

  it("Escape con un aviso abierto cierra el aviso, no el formulario", async () => {
    const onOpenChange = abrirConAviso();
    const { contenedor } = montarAviso();
    await dejarQueRadixEscuche();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onOpenChange).not.toHaveBeenCalled();
    contenedor.remove();
  });

  it("sin aviso, un clic realmente afuera sigue cerrando", async () => {
    const onOpenChange = abrirConAviso();
    const afuera = document.createElement("div");
    document.body.appendChild(afuera);
    await dejarQueRadixEscuche();

    fireEvent.pointerDown(afuera);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    afuera.remove();
  });
});
