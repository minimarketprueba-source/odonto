import { describe, it, expect, vi, afterEach } from "vitest";
import { imprimirReciboLiquidacion, type DatosReciboLiquidacion } from "@/lib/imprimir";

const BASE: DatosReciboLiquidacion = {
  numero: 5,
  profesional: "Dr(a). Benítez, Ana",
  registroProfesional: "1234",
  desde: "01/09/2026",
  hasta: "30/09/2026",
  produccion: 5000000,
  comisionPorcentaje: 40,
  totalPagar: 2000000,
  estado: "pagado",
  fechaEmision: "12/10/2026",
};

function textoDelRecibo(): string {
  const iframe = document.getElementById("anp-print-iframe") as HTMLIFrameElement | null;
  return iframe?.contentDocument?.body.textContent ?? "";
}

describe("recibo de liquidación", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById("anp-print-iframe")?.remove();
  });

  it("lleva profesional, período, comisión y total", () => {
    vi.useFakeTimers(); // que no llegue a llamar a print(), que jsdom no tiene
    imprimirReciboLiquidacion(BASE);
    const texto = textoDelRecibo();

    expect(texto).toContain("RECIBO DE HONORARIOS PROFESIONALES");
    expect(texto).toContain("Benítez, Ana");
    expect(texto).toContain("1234");
    expect(texto).toContain("01/09/2026");
    expect(texto).toContain("30/09/2026");
    expect(texto).toContain("40%");
    expect(texto).toContain("2.000.000 ₲");
    expect(texto).not.toContain("BORRADOR");
  });

  it("un borrador sale marcado como tal", () => {
    vi.useFakeTimers();
    imprimirReciboLiquidacion({ ...BASE, estado: "borrador" });
    expect(textoDelRecibo()).toContain("BORRADOR");
  });
});
