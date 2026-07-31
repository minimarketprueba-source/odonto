import { describe, it, expect } from "vitest";
import {
  MEDICAMENTOS_FRECUENTES,
  buscarMedicamentos,
  obtenerCategoriasMedicamentos,
} from "../medicamentos";

describe("medicamentos", () => {
  it("contiene medicamentos frecuentes con campos completos", () => {
    expect(MEDICAMENTOS_FRECUENTES.length).toBeGreaterThan(10);
    for (const m of MEDICAMENTOS_FRECUENTES) {
      expect(m.nombre).toBeTruthy();
      expect(m.categoria).toBeTruthy();
      expect(m.dosis).toBeTruthy();
      expect(m.frecuencia).toBeTruthy();
      expect(m.duracion).toBeTruthy();
    }
  });

  it("busca medicamentos por nombre ignorando tildes y mayúsculas", () => {
    const ibu = buscarMedicamentos("ibuprofeno");
    expect(ibu.length).toBeGreaterThan(0);
    expect(ibu[0].nombre).toContain("Ibuprofeno");

    const amox = buscarMedicamentos("Ácido Clavulánico");
    expect(amox.length).toBeGreaterThan(0);
    expect(amox[0].nombre).toContain("Amoxicilina");
  });

  it("busca medicamentos por múltiples palabras desordenadas", () => {
    const res = buscarMedicamentos("paracetamol 500");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].nombre).toBe("Paracetamol 500 mg");
  });

  it("retorna categorías únicas", () => {
    const cats = obtenerCategoriasMedicamentos();
    expect(cats).toContain("Analgésicos / Antiinflamatorios");
    expect(cats).toContain("Antibióticos");
    expect(cats.length).toBeGreaterThan(3);
  });
});
