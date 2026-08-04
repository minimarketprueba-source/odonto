import { describe, it, expect } from "vitest";
import { ESTADOS_DENTALES, buscarEstado, estadoDeRegistro } from "../estados-dentales";
import { tipoDeDiente, esSuperior } from "../diente-figura";

describe("estados del odontograma", () => {
  it("no tiene dos estados con el mismo id", () => {
    const ids = ESTADOS_DENTALES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marca como de pieza completa lo que no puede ir en una sola cara", () => {
    // Una corona o una extracción no son "mesiales": afectan a toda la pieza.
    for (const id of ["corona", "endodoncia", "extraccion", "ausente", "implante"]) {
      expect(buscarEstado(id)?.piezaCompleta).toBe(true);
    }
    // Caries y obturación sí son por cara.
    expect(buscarEstado("caries")?.piezaCompleta).toBeUndefined();
    expect(buscarEstado("obturacion")?.piezaCompleta).toBeUndefined();
  });

  it("usa rojo para lo pendiente y azul para lo hecho", () => {
    expect(buscarEstado("caries")?.estado).toBe("pendiente");
    expect(buscarEstado("obturacion")?.estado).toBe("realizado");
  });

  describe("lectura de lo guardado en la base", () => {
    it("reconoce una caries", () => {
      expect(estadoDeRegistro({ diagnostico: "caries", tratamiento: null })?.id).toBe("caries");
    });

    it("reconoce los registros viejos que guardaban «empaste»", () => {
      // El código anterior guardaba el tratamiento con ese nombre; si no se lo
      // reconoce, las obturaciones ya cargadas dejarían de verse.
      expect(estadoDeRegistro({ diagnostico: null, tratamiento: "empaste" })?.id).toBe("obturacion");
    });

    it("da prioridad al tratamiento sobre el diagnóstico", () => {
      // Una caries ya obturada tiene los dos campos: vale lo último que se hizo.
      const r = { diagnostico: "caries", tratamiento: "obturacion" };
      expect(estadoDeRegistro(r)?.id).toBe("obturacion");
    });

    it("reconoce «sano» como borrado de la marca", () => {
      const e = estadoDeRegistro({ diagnostico: "sano", tratamiento: "ninguno" });
      expect(e?.limpia).toBe(true);
    });

    it("devuelve undefined si no reconoce nada", () => {
      expect(estadoDeRegistro({ diagnostico: null, tratamiento: null })).toBeUndefined();
    });
  });
});

describe("anatomía de las piezas (notación FDI)", () => {
  it("clasifica las piezas permanentes", () => {
    expect(tipoDeDiente(11)).toBe("incisivo");
    expect(tipoDeDiente(12)).toBe("incisivo");
    expect(tipoDeDiente(13)).toBe("canino");
    expect(tipoDeDiente(14)).toBe("premolar");
    expect(tipoDeDiente(15)).toBe("premolar");
    expect(tipoDeDiente(16)).toBe("molar");
    expect(tipoDeDiente(48)).toBe("molar");
  });

  it("en los temporales, la 4 y la 5 son molares y no premolares", () => {
    // La dentición temporal tiene 5 piezas por cuadrante y NO tiene premolares:
    // clasificarlas por el número sin más las dibujaría mal.
    expect(tipoDeDiente(54)).toBe("molar");
    expect(tipoDeDiente(55)).toBe("molar");
    expect(tipoDeDiente(64)).toBe("molar");
    expect(tipoDeDiente(85)).toBe("molar");
    expect(tipoDeDiente(53)).toBe("canino");
    expect(tipoDeDiente(51)).toBe("incisivo");
  });

  it("distingue la arcada superior de la inferior", () => {
    for (const n of [11, 18, 21, 28, 51, 55, 61, 65]) expect(esSuperior(n)).toBe(true);
    for (const n of [31, 38, 41, 48, 71, 75, 81, 85]) expect(esSuperior(n)).toBe(false);
  });
});
