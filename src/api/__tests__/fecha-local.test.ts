import { describe, it, expect, afterEach, vi } from "vitest";
import { fechaLocalISO, fechaHoyISO } from "@/api/citas";

/**
 * Este archivo existe por un error que solo se nota de noche.
 *
 * `new Date().toISOString().slice(0, 10)` da el día en hora de Londres.
 * Paraguay está 3 o 4 horas atrás, así que a partir de las 20 o 21 —hora de
 * trabajo normal en un consultorio— devolvía el día SIGUIENTE. Una receta, un
 * pago o un periodontograma cargados a las 21:30 quedaban fechados mañana.
 *
 * Estaba en cinco lugares: la receta, el periodontograma, el pago del
 * presupuesto, la imagen clínica y el rango semanal de Reportes.
 *
 * Los relojes se fijan con componentes LOCALES (`new Date(año, mes, día, hora)`)
 * y no con un texto tipo "...T21:30:00-03:00": así estas pruebas dan lo mismo
 * en la máquina del consultorio que en cualquier otra.
 */

afterEach(() => {
  vi.useRealTimers();
});

/** Fija el reloj en una hora del calendario local. */
function reloj(anio: number, mes1a12: number, dia: number, hora: number, min = 0) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(anio, mes1a12 - 1, dia, hora, min));
}

describe("fecha local en formato yyyy-mm-dd", () => {
  it("da el día del calendario que uno tiene en la pared", () => {
    expect(fechaLocalISO(new Date(2026, 7, 6, 21, 30))).toBe("2026-08-06");
  });

  it("a las 21:30 NO devuelve el día siguiente", () => {
    reloj(2026, 8, 6, 21, 30);
    expect(fechaHoyISO()).toBe("2026-08-06");
  });

  it("tampoco a las 23:59", () => {
    reloj(2026, 8, 6, 23, 59);
    expect(fechaHoyISO()).toBe("2026-08-06");
  });

  it("funciona igual de mañana", () => {
    reloj(2026, 8, 6, 9, 0);
    expect(fechaHoyISO()).toBe("2026-08-06");
  });

  it("rellena con ceros el mes y el día", () => {
    // "2026-1-5" no lo entiende Postgres como fecha.
    expect(fechaLocalISO(new Date(2026, 0, 5, 10, 0))).toBe("2026-01-05");
  });

  it("cruza bien el fin de año", () => {
    expect(fechaLocalISO(new Date(2026, 11, 31, 22, 0))).toBe("2026-12-31");
    expect(fechaLocalISO(new Date(2027, 0, 1, 1, 0))).toBe("2027-01-01");
  });

  it("así se veía el error: de noche, el día en UTC ya es otro", () => {
    reloj(2026, 8, 6, 23, 0);
    const enUTC = new Date().toISOString().slice(0, 10);
    // Solo pasa en husos al oeste de Londres, que es donde está Paraguay. En
    // otra zona la comparación no tendría sentido, así que se saltea.
    const horasDetras = -new Date().getTimezoneOffset() / 60;
    if (horasDetras <= -1) {
      expect(enUTC).not.toBe(fechaHoyISO());
      expect(enUTC).toBe("2026-08-07");
    }
    expect(fechaHoyISO()).toBe("2026-08-06");
  });
});
