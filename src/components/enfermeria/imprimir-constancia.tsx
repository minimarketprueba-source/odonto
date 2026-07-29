import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  destinoAmbulatorio, esDestinoImprimible, type AtencionEnfermeria,
} from "@/api/atenciones-enfermeria";
import {
  cleanQrText, documentoReposo, imprimirConstanciaEnfermeria, type DatosConstanciaEnfermeria,
} from "@/lib/imprimir";
import { labelTipoPaciente } from "@/api/pacientes";

function ddmm(fechaIso?: string | null): string | null {
  return fechaIso ? fechaIso.split("-").reverse().join("/") : null;
}

/**
 * Imprime la constancia provisoria a partir de una atención ya guardada
 * (recién creada o desde el historial, si se perdió el papel). Usa los datos
 * tal como quedaron en la base, incluido el paciente embebido.
 */
export function imprimirConstanciaDeAtencion(atencion: AtencionEnfermeria) {
  if (!esDestinoImprimible(atencion.destino)) return;
  const paciente = atencion.paciente;
  if (!paciente) {
    toast.error("No se encontraron los datos del paciente para imprimir.");
    return;
  }

  const destinoSel = destinoAmbulatorio(atencion.destino);
  const fechaDdMm = ddmm(atencion.fecha) ?? "—";
  const hastaDdMm = ddmm(atencion.reposo_hasta);
  const enfermero = atencion.enfermero || atencion.registrado_por?.split("@")[0] || "Enfermería";
  // El mismo identificador que lleva impreso el pie del documento.
  const doc = documentoReposo(atencion.destino === "observacion" ? "internacion" : (atencion.destino as "enfermo_local" | "sin_servicio" | "reposo_domiciliario"));
  const refCod = `ENF-${doc.ref}-${paciente.documento || "0"}-${atencion.id}`;
  const revisadaEl = atencion.revisada_at
    ? new Date(atencion.revisada_at).toLocaleDateString("es-PY")
    : null;

  const qrSvgHtml = renderToStaticMarkup(
    <QRCodeSVG
      value={cleanQrText([
        "SANIDAD POLICIAL - ACADEMIA NACIONAL DE POLICIA",
        "DOCUMENTO: CONSTANCIA PROVISORIA DE ENFERMERIA",
        `Paciente: ${paciente.apellidos}, ${paciente.nombres} (CI: ${paciente.documento || "sin cedula"})`,
        `Condicion: ${destinoSel?.label ?? atencion.destino}`,
        `Desde: ${fechaDdMm} Hasta: ${hastaDdMm || "Revision medica"}`,
        `Atendio: ${enfermero}`,
        atencion.revisada_at ? "REVISADA POR EL MEDICO" : "PENDIENTE DE REVISION MEDICA",
        `ID: ${refCod}`,
      ].join("\n"))}
      size={105}
      level="M"
    />
  );

  imprimirConstanciaEnfermeria({
    pacienteNombre: `${paciente.apellidos}, ${paciente.nombres}`,
    pacienteDocumento: paciente.documento,
    pacienteTipo: labelTipoPaciente(paciente.tipo),
    pacienteGrado: paciente.grado,
    pacienteUnidad: paciente.unidad,
    destino: atencion.destino as DatosConstanciaEnfermeria["destino"],
    fechaDesde: fechaDdMm,
    fechaHasta: hastaDdMm,
    motivo: atencion.motivo,
    procedimiento: atencion.procedimiento,
    enfermeroNombre: enfermero,
    atencionId: atencion.id,
    revisadaEl,
    revisadaPor: atencion.medico_revisor
      ? `Dr(a). ${atencion.medico_revisor.apellidos}, ${atencion.medico_revisor.nombres}`
      : null,
    qrSvgHtml,
  });
}
