import { describe, it, expect, beforeEach } from "vitest";
import {
  EMPRESA_PREDETERMINADA, getEmpresa, setEmpresa, lineaContacto,
  normalizarColor, aclararColor,
} from "@/lib/clinica";
import { imprimirReceta, imprimirComprobantePagos, imprimirPresupuesto } from "@/lib/imprimir";

const COMPLETA = {
  nombre: "CONSULTORIO ODONTOLÓGICO MOVA DENT",
  nombre_corto: "Mova Dent",
  icono_url: null,
  color_primario: "#0e7490",
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
  it("arma dirección y teléfono separados por guiones", () => {
    expect(lineaContacto(COMPLETA)).toBe("Av. Mcal. López 1234 - Tel: 0983 559 700");
  });

  it("si no se cargó dirección, queda solo el teléfono", () => {
    expect(lineaContacto({ ...COMPLETA, direccion: null })).toBe("Tel: 0983 559 700");
  });

  it("usa el teléfono CARGADO, no uno escrito en el código", () => {
    // Hasta el 2026-10-01 salía siempre el de Mova Dent, cargado o no.
    expect(lineaContacto({ ...COMPLETA, telefono: "021 445 900" })).toContain("021 445 900");
    expect(lineaContacto({ ...COMPLETA, telefono: "021 445 900" })).not.toContain("0981 522 615");
  });

  it("sin datos cargados no inventa ninguno", () => {
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

async function htmlDelPresupuesto(): Promise<string> {
  imprimirPresupuesto({
    pacienteNombre: "González, María",
    titulo: "Restauración",
    fecha: "6/8/2026",
    estado: "Aprobado",
    total: 100000,
    saldoPendiente: 100000,
    detalles: [{ tratamiento: "Resina", costo: 100000, descuento: 0 }],
    pagos: [],
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
    expect(html).toContain(COMPLETA.logo_url);
  });

  it("sin datos cargados imprime igual, con el nombre predeterminado", async () => {
    const html = await htmlDelComprobante();
    expect(html).toContain(EMPRESA_PREDETERMINADA.nombre);
    // Sin logo no tiene que quedar una etiqueta de imagen vacía.
    expect(html).not.toContain('<img src="" ');
  });

  it("sin logo cargado no imprime ninguna imagen, y menos la de otra empresa", async () => {
    const html = await htmlDelComprobante();
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/mova/i);
  });

  it("con logo cargado imprime ese", async () => {
    setEmpresa(COMPLETA);
    const html = await htmlDelComprobante();
    expect(html).toContain(COMPLETA.logo_url);
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

  it("no imprime el RUC en los presupuestos", async () => {
    setEmpresa(COMPLETA);
    const html = await htmlDelPresupuesto();
    expect(html).not.toContain("RUC");
    expect(html).not.toContain(COMPLETA.ruc);
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

  it("lleva el RP/ y, con logo cargado, la marca de agua", async () => {
    setEmpresa(COMPLETA);
    const html = await htmlDeLaReceta();
    expect(html).toContain("RP/");
    expect(html).toContain("opacity:0.08");
  });

  it("sin logo propio la banda lleva el nombre; con logo propio, el logo", async () => {
    const sinLogo = await htmlDeLaReceta();
    expect(sinLogo).not.toContain("<img");
    expect(sinLogo).toContain(EMPRESA_PREDETERMINADA.nombre_corto);
    setEmpresa(COMPLETA);
    expect(await htmlDeLaReceta()).toContain(COMPLETA.logo_url);
  });

  it("sin teléfono cargado no imprime uno ajeno", async () => {
    setEmpresa({ ...COMPLETA, telefono: null });
    expect(await htmlDeLaReceta()).not.toContain("0981 522 615");
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

// ---------------------------------------------------------------------------
// Que el sistema se pueda entregar a otro consultorio
// ---------------------------------------------------------------------------

describe("color de la marca", () => {
  it("acepta un color normal y lo deja en minúsculas", () => {
    expect(normalizarColor("#7C3AED")).toBe("#7c3aed");
  });

  it("completa la forma corta de tres dígitos", () => {
    expect(normalizarColor("#0AF")).toBe("#00aaff");
  });

  it("descarta cualquier cosa que no sea un color", () => {
    // El valor entra en el `style` del impreso: algo inválido rompería el CSS
    // del documento y el papel saldría sin la banda.
    for (const malo of ["rojo", "", "  ", "#12345", "red; background:url(x)", null, undefined]) {
      expect(normalizarColor(malo)).toBe(EMPRESA_PREDETERMINADA.color_primario);
    }
  });

  it("aclara hacia el blanco para armar el degradado", () => {
    expect(aclararColor("#000000", 0.5)).toBe("#808080");
    expect(aclararColor("#ffffff", 0.5)).toBe("#ffffff");
    // Con un solo color cargado se arma la variante clara sola.
    expect(aclararColor("#7c3aed")).not.toBe("#7c3aed");
  });
});

describe("la receta se adapta a otro consultorio", () => {
  const OTRO = {
    nombre: "CENTRO ODONTOLÓGICO SONRISA PLUS",
    nombre_corto: "Sonrisa+",
    ruc: "80099887-1",
    direccion: "Av. España 850",
    telefono: "021 445 900",
    email: null,
    logo_url: "data:image/png;base64,OTROLOGO",
    icono_url: null,
    color_primario: "#7c3aed",
  };

  it("usa el color, el logo y los datos del otro consultorio", async () => {
    setEmpresa(OTRO);
    const html = await htmlDeLaReceta();
    expect(html).toContain("#7c3aed");
    expect(html).toContain("data:image/png;base64,OTROLOGO");
    expect(html).toContain("Av. España 850");
    expect(html).toContain("021 445 900");
  });

  it("NO le imprime nada de Mova Dent", async () => {
    // Sería la marca de otra empresa en un documento ajeno.
    setEmpresa(OTRO);
    const html = await htmlDeLaReceta();
    expect(html).not.toMatch(/mova/i);
    expect(html).not.toContain("0981 522 615");
  });

  it("de marca de agua usa el LOGO, no el ícono, aunque estén los dos", async () => {
    // El ícono está hecho para el recuadro del menú y la pestaña, así que suele
    // tener fondo sólido: de marca de agua sería un cuadrado gris en el medio
    // de la receta. El logo se hace transparente porque va sobre documentos.
    setEmpresa({ ...OTRO, icono_url: "data:image/png;base64,OTROICONO" });
    const html = await htmlDeLaReceta();
    expect(html).toContain("data:image/png;base64,OTROLOGO");
  });

  it("con ícono y sin logo, usa el ícono de marca de agua", async () => {
    setEmpresa({ ...OTRO, logo_url: null, icono_url: "data:image/png;base64,SOLOICONO" });
    const html = await htmlDeLaReceta();
    expect(html).toContain("data:image/png;base64,SOLOICONO");
  });

  it("sin nada personalizado sale limpia: sin marca de agua ni logo ajeno", async () => {
    const html = await htmlDeLaReceta();
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/mova/i);
  });
});
