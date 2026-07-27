import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MedicoSelector } from "@/components/consultas/medico-selector";

// Radix usa APIs de puntero y scroll que jsdom no trae.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const MEDICOS = [
  { id: 1, nombres: "María", apellidos: "IRALA LÓPEZ", activo: true, especialidad: { id: 1, nombre: "Medicina General", color: null } },
  { id: 2, nombres: "Ramón", apellidos: "ACOSTA PAREDES", activo: true, especialidad: { id: 2, nombre: "Odontología", color: null } },
];

const estado = vi.hoisted(() => ({ miMedico: null as unknown }));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: { id: "cuenta-1" } }),
}));

vi.mock("@/api/citas", () => ({
  useMedicosActivos: () => ({ data: MEDICOS }),
  useMiMedico: () => ({ data: estado.miMedico, isLoading: false }),
}));

function Prueba({ inicial = "", disabled = false }: { inicial?: string; disabled?: boolean }) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <MedicoSelector value={valor} onChange={setValor} disabled={disabled} />
      <output data-testid="valor">{valor}</output>
    </>
  );
}

beforeEach(() => {
  estado.miMedico = null;
});

describe("MedicoSelector", () => {
  it("una cuenta de profesional queda fija en su propio nombre, sin poder elegir otro", () => {
    estado.miMedico = MEDICOS[0];
    render(<Prueba />);

    expect(screen.getByTestId("medico-fijo")).toHaveTextContent("IRALA LÓPEZ, María");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByTestId("valor")).toHaveTextContent("1");
  });

  // El caso que motivó el cambio: la consulta abierta desde una cita de otro
  // profesional traía precargado a ese otro y se podía firmar a su nombre.
  it("pisa el médico precargado de otro profesional", () => {
    estado.miMedico = MEDICOS[0];
    render(<Prueba inicial="2" />);

    expect(screen.getByTestId("valor")).toHaveTextContent("1");
    expect(screen.getByTestId("medico-fijo")).toHaveTextContent("IRALA LÓPEZ, María");
  });

  it("una cuenta sin ficha propia (enfermería, admin) sí elige de la lista", async () => {
    const usuario = userEvent.setup();
    render(<Prueba />);

    await usuario.click(screen.getByRole("combobox"));
    await usuario.click(screen.getByText("ACOSTA PAREDES, Ramón"));

    expect(screen.getByTestId("valor")).toHaveTextContent("2");
  });

  // Una ficha ya cerrada se mira, no se firma: tiene que seguir mostrando a quien
  // la atendió, no a quien la está abriendo.
  it("en solo lectura no reemplaza al profesional que firmó", () => {
    estado.miMedico = MEDICOS[0];
    render(<Prueba inicial="2" disabled />);

    expect(screen.getByTestId("valor")).toHaveTextContent("2");
    expect(screen.getByRole("combobox")).toHaveTextContent("ACOSTA PAREDES, Ramón");
  });
});
