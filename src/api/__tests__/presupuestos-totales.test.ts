import { describe, it, expect, vi, beforeEach } from "vitest";

// Doble de Supabase: guarda lo que se lee de cada tabla y lo que se actualiza.
const DATOS: Record<string, any[]> = {};
const ACTUALIZACIONES: { tabla: string; cambios: any }[] = [];
// Error que devuelve la LECTURA de una tabla (simula un corte de conexión).
const ERRORES_LECTURA: Record<string, any> = {};

vi.mock("sonner", () => ({ toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() } }));

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
      cambiosUpdate
        ? resolve({ data: null, error: null })
        : resolve({
            data: ERRORES_LECTURA[tabla] ? null : DATOS[tabla] ?? [],
            error: ERRORES_LECTURA[tabla] ?? null,
          });
    return api;
  };
  return { supabase: { from: constructor } };
});

import { recalcularTotalesPresupuesto, addPagoPresupuesto } from "@/api/odontologia";
import { toast } from "sonner";

describe("cuentas del plan de tratamiento", () => {
  beforeEach(() => {
    for (const k of Object.keys(DATOS)) delete DATOS[k];
    for (const k of Object.keys(ERRORES_LECTURA)) delete ERRORES_LECTURA[k];
    ACTUALIZACIONES.length = 0;
    vi.mocked(toast.warning).mockClear();
  });

  it("si no puede leer los pagos, NO graba ceros encima del plan", async () => {
    // Antes el error de lectura se ignoraba, la lista llegaba vacía y el plan
    // quedaba con total 0 y saldo 0.
    DATOS.presupuesto_detalles = [{ costo: 1000000, descuento: 0 }];
    ERRORES_LECTURA.pagos_presupuesto = { code: "08006", message: "connection failure" };

    await expect(recalcularTotalesPresupuesto("p1")).rejects.toThrow();
    expect(ACTUALIZACIONES.filter((a) => a.tabla === "presupuestos")).toHaveLength(0);
  });

  it("si no puede leer los procedimientos, tampoco graba nada", async () => {
    ERRORES_LECTURA.presupuesto_detalles = { code: "08006", message: "connection failure" };
    DATOS.pagos_presupuesto = [{ monto: 250000 }];

    await expect(recalcularTotalesPresupuesto("p1")).rejects.toThrow();
    expect(ACTUALIZACIONES.filter((a) => a.tabla === "presupuestos")).toHaveLength(0);
  });

  it("un pago ya guardado no se informa como error aunque falle el recálculo", async () => {
    // Si decía "error", lo natural era apretar de nuevo y el pago quedaba doble.
    DATOS.pagos_presupuesto = [{ id: 7, presupuesto_id: 3, monto: 250000 }];
    ERRORES_LECTURA.presupuesto_detalles = { code: "08006", message: "connection failure" };

    const pago = await addPagoPresupuesto({ presupuesto_id: 3, monto: 250000 });

    expect(pago.id).toBe(7);
    expect(toast.warning).toHaveBeenCalledTimes(1);
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
