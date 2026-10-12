import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// Pantalla de Liquidaciones. Hasta el 2026-10-12 NUNCA pudo guardar: convertía
// el id del odontólogo (un UUID) con Number(), daba NaN, viajaba como null y la
// base lo rechazaba. Y "Imprimir recibo" imprimía la pantalla entera.

const UUID_MEDICO = "8f14e45f-ceea-467a-9575-0a1b2c3d4e5f";
const crear = vi.fn().mockResolvedValue({});
const imprimir = vi.fn();

vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/context/auth-context", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/api/citas", () => ({
  useMedicosActivos: () => ({
    data: [{ id: UUID_MEDICO, nombres: "Ana", apellidos: "Benítez" }],
  }),
  fechaHoyISO: () => "2026-10-12",
}));
vi.mock("@/api/liquidaciones", () => ({
  useLiquidaciones: () => ({
    isLoading: false,
    data: [
      {
        id: 5,
        medico_id: UUID_MEDICO,
        fecha_inicio: "2026-09-01",
        fecha_fin: "2026-09-30",
        total_produccion: 5000000,
        comision_porcentaje: 40,
        total_pagar: 2000000,
        estado: "borrador",
        created_at: "2026-10-01T12:00:00Z",
        medico: { nombres: "Ana", apellidos: "Benítez", numero_colegiatura: "1234" },
      },
    ],
  }),
  useCreateLiquidacion: () => ({ mutateAsync: crear, isPending: false }),
  useMarcarLiquidacionPagada: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/lib/imprimir", () => ({ imprimirReciboLiquidacion: (d: unknown) => imprimir(d) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
// El Select de Radix no se puede manejar en jsdom; uno nativo hace lo mismo.
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: ReactNode }) => (
    <select aria-label="odontologo" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

import Liquidaciones from "@/pages/Liquidaciones";

describe("Liquidaciones", () => {
  beforeEach(() => {
    crear.mockClear();
    imprimir.mockClear();
  });

  it("guarda con el id del odontólogo tal cual (UUID), no como número", async () => {
    render(<Liquidaciones />);
    fireEvent.click(screen.getByRole("button", { name: /generar liquidación/i }));

    fireEvent.change(screen.getByLabelText("odontologo"), { target: { value: UUID_MEDICO } });
    const [desde, hasta] = Array.from(document.querySelectorAll('input[type="date"]'));
    fireEvent.change(desde, { target: { value: "2026-09-01" } });
    fireEvent.change(hasta, { target: { value: "2026-09-30" } });
    fireEvent.change(screen.getByPlaceholderText("Ej: 5000000"), { target: { value: "5000000" } });

    fireEvent.click(screen.getByRole("button", { name: /guardar borrador/i }));

    await waitFor(() => expect(crear).toHaveBeenCalledTimes(1));
    expect(crear.mock.calls[0][0]).toMatchObject({
      medico_id: UUID_MEDICO,
      total_produccion: 5000000,
      comision_porcentaje: 40,
    });
  });

  it("no guarda un período al revés", async () => {
    render(<Liquidaciones />);
    fireEvent.click(screen.getByRole("button", { name: /generar liquidación/i }));

    fireEvent.change(screen.getByLabelText("odontologo"), { target: { value: UUID_MEDICO } });
    const [desde, hasta] = Array.from(document.querySelectorAll('input[type="date"]'));
    fireEvent.change(desde, { target: { value: "2026-09-30" } });
    fireEvent.change(hasta, { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByPlaceholderText("Ej: 5000000"), { target: { value: "5000000" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar borrador/i }));

    await new Promise((r) => setTimeout(r, 0));
    expect(crear).not.toHaveBeenCalled();
  });

  it("'Imprimir recibo' arma el recibo de ESA liquidación, no imprime la pantalla", () => {
    const printPantalla = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<Liquidaciones />);

    fireEvent.click(screen.getByTitle("Imprimir Recibo"));

    expect(printPantalla).not.toHaveBeenCalled();
    expect(imprimir).toHaveBeenCalledWith(
      expect.objectContaining({
        numero: 5,
        profesional: "Dr(a). Benítez, Ana",
        registroProfesional: "1234",
        desde: "01/09/2026",
        hasta: "30/09/2026",
        totalPagar: 2000000,
        estado: "borrador",
      })
    );
    printPantalla.mockRestore();
  });
});
