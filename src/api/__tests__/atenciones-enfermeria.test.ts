import { describe, expect, it } from "vitest";
import {
  DESTINOS_AMBULATORIO, TIPOS_ATENCION, destinoAmbulatorio, esDestinoImprimible,
  esTablaFaltante, labelDestinoAmbulatorio, labelTipoAtencion, traducirErrorAtencion,
} from "@/api/atenciones-enfermeria";

/**
 * La atención ambulatoria depende de una tabla que se crea con una migración
 * manual (SQL_Atencion_Ambulatoria.txt). El código tiene que distinguir "la
 * tabla no existe todavía" de un error real, para deshabilitar la sección con
 * un aviso en vez de romper la pantalla de Enfermería o la historia clínica.
 */
describe("esTablaFaltante", () => {
  it("reconoce el error de PostgREST cuando la tabla no está en el esquema", () => {
    expect(esTablaFaltante({
      code: "PGRST205",
      message: "Could not find the table 'public.atenciones_enfermeria' in the schema cache",
    })).toBe(true);
  });

  it("reconoce el error crudo de Postgres", () => {
    expect(esTablaFaltante({
      code: "42P01",
      message: 'relation "public.atenciones_enfermeria" does not exist',
    })).toBe(true);
  });

  it("no confunde otros errores", () => {
    expect(esTablaFaltante({ code: "23514", message: "check constraint violated" })).toBe(false);
    expect(esTablaFaltante({ message: "Failed to fetch" })).toBe(false);
    expect(esTablaFaltante(null)).toBe(false);
    expect(esTablaFaltante(undefined)).toBe(false);
  });

  it("reconoce también el error YA TRADUCIDO (React Query le pasa ese al panel y al retry)", () => {
    // Si esto falla, el cartel de "falta la migración" no aparece nunca y la
    // pantalla muestra "no hay pendientes" con la tabla sin crear.
    const crudo = { code: "PGRST205", message: "Could not find the table 'public.atenciones_enfermeria'" };
    const traducido = traducirErrorAtencion(crudo, "No se pudieron cargar las atenciones");
    expect(esTablaFaltante(traducido as Error & { code?: string })).toBe(true);
  });
});

describe("traducirErrorAtencion", () => {
  it("la tabla faltante se explica con el archivo SQL a aplicar", () => {
    const e = traducirErrorAtencion(
      { code: "PGRST205", message: "Could not find the table 'public.atenciones_enfermeria'" },
      "No se pudo registrar la atención"
    );
    expect(e.message).toMatch(/SQL_Atencion_Ambulatoria/);
    expect(e.message).toMatch(/administrador/);
  });

  it("un signo vital fuera de rango se explica en castellano", () => {
    const e = traducirErrorAtencion(
      { code: "23514", message: 'new row violates check constraint "atenciones_enfermeria_temp_check"' },
      "No se pudo registrar la atención"
    );
    expect(e.message).toMatch(/fuera de rango/);
    expect(e.message).toMatch(/signos vitales/);
  });

  it("un decimal en una columna entera se explica en castellano", () => {
    const e = traducirErrorAtencion(
      { code: "22P02", message: 'invalid input syntax for type integer: "98.5"' },
      "No se pudo registrar la atención"
    );
    expect(e.message).toMatch(/número entero/);
  });

  it("cualquier otro error conserva la acción y el detalle", () => {
    const e = traducirErrorAtencion(
      { message: "conexión rechazada" },
      "No se pudo registrar la atención"
    );
    expect(e.message).toBe("No se pudo registrar la atención: conexión rechazada");
  });
});

describe("catálogos", () => {
  it("los tipos de atención tienen etiqueta legible", () => {
    for (const t of TIPOS_ATENCION) {
      expect(labelTipoAtencion(t.value)).toBe(t.label);
    }
  });

  it("un tipo desconocido no rompe: se muestra tal cual", () => {
    expect(labelTipoAtencion("vacunacion")).toBe("vacunacion");
    expect(labelTipoAtencion(null)).toBe("Atención");
  });

  it("los destinos tienen etiqueta legible", () => {
    for (const d of DESTINOS_AMBULATORIO) {
      expect(labelDestinoAmbulatorio(d.value)).toBe(d.label);
    }
    expect(labelDestinoAmbulatorio(null)).toBe("—");
  });

  it("los valores de catálogo no cambian sin querer (ya hay filas guardadas con ellos)", () => {
    expect(TIPOS_ATENCION.map((t) => t.value)).toEqual([
      "curacion", "medicacion", "control", "primeros_auxilios", "otro",
    ]);
    expect(DESTINOS_AMBULATORIO.map((d) => d.value)).toEqual([
      "alta", "cita_medico", "enfermo_local", "sin_servicio", "reposo_domiciliario",
      "observacion", "derivado",
    ]);
  });
});

describe("destinos con reposo provisorio (sin médico de guardia)", () => {
  it("los destinos de reposo piden días y los demás no", () => {
    expect(destinoAmbulatorio("enfermo_local")?.pideDias).toBe(true);
    expect(destinoAmbulatorio("sin_servicio")?.pideDias).toBe(true);
    expect(destinoAmbulatorio("reposo_domiciliario")?.pideDias).toBe(true);
    expect(destinoAmbulatorio("alta")?.pideDias).toBe(false);
    expect(destinoAmbulatorio("observacion")?.pideDias).toBe(false);
  });

  it("solo la observación pide cama (interna de verdad)", () => {
    for (const d of DESTINOS_AMBULATORIO) {
      expect(d.pideCama, d.value).toBe(d.value === "observacion");
    }
  });

  it("se imprime constancia para reposos y observación, no para el resto", () => {
    expect(esDestinoImprimible("enfermo_local")).toBe(true);
    expect(esDestinoImprimible("sin_servicio")).toBe(true);
    expect(esDestinoImprimible("reposo_domiciliario")).toBe(true);
    expect(esDestinoImprimible("observacion")).toBe(true);
    expect(esDestinoImprimible("alta")).toBe(false);
    expect(esDestinoImprimible("cita_medico")).toBe(false);
    expect(esDestinoImprimible("derivado")).toBe(false);
    expect(esDestinoImprimible(null)).toBe(false);
  });

  it("la columna nueva faltante se explica con su archivo SQL", () => {
    const e = traducirErrorAtencion(
      { code: "PGRST204", message: "Could not find the 'reposo_hasta' column of 'atenciones_enfermeria'" },
      "No se pudo registrar la atención"
    );
    expect(e.message).toMatch(/SQL_Atencion_Reposo/);
  });
});
