import { describe, it, expect, vi, beforeEach } from "vitest";

// Doble de Supabase: guarda lo que se lee de cada tabla y lo que se actualiza.
const DATOS: Record<string, any[]> = {};
const ACTUALIZACIONES: { tabla: string; cambios: any }[] = [];

vi.mock("@/lib/supabase", () => {
  const constructor = (tabla: string) => {
    const api: any = {};
    let cambiosUpdate: any = null;

    api.select = () => api;
    api.eq = () => api;
    api.maybeSingle = () => Promise.resolve({ data: (DATOS[tabla] ?? [])[0] ?? null, error: null });
    api.single = () => Promise.resolve({ data: (DATOS[tabla] ?? [])[0] ?? null, error: null });
    api.insert = () => api;
    api.delete = () => api;
    api.update = (cambios: any) => {
      cambiosUpdate = cambios;
      ACTUALIZACIONES.push({ tabla, cambios });
      return api;
    };
    api.then = (resolve: any) =>
      resolve({ data: cambiosUpdate ? null : DATOS[tabla] ?? [], error: null });
    return api;
  };
  return { supabase: { from: constructor } };
});

import { recalcularTotalesPresupuesto } from "@/api/odontologia";

describe("cuentas del plan de tratamiento", () => {
  beforeEach(() => {
    for (const k of Object.keys(DATOS)) delete DATOS[k];
    ACTUALIZACIONES.length = 0;
  });

  it("descuenta el pago del saldo", async () => {
    // El caso que se reportó: un pago cargado y "Total Abonado" en 0 ₲, porque
    // nadie recalculaba las columnas del presupuesto.
    DATOS.presupuesto_detalles = [{ costo: 1000000, descuento: 0 }];
    DATOS.pagos_presupuesto = [{ monto: 250000 }];

    await recalcularTotalesPresupuesto("p1");

    const update = ACTUALIZACIONES.find((a) => a.tabla === "presupuestos");
    expect(update?.cambios).toEqual({ total: 1000000, saldo_pendiente: 750000 });
  });

  it("resta los descuentos del total", async () => {
    DATOS.presupuesto_detalles = [
      { costo: 500000, descuento: 100000 },
      { costo: 300000, descuento: 0 },
    ];
    DATOS.pagos_presupuesto = [];

    await recalcularTotalesPresupuesto("p1");

    const update = ACTUALIZACIONES.find((a) => a.tabla === "presupuestos");
    expect(update?.cambios.total).toBe(700000);
    expect(update?.cambios.saldo_pendiente).toBe(700000);
  });

  it("suma varios pagos parciales", async () => {
    DATOS.presupuesto_detalles = [{ costo: 1000000, descuento: 0 }];
    DATOS.pagos_presupuesto = [{ monto: 300000 }, { monto: 200000 }, { monto: 100000 }];

    await recalcularTotalesPresupuesto("p1");

    expect(ACTUALIZACIONES[0].cambios.saldo_pendiente).toBe(400000);
  });

  it("nunca deja el saldo en negativo", async () => {
    // Una seña entregada antes de cargar el plan: el saldo es 0, no -250.000,
    // que se leería como una deuda al revés.
    DATOS.presupuesto_detalles = [];
    DATOS.pagos_presupuesto = [{ monto: 250000 }];

    await recalcularTotalesPresupuesto("p1");

    expect(ACTUALIZACIONES[0].cambios.saldo_pendiente).toBe(0);
    expect(ACTUALIZACIONES[0].cambios.total).toBe(0);
  });

  it("un plan sin nada cargado queda en cero", async () => {
    DATOS.presupuesto_detalles = [];
    DATOS.pagos_presupuesto = [];

    await recalcularTotalesPresupuesto("p1");

    expect(ACTUALIZACIONES[0].cambios).toEqual({ total: 0, saldo_pendiente: 0 });
  });

  it("no se rompe con importes vacíos o mal cargados", async () => {
    DATOS.presupuesto_detalles = [
      { costo: null, descuento: null },
      { costo: "150000", descuento: undefined },
    ];
    DATOS.pagos_presupuesto = [{ monto: null }, { monto: "50000" }];

    await recalcularTotalesPresupuesto("p1");

    // Un null suelto no debe convertir todo el total en NaN, que en pantalla
    // saldría como "NaN ₲".
    expect(ACTUALIZACIONES[0].cambios.total).toBe(150000);
    expect(ACTUALIZACIONES[0].cambios.saldo_pendiente).toBe(100000);
  });

  it("recalcula desde cero y no acumula sobre lo anterior", async () => {
    DATOS.presupuesto_detalles = [{ costo: 100, descuento: 0 }];
    DATOS.pagos_presupuesto = [{ monto: 40 }];

    await recalcularTotalesPresupuesto("p1");
    await recalcularTotalesPresupuesto("p1");

    // Dos recálculos seguidos tienen que dar lo mismo: si sumara sobre lo
    // guardado, el saldo se iría desfasando con cada operación.
    expect(ACTUALIZACIONES[0].cambios).toEqual(ACTUALIZACIONES[1].cambios);
    expect(ACTUALIZACIONES[1].cambios.saldo_pendiente).toBe(60);
  });
});
