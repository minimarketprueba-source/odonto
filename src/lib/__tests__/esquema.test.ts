import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  esTablaInexistente,
  esColumnaInexistente,
  faltaEnElEsquema,
  avisarEsquemaFaltante,
  _resetAvisosEsquema,
} from "@/lib/esquema";

describe("deteccion de esquema faltante", () => {
  beforeEach(() => _resetAvisosEsquema());
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reconoce una tabla que no existe", () => {
    // El error real de PostgREST cuando la tabla no esta en el cache.
    const error = {
      code: "PGRST205",
      message: "Could not find the table 'public.notificaciones' in the schema cache",
    };
    expect(esTablaInexistente(error)).toBe(true);
    expect(esColumnaInexistente(error)).toBe(false);
  });

  it("reconoce el undefined_table de Postgres", () => {
    expect(esTablaInexistente({ code: "42P01", message: 'relation "x" does not exist' })).toBe(true);
  });

  it("NO confunde una columna faltante con una tabla faltante", () => {
    // La trampa: PGRST204 (columna) y PGRST205 (tabla) difieren en un digito.
    // Tomarlo por tabla manda a crear algo que ya existe y esconde la
    // migracion que de verdad falta.
    const error = {
      code: "PGRST204",
      message: "Could not find the 'numero_colegiatura' column of 'medicos' in the schema cache",
    };
    expect(esTablaInexistente(error)).toBe(false);
    expect(esColumnaInexistente(error)).toBe(true);
    expect(faltaEnElEsquema(error)).toBe(true);
  });

  it("reconoce el undefined_column de Postgres", () => {
    const error = { code: "42703", message: "column ausencias_medicos.desde does not exist" };
    expect(esColumnaInexistente(error)).toBe(true);
    expect(esTablaInexistente(error)).toBe(false);
  });

  it("no toma por esquema faltante un error comun", () => {
    for (const error of [
      { code: "23505", message: "duplicate key value violates unique constraint" },
      { code: "42501", message: "new row violates row-level security policy" },
      { message: "Failed to fetch" },
      null,
      undefined,
    ]) {
      expect(faltaEnElEsquema(error)).toBe(false);
      expect(avisarEsquemaFaltante(error, "prueba")).toBe(false);
    }
  });

  it("avisa una sola vez por problema, aunque se consulte muchas veces", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = { code: "PGRST205", message: "Could not find the table 'public.x'" };

    for (let i = 0; i < 20; i++) {
      expect(avisarEsquemaFaltante(error, "pantalla que refresca sola")).toBe(true);
    }

    // Una pantalla con refetch automatico escribia el mismo error decenas de
    // veces y tapaba todo lo demas en la consola.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("falta una tabla");
    expect(warn.mock.calls[0][0]).toContain("esquema_completo.sql");
  });

  it("distingue problemas distintos aunque compartan contexto", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    avisarEsquemaFaltante({ code: "PGRST205", message: "tabla a" }, "Reportes");
    avisarEsquemaFaltante({ code: "42703", message: "columna b" }, "Reportes");
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[1][0]).toContain("falta una columna");
  });
});
