import { describe, expect, it } from "vitest";
import {
  DESTINOS_AMBULATORIO, TIPOS_ATENCION, destinoAmbulatorio, esDestinoImprimible,
  esTablaFaltante, especialidadPredeterminada, faltaColumnaEspecialidad,
  labelDestinoAmbulatorio, labelTipoAtencion, nombreEspecialidad, traducirErrorAtencion,
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

  it("que falte una COLUMNA no es que falte la tabla", () => {
    // Este es el mensaje textual de PostgREST. Si se lo toma por tabla
    // faltante, la pantalla manda a crear una tabla que ya existe y esconde
    // cuál es la migración que de verdad falta.
    for (const columna of ["especialidad_id", "reposo_hasta", "enfermero_registro"]) {
      expect(esTablaFaltante({
        code: "PGRST204",
        message: `Could not find the '${columna}' column of 'atenciones_enfermeria' in the schema cache`,
      }), columna).toBe(false);
    }
    expect(esTablaFaltante({
      code: "42703",
      message: "column atenciones_enfermeria.especialidad_id does not exist",
    })).toBe(false);
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

/**
 * Cada atención se deriva a un servicio: a la odontóloga no le sirve ver un
 * dolor de cabeza, y a la clínica no le corresponde una muela. El servicio lo
 * elige enfermería al registrar.
 */
describe("servicio que debe revisar la atención", () => {
  const CATALOGO = [
    { id: 3, nombre: "Odontología", activo: true },
    { id: 1, nombre: "Medicina General", activo: true },
    { id: 7, nombre: "Fisioterapia", activo: true },
  ];

  it("el formulario arranca en Medicina General, que es la enorme mayoría", () => {
    expect(especialidadPredeterminada(CATALOGO)?.id).toBe(1);
  });

  it("no toma una especialidad dada de baja", () => {
    const baja = [{ id: 1, nombre: "Medicina General", activo: false }, ...CATALOGO.slice(0, 1)];
    expect(especialidadPredeterminada(baja)).toBeNull();
  });

  it("si el catálogo no tiene Medicina General no inventa ninguna", () => {
    // Antes que elegir mal el servicio (y esconderle la atención al que
    // corresponde), el formulario queda sin elegir y lo pide.
    expect(especialidadPredeterminada([{ id: 3, nombre: "Odontología" }])).toBeNull();
    expect(especialidadPredeterminada([])).toBeNull();
  });

  it("pone nombre al servicio de cada tarjeta", () => {
    expect(nombreEspecialidad(3, CATALOGO)).toBe("Odontología");
    expect(nombreEspecialidad(null, CATALOGO)).toBeNull();
    // Una especialidad borrada del catálogo no rompe la tarjeta.
    expect(nombreEspecialidad(99, CATALOGO)).toBeNull();
  });
});

describe("faltaColumnaEspecialidad", () => {
  it("reconoce el error del insert cuando falta la migración", () => {
    expect(faltaColumnaEspecialidad({
      code: "PGRST204",
      message: "Could not find the 'especialidad_id' column of 'atenciones_enfermeria' in the schema cache",
    })).toBe(true);
  });

  it("reconoce el error del filtro por servicio", () => {
    expect(faltaColumnaEspecialidad({
      code: "42703",
      message: 'column atenciones_enfermeria.especialidad_id does not exist',
    })).toBe(true);
  });

  it("no confunde un servicio inexistente con la columna faltante", () => {
    // Clave foránea: la columna existe, el id no. Eso SÍ es un error real.
    expect(faltaColumnaEspecialidad({
      code: "23503",
      message: 'insert violates foreign key constraint "atenciones_enfermeria_especialidad_id_fkey"',
    })).toBe(false);
    expect(faltaColumnaEspecialidad({ code: "23514", message: "check constraint" })).toBe(false);
    expect(faltaColumnaEspecialidad(null)).toBe(false);
  });

  it("la columna faltante se explica con su archivo SQL", () => {
    const e = traducirErrorAtencion(
      {
        code: "PGRST204",
        message: "Could not find the 'especialidad_id' column of 'atenciones_enfermeria' in the schema cache",
      },
      "No se pudo registrar la atención"
    );
    expect(e.message).toMatch(/SQL_Especialidad_Atencion/);
    expect(e.message).toMatch(/administrador/);
  });
});
