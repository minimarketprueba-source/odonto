import { describe, it, expect } from "vitest";
import {
  calcularNIC,
  resumirPeriodontograma,
  SITIOS,
  NOMBRE_SITIO,
  type DatosPeriodontograma,
} from "@/api/periodontograma";

function diente(ps: number[], extras: any = {}) {
  const sitios: any = {};
  SITIOS.forEach((s, i) => {
    if (ps[i] !== undefined) sitios[s] = { ps: ps[i], ...(extras.porSitio?.[i] ?? {}) };
  });
  return { sitios, ...extras.diente };
}

describe("nivel de inserción clínica", () => {
  it("suma la recesión a la profundidad", () => {
    // Dos bolsas de 4 mm no son lo mismo: la que tiene 3 mm de recesión perdió
    // casi el doble de soporte. Por eso el NIC es lo que se compara, no la PS.
    expect(calcularNIC({ ps: 4, rec: 0 })).toBe(4);
    expect(calcularNIC({ ps: 4, rec: 3 })).toBe(7);
  });

  it("resta cuando la encía está agrandada (recesión negativa)", () => {
    expect(calcularNIC({ ps: 5, rec: -2 })).toBe(3);
  });

  it("devuelve null si el sitio no se midió", () => {
    expect(calcularNIC({ ps: null })).toBeNull();
    expect(calcularNIC(undefined)).toBeNull();
    expect(calcularNIC(null)).toBeNull();
  });

  it("trata la recesión ausente como cero", () => {
    expect(calcularNIC({ ps: 3 })).toBe(3);
  });
});

describe("índices periodontales", () => {
  it("cuenta solo los sitios efectivamente medidos", () => {
    const datos: DatosPeriodontograma = {
      dientes: { "16": diente([3, 2, 3]) }, // 3 de los 6 sitios
    };
    expect(resumirPeriodontograma(datos).sitiosMedidos).toBe(3);
  });

  it("clasifica las bolsas por profundidad", () => {
    const datos: DatosPeriodontograma = {
      dientes: { "16": diente([2, 3, 4, 5, 6, 9]) },
    };
    const r = resumirPeriodontograma(datos);
    // 4 y 5 son bolsa moderada; 6 y 9, profunda. El corte en 4 y en 6 es el que
    // separa "raspaje" de "posible cirugía".
    expect(r.bolsas4a5).toBe(2);
    expect(r.bolsas6omas).toBe(2);
  });

  it("calcula el porcentaje de sangrado sobre los sitios medidos", () => {
    const datos: DatosPeriodontograma = {
      dientes: {
        "16": diente([3, 3, 3, 3], { porSitio: [{ sangra: true }, { sangra: true }] }),
      },
    };
    const r = resumirPeriodontograma(datos);
    expect(r.porcentajeSangrado).toBe(50); // 2 de 4
  });

  it("no cuenta los dientes ausentes en los porcentajes", () => {
    const datos: DatosPeriodontograma = {
      dientes: {
        "16": diente([3, 3], { porSitio: [{ sangra: true }, {}] }),
        // Una pieza que no está en boca no puede sangrar: si contara, bajaría
        // artificialmente el índice y el paciente parecería más sano.
        "17": diente([5, 5, 5, 5, 5, 5], { diente: { ausente: true } }),
      },
    };
    const r = resumirPeriodontograma(datos);
    expect(r.sitiosMedidos).toBe(2);
    expect(r.porcentajeSangrado).toBe(50);
    expect(r.bolsas6omas).toBe(0);
    expect(r.dientesAusentes).toBe(1);
  });

  it("cuenta como movilidad relevante la de grado 2 o más", () => {
    const datos: DatosPeriodontograma = {
      dientes: {
        "11": diente([2], { diente: { movilidad: 1 } }),
        "21": diente([2], { diente: { movilidad: 2 } }),
        "31": diente([2], { diente: { movilidad: 3 } }),
        "41": diente([2], { diente: { movilidad: 0 } }),
      },
    };
    // La movilidad 1 es fisiológica en muchos casos; se informan las que
    // cambian la conducta clínica.
    expect(resumirPeriodontograma(datos).dientesConMovilidad).toBe(2);
  });

  it("promedia la profundidad con un decimal", () => {
    const datos: DatosPeriodontograma = { dientes: { "16": diente([2, 3, 4]) } };
    expect(resumirPeriodontograma(datos).psPromedio).toBe(3);

    const datos2: DatosPeriodontograma = { dientes: { "16": diente([2, 3, 3]) } };
    expect(resumirPeriodontograma(datos2).psPromedio).toBe(2.7);
  });

  it("no divide por cero cuando no hay nada cargado", () => {
    const r = resumirPeriodontograma({ dientes: {} });
    expect(r.porcentajeSangrado).toBe(0);
    expect(r.porcentajePlaca).toBe(0);
    expect(r.psPromedio).toBe(0);
    expect(Number.isNaN(r.psPromedio)).toBe(false);
  });

  it("aguanta datos incompletos sin romper", () => {
    expect(() => resumirPeriodontograma({ dientes: {} })).not.toThrow();
    expect(() => resumirPeriodontograma({} as any)).not.toThrow();
    expect(() => resumirPeriodontograma({ dientes: { "16": {} as any } })).not.toThrow();
  });
});

describe("sitios de sondaje", () => {
  it("son los seis del protocolo", () => {
    // Sondear menos de seis sitios subregistra la enfermedad: las bolsas
    // suelen esconderse en interproximal.
    expect(SITIOS).toHaveLength(6);
    expect(SITIOS).toEqual(["mv", "v", "dv", "mp", "p", "dp"]);
  });

  it("cada sitio tiene nombre legible", () => {
    for (const s of SITIOS) {
      expect(NOMBRE_SITIO[s]).toBeTruthy();
    }
  });
});
