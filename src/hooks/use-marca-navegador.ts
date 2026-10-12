import { useEffect } from "react";
import { ICONO_PREDETERMINADO, type DatosEmpresa } from "@/lib/clinica";
import { useIconoEmpresa } from "@/hooks/use-icono-empresa";

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
  // El subido por el admin o, si no hay, el armado desde su logo.
  const icono = useIconoEmpresa(empresa);

  useEffect(() => {
    document.title = empresa.nombre_corto || empresa.nombre;
  }, [empresa.nombre_corto, empresa.nombre]);

  useEffect(() => {
    // Sin marca propia queda el de index.html, que es el mismo genérico.
    if (icono === ICONO_PREDETERMINADO) return;
    for (const rel of ["icon", "apple-touch-icon"]) {
      // Si la etiqueta no existe se crea: `index.html` trae las dos, pero no
      // conviene depender de eso para no romper si alguien las saca.
      let etiqueta = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!etiqueta) {
        etiqueta = document.createElement("link");
        etiqueta.rel = rel;
        document.head.appendChild(etiqueta);
      }
      etiqueta.href = icono;
    }
  }, [icono]);
}
