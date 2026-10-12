// ============================================================================
// Controles antes de cargar un procedimiento o un pago en el plan
// ============================================================================
// Los campos de la ficha solo aceptan dígitos, así que no entran negativos,
// pero sí entraban tres cosas que después desarman la cuenta:
//   - un pago de 0 ₲, que figura en el comprobante como un cobro;
//   - un descuento mayor que el importe, que deja el procedimiento en negativo
//     y le RESTA al total del plan;
//   - un pago mayor que el saldo (un cero de más), que deja el saldo en 0 y el
//     sobrante desaparece de la vista.
// Lo último no se bloquea: una seña antes de cargar el plan es un caso real.
// Se pide confirmación diciendo cuánto sobra.

export type ResultadoControl =
  | { tipo: "ok" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "confirmar"; titulo: string; mensaje: string };

const gs = (n: number) => `${Math.round(n).toLocaleString("es-PY")} ₲`;

export function controlarProcedimiento(costo: number, descuento: number): ResultadoControl {
  if (!Number.isFinite(costo) || costo < 0) {
    return { tipo: "error", mensaje: "El importe no es válido." };
  }
  if (!Number.isFinite(descuento) || descuento < 0) {
    return { tipo: "error", mensaje: "El descuento no es válido." };
  }
  if (descuento > costo) {
    return {
      tipo: "error",
      mensaje: `El descuento (${gs(descuento)}) no puede ser mayor que el importe (${gs(costo)}).`,
    };
  }
  return { tipo: "ok" };
}

/**
 * @param saldoPendiente Lo que falta pagar del plan.
 * @param totalCotizado  Total del plan; en 0 significa que todavía no tiene
 *   procedimientos cargados y el pago es una seña.
 */
export function controlarPago(
  monto: number,
  saldoPendiente: number,
  totalCotizado: number
): ResultadoControl {
  if (!Number.isFinite(monto) || monto <= 0) {
    return { tipo: "error", mensaje: "El monto del pago tiene que ser mayor que 0." };
  }
  if (totalCotizado <= 0) {
    return {
      tipo: "confirmar",
      titulo: "El plan todavía no tiene procedimientos",
      mensaje: `El pago de ${gs(monto)} va a quedar como seña a favor del paciente. ¿Registrarlo igual?`,
    };
  }
  if (monto > saldoPendiente) {
    const sobra = monto - saldoPendiente;
    return {
      tipo: "confirmar",
      titulo: "El pago supera el saldo",
      mensaje:
        saldoPendiente > 0
          ? `El saldo pendiente es ${gs(saldoPendiente)} y el pago es de ${gs(monto)}: sobran ${gs(sobra)}, que quedan a favor del paciente. ¿Registrarlo igual?`
          : `Este plan ya está pagado. Los ${gs(monto)} quedarían a favor del paciente. ¿Registrarlo igual?`,
    };
  }
  return { tipo: "ok" };
}
