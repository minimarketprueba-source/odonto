// ============================================================================
// Identidad del consultorio
// ============================================================================
// El nombre estaba escrito a mano en 13 lugares distintos (los 6 impresos, el
// menú lateral, el login, el alta de cuenta, el Dashboard, Pacientes, Reportes
// y el estado de cuenta de WhatsApp). Cambiarlo obligaba a encontrarlos todos,
// y bastaba con que se escapara uno para que el paciente recibiera dos nombres
// distintos del mismo consultorio.
//
// Acá está una sola vez. Para cambiarlo, se cambia esta línea.

/** Nombre completo. Es el que va en los documentos que recibe el paciente. */
export const NOMBRE_CLINICA = "CONSULTORIO ODONTOLÓGICO MOVA DENT";

/**
 * Versión corta para los lugares donde el nombre completo no entra: el menú
 * lateral en el celular, el título de la pestaña del navegador.
 */
export const NOMBRE_CLINICA_CORTO = "Mova Dent";
