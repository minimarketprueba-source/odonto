import { describe, it, expect, beforeEach } from "vitest";
import { codigoDeAcceso, enlaceDeIngreso, guardarCodigo, normalizarCodigo } from "@/lib/codigo-acceso";

describe("código de acceso del consultorio", () => {
  beforeEach(() => localStorage.clear());

  it("toma el código del enlace y lo recuerda para la próxima vez", () => {
    expect(codigoDeAcceso("?c=movadent")).toBe("movadent");
    // Otra visita, ya sin el ?c= en la dirección:
    expect(codigoDeAcceso("")).toBe("movadent");
  });

  it("el enlace le gana a lo guardado", () => {
    guardarCodigo("movadent");
    expect(codigoDeAcceso("?c=nandutisonrisas")).toBe("nandutisonrisas");
  });

  it("sin enlace ni nada guardado no hay código", () => {
    expect(codigoDeAcceso("")).toBeNull();
  });

  it("descarta códigos con cosas raras en vez de mandarlas a la base", () => {
    expect(normalizarCodigo("MovaDent ")).toBe("movadent");
    expect(normalizarCodigo("mova dent")).toBeNull();
    expect(normalizarCodigo("%")).toBeNull();
    expect(normalizarCodigo("<script>")).toBeNull();
    expect(codigoDeAcceso("?c=%25")).toBeNull();
  });

  it("arma el enlace para copiar o mandar por WhatsApp", () => {
    expect(enlaceDeIngreso("movadent", "https://odonto-pied.vercel.app")).toBe(
      "https://odonto-pied.vercel.app/?c=movadent"
    );
  });
});
