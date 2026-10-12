import { describe, it, expect } from "vitest";
import { controlarPago, controlarProcedimiento } from "@/lib/cobros";

describe("controlarProcedimiento", () => {
  it("acepta un importe con descuento menor", () => {
    expect(controlarProcedimiento(150000, 20000).tipo).toBe("ok");
  });

  it("acepta un descuento igual al importe (procedimiento sin cargo)", () => {
    expect(controlarProcedimiento(150000, 150000).tipo).toBe("ok");
  });

  it("rechaza un descuento mayor que el importe", () => {
    // Dejaría el procedimiento en negativo y le restaría al total del plan.
    const r = controlarProcedimiento(150000, 200000);
    expect(r.tipo).toBe("error");
    if (r.tipo === "error") expect(r.mensaje).toContain("200.000");
  });

  it("rechaza importes que no son números", () => {
    expect(controlarProcedimiento(Number.NaN, 0).tipo).toBe("error");
  });
});

describe("controlarPago", () => {
  it("acepta un pago parcial", () => {
    expect(controlarPago(250000, 1000000, 1000000).tipo).toBe("ok");
  });

  it("acepta pagar exactamente el saldo", () => {
    expect(controlarPago(750000, 750000, 1000000).tipo).toBe("ok");
  });

  it("rechaza un pago de 0", () => {
    expect(controlarPago(0, 750000, 1000000).tipo).toBe("error");
  });

  it("pide confirmar un pago mayor al saldo, diciendo cuánto sobra", () => {
    // El caso típico es un cero de más: 2.500.000 en vez de 250.000.
    const r = controlarPago(2500000, 750000, 1000000);
    expect(r.tipo).toBe("confirmar");
    if (r.tipo === "confirmar") expect(r.mensaje).toContain("1.750.000");
  });

  it("pide confirmar un pago sobre un plan ya saldado", () => {
    const r = controlarPago(100000, 0, 1000000);
    expect(r.tipo).toBe("confirmar");
    if (r.tipo === "confirmar") expect(r.mensaje).toContain("ya está pagado");
  });

  it("una seña antes de cargar el plan se puede registrar, confirmando", () => {
    const r = controlarPago(200000, 0, 0);
    expect(r.tipo).toBe("confirmar");
    if (r.tipo === "confirmar") expect(r.mensaje).toContain("seña");
  });
});
