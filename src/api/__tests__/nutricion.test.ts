import { describe, expect, it } from "vitest";
import { calcularDxICC, escribirEtiquetasPesada, leerEtiquetasPesada } from "@/api/nutricion";
import { calcularIMC, calcularPorcentajeMuscular, clasificarIMC } from "@/lib/utils/imc-utils";

/**
 * La ficha de nutrición rellenaba lo que no estaba medido: EGS "A", DX BIA
 * deducido de la cintura, talla 170 cm. En pantalla no había forma de saber
 * qué había medido la nutricionista y qué había puesto el código.
 */
describe("etiquetas EGS / DX BIA dentro de observaciones", () => {
  it("no inventa nada cuando la pesada no las trae", () => {
    const r = leerEtiquetasPesada("Dieta hipocalórica");
    expect(r.egs).toBeNull();
    expect(r.dxBia).toBeNull();
    expect(r.observaciones).toBe("Dieta hipocalórica");
  });

  it("devuelve null en una pesada sin observaciones", () => {
    expect(leerEtiquetasPesada(null)).toEqual({ egs: null, dxBia: null, observaciones: null });
  });

  it("lee las etiquetas y deja limpia la nota de la nutricionista", () => {
    const r = leerEtiquetasPesada("Dieta hipocalórica | EGS: B | DX_BIA: Elevada");
    expect(r.egs).toBe("B");
    expect(r.dxBia).toBe("Elevada");
    expect(r.observaciones).toBe("Dieta hipocalórica");
  });

  it("lee las etiquetas aunque no haya nota", () => {
    const r = leerEtiquetasPesada("EGS: A | DX_BIA: Normal");
    expect(r.egs).toBe("A");
    expect(r.dxBia).toBe("Normal");
    expect(r.observaciones).toBeNull();
  });

  it("lo escrito se vuelve a leer igual", () => {
    const texto = escribirEtiquetasPesada("Control mensual", "C", "Muy Elevada");
    expect(leerEtiquetasPesada(texto)).toEqual({
      egs: "C",
      dxBia: "Muy Elevada",
      observaciones: "Control mensual",
    });
  });

  it("no escribe etiquetas de lo que quedó sin evaluar", () => {
    expect(escribirEtiquetasPesada("Solo peso", null, null)).toBe("Solo peso");
    expect(escribirEtiquetasPesada(null, null, null)).toBeNull();
    expect(escribirEtiquetasPesada(null, "A", null)).toBe("EGS: A");
  });
});

describe("%MM contra la columna masa_muscular_kg", () => {
  // La columna de `pesadas` guarda KILOS y así la lee control de peso; la
  // nutricionista carga el porcentaje de la balanza. La conversión tiene que
  // cerrar en los dos sentidos o se ensucian los datos de la otra app.
  it("el porcentaje cargado vuelve como el mismo porcentaje", () => {
    const peso = 78;
    const porcentaje = 42.5;
    const kg = Number(((peso * porcentaje) / 100).toFixed(2));
    expect(kg).toBeCloseTo(33.15, 2);
    expect(calcularPorcentajeMuscular(kg, peso)).toBeCloseTo(porcentaje, 1);
  });

  it("los kilos que cargó control de peso se leen como porcentaje, no como %", () => {
    // 33 kg de músculo en 80 kg de peso son 41,3 %, no "33 %".
    expect(calcularPorcentajeMuscular(33, 80)).toBe(41.3);
  });

  it("sin peso no hay porcentaje que calcular", () => {
    expect(calcularPorcentajeMuscular(33, 0)).toBe(0);
  });
});

describe("clasificación de IMC", () => {
  it("un IMC fuera de escala ya no cae en «Peso normal»", () => {
    expect(clasificarIMC(120).clasificacion).toBe("obesidad_iii");
  });

  it("clasifica los rangos de la OMS", () => {
    expect(clasificarIMC(17).clasificacion).toBe("bajo_peso");
    expect(clasificarIMC(22).clasificacion).toBe("peso_normal");
    expect(clasificarIMC(27).clasificacion).toBe("sobrepeso");
    expect(clasificarIMC(32).clasificacion).toBe("obesidad_i");
  });

  it("el IMC se calcula con la talla real", () => {
    expect(calcularIMC(70, 175)).toBe(22.86);
    // Con la talla supuesta de 170 que se usaba antes daba otro número.
    expect(calcularIMC(70, 170)).not.toBe(calcularIMC(70, 175));
  });
});

describe("DX ICC", () => {
  it("usa umbrales distintos según el sexo", () => {
    expect(calcularDxICC(0.85, "M").riesgo).toBe("bajo");
    expect(calcularDxICC(0.85, "F").riesgo).toBe("alto");
  });
});
