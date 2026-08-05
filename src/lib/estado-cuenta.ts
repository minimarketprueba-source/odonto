// ============================================================================
// Estado de cuenta del paciente
// ============================================================================
// Lo que se le manda al paciente por su cuenta: qué se le cobró, qué pagó y
// qué debe. NO lleva datos clínicos —diagnósticos, notas, piezas tratadas—:
// un mensaje de WhatsApp puede terminar en cualquier pantalla, y el detalle
// clínico no hace falta para saldar una cuenta.

export interface LineaPago {
  fecha: string;
  monto: number;
  metodo: string;
  plan?: string | null;
}

export interface EstadoCuenta {
  clinica: string;
  pacienteNombre: string;
  fecha: string;
  planTitulo?: string | null;
  totalCotizado: number;
  totalAbonado: number;
  saldoPendiente: number;
  pagos: LineaPago[];
}

const gs = (n: number) => `${n.toLocaleString("es-PY")} ₲`;

/**
 * Arma el mensaje para mandar por WhatsApp.
 *
 * Va en texto plano con los asteriscos de negrita que entiende WhatsApp. Se
 * evitan las tablas: en un celular se desarman y quedan ilegibles.
 */
export function mensajeEstadoCuenta(datos: EstadoCuenta): string {
  const lineas: string[] = [];

  lineas.push(`*${datos.clinica}*`);
  lineas.push(`Estado de cuenta — ${datos.fecha}`);
  lineas.push("");
  lineas.push(`Paciente: ${datos.pacienteNombre}`);
  if (datos.planTitulo) lineas.push(`Tratamiento: ${datos.planTitulo}`);
  lineas.push("");

  if (datos.pagos.length > 0) {
    lineas.push("*Pagos recibidos:*");
    for (const p of datos.pagos) {
      const metodo = p.metodo && p.metodo !== "—" ? ` (${p.metodo})` : "";
      lineas.push(`• ${p.fecha}${metodo}: ${gs(p.monto)}`);
    }
    lineas.push("");
  }

  lineas.push(`Total del tratamiento: ${gs(datos.totalCotizado)}`);
  lineas.push(`Total abonado: ${gs(datos.totalAbonado)}`);

  if (datos.saldoPendiente > 0) {
    lineas.push(`*Saldo pendiente: ${gs(datos.saldoPendiente)}*`);
  } else if (datos.totalAbonado > datos.totalCotizado) {
    lineas.push(`*A favor: ${gs(datos.totalAbonado - datos.totalCotizado)}*`);
  } else {
    lineas.push("*Cuenta saldada. ¡Muchas gracias!*");
  }

  return lineas.join("\n");
}

/**
 * Deja el teléfono en el formato que espera wa.me: solo dígitos y con el
 * código de país.
 *
 * En Paraguay los números se anotan como 0981 123456 o 0983559700; el cero
 * inicial es para llamar dentro del país y hay que cambiarlo por el 595. Un
 * número que ya venga con el código se deja como está.
 */
export function telefonoParaWhatsApp(telefono?: string | null, codigoPais = "595"): string | null {
  if (!telefono) return null;

  let n = telefono.replace(/\D/g, "");
  if (!n) return null;

  // Ya trae el código de país (con o sin el + adelante).
  if (n.startsWith(codigoPais) && n.length >= 11) return n;

  // Formato local: 0981234567 → se saca el 0 y se antepone el país.
  if (n.startsWith("0")) n = n.slice(1);

  // Un número demasiado corto no es un celular: mejor no abrir un chat errado.
  if (n.length < 8) return null;

  return codigoPais + n;
}

/**
 * Enlace de WhatsApp con el mensaje ya escrito. Sin número válido devuelve el
 * enlace igual, para que la persona elija a quién mandárselo.
 */
export function enlaceWhatsApp(mensaje: string, telefono?: string | null): string {
  const numero = telefonoParaWhatsApp(telefono);
  const texto = encodeURIComponent(mensaje);
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
