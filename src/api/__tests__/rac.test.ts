import { describe, expect, it } from "vitest";
import { DESTINOS_RAC, NIVELES_TRIAJE, fechaHastaReposo, numeroRac } from "../rac";

// El reposo cuenta el primer día: "3 días" desde el lunes termina el miércoles,
// no el jueves. Un error acá le da al cadete un día de más o de menos de
// exención de actividad física, así que conviene tenerlo clavado.
describe("fechaHastaReposo", () => {
  it("cuenta el día de inicio como el primer día", () => {
    expect(fechaHastaReposo("2026-07-27", 1)).toBe("2026-07-27");
    expect(fechaHastaReposo("2026-07-27", 3)).toBe("2026-07-29");
  });

  it("cruza el fin de mes", () => {
    expect(fechaHastaReposo("2026-07-31", 3)).toBe("2026-08-02");
  });

  it("cruza el fin de año", () => {
    expect(fechaHastaReposo("2026-12-30", 4)).toBe("2027-01-02");
  });

  it("contempla el año bisiesto", () => {
    expect(fechaHastaReposo("2028-02-28", 2)).toBe("2028-02-29");
  });

  it("nunca devuelve una fecha anterior al inicio", () => {
    expect(fechaHastaReposo("2026-07-27", 0)).toBe("2026-07-27");
  });
});

describe("numeroRac", () => {
  it("usa cinco dígitos", () => {
    expect(numeroRac(1)).toBe("RAC-00001");
    expect(numeroRac(1234)).toBe("RAC-01234");
  });
});

describe("catálogos del RAC", () => {
  it("tiene los 4 niveles del MSPBS, del más grave al menos grave", () => {
    expect(NIVELES_TRIAJE.map((n) => n.value)).toEqual(["rojo", "amarillo", "verde", "azul"]);
  });

  it("solo enfermo local, reposo domiciliario e internación eximen de actividad física", () => {
    const conReposo = DESTINOS_RAC.filter((d) => d.reposo).map((d) => d.value);
    expect(conReposo).toEqual(["enfermo_local", "reposo_domiciliario", "internacion"]);
  });

  it("el alta no pide cantidad de días", () => {
    expect(DESTINOS_RAC.find((d) => d.value === "alta")?.pideDias).toBe(false);
  });
});
