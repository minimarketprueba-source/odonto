import { describe, it, expect, beforeEach } from "vitest";
import {
  EMPRESA_PREDETERMINADA, getEmpresa, setEmpresa, lineaContacto,
} from "@/lib/clinica";
import { imprimirReceta, imprimirComprobantePagos } from "@/lib/imprimir";
import { LOGO_IMPRESION_PREDETERMINADO } from "@/lib/logo-impresion-base64";
import { LOGO_BANDA_PREDETERMINADO, MARCA_AGUA_DIENTE } from "@/lib/recetario-base64";

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

/**
 * Imprime un comprobante de pagos y devuelve el HTML del iframe.
 *
 * Se usa el comprobante y no la receta para probar el encabezado compartido:
 * la receta tiene su propio diseño (el recetario A5 del consultorio) y NO pasa
 * por `encabezadoDocumento`. Los otros cinco impresos sí.
 */
async function htmlDelComprobante(): Promise<string> {
  imprimirComprobantePagos({
    pacienteNombre: "González, María",
    fecha: "6/8/2026",
    totalCotizado: 100000,
    totalAbonado: 100000,
    saldoPendiente: 0,
    pagos: [{ fecha: "1/8/2026", monto: 100000, metodo: "Efectivo" }],
  });
  await new Promise((r) => setTimeout(r, 350));
  const iframe = document.getElementById("anp-print-iframe") as HTMLIFrameElement;
  return iframe.contentWindow!.document.documentElement.outerHTML;
}

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

describe("encabezado compartido de los impresos", () => {
  it("saca el nombre y el contacto de los datos del consultorio", async () => {
    setEmpresa(COMPLETA);
    const html = await htmlDelComprobante();
    expect(html).toContain(COMPLETA.nombre);
    expect(html).toContain("Av. Mcal. López 1234");
    expect(html).toContain("RUC: 80012345-6");
    expect(html).toContain(COMPLETA.logo_url);
  });

  it("sin datos cargados imprime igual, con el nombre predeterminado", async () => {
    const html = await htmlDelComprobante();
    expect(html).toContain(EMPRESA_PREDETERMINADA.nombre);
    // Sin logo no tiene que quedar una etiqueta de imagen vacía.
    expect(html).not.toContain('<img src="" ');
  });

  it("sin logo cargado usa el de Mova Dent, para que el papel no salga pelado", async () => {
    const html = await htmlDelComprobante();
    expect(html).toContain(LOGO_IMPRESION_PREDETERMINADO.slice(0, 80));
  });

  it("el logo que subió el administrador le gana al predeterminado", async () => {
    setEmpresa(COMPLETA);
    const html = await htmlDelComprobante();
    expect(html).toContain(COMPLETA.logo_url);
    expect(html).not.toContain(LOGO_IMPRESION_PREDETERMINADO.slice(0, 80));
  });

  it("escapa lo que escribió el usuario en el nombre del consultorio", async () => {
    setEmpresa({ ...COMPLETA, nombre: 'Odonto <b>"X"</b> & Cía' });
    const html = await htmlDelComprobante();
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain('<b>"X"</b>');
  });

  it("no escapa el subtítulo dos veces", async () => {
    // Pasó de verdad: el separador iba como "&nbsp;" y al escaparse otra vez
    // salía escrito "&nbsp;" en el papel, en lugar de un espacio.
    setEmpresa(COMPLETA);
    const html = await htmlDelComprobante();
    expect(html).not.toContain("&amp;nbsp;");
  });
});

describe("la receta sigue el recetario A5 del consultorio", () => {
  it("se imprime en A5, no en A4", async () => {
    // Es el tamaño del talonario de papel: una receta impresa desde el sistema
    // y una del talonario tienen que ser el mismo papel.
    const html = await htmlDeLaReceta();
    expect(html).toContain("size: A5");
    expect(html).not.toContain("size: A4");
  });

  it("la banda lleva el teléfono y la dirección del consultorio", async () => {
    setEmpresa({
      ...COMPLETA,
      telefono: "0981 522 615 / 0971 934 679",
      direccion: "Mariscal Estigarribia y Pedro Melo de Portugal",
    });
    const html = await htmlDeLaReceta();
    expect(html).toContain("0981 522 615 / 0971 934 679");
    expect(html).toContain("Mariscal Estigarribia y Pedro Melo de Portugal");
  });

  it("lleva el RP/ y la marca de agua del diseño", async () => {
    const html = await htmlDeLaReceta();
    expect(html).toContain("RP/");
    expect(html).toContain(MARCA_AGUA_DIENTE.slice(0, 60));
  });

  it("sin logo propio usa el de la banda; con logo propio, el del administrador", async () => {
    expect(await htmlDeLaReceta()).toContain(LOGO_BANDA_PREDETERMINADO.slice(0, 60));
    setEmpresa(COMPLETA);
    const propio = await htmlDeLaReceta();
    expect(propio).toContain(COMPLETA.logo_url);
    expect(propio).not.toContain(LOGO_BANDA_PREDETERMINADO.slice(0, 60));
  });

  it("una receta anulada se imprime marcada y avisando que no vale", async () => {
    const html = await htmlDeLaReceta("R-00009");
    expect(html).not.toContain("ANULADA");
    imprimirReceta({
      numero: "R-00009", fecha: "6/8/2026", pacienteNombre: "González, María",
      medicamentos: [{ medicamento: "Amoxicilina 500 mg" }],
      anulada: true, motivoAnulacion: "Medicamento equivocado",
    });
    await new Promise((r) => setTimeout(r, 350));
    const iframe = document.getElementById("anp-print-iframe") as HTMLIFrameElement;
    const anulada = iframe.contentWindow!.document.documentElement.outerHTML;
    expect(anulada).toContain("ANULADA");
    expect(anulada).toContain("No es válida para su dispensación");
    expect(anulada).toContain("Medicamento equivocado");
  });
});
