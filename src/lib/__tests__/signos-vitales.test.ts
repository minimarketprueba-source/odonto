import { describe, expect, it } from "vitest";
import {
  enteroSignoONull, numeroSignoONull, validarSignoVital, validarSignosVitales,
} from "@/lib/signos-vitales";

describe("lectura de un valor tecleado", () => {
  it("acepta la coma decimal (así se escribe acá)", () => {
    expect(numeroSignoONull("36,5")).toBe(36.5);
    expect(numeroSignoONull("36.5")).toBe(36.5);
  });

  it("un campo vacío no es un cero", () => {
    expect(numeroSignoONull("")).toBeNull();
    expect(numeroSignoONull("   ")).toBeNull();
    expect(enteroSignoONull("")).toBeNull();
  });

  it("redondea lo que va en una columna entera", () => {
    expect(enteroSignoONull("98,6")).toBe(99);
    expect(enteroSignoONull("120")).toBe(120);
  });

  it("texto que no es número queda en null", () => {
    expect(numeroSignoONull("120/80")).toBeNull();
    expect(numeroSignoONull("normal")).toBeNull();
  });
});

describe("aviso por valor imposible", () => {
  it("los campos vacíos no molestan: los signos son opcionales", () => {
    expect(validarSignoVital("temp", "")).toBeNull();
    expect(validarSignosVitales({ temp: "", fc: "", spo2: "" })).toBeNull();
  });

  it("acepta lo normal", () => {
    expect(
      validarSignosVitales({
        pa_sistolica: "120", pa_diastolica: "80", fc: "72", fr: "16",
        temp: "36,5", spo2: "98",
      })
    ).toBeNull();
  });

  // Este es el caso que reportó enfermería: la base devolvía "hay un valor
  // fuera de rango" sin decir cuál, y el formulario se perdía.
  it("nombra el campo y el rango, no un error genérico", () => {
    const aviso = validarSignoVital("temp", "365");
    expect(aviso).toContain("la temperatura");
    expect(aviso).toContain("30");
    expect(aviso).toContain("45");
  });

  it("sugiere la coma que faltó", () => {
    expect(validarSignoVital("temp", "365")).toContain("¿Quiso escribir 36,5?");
    expect(validarSignoVital("peso_kg", "725")).toContain("¿Quiso escribir 72,5?");
  });

  it("avisa cuando lo tecleado no es un número", () => {
    expect(validarSignoVital("pa_sistolica", "120/80")).toContain("no es un número");
  });

  it("respeta los mismos límites que los CHECK de la base", () => {
    expect(validarSignoVital("spo2", "100")).toBeNull();
    expect(validarSignoVital("spo2", "101")).not.toBeNull();
    expect(validarSignoVital("spo2", "49")).not.toBeNull();
    expect(validarSignoVital("fr", "4")).toBeNull();
    expect(validarSignoVital("fr", "3")).not.toBeNull();
    expect(validarSignoVital("temp", "30")).toBeNull();
    expect(validarSignoVital("temp", "29,9")).not.toBeNull();
    expect(validarSignoVital("talla_cm", "250")).toBeNull();
    expect(validarSignoVital("talla_cm", "251")).not.toBeNull();
  });

  it("una presión invertida es siempre un error de tipeo", () => {
    const aviso = validarSignosVitales({ pa_sistolica: "80", pa_diastolica: "120" });
    expect(aviso).toContain("sistólica");
    expect(validarSignosVitales({ pa_sistolica: "120", pa_diastolica: "80" })).toBeNull();
  });

  it("solo controla los campos que la pantalla carga", () => {
    // La atención ambulatoria no pide peso ni talla: no debe inventar avisos.
    expect(validarSignosVitales({ fc: "72" })).toBeNull();
  });
});
