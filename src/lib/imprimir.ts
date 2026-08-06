import { getEmpresa, lineaContacto } from "@/lib/clinica";

/**
 * El encabezado que comparten todos los impresos: logo, nombre del
 * consultorio, datos de contacto y título del documento.
 *
 * Está acá una sola vez porque los datos ahora se editan en Mantenimiento →
 * Consultorio: si el usuario cambia la dirección o el RUC, tiene que cambiar
 * en los cinco impresos a la vez. Antes cada uno traía el nombre escrito a
 * mano y bastaba con olvidarse de uno.
 *
 * `getEmpresa()` y no un hook: los impresos no son componentes de React.
 */
function encabezadoDocumento(
  tituloDoc: string,
  opciones: { sub?: string | null; tamNombre?: number; margen?: number } = {}
): string {
  const { sub = null, tamNombre = 18, margen = 16 } = opciones;
  const empresa = getEmpresa();
  const contacto = lineaContacto(empresa);

  return `
      <div style="text-align:center; margin-bottom:${margen}px; border-bottom:2px solid #0f172a; padding-bottom:10px;">
        ${
          empresa.logo_url
            ? `<img src="${empresa.logo_url}" alt="" style="max-height:54px; max-width:230px; display:block; margin:0 auto 6px;">`
            : ""
        }
        <h1 style="margin:0; font-size:${tamNombre}px; color:#1e3a8a;">${esc(empresa.nombre)}</h1>
        ${contacto ? `<p style="margin:3px 0 0; font-size:10px; color:#64748b;">${esc(contacto)}</p>` : ""}
        <h2 style="margin:5px 0 0; font-size:14px;">${esc(tituloDoc)}</h2>
        ${sub ? `<p style="margin:3px 0 0; font-size:11px; color:#475569;">${esc(sub)}</p>` : ""}
      </div>`;
}

export function cleanQrText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");
}

export function formatTipoGrado(tipo?: string | null, grado?: string | null): string {
  const t = tipo?.trim();
  const g = grado?.trim();

  if (t && g) {
    if (g.toLowerCase().includes(t.toLowerCase())) {
      return g;
    }
    return `${t} — ${g}`;
  }
  return g || t || "—";
}

function ejecutarImpresionIframe(titulo: string, bodyContent: string) {
  // Eliminar iframe previo si existe
  const idIframe = "anp-print-iframe";
  const viejo = document.getElementById(idIframe);
  if (viejo) viejo.remove();

  const iframe = document.createElement("iframe");
  iframe.id = idIframe;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.zIndex = "-9999";
  iframe.title = titulo;

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm 15mm 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 14px;
          }
          .header h1 {
            font-size: 17px;
            font-weight: 800;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header p.sub {
            font-size: 10px;
            font-weight: 700;
            color: #334155;
            margin: 2px 0 0 0;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 14px;
            font-weight: 700;
            margin: 6px 0 0 0;
            text-transform: uppercase;
          }
          .header p.meta {
            font-size: 10px;
            color: #64748b;
            margin: 2px 0 0 0;
          }
          .box-paciente {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 12px;
          }
          .box-reposo {
            border: 2px solid #0284c7;
            border-radius: 6px;
            padding: 14px;
            background-color: #fff;
          }
          .badge-reposo {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 12px;
          }
          .badge-reposo .tipo {
            font-size: 15px;
            font-weight: 800;
            color: #b91c1c;
            text-transform: uppercase;
            margin: 2px 0 0 0;
          }
          .dates-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .footer-qr {
            margin-top: 24px;
            padding-top: 14px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .firmas {
            text-align: center;
          }
          .linea-firma {
            width: 190px;
            border-bottom: 1px solid #000;
            margin: 0 auto 4px auto;
          }
          .consulta-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 10px;
            background: #fff;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `);
  doc.close();

  // Esperar montaje y llamar a print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Error al imprimir iframe:", e);
    }
  }, 250);
}

export interface DatosImpresionProductividad {
  especialidadNombre: string;
  especialistaNombre: string;
  especialistaColegiatura?: string | null;
  fecha: string;
  horario?: string | null;
  unidad?: string | null;
  tipoPeriodo?: "diario" | "semanal" | "mensual" | "personalizado";
  periodoEtiqueta?: string;
  filas: {
    index: number;
    pacienteNombre: string;
    pacienteJerarquia: string;
    pacienteSexo: string;
    diagnostico: string;
    tratamiento: string;
  }[];
  totalAtendidos: number;
  totalMasculino: number;
  totalFemenino: number;
}

export function imprimirPlanillaProductividad(datos: DatosImpresionProductividad) {
  let tituloPrincipal = "INFORME DIARIO DE PRODUCCIÓN ODONTOLÓGICA";
  if (datos.tipoPeriodo === "semanal") {
    tituloPrincipal = "INFORME SEMANAL DE PRODUCCIÓN ODONTOLÓGICA";
  } else if (datos.tipoPeriodo === "mensual") {
    tituloPrincipal = "INFORME MENSUAL DE PRODUCCIÓN ODONTOLÓGICA";
  } else if (datos.tipoPeriodo === "personalizado") {
    tituloPrincipal = "INFORME DE PRODUCCIÓN ODONTOLÓGICA";
  }

  const tituloDoc = tituloPrincipal;

  const trs = datos.filas.map((f) => `
    <tr>
      <td style="padding: 6px 4px; border: 1px solid #334155; text-align: center; font-weight: bold; font-size: 11px;">${f.index}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 12px; font-weight: 600; color: #0f172a;">${f.pacienteNombre}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 11px; text-align: center; color: #334155;">${f.pacienteJerarquia}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 11px; text-align: center; font-weight: bold; color: ${f.pacienteSexo === "M" ? "#1d4ed8" : "#be185d"};">${f.pacienteSexo}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 11px; color: #1e293b;">${f.diagnostico}</td>
      <td style="padding: 6px; border: 1px solid #334155; font-size: 11px; color: #1e293b;">${f.tratamiento}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 15px; color: #0f172a; max-width: 900px; margin: 0 auto;">
      <!-- CABECERA INSTITUCIONAL OFICIAL -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="text-align: left;">
          <h3 style="margin: 0; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">POLICÍA NACIONAL DEL PARAGUAY</h3>
          <h2 style="margin: 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">HOSPITAL CENTRAL DE POLICÍA "RIGOBERTO CABALLERO"</h2>
          <h1 style="margin: 4px 0 0 0; font-size: 15px; font-weight: 900; color: #1e3a8a; text-transform: UPPERCASE; letter-spacing: 0.5px;">${tituloPrincipal}</h1>
          <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #2563eb;">PLANILLA DE PRODUCTIVIDAD POR ESPECIALIDAD Y PROFESIONAL</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #334155; line-height: 1.4;">
          <p style="margin: 0; font-weight: bold; color: #0f172a;">${esc(getEmpresa().nombre)}</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Emisión: ${new Date().toLocaleDateString("es-PY")}</p>
        </div>
      </div>

      <!-- METADATOS DE CABECERA -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px;">
        <div><strong>Especialidad:</strong> <span style="color: #1e40af; font-weight: bold; text-transform: uppercase;">${datos.especialidadNombre}</span></div>
        <div><strong>Especialista / Profesional:</strong> <span style="font-weight: bold; color: #0f172a;">${datos.especialistaNombre}</span> ${datos.especialistaColegiatura ? `(Reg. N° ${datos.especialistaColegiatura})` : ""}</div>
        <div><strong>Período de Atención:</strong> <span style="font-weight: bold; color: #0369a1;">${datos.periodoEtiqueta || datos.fecha}</span></div>
        <div><strong>Horario / Turno:</strong> <span style="font-weight: bold;">${datos.horario || "13:00 a 19:00"} hs</span></div>
      </div>

      <!-- TABLA DE PACIENTES ATENDIDOS -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px;" border="1">
        <thead>
          <tr style="background-color: #1e293b; color: #ffffff;">
            <th style="padding: 8px 4px; width: 35px; text-align: center;">Nº</th>
            <th style="padding: 8px; text-align: left;">Nombre y Apellido</th>
            <th style="padding: 8px; width: 110px; text-align: center;">Documento</th>
            <th style="padding: 8px; width: 45px; text-align: center;">Sexo</th>
            <th style="padding: 8px; text-align: left;">Pieza y procedimiento</th>
            <th style="padding: 8px; text-align: left;">Nota clínica</th>
          </tr>
        </thead>
        <tbody>
          ${trs.length > 0 ? trs : `<tr><td colspan="6" style="padding: 16px; text-align: center; color: #64748b; font-style: italic;">Sin atenciones registradas en la fecha seleccionada.</td></tr>`}
        </tbody>
      </table>

      <!-- RESUMEN DE PRODUCTIVIDAD -->
      <div style="display: flex; justify-content: space-between; align-items: center; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 14px; margin-bottom: 40px; font-size: 12px; font-weight: bold; color: #1e3a8a;">
        <span>TOTAL PACIENTES ATENDIDOS: ${datos.totalAtendidos}</span>
        <div style="display: flex; gap: 16px; font-size: 11px;">
          <span style="color: #1d4ed8;">Masculino (M): ${datos.totalMasculino}</span>
          <span style="color: #be185d;">Femenino (F): ${datos.totalFemenino}</span>
        </div>
      </div>

      <!-- FIRMAS OFICIALES -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; text-align: center; page-break-inside: avoid; margin-top: 50px;">
        <div>
          <div style="width: 220px; border-bottom: 1px solid #0f172a; margin: 0 auto 6px auto;"></div>
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">${datos.especialistaNombre}</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #475569;">${datos.especialidadNombre} ${datos.especialistaColegiatura ? `· Reg. N° ${datos.especialistaColegiatura}` : ""}</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Firma y Sello del Especialista / Profesional</p>
        </div>
        <div>
          <div style="width: 220px; border-bottom: 1px solid #0f172a; margin: 0 auto 6px auto;"></div>
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">V° B° DIRECCIÓN</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #475569;">${esc(getEmpresa().nombre)}</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Firma y Sello Autorizado</p>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

export interface DatosImpresionPresupuesto {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  titulo: string;
  fecha: string;
  estado: string;
  total: number;
  saldoPendiente: number;
  detalles: {
    pieza?: number | null;
    cara?: string | null;
    tratamiento: string;
    costo: number;
    descuento: number;
  }[];
  pagos: {
    fecha: string;
    monto: number;
    metodo: string;
  }[];
}

export function imprimirPresupuesto(datos: DatosImpresionPresupuesto) {
  const tituloDoc = "PRESUPUESTO ODONTOLÓGICO";

  const trsDetalles = datos.detalles.map((d) => `
    <tr>
      <td style="padding: 6px; border: 1px solid #cbd5e1;">${d.pieza ? `${d.pieza} (${d.cara || "Completo"})` : "Boca entera"}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1;">${d.tratamiento}</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${d.costo.toLocaleString()} ₲</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">-${d.descuento.toLocaleString()} ₲</td>
      <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${(d.costo - d.descuento).toLocaleString()} ₲</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a; max-width: 800px; margin: 0 auto;">
      ${encabezadoDocumento(tituloDoc, { sub: `Fecha: ${datos.fecha}`, tamNombre: 18, margen: 20 })}

      <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #f8fafc;">
        <p style="margin: 4px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin: 4px 0;"><strong>Documento:</strong> ${datos.pacienteDocumento || "—"}</p>
        <p style="margin: 4px 0;"><strong>Plan de Tratamiento:</strong> ${datos.titulo} <span style="padding: 2px 6px; background-color: #e2e8f0; border-radius: 4px; font-size: 10px; text-transform: uppercase;">${datos.estado}</span></p>
      </div>

      <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">DETALLE DE TRATAMIENTOS</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Diente/Cara</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Tratamiento</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Costo</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Descuento</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${trsDetalles || `<tr><td colspan="5" style="text-align:center; padding: 10px;">Sin procedimientos</td></tr>`}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="width: 250px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #f1f5f9;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Total Cotizado:</span>
            <strong>${datos.total.toLocaleString()} ₲</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Total Abonado:</span>
            <strong style="color: #16a34a;">${(datos.total - datos.saldoPendiente).toLocaleString()} ₲</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 14px;">
            <strong>SALDO PENDIENTE:</strong>
            <strong style="color: #dc2626;">${datos.saldoPendiente.toLocaleString()} ₲</strong>
          </div>
        </div>
      </div>

      <div style="margin-top: 60px; display: flex; justify-content: space-around; text-align: center;">
        <div>
          <div style="width: 200px; border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
          <span style="font-size: 11px;">Firma del Paciente</span>
        </div>
        <div>
          <div style="width: 200px; border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
          <span style="font-size: 11px;">Firma y Sello del Odontólogo</span>
        </div>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

// ============================================================================
// Planilla del historial completo de un paciente
// ============================================================================
// Es el papel que se archiva en la carpeta del paciente o se le entrega: todo
// lo que se le hizo a lo largo del tiempo, con lo cobrado y lo que debe.

export interface DatosPlanillaHistorial {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteEdad?: string | null;
  pacienteTelefono?: string | null;
  /** Cada procedimiento asentado, del más viejo al más nuevo. */
  tratamientos: {
    fecha: string;
    pieza?: string | null;
    procedimiento: string;
    nota?: string | null;
    profesional?: string | null;
  }[];
  /** Los planes de tratamiento con sus importes. */
  planes: {
    titulo: string;
    fecha: string;
    estado: string;
    total: number;
    abonado: number;
    saldo: number;
  }[];
  pagos: { fecha: string; monto: number; metodo: string; plan?: string | null }[];
  totalCobrado: number;
  totalAdeudado: number;
}

export function imprimirPlanillaHistorial(datos: DatosPlanillaHistorial) {
  const tituloDoc = "HISTORIAL CLÍNICO ODONTOLÓGICO";

  const sinDatos = (columnas: number, texto: string) =>
    `<tr><td colspan="${columnas}" style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; color: #64748b; font-style: italic;">${texto}</td></tr>`;

  const filasTratamientos = datos.tratamientos.length
    ? datos.tratamientos.map((t, i) => `
        <tr>
          <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; white-space: nowrap;">${t.fecha}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${t.pieza || "—"}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1;">${t.procedimiento}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-size: 10px;">${t.nota || ""}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-size: 10px;">${t.profesional || "—"}</td>
        </tr>
      `).join("")
    : sinDatos(6, "Todavía no se registraron tratamientos.");

  const filasPlanes = datos.planes.length
    ? datos.planes.map((p) => `
        <tr>
          <td style="padding: 5px; border: 1px solid #cbd5e1;">${p.titulo}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; white-space: nowrap;">${p.fecha}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px;">${p.estado}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">${p.total.toLocaleString()} ₲</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; color: #15803d;">${p.abonado.toLocaleString()} ₲</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: ${p.saldo > 0 ? "#b91c1c" : "#15803d"};">${p.saldo.toLocaleString()} ₲</td>
        </tr>
      `).join("")
    : sinDatos(6, "Todavía no se cargaron planes de tratamiento.");

  const filasPagos = datos.pagos.length
    ? datos.pagos.map((p) => `
        <tr>
          <td style="padding: 5px; border: 1px solid #cbd5e1; white-space: nowrap;">${p.fecha}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1;">${p.metodo}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-size: 10px;">${p.plan || "—"}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #15803d;">${p.monto.toLocaleString()} ₲</td>
        </tr>
      `).join("")
    : sinDatos(4, "Todavía no se registraron pagos.");

  const encabezadoTabla = (columnas: string[]) =>
    `<tr style="background-color: #1e293b; color: #ffffff;">${columnas
      .map((c) => `<th style="padding: 6px; border: 1px solid #334155; text-align: left; font-size: 11px;">${c}</th>`)
      .join("")}</tr>`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 18px; color: #0f172a; max-width: 900px; margin: 0 auto; font-size: 12px;">
      ${encabezadoDocumento(tituloDoc, { sub: `Emitido el ${new Date().toLocaleDateString("es-PY")}`, tamNombre: 17, margen: 16 })}

      <div style="margin-bottom: 14px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #f8fafc;">
        <p style="margin: 3px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin: 3px 0;"><strong>Documento:</strong> ${datos.pacienteDocumento || "—"}${
          datos.pacienteEdad ? ` &nbsp;·&nbsp; <strong>Edad:</strong> ${datos.pacienteEdad}` : ""
        }${datos.pacienteTelefono ? ` &nbsp;·&nbsp; <strong>Teléfono:</strong> ${datos.pacienteTelefono}` : ""}</p>
      </div>

      <h3 style="font-size: 12px; margin: 14px 0 6px; color: #1e3a8a;">TRATAMIENTOS REALIZADOS</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>${encabezadoTabla(["Nº", "Fecha", "Pieza", "Procedimiento", "Nota clínica", "Profesional"])}</thead>
        <tbody>${filasTratamientos}</tbody>
      </table>

      <h3 style="font-size: 12px; margin: 14px 0 6px; color: #1e3a8a;">PLANES DE TRATAMIENTO</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>${encabezadoTabla(["Plan", "Fecha", "Estado", "Cotizado", "Abonado", "Saldo"])}</thead>
        <tbody>${filasPlanes}</tbody>
      </table>

      <h3 style="font-size: 12px; margin: 14px 0 6px; color: #1e3a8a;">PAGOS RECIBIDOS</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>${encabezadoTabla(["Fecha", "Método", "Plan", "Monto"])}</thead>
        <tbody>${filasPagos}</tbody>
      </table>

      <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: flex-end;">
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 14px; background-color: #f0fdf4; text-align: right;">
          <div style="font-size: 10px; color: #475569; text-transform: uppercase;">Total cobrado</div>
          <div style="font-size: 15px; font-weight: bold; color: #15803d;">${datos.totalCobrado.toLocaleString()} ₲</div>
        </div>
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 14px; background-color: ${
          datos.totalAdeudado > 0 ? "#fef2f2" : "#f8fafc"
        }; text-align: right;">
          <div style="font-size: 10px; color: #475569; text-transform: uppercase;">Saldo adeudado</div>
          <div style="font-size: 15px; font-weight: bold; color: ${datos.totalAdeudado > 0 ? "#b91c1c" : "#15803d"};">${datos.totalAdeudado.toLocaleString()} ₲</div>
        </div>
      </div>

      <div style="margin-top: 45px; text-align: center;">
        <div style="width: 220px; border-bottom: 1px solid #000; margin: 0 auto 5px;"></div>
        <span style="font-size: 10px;">Firma y Sello del Odontólogo</span>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

// ============================================================================
// Periodontograma
// ============================================================================

export interface DatosImpresionPeriodontograma {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  fecha: string;
  profesional?: string | null;
  arcadas: {
    titulo: string;
    dientes: {
      numero: number;
      datos: {
        sitios: Record<string, { ps?: number | null; sangra?: boolean; placa?: boolean } | undefined>;
        movilidad?: number | null;
        furca?: number | null;
        ausente?: boolean;
      };
    }[];
  }[];
  resumen: {
    sitiosMedidos: number;
    porcentajeSangrado: number;
    porcentajePlaca: number;
    bolsas4a5: number;
    bolsas6omas: number;
    psPromedio: number;
    dientesConMovilidad: number;
    dientesAusentes: number;
  };
  observaciones?: string | null;
}

export function imprimirPeriodontograma(datos: DatosImpresionPeriodontograma) {
  const tituloDoc = "PERIODONTOGRAMA";
  const ORDEN_SITIOS = ["mv", "v", "dv", "mp", "p", "dp"];

  // En papel el color no siempre está disponible, así que la profundidad se
  // marca además con un símbolo: * para 4-5 mm y ** para 6 mm o más.
  const celdaPS = (ps?: number | null) => {
    if (ps === null || ps === undefined) return `<td style="border:1px solid #cbd5e1; text-align:center; padding:2px;">—</td>`;
    const fondo = ps >= 6 ? "#fecaca" : ps >= 4 ? "#fde68a" : "#ffffff";
    const marca = ps >= 6 ? "**" : ps >= 4 ? "*" : "";
    return `<td style="border:1px solid #cbd5e1; text-align:center; padding:2px; background:${fondo}; font-weight:${ps >= 4 ? "bold" : "normal"};">${ps}${marca}</td>`;
  };

  const tablaArcada = (arcada: DatosImpresionPeriodontograma["arcadas"][number]) => {
    const encabezado = arcada.dientes
      .map((d) => `<th style="border:1px solid #334155; padding:2px; font-size:9px; background:#1e293b; color:#fff;">${d.numero}</th>`)
      .join("");

    const filaSitio = (sitio: string, etiqueta: string) => `
      <tr>
        <td style="border:1px solid #cbd5e1; padding:2px; font-size:9px; background:#f1f5f9; white-space:nowrap;">${etiqueta}</td>
        ${arcada.dientes.map((d) => (d.datos.ausente ? `<td style="border:1px solid #cbd5e1; text-align:center; background:#e2e8f0;">·</td>` : celdaPS(d.datos.sitios?.[sitio]?.ps))).join("")}
      </tr>`;

    const filaMarcas = (clave: "sangra" | "placa", etiqueta: string, simbolo: string) => `
      <tr>
        <td style="border:1px solid #cbd5e1; padding:2px; font-size:9px; background:#f1f5f9; white-space:nowrap;">${etiqueta}</td>
        ${arcada.dientes
          .map((d) => {
            const marcados = ORDEN_SITIOS.filter((s) => d.datos.sitios?.[s]?.[clave]).length;
            return `<td style="border:1px solid #cbd5e1; text-align:center; padding:2px; font-size:9px;">${marcados ? simbolo.repeat(Math.min(marcados, 3)) : ""}</td>`;
          })
          .join("")}
      </tr>`;

    const filaDiente = (clave: "movilidad" | "furca", etiqueta: string) => `
      <tr>
        <td style="border:1px solid #cbd5e1; padding:2px; font-size:9px; background:#f1f5f9; white-space:nowrap;">${etiqueta}</td>
        ${arcada.dientes.map((d) => `<td style="border:1px solid #cbd5e1; text-align:center; padding:2px; font-size:9px;">${d.datos[clave] ?? ""}</td>`).join("")}
      </tr>`;

    return `
      <h3 style="font-size:11px; margin:12px 0 4px; color:#1e3a8a;">${arcada.titulo}</h3>
      <table style="width:100%; border-collapse:collapse; font-size:10px;">
        <thead><tr><th style="border:1px solid #334155; padding:2px; background:#1e293b; color:#fff; font-size:9px;">Pieza</th>${encabezado}</tr></thead>
        <tbody>
          ${filaSitio("mv", "PS mesio-vest.")}
          ${filaSitio("v", "PS vestibular")}
          ${filaSitio("dv", "PS disto-vest.")}
          ${filaSitio("mp", "PS mesio-pal.")}
          ${filaSitio("p", "PS palatino")}
          ${filaSitio("dp", "PS disto-pal.")}
          ${filaMarcas("sangra", "Sangrado", "•")}
          ${filaMarcas("placa", "Placa", "▪")}
          ${filaDiente("movilidad", "Movilidad")}
          ${filaDiente("furca", "Furca")}
        </tbody>
      </table>`;
  };

  const tarjeta = (etiqueta: string, valor: string, color = "#0f172a") => `
    <div style="border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; text-align:center; min-width:80px;">
      <div style="font-size:9px; color:#475569; text-transform:uppercase;">${etiqueta}</div>
      <div style="font-size:14px; font-weight:bold; color:${color};">${valor}</div>
    </div>`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding:16px; color:#0f172a; max-width:1000px; margin:0 auto;">
      ${encabezadoDocumento(tituloDoc, { tamNombre: 16, margen: 12 })}

      <div style="margin-bottom:10px; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc; font-size:11px;">
        <p style="margin:2px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre} &nbsp;·&nbsp; <strong>Documento:</strong> ${datos.pacienteDocumento || "—"}</p>
        <p style="margin:2px 0;"><strong>Fecha del sondaje:</strong> ${datos.fecha}${datos.profesional ? ` &nbsp;·&nbsp; <strong>Profesional:</strong> ${datos.profesional}` : ""}</p>
      </div>

      ${datos.arcadas.map(tablaArcada).join("")}

      <p style="font-size:9px; color:#475569; margin:6px 0;">
        PS = profundidad de sondaje en mm. <strong>*</strong> 4-5 mm · <strong>**</strong> 6 mm o más ·
        <strong>•</strong> sangrado · <strong>▪</strong> placa (uno por sitio afectado) · <strong>·</strong> pieza ausente.
      </p>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; justify-content:center;">
        ${tarjeta("Sitios medidos", String(datos.resumen.sitiosMedidos))}
        ${tarjeta("Sangrado", `${datos.resumen.porcentajeSangrado}%`, "#b91c1c")}
        ${tarjeta("Placa", `${datos.resumen.porcentajePlaca}%`, "#1d4ed8")}
        ${tarjeta("Bolsas 4-5 mm", String(datos.resumen.bolsas4a5), "#b45309")}
        ${tarjeta("Bolsas ≥6 mm", String(datos.resumen.bolsas6omas), "#b91c1c")}
        ${tarjeta("PS promedio", `${datos.resumen.psPromedio} mm`)}
        ${tarjeta("Piezas ausentes", String(datos.resumen.dientesAusentes))}
      </div>

      ${
        datos.observaciones
          ? `<div style="margin-top:12px; padding:8px 10px; border:1px solid #cbd5e1; border-radius:6px;">
               <strong style="font-size:11px;">Observaciones:</strong>
               <p style="margin:4px 0 0; font-size:11px; white-space:pre-wrap;">${datos.observaciones}</p>
             </div>`
          : ""
      }

      <div style="margin-top:40px; text-align:center;">
        <div style="width:220px; border-bottom:1px solid #000; margin:0 auto 5px;"></div>
        <span style="font-size:10px;">Firma y Sello del Odontólogo</span>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

// ============================================================================
// Comprobante de pagos (estado de cuenta del paciente)
// ============================================================================
// Es el papel que se le entrega o se le manda al paciente. A diferencia de la
// planilla del historial, NO lleva nada clínico: solo la cuenta.

export interface DatosComprobantePagos {
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  fecha: string;
  planTitulo?: string | null;
  totalCotizado: number;
  totalAbonado: number;
  saldoPendiente: number;
  pagos: { fecha: string; monto: number; metodo: string; comentario?: string | null }[];
}

export function imprimirComprobantePagos(datos: DatosComprobantePagos) {
  const tituloDoc = "COMPROBANTE DE PAGOS";
  const gs = (n: number) => `${n.toLocaleString("es-PY")} ₲`;

  const filas = datos.pagos.length
    ? datos.pagos
        .map(
          (p, i) => `
      <tr>
        <td style="padding:6px; border:1px solid #cbd5e1; text-align:center;">${i + 1}</td>
        <td style="padding:6px; border:1px solid #cbd5e1; white-space:nowrap;">${p.fecha}</td>
        <td style="padding:6px; border:1px solid #cbd5e1; text-transform:capitalize;">${p.metodo}</td>
        <td style="padding:6px; border:1px solid #cbd5e1; font-size:11px; color:#475569;">${p.comentario || ""}</td>
        <td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; color:#15803d;">${gs(p.monto)}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="5" style="padding:12px; border:1px solid #cbd5e1; text-align:center; color:#64748b; font-style:italic;">Todavía no se registraron pagos.</td></tr>`;

  const saldado = datos.saldoPendiente <= 0;
  const aFavor = Math.max(0, datos.totalAbonado - datos.totalCotizado);

  const html = `
    <div style="font-family: Arial, sans-serif; padding:22px; color:#0f172a; max-width:720px; margin:0 auto;">
      ${encabezadoDocumento(tituloDoc, { sub: `Emitido el ${datos.fecha}`, tamNombre: 18, margen: 18 })}

      <div style="margin-bottom:16px; padding:10px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc;">
        <p style="margin:4px 0;"><strong>Paciente:</strong> ${datos.pacienteNombre}</p>
        <p style="margin:4px 0;"><strong>Documento:</strong> ${datos.pacienteDocumento || "—"}</p>
        ${datos.planTitulo ? `<p style="margin:4px 0;"><strong>Tratamiento:</strong> ${datos.planTitulo}</p>` : ""}
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="background:#1e293b; color:#fff;">
            <th style="padding:7px; border:1px solid #334155; width:34px;">Nº</th>
            <th style="padding:7px; border:1px solid #334155; text-align:left;">Fecha</th>
            <th style="padding:7px; border:1px solid #334155; text-align:left;">Método</th>
            <th style="padding:7px; border:1px solid #334155; text-align:left;">Observación</th>
            <th style="padding:7px; border:1px solid #334155; text-align:right;">Monto</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>

      <table style="width:100%; margin-top:16px; font-size:13px;">
        <tr>
          <td style="padding:5px 8px; text-align:right;">Total del tratamiento:</td>
          <td style="padding:5px 8px; text-align:right; width:150px;"><strong>${gs(datos.totalCotizado)}</strong></td>
        </tr>
        <tr>
          <td style="padding:5px 8px; text-align:right;">Total abonado:</td>
          <td style="padding:5px 8px; text-align:right; color:#15803d;"><strong>${gs(datos.totalAbonado)}</strong></td>
        </tr>
        <tr style="background:${saldado ? "#f0fdf4" : "#fef2f2"};">
          <td style="padding:8px; text-align:right; font-size:14px;"><strong>${
            aFavor > 0 ? "SALDO A FAVOR:" : "SALDO PENDIENTE:"
          }</strong></td>
          <td style="padding:8px; text-align:right; font-size:15px; color:${saldado ? "#15803d" : "#b91c1c"};">
            <strong>${gs(aFavor > 0 ? aFavor : datos.saldoPendiente)}</strong>
          </td>
        </tr>
      </table>

      ${
        saldado && aFavor === 0
          ? `<p style="margin-top:14px; text-align:center; color:#15803d; font-weight:bold;">Cuenta saldada. ¡Muchas gracias!</p>`
          : ""
      }

      <div style="margin-top:45px; text-align:center;">
        <div style="width:220px; border-bottom:1px solid #000; margin:0 auto 5px;"></div>
        <span style="font-size:11px;">Firma y Sello de la Clínica</span>
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}

// ============================================================================
// Receta odontológica
// ============================================================================
// El papel que se lleva el paciente a la farmacia. Lleva el número correlativo
// (R-00001) para poder encontrarla después, y la firma con el registro
// profesional de quien prescribe, que es lo que la hace válida.

/**
 * Escapa el texto que escribió el odontólogo antes de meterlo en el HTML.
 * Un nombre de medicamento con `<` o `&` rompería el impreso; acá el contenido
 * es tipeado a mano, así que no se puede confiar en que sea HTML válido.
 */
function esc(txt: string | null | undefined): string {
  return String(txt ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface DatosImpresionReceta {
  numero: string;
  fecha: string;
  pacienteNombre: string;
  pacienteDocumento?: string | null;
  pacienteEdad?: string | null;
  diagnostico?: string | null;
  indicaciones?: string | null;
  medicamentos: {
    medicamento: string;
    dosis?: string | null;
    frecuencia?: string | null;
    duracion?: string | null;
    indicaciones?: string | null;
  }[];
  profesionalNombre?: string | null;
  profesionalRegistro?: string | null;
  /** Si está anulada se imprime igual, pero marcada: sirve como constancia. */
  anulada?: boolean;
  motivoAnulacion?: string | null;
}

export function imprimirReceta(datos: DatosImpresionReceta) {
  const tituloDoc = "RECETA ODONTOLÓGICA";

  const filas = datos.medicamentos
    .map((m, i) => {
      // La posología va en una sola línea: así se lee de un vistazo en el
      // mostrador de la farmacia, que es donde se usa este papel.
      const posologia = [m.dosis, m.frecuencia, m.duracion]
        .filter((x) => x && String(x).trim())
        .map((x) => esc(x))
        .join(" &nbsp;·&nbsp; ");
      return `
      <div style="padding:10px 12px; border-bottom:1px dashed #cbd5e1;">
        <div style="font-size:14px; font-weight:bold;">${i + 1}. ${esc(m.medicamento)}</div>
        ${posologia ? `<div style="font-size:13px; margin-top:3px; color:#1e293b;">${posologia}</div>` : ""}
        ${
          m.indicaciones && String(m.indicaciones).trim()
            ? `<div style="font-size:11px; margin-top:3px; color:#475569; font-style:italic;">${esc(m.indicaciones)}</div>`
            : ""
        }
      </div>`;
    })
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; padding:22px; color:#0f172a; max-width:720px; margin:0 auto; position:relative;">
      ${
        datos.anulada
          ? `<div style="position:absolute; top:180px; left:0; right:0; text-align:center; font-size:64px; font-weight:bold;
                        color:#dc2626; opacity:0.18; transform:rotate(-20deg); letter-spacing:8px; pointer-events:none;">ANULADA</div>`
          : ""
      }

      ${/* Sin esc() ni &nbsp; acá: encabezadoDocumento ya escapa el subtítulo,
            y escaparlo dos veces dejaba los "&nbsp;" escritos en el papel. */""}
      ${encabezadoDocumento(tituloDoc, { sub: `Nº ${datos.numero}  ·  ${datos.fecha}`, tamNombre: 18, margen: 16 })}

      ${
        datos.anulada
          ? `<div style="margin-bottom:14px; padding:8px 10px; border:1px solid #fecaca; background:#fef2f2; border-radius:6px; font-size:12px; color:#b91c1c;">
               <strong>Receta anulada.</strong> No es válida para su dispensación.
               ${datos.motivoAnulacion ? ` Motivo: ${esc(datos.motivoAnulacion)}` : ""}
             </div>`
          : ""
      }

      <div style="margin-bottom:16px; padding:10px; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc;">
        <p style="margin:4px 0;"><strong>Paciente:</strong> ${esc(datos.pacienteNombre)}</p>
        <p style="margin:4px 0;"><strong>Documento:</strong> ${esc(datos.pacienteDocumento) || "—"}${
          datos.pacienteEdad ? ` &nbsp;·&nbsp; <strong>Edad:</strong> ${esc(datos.pacienteEdad)}` : ""
        }</p>
        ${
          datos.diagnostico && datos.diagnostico.trim()
            ? `<p style="margin:4px 0;"><strong>Diagnóstico:</strong> ${esc(datos.diagnostico)}</p>`
            : ""
        }
      </div>

      <div style="font-size:26px; font-weight:bold; font-family:Georgia, serif; margin-bottom:4px;">Rp/</div>
      <div style="border:1px solid #cbd5e1; border-radius:6px; overflow:hidden; margin-bottom:16px;">
        ${filas || `<div style="padding:14px; text-align:center; color:#64748b; font-style:italic;">Sin medicamentos.</div>`}
      </div>

      ${
        datos.indicaciones && datos.indicaciones.trim()
          ? `<div style="margin-bottom:16px; padding:10px; border-left:3px solid #1e3a8a; background:#f8fafc; font-size:12px;">
               <strong>Indicaciones generales:</strong><br/>${esc(datos.indicaciones).replace(/\n/g, "<br/>")}
             </div>`
          : ""
      }

      <div style="margin-top:55px; text-align:center;">
        <div style="width:240px; border-bottom:1px solid #000; margin:0 auto 5px;"></div>
        <div style="font-size:12px; font-weight:bold;">${esc(datos.profesionalNombre) || "Firma y sello del odontólogo"}</div>
        ${
          datos.profesionalRegistro
            ? `<div style="font-size:11px; color:#475569;">Reg. Prof. Nº ${esc(datos.profesionalRegistro)}</div>`
            : ""
        }
      </div>
    </div>
  `;

  ejecutarImpresionIframe(tituloDoc, html);
}
