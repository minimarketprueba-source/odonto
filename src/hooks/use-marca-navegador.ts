import { useEffect } from "react";
import type { DatosEmpresa } from "@/lib/clinica";

/**
 * Pone el nombre y el ícono del consultorio en la pestaña del navegador.
 *
 * Por qué hace falta un hook y no alcanza con `index.html`: ese archivo se
 * escribe una vez cuando se compila, y acá los datos salen de la base. Sin
 * esto, un consultorio que cargue su marca seguiría viendo "Mova Dent" y la
 * muela en la pestaña, que es lo primero que se nota al abrir el sistema.
 *
 * También cambia el ícono que se guarda al agregar la app a la pantalla de
 * inicio del celular (`apple-touch-icon`).
 */
export function useMarcaNavegador(empresa: DatosEmpresa): void {
  useEffect(() => {
    document.title = empresa.nombre_corto || empresa.nombre;
  }, [empresa.nombre_corto, empresa.nombre]);

  useEffect(() => {
    if (!empresa.icono_url) return;
    for (const rel of ["icon", "apple-touch-icon"]) {
      // Si la etiqueta no existe se crea: `index.html` trae las dos, pero no
      // conviene depender de eso para no romper si alguien las saca.
      let etiqueta = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!etiqueta) {
        etiqueta = document.createElement("link");
        etiqueta.rel = rel;
        document.head.appendChild(etiqueta);
      }
      etiqueta.href = empresa.icono_url;
    }
  }, [empresa.icono_url]);
}
