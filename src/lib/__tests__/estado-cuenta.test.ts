import { describe, it, expect } from "vitest";
import { mensajeEstadoCuenta, telefonoParaWhatsApp, enlaceWhatsApp } from "@/lib/estado-cuenta";
import { NOMBRE_CLINICA } from "@/lib/clinica";

const CUENTA_BASE = {
  clinica: NOMBRE_CLINICA,
  pacienteNombre: "ROMERO, TOBIAS",
  fecha: "5/8/2026",
  planTitulo: "Tratamiento integral",
  totalCotizado: 1000000,
  totalAbonado: 400000,
  saldoPendiente: 600000,
  pagos: [
    { fecha: "1/8/2026", monto: 250000, metodo: "Transferencia" },
    { fecha: "4/8/2026", monto: 150000, metodo: "Efectivo" },
  ],
};

describe("teléfono para WhatsApp", () => {
  it("cambia el cero inicial paraguayo por el código de país", () => {
    // 0983559700 es como se anota en Paraguay; wa.me necesita 595983559700.
    expect(telefonoParaWhatsApp("0983559700")).toBe("595983559700");
    expect(telefonoParaWhatsApp("0981 123 456")).toBe("595981123456");
  });

  it("saca guiones, espacios y paréntesis", () => {
    expect(telefonoParaWhatsApp("(0981) 123-456")).toBe("595981123456");
  });

  it("respeta un número que ya viene con el código de país", () => {
    expect(telefonoParaWhatsApp("+595 983 559 700")).toBe("595983559700");
    expect(telefonoParaWhatsApp("595983559700")).toBe("595983559700");
  });

  it("no inventa un número cuando no hay teléfono", () => {
    expect(telefonoParaWhatsApp(null)).toBeNull();
    expect(telefonoParaWhatsApp("")).toBeNull();
    expect(telefonoParaWhatsApp("sin datos")).toBeNull();
  });

  it("descarta números demasiado cortos", () => {
    // Un interno o un número mal cargado abriría el chat de otra persona.
    expect(telefonoParaWhatsApp("1234")).toBeNull();
    expect(telefonoParaWhatsApp("0123")).toBeNull();
  });

  it("acepta otro código de país", () => {
    expect(telefonoParaWhatsApp("011 4123 4567", "54")).toBe("5411412345 67".replace(" ", ""));
  });
});

describe("enlace de WhatsApp", () => {
  it("arma el enlace con el número y el mensaje", () => {
    const url = enlaceWhatsApp("Hola", "0983559700");
    expect(url.startsWith("https://wa.me/595983559700?text=")).toBe(true);
    expect(url).toContain("Hola");
  });

  it("sin teléfono deja elegir el contacto en WhatsApp", () => {
    expect(enlaceWhatsApp("Hola", null)).toBe("https://wa.me/?text=Hola");
  });

  it("codifica saltos de línea y símbolos", () => {
    const url = enlaceWhatsApp("Saldo: 600.000 ₲\nGracias", "0981123456");
    // Sin codificar, el mensaje se corta en el primer salto de línea.
    expect(url).not.toContain("\n");
    expect(decodeURIComponent(url.split("text=")[1])).toContain("Saldo: 600.000 ₲");
  });
});

describe("mensaje del estado de cuenta", () => {
  it("incluye paciente, pagos y saldo", () => {
    const m = mensajeEstadoCuenta(CUENTA_BASE);
    expect(m).toContain("ROMERO, TOBIAS");
    expect(m).toContain("Tratamiento integral");
    expect(m).toContain("250.000 ₲");
    expect(m).toContain("150.000 ₲");
    expect(m).toContain("Saldo pendiente: 600.000 ₲");
  });

  it("NO incluye datos clínicos", () => {
    const m = mensajeEstadoCuenta(CUENTA_BASE);
    // Un mensaje de WhatsApp puede terminar en cualquier pantalla: la cuenta
    // se manda, el diagnóstico no.
    for (const palabra of ["diagnóstico", "caries", "pieza", "nota clínica", "alergia"]) {
      expect(m.toLowerCase()).not.toContain(palabra);
    }
  });

  it("avisa cuando la cuenta está saldada", () => {
    const m = mensajeEstadoCuenta({ ...CUENTA_BASE, totalAbonado: 1000000, saldoPendiente: 0 });
    expect(m).toContain("Cuenta saldada");
    expect(m).not.toContain("Saldo pendiente");
  });

  it("informa el saldo a favor si pagó de más", () => {
    const m = mensajeEstadoCuenta({
      ...CUENTA_BASE,
      totalCotizado: 100000,
      totalAbonado: 250000,
      saldoPendiente: 0,
    });
    expect(m).toContain("A favor: 150.000 ₲");
  });

  it("funciona sin pagos cargados", () => {
    const m = mensajeEstadoCuenta({ ...CUENTA_BASE, pagos: [], totalAbonado: 0, saldoPendiente: 1000000 });
    expect(m).not.toContain("Pagos recibidos");
    expect(m).toContain("Saldo pendiente: 1.000.000 ₲");
  });

  it("no muestra el método cuando no se cargó", () => {
    const m = mensajeEstadoCuenta({
      ...CUENTA_BASE,
      pagos: [{ fecha: "1/8/2026", monto: 50000, metodo: "—" }],
    });
    expect(m).toContain("• 1/8/2026: 50.000 ₲");
    expect(m).not.toContain("(—)");
  });
});
