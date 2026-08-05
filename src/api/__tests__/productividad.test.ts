import { describe, it, expect, vi, beforeEach } from "vitest";

// Doble de Supabase: cada tabla devuelve lo que se le cargue en RESPUESTAS.
const RESPUESTAS: Record<string, { data: any[]; error?: any }> = {};
const CONSULTAS: { tabla: string; filtros: string[] }[] = [];

vi.mock("@/lib/supabase", () => {
  const encadenable = (tabla: string) => {
    const registro = { tabla, filtros: [] as string[] };
    CONSULTAS.push(registro);
    const api: any = {};
    for (const m of ["select", "gte", "lt", "lte", "eq", "order", "limit"]) {
      api[m] = (...args: any[]) => {
        if (m !== "select") registro.filtros.push(`${m}:${args.join(",")}`);
        return api;
      };
    }
    // Al await-earlo devuelve la respuesta cargada para esa tabla.
    api.then = (resolve: any) => resolve(RESPUESTAS[tabla] ?? { data: [], error: null });
    return api;
  };
  return { supabase: { from: (tabla: string) => encadenable(tabla) } };
});

import { fetchProduccionDental, formatSexo, formatJerarquia } from "@/api/productividad";

const FILTROS_BASE = { fechaDesde: "2026-08-01", fechaHasta: "2026-08-31" };

function evolucion(over: any = {}) {
  return {
    id: "e1",
    fecha_registro: "2026-08-10T14:30:00Z",
    pieza: "16",
    procedimiento: "Obturación de resina",
    nota_clinica: "Caries oclusal",
    medico: {
      id: "m1", nombres: "María", apellidos: "Benítez", numero_colegiatura: "ODO-1",
      especialidad: { id: "esp1", nombre: "Odontología General" },
    },
    paciente: { id: "p1", nombres: "Juan", apellidos: "Pérez", documento: "123456", tipo: "civil", sexo: "M" },
    ...over,
  };
}

describe("producción odontológica", () => {
  beforeEach(() => {
    for (const k of Object.keys(RESPUESTAS)) delete RESPUESTAS[k];
    CONSULTAS.length = 0;
  });

  it("lee la producción de evoluciones_clinicas, no de tablas del sistema médico", async () => {
    RESPUESTAS.evoluciones_clinicas = { data: [evolucion()], error: null };
    const r = await fetchProduccionDental(FILTROS_BASE);

    const tablas = CONSULTAS.map((c) => c.tabla);
    expect(tablas).toContain("evoluciones_clinicas");
    // `consultas` y `atenciones_enfermeria` no existen en esta base: consultarlas
    // era lo que dejaba la pantalla vacía y llenaba la consola de 404.
    expect(tablas).not.toContain("consultas");
    expect(tablas).not.toContain("atenciones_enfermeria");

    expect(r.atenciones).toHaveLength(1);
    expect(r.atenciones[0].pieza).toBe("16");
    expect(r.atenciones[0].procedimiento).toBe("Obturación de resina");
    expect(r.atenciones[0].nota).toBe("Caries oclusal");
    expect(r.atenciones[0].medicoNombre).toBe("Benítez, María");
  });

  it("incluye el último día del período completo", async () => {
    RESPUESTAS.evoluciones_clinicas = { data: [], error: null };
    await fetchProduccionDental({ fechaDesde: "2026-08-01", fechaHasta: "2026-08-31" });

    const evo = CONSULTAS.find((c) => c.tabla === "evoluciones_clinicas")!;
    // Se compara contra el día SIGUIENTE, si no las marcas de tiempo del día 31
    // (que llevan hora) quedarían afuera y faltaría un día de producción.
    expect(evo.filtros).toContain("lt:fecha_registro,2026-09-01");
  });

  it("suma lo cobrado y lo pendiente", async () => {
    RESPUESTAS.evoluciones_clinicas = { data: [], error: null };
    RESPUESTAS.pagos_presupuesto = { data: [{ monto: 1500000 }, { monto: 500000 }], error: null };
    RESPUESTAS.presupuestos = {
      data: [
        { total: 2500000, saldo_pendiente: 1000000, estado: "aprobado" },
        { total: 800000, saldo_pendiente: 800000, estado: "borrador" },
      ],
      error: null,
    };

    const r = await fetchProduccionDental(FILTROS_BASE);
    expect(r.facturacion.cobrado).toBe(2000000);
    expect(r.facturacion.pendiente).toBe(1800000);
    expect(r.facturacion.planes).toBe(2);
  });

  it("no cuenta como deuda un plan rechazado o anulado", async () => {
    RESPUESTAS.evoluciones_clinicas = { data: [], error: null };
    RESPUESTAS.presupuestos = {
      data: [
        { total: 100, saldo_pendiente: 100, estado: "aprobado" },
        { total: 900, saldo_pendiente: 900, estado: "rechazado" },
        { total: 700, saldo_pendiente: 700, estado: "ANULADO" },
      ],
      error: null,
    };
    const r = await fetchProduccionDental(FILTROS_BASE);
    // Un plan que el paciente rechazó no es plata por cobrar: contarlo inflaría
    // la deuda de la clínica.
    expect(r.facturacion.pendiente).toBe(100);
    expect(r.facturacion.planes).toBe(3);
  });

  it("filtra por especialidad sin perder las evoluciones sin médico", async () => {
    RESPUESTAS.evoluciones_clinicas = {
      data: [
        evolucion({ id: "a", medico: { id: "m1", nombres: "A", apellidos: "A", especialidad: { id: "esp1", nombre: "General" } } }),
        evolucion({ id: "b", medico: { id: "m2", nombres: "B", apellidos: "B", especialidad: { id: "esp2", nombre: "Ortodoncia" } } }),
      ],
      error: null,
    };
    const r = await fetchProduccionDental({ ...FILTROS_BASE, especialidadId: "esp2" });
    expect(r.atenciones).toHaveLength(1);
    expect(r.atenciones[0].especialidadNombre).toBe("Ortodoncia");
  });

  it("renumera la planilla después de filtrar", async () => {
    RESPUESTAS.evoluciones_clinicas = {
      data: [
        evolucion({ id: "a", medico: { id: "m1", nombres: "A", apellidos: "A", especialidad: { id: "esp1", nombre: "General" } } }),
        evolucion({ id: "b", medico: { id: "m2", nombres: "B", apellidos: "B", especialidad: { id: "esp2", nombre: "Orto" } } }),
        evolucion({ id: "c", medico: { id: "m3", nombres: "C", apellidos: "C", especialidad: { id: "esp2", nombre: "Orto" } } }),
      ],
      error: null,
    };
    const r = await fetchProduccionDental({ ...FILTROS_BASE, especialidadId: "esp2" });
    // Sin renumerar, la planilla impresa saldría numerada 2 y 3.
    expect(r.atenciones.map((a) => a.index)).toEqual([1, 2]);
  });

  it("agrupa las citas por estado", async () => {
    RESPUESTAS.evoluciones_clinicas = { data: [], error: null };
    RESPUESTAS.citas = {
      data: [{ estado: "atendida" }, { estado: "atendida" }, { estado: "cancelada" }],
      error: null,
    };
    const r = await fetchProduccionDental(FILTROS_BASE);
    expect(r.citasPorEstado).toEqual({ atendida: 2, cancelada: 1 });
  });

  it("degrada sin romper si falta una tabla", async () => {
    RESPUESTAS.evoluciones_clinicas = {
      data: null as any,
      error: { code: "PGRST205", message: "Could not find the table 'public.evoluciones_clinicas'" },
    };
    const r = await fetchProduccionDental(FILTROS_BASE);
    expect(r.atenciones).toEqual([]);
    expect(r.facturacion.cobrado).toBe(0);
  });

  it("usa el documento del paciente como identificación", async () => {
    RESPUESTAS.evoluciones_clinicas = { data: [evolucion()], error: null };
    const r = await fetchProduccionDental(FILTROS_BASE);
    expect(r.atenciones[0].pacienteJerarquia).toBe("123456");
  });

  it("cae en el tipo cuando el paciente no tiene documento", async () => {
    RESPUESTAS.evoluciones_clinicas = {
      data: [evolucion({ paciente: { nombres: "N", apellidos: "N", documento: null, tipo: "civil", grado: null, sexo: "F" } })],
      error: null,
    };
    const r = await fetchProduccionDental(FILTROS_BASE);
    expect(r.atenciones[0].pacienteJerarquia).toBe("civil");
  });
});

describe("formateo", () => {
  it("normaliza el sexo", () => {
    expect(formatSexo("m")).toBe("M");
    expect(formatSexo("F")).toBe("F");
    expect(formatSexo(null)).toBe("—");
  });

  it("arma la identificación sin dejar separadores sueltos", () => {
    expect(formatJerarquia("civil", null)).toBe("civil");
    expect(formatJerarquia(null, null)).toBe("—");
  });
});
