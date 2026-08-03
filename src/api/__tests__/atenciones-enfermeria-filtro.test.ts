import { describe, expect, it, beforeEach, vi } from "vitest";

/**
 * El filtro por servicio (cada profesional revisa lo suyo) tiene que ir en la
 * CONSULTA, no en memoria: con el corte de filas, filtrar después escondería
 * atenciones sin ningún error a la vista — la misma trampa que tuvo la lista
 * de espera. Y si la migración todavía no está aplicada, es preferible mostrar
 * todas antes que dejar al médico creyendo que no tiene nada para revisar.
 *
 * Se reemplaza Supabase por un doble que anota con qué filtro se lo llamó.
 */
type Respuesta = { data: unknown[] | null; error: { code?: string; message: string } | null };

const estado = {
  filtros: [] as (string | null)[],
  errorPrimerIntento: null as { code?: string; message: string } | null,
  filas: [] as unknown[],
};

interface Consulta {
  select: () => Consulta;
  is: () => Consulta;
  not: () => Consulta;
  order: () => Consulta;
  or: (expresion: string) => Consulta;
  limit: () => Promise<Respuesta>;
}

function nuevaConsulta(): Consulta {
  let filtro: string | null = null;
  const consulta: Consulta = {
    select: () => consulta,
    is: () => consulta,
    not: () => consulta,
    order: () => consulta,
    or: (expresion: string) => {
      filtro = expresion;
      return consulta;
    },
    limit: async () => {
      estado.filtros.push(filtro);
      if (estado.errorPrimerIntento && estado.filtros.length === 1) {
        return { data: null, error: estado.errorPrimerIntento };
      }
      return { data: estado.filas, error: null };
    },
  };
  return consulta;
}

vi.mock("@/lib/supabase", () => ({ supabase: { from: () => nuevaConsulta() } }));

const { fetchAtencionesPendientes, fetchAtencionesRevisadas } =
  await import("@/api/atenciones-enfermeria");

beforeEach(() => {
  estado.filtros = [];
  estado.errorPrimerIntento = null;
  estado.filas = [{ id: 1 }, { id: 2 }];
});

describe("fetchAtencionesPendientes", () => {
  it("un profesional recibe solo las de su servicio (y las que quedaron sin servicio)", async () => {
    await fetchAtencionesPendientes(3);
    expect(estado.filtros).toEqual(["especialidad_id.eq.3,especialidad_id.is.null"]);
  });

  it("enfermería y el administrador no filtran: ven todo", async () => {
    await fetchAtencionesPendientes();
    await fetchAtencionesPendientes(null);
    expect(estado.filtros).toEqual([null, null]);
  });

  it("sin la migración aplicada muestra todas en vez de dejar la pantalla vacía", async () => {
    estado.errorPrimerIntento = {
      code: "42703",
      message: "column atenciones_enfermeria.especialidad_id does not exist",
    };
    const filas = await fetchAtencionesPendientes(3);
    expect(filas).toHaveLength(2);
    // Reintentó sin el filtro.
    expect(estado.filtros).toEqual(["especialidad_id.eq.3,especialidad_id.is.null", null]);
  });

  it("un error de verdad se propaga: no se disfraza de «no hay pendientes»", async () => {
    estado.errorPrimerIntento = { code: "PGRST301", message: "JWT expired" };
    await expect(fetchAtencionesPendientes(3)).rejects.toThrow(/JWT expired/);
    expect(estado.filtros).toHaveLength(1);
  });
});

describe("fetchAtencionesRevisadas", () => {
  it("el historial acompaña al mismo servicio", async () => {
    await fetchAtencionesRevisadas(7);
    expect(estado.filtros).toEqual(["especialidad_id.eq.7,especialidad_id.is.null"]);
  });

  it("sin la migración aplicada tampoco se queda vacío", async () => {
    estado.errorPrimerIntento = {
      code: "42703",
      message: "column atenciones_enfermeria.especialidad_id does not exist",
    };
    expect(await fetchAtencionesRevisadas(7)).toHaveLength(2);
  });
});
