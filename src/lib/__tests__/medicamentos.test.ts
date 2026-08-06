import { describe, it, expect } from "vitest";
import {
  MEDICAMENTOS_FRECUENTES,
  buscarMedicamentos,
  obtenerCategoriasMedicamentos,
  alergiasEnConflicto,
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

  it("es un vademécum odontológico: sin los medicamentos del sistema médico anterior", () => {
    const nombres = MEDICAMENTOS_FRECUENTES.map((m) => m.nombre.toLowerCase()).join(" | ");
    // Presión arterial y respiratorios: los recetaba el médico policial del que
    // se clonó el sistema, no un odontólogo.
    expect(nombres).not.toContain("losartán");
    expect(nombres).not.toContain("enalapril");
    expect(nombres).not.toContain("salbutamol");
    // Los dos que faltaban y en odontología se usan todos los días.
    expect(nombres).toContain("metronidazol");
    expect(nombres).toContain("clindamicina");
  });
});

describe("alergiasEnConflicto", () => {
  it("avisa que la amoxicilina es una penicilina", () => {
    // El caso que justifica toda la función: el nombre del medicamento no dice
    // "penicilina" por ningún lado, pero lo es.
    const avisos = alergiasEnConflicto(["Amoxicilina 500 mg"], "Alergia a la penicilina");
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain("Amoxicilina 500 mg");
    expect(avisos[0]).toContain("penicilina");
  });

  it("avisa aunque el medicamento se haya escrito a mano y sin tildes", () => {
    const avisos = alergiasEnConflicto(["amoxicilina + acido clavulanico"], "PENICILINA");
    expect(avisos).toHaveLength(1);
  });

  it("no avisa de la clindamicina, que es justamente el reemplazo", () => {
    const avisos = alergiasEnConflicto(["Clindamicina 300 mg"], "Alergia a la penicilina");
    expect(avisos).toHaveLength(0);
  });

  it("avisa de los antiinflamatorios cuando la alergia es a los AINEs", () => {
    const avisos = alergiasEnConflicto(
      ["Ibuprofeno 400 mg", "Paracetamol 500 mg"],
      "Alérgica a la aspirina"
    );
    // El paracetamol no es un AINE: no tiene que salir en el aviso.
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain("Ibuprofeno");
  });

  it("no avisa nada si el paciente no declaró alergias", () => {
    expect(alergiasEnConflicto(["Amoxicilina 500 mg"], null)).toHaveLength(0);
    expect(alergiasEnConflicto(["Amoxicilina 500 mg"], "")).toHaveLength(0);
    expect(alergiasEnConflicto(["Amoxicilina 500 mg"], "   ")).toHaveLength(0);
  });

  it("no avisa cuando la alergia declarada no tiene que ver con lo recetado", () => {
    const avisos = alergiasEnConflicto(["Amoxicilina 500 mg"], "Alergia al polen y al látex");
    expect(avisos).toHaveLength(0);
  });

  it("revisa todos los medicamentos de la receta, no solo el primero", () => {
    const avisos = alergiasEnConflicto(
      ["Paracetamol 500 mg", "Clorhexidina 0.12% Colutorio", "Amoxicilina 875 mg"],
      "penicilina"
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain("Amoxicilina 875 mg");
  });

  it("ignora las filas vacías del formulario", () => {
    expect(alergiasEnConflicto(["", "   "], "penicilina")).toHaveLength(0);
  });
});
