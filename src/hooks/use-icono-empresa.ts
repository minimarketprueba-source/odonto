import { useEffect, useState } from "react";
import { ICONO_PREDETERMINADO, type DatosEmpresa } from "@/lib/clinica";
import { iconoDesdeLogo, placaParaLogoDesde } from "@/lib/icono-desde-logo";

// Un ícono armado por logo: el logo cambia rara vez y armarlo lleva unos
// milisegundos de canvas, no tiene sentido repetirlo en cada pantalla.
const armados = new Map<string, Promise<string | null>>();

function armar(logo: string, nombre: string, color: string): Promise<string | null> {
  const clave = `${logo.length}:${logo.slice(-64)}:${nombre}:${color}`;
  let p = armados.get(clave);
  if (!p) {
    p = iconoDesdeLogo(logo, { nombre, color });
    armados.set(clave, p);
  }
  return p;
}

/**
 * El ícono cuadrado del consultorio (menú lateral y pestaña del navegador):
 *   1. el que subió el administrador, si subió uno;
 *   2. si no, uno armado a partir de su logo (ver icono-desde-logo.ts);
 *   3. si tampoco hay logo, el diente genérico de fábrica.
 *
 * Antes se saltaba el paso 2: solo Mova Dent tenía ícono (se lo recortaron a
 * mano) y cualquier otro consultorio con logo veía el diente genérico.
 */
export function useIconoEmpresa(empresa: DatosEmpresa): string {
  const [armado, setArmado] = useState<string | null>(null);
  const { icono_url, logo_url, nombre_corto, nombre, color_primario } = empresa;

  useEffect(() => {
    setArmado(null);
    if (icono_url || !logo_url) return;
    let vigente = true;
    armar(logo_url, nombre_corto || nombre, color_primario).then((icono) => {
      if (vigente) setArmado(icono);
    });
    return () => {
      vigente = false;
    };
  }, [icono_url, logo_url, nombre_corto, nombre, color_primario]);

  return icono_url || armado || ICONO_PREDETERMINADO;
}

const placas = new Map<string, Promise<string | null>>();

/**
 * El color de la placa sobre la que va el logo entero (pantalla de acceso), o
 * null si no hace falta (sin logo, o el logo ya trae su fondo). Ver
 * placaParaLogo() en icono-desde-logo.ts.
 */
export function usePlacaLogo(logo: string | null): string | null {
  const [placa, setPlaca] = useState<string | null>(null);
  useEffect(() => {
    setPlaca(null);
    if (!logo) return;
    const clave = `${logo.length}:${logo.slice(-64)}`;
    let p = placas.get(clave);
    if (!p) {
      p = placaParaLogoDesde(logo);
      placas.set(clave, p);
    }
    let vigente = true;
    p.then((color) => {
      if (vigente) setPlaca(color);
    });
    return () => {
      vigente = false;
    };
  }, [logo]);
  return placa;
}
