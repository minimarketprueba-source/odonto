import { describe, it, expect, beforeEach } from "vitest";
import {
  EMPRESA_PREDETERMINADA, getEmpresa, setEmpresa, lineaContacto,
} from "@/lib/clinica";
import { imprimirReceta } from "@/lib/imprimir";

const COMPLETA = {
  nombre: "CONSULTORIO ODONTOLÓGICO MOVA DENT",
  ruc: "80012345-6",
  direccion: "Av. Mcal. López 1234",
  telefono: "0983 559 700",
  email: "contacto@movadent.com.py",
  logo_url: "data:image/png;base64,AAAA",
};

beforeEach(() => {
  setEmpresa(EMPRESA_PREDETERMINADA);
});

describe("datos del consultorio", () => {
  it("guarda lo leído de la base para que lo usen los impresos", () => {
    setEmpresa(COMPLETA);
    expect(getEmpresa().nombre).toBe(COMPLETA.nombre);
    expect(getEmpresa().ruc).toBe("80012345-6");
  });

  it("con el nombre vacío se queda con el predeterminado", () => {
    // Una fila a medio cargar no puede dejar los impresos sin encabezado.
    setEmpresa({ ...COMPLETA, nombre: "   " });
    expect(getEmpresa().nombre).toBe(EMPRESA_PREDETERMINADA.nombre);
  });

  it("ignora un dato nulo en vez de romper", () => {
    setEmpresa(COMPLETA);
    setEmpresa(null);
    expect(getEmpresa().nombre).toBe(COMPLETA.nombre);
  });
});

describe("línea de contacto del encabezado", () => {
  it("arma dirección, teléfono y RUC separados por puntos", () => {
    expect(lineaContacto(COMPLETA)).toBe(
      "Av. Mcal. López 1234 · Tel: 0983 559 700 · RUC: 80012345-6"
    );
  });

  it("no deja separadores sueltos cuando faltan datos", () => {
    expect(lineaContacto({ ...COMPLETA, telefono: null, ruc: null })).toBe("Av. Mcal. López 1234");
    expect(lineaContacto({ ...COMPLETA, direccion: null, telefono: null })).toBe("RUC: 80012345-6");
  });

  it("queda vacía si no se cargó ningún dato de contacto", () => {
    expect(lineaContacto(EMPRESA_PREDETERMINADA)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// El encabezado impreso
// ---------------------------------------------------------------------------

/** Imprime una receta mínima y devuelve el HTML que quedó en el iframe. */
async function htmlDeLaReceta(numero = "R-00007"): Promise<string> {
  imprimirReceta({
    numero,
    fecha: "6/8/2026",
    pacienteNombre: "González, María",
    medicamentos: [{ medicamento: "Amoxicilina 500 mg", dosis: "1 cápsula",
                     frecuencia: "c/8 horas", duracion: "7 días", indicaciones: null }],
  });
  await new Promise((r) => setTimeout(r, 350));
  const iframe = document.getElementById("anp-print-iframe") as HTMLIFrameElement;
  return iframe.contentWindow!.document.documentElement.outerHTML;
}

describe("encabezado de los impresos", () => {
  it("saca el nombre y el contacto de los datos del consultorio", async () => {
    setEmpresa(COMPLETA);
    const html = await htmlDeLaReceta();
    expect(html).toContain(COMPLETA.nombre);
    expect(html).toContain("Av. Mcal. López 1234");
    expect(html).toContain("RUC: 80012345-6");
    expect(html).toContain(COMPLETA.logo_url);
  });

  it("no escapa el subtítulo dos veces", async () => {
    // Pasó de verdad: el separador iba como "&nbsp;" y al escaparse otra vez
    // salía escrito "&nbsp;" en el papel, en lugar de un espacio.
    setEmpresa(COMPLETA);
    const html = await htmlDeLaReceta();
    expect(html).not.toContain("&amp;nbsp;");
    expect(html).toContain("R-00007");
  });

  it("sin datos cargados imprime igual, con el nombre predeterminado", async () => {
    const html = await htmlDeLaReceta();
    expect(html).toContain(EMPRESA_PREDETERMINADA.nombre);
    // Sin logo no tiene que quedar una etiqueta de imagen vacía.
    expect(html).not.toContain('<img src="" ');
  });

  it("escapa lo que escribió el usuario en el nombre del consultorio", async () => {
    setEmpresa({ ...COMPLETA, nombre: 'Odonto <b>"X"</b> & Cía' });
    const html = await htmlDeLaReceta();
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain('<b>"X"</b>');
  });
});
