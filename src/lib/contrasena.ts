// Largo mínimo de las contraseñas, en un solo lugar.
//
// Era 6 y estaba repetido en seis pantallas. Para un sistema con fichas
// clínicas 6 caracteres es poco. Las contraseñas que ya existen siguen
// sirviendo: esto solo se controla al crear o cambiar una.
//
// OJO: las Edge Functions (create-user, update-user-password) todavía aceptan
// 6. La pantalla es más estricta, así que por la app no entra una corta, pero
// conviene subirlo también allá.
export const MIN_CONTRASENA = 8;

export const AVISO_CONTRASENA_CORTA = `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres.`;
