/* eslint-disable no-console -- este archivo ES el que escribe en la consola; el resto del código pasa por acá. */
/**
 * Sistema de logging que deshabilita logs en producción
 * En desarrollo: muestra todos los logs
 * En producción: solo muestra errores críticos
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    console.error(...args);
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  table: (data: unknown) => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};
