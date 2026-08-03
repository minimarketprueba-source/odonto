import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Combobox, type OpcionCombobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// Radix usa APIs de puntero y scroll que jsdom no trae.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const PROFESIONALES: OpcionCombobox[] = [
  { value: "1", label: "IRALA LÓPEZ, María", detalle: "Medicina General" },
  { value: "2", label: "ACOSTA PAREDES, Ramón", detalle: "Odontología" },
  { value: "3", label: "GONZÁLEZ CENTURIÓN, Ysacio", detalle: "Psicología" },
];

function Prueba({ dentroDeDialogo = false }: { dentroDeDialogo?: boolean }) {
  const [valor, setValor] = useState("");
  const combo = (
    <Combobox
      opciones={PROFESIONALES}
      value={valor}
      onChange={setValor}
      placeholder="Elija el profesional"
      buscarPlaceholder="Buscar..."
    />
  );
  if (!dentroDeDialogo) return combo;
  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Ficha</DialogTitle>
        <DialogDescription>Prueba</DialogDescription>
        {combo}
      </DialogContent>
    </Dialog>
  );
}

describe("Combobox", () => {
  it("filtra ignorando tildes y el orden de las palabras", async () => {
    const usuario = userEvent.setup();
    render(<Prueba />);

    await usuario.click(screen.getByRole("combobox"));
    // Sin tildes y con los apellidos al revés: igual lo tiene que encontrar.
    await usuario.type(screen.getByPlaceholderText("Buscar..."), "lopez irala");

    expect(screen.getByText("IRALA LÓPEZ, María")).toBeInTheDocument();
    expect(screen.queryByText("ACOSTA PAREDES, Ramón")).not.toBeInTheDocument();
  });

  it("también busca por la especialidad", async () => {
    const usuario = userEvent.setup();
    render(<Prueba />);

    await usuario.click(screen.getByRole("combobox"));
    await usuario.type(screen.getByPlaceholderText("Buscar..."), "odonto");

    expect(screen.getByText("ACOSTA PAREDES, Ramón")).toBeInTheDocument();
    expect(screen.queryByText("IRALA LÓPEZ, María")).not.toBeInTheDocument();
  });

  it("avisa cuando no hay coincidencias en vez de quedar en blanco", async () => {
    const usuario = userEvent.setup();
    render(<Prueba />);

    await usuario.click(screen.getByRole("combobox"));
    await usuario.type(screen.getByPlaceholderText("Buscar..."), "kinesiologia");

    expect(screen.getByText("Sin resultados.")).toBeInTheDocument();
  });

  it("al elegir una opción la muestra y cierra la lista", async () => {
    const usuario = userEvent.setup();
    render(<Prueba />);

    await usuario.click(screen.getByRole("combobox"));
    await usuario.click(screen.getByText("GONZÁLEZ CENTURIÓN, Ysacio"));

    expect(screen.getByRole("combobox")).toHaveTextContent("GONZÁLEZ CENTURIÓN, Ysacio");
    expect(screen.queryByPlaceholderText("Buscar...")).not.toBeInTheDocument();
  });

  // El buscador vive dentro de diálogos (salvoconducto, ficha de RAC) y Radix
  // atrapa el foco ahí adentro: si el desplegable no abre, no se puede elegir nada.
  it("funciona dentro de un diálogo", async () => {
    const usuario = userEvent.setup();
    render(<Prueba dentroDeDialogo />);

    await usuario.click(screen.getByRole("combobox"));
    await usuario.type(screen.getByPlaceholderText("Buscar..."), "psico");
    await usuario.click(screen.getByText("GONZÁLEZ CENTURIÓN, Ysacio"));

    expect(screen.getByRole("combobox")).toHaveTextContent("GONZÁLEZ CENTURIÓN, Ysacio");
  });
});
