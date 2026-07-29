import { describe, expect, it, vi, beforeEach } from "vitest";

// El módulo consulta Supabase; se reemplaza por un doble que devuelve el
// último número emitido.
const ultimoNumero = { valor: null as string | null };

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: async () => ({
            data: ultimoNumero.valor ? [{ numero: ultimoNumero.valor }] : [],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

const { emitirConNumero, esConflictoDeNumero, siguienteNumero, MAX_INTENTOS_NUMERO } =
  await import("@/api/numeracion");

/** Error tal como lo devuelve Postgres cuando choca el índice único. */
function conflicto() {
  return Object.assign(new Error('duplicate key value violates unique constraint "recetas_numero_unico"'), {
    code: "23505",
  });
}

beforeEach(() => {
  ultimoNumero.valor = null;
});

describe("siguienteNumero", () => {
  it("arranca en 1 cuando no hay ningún documento", async () => {
    expect(await siguienteNumero("recetas", "R")).toBe("R-00001");
  });

  it("sigue al último emitido", async () => {
    ultimoNumero.valor = "R-00041";
    expect(await siguienteNumero("recetas", "R")).toBe("R-00042");
  });

  it("no retrocede aunque se hayan borrado filas del medio", async () => {
    // Contando filas (lo que se hacía antes) 3 registros con el último en 9
    // habrían devuelto R-00004 y repetido números ya impresos.
    ultimoNumero.valor = "R-00009";
    expect(await siguienteNumero("recetas", "R")).toBe("R-00010");
  });

  it("respeta el prefijo del salvoconducto", async () => {
    ultimoNumero.valor = "SC-00007";
    expect(await siguienteNumero("salvoconductos", "SC")).toBe("SC-00008");
  });
});

describe("esConflictoDeNumero", () => {
  it("reconoce el choque del índice único", () => {
    expect(esConflictoDeNumero(conflicto())).toBe(true);
  });

  it("no confunde otros errores", () => {
    expect(esConflictoDeNumero(new Error("network"))).toBe(false);
    expect(esConflictoDeNumero({ code: "23505", message: "pacientes_documento_unico" })).toBe(false);
    expect(esConflictoDeNumero(null)).toBe(false);
  });
});

describe("emitirConNumero", () => {
  it("emite con el número que corresponde", async () => {
    ultimoNumero.valor = "R-00002";
    const emitido = await emitirConNumero("recetas", "R", async (n) => n);
    expect(emitido).toBe("R-00003");
  });

  it("reintenta con el siguiente si otro puesto se adelantó", async () => {
    ultimoNumero.valor = "R-00010";
    const intentos: string[] = [];
    const emitido = await emitirConNumero("recetas", "R", async (n) => {
      intentos.push(n);
      if (intentos.length < 3) throw conflicto();
      return n;
    });
    expect(intentos).toEqual(["R-00011", "R-00012", "R-00013"]);
    expect(emitido).toBe("R-00013");
  });

  it("los errores que no son de numeración salen tal cual, sin reintentar", async () => {
    let veces = 0;
    await expect(
      emitirConNumero("recetas", "R", async () => {
        veces++;
        throw new Error("se cayó la conexión");
      })
    ).rejects.toThrow("se cayó la conexión");
    expect(veces).toBe(1);
  });

  it("después de varios choques avisa en castellano en vez de romper", async () => {
    await expect(
      emitirConNumero("recetas", "R", async () => {
        throw conflicto();
      })
    ).rejects.toThrow(/al mismo tiempo/);
  });

  it("no reintenta para siempre", async () => {
    let veces = 0;
    await expect(
      emitirConNumero("recetas", "R", async () => {
        veces++;
        throw conflicto();
      })
    ).rejects.toThrow();
    expect(veces).toBe(MAX_INTENTOS_NUMERO);
  });
});
