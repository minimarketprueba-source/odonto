// ============================================================================
// Silueta anatómica de cada pieza dental
// ============================================================================
// Antes todas las piezas se dibujaban como un cuadradito igual, así que un
// molar y un incisivo eran indistinguibles y había que leer el número para
// ubicarse. Acá cada pieza tiene la forma que le corresponde —corona y raíces—
// para poder recorrer la arcada de un vistazo, como en el odontograma de papel.

export type TipoDiente = "molar" | "premolar" | "canino" | "incisivo";

/**
 * Qué tipo de pieza es, según el número FDI.
 *
 * El segundo dígito da la posición contando desde la línea media:
 * 1-2 incisivos · 3 canino · 4-5 premolares · 6-8 molares.
 * En los temporales (51-85) hay solo 5 piezas por cuadrante: 1-2 incisivos,
 * 3 canino, 4-5 molares — ahí NO hay premolares.
 */
export function tipoDeDiente(numero: number): TipoDiente {
  const posicion = numero % 10;
  const esTemporal = numero >= 51 && numero <= 85;

  if (posicion <= 2) return "incisivo";
  if (posicion === 3) return "canino";
  if (esTemporal) return "molar"; // 54, 55, 64, 65… son molares temporales
  if (posicion <= 5) return "premolar";
  return "molar";
}

/** Si la pieza es de la arcada superior (cuadrantes 1, 2, 5 y 6). */
export function esSuperior(numero: number): boolean {
  const cuadrante = Math.floor(numero / 10);
  return cuadrante === 1 || cuadrante === 2 || cuadrante === 5 || cuadrante === 6;
}

interface DienteFiguraProps {
  numero: number;
  /** Color de relleno de la corona; blanco si la pieza no tiene estado. */
  color: string;
  /** Dibuja la pieza tachada (ausente o extraída). */
  tachado?: boolean;
  className?: string;
}

/**
 * Corona + raíces en un viewBox de 40x64. Las raíces apuntan hacia arriba en
 * las piezas superiores y hacia abajo en las inferiores, igual que en la boca.
 */
export function DienteFigura({ numero, color, tachado, className }: DienteFiguraProps) {
  const tipo = tipoDeDiente(numero);
  const arriba = esSuperior(numero);

  // Los trazados están dibujados en la posición de una pieza SUPERIOR: raíces
  // hacia arriba y corona hacia abajo, que es como se ve en la boca. Las piezas
  // inferiores son ese mismo dibujo dado vuelta, así hay un solo juego de
  // trazados en lugar de dos.
  const transform = arriba ? undefined : "rotate(180 20 32)";

  return (
    <svg
      viewBox="0 0 40 64"
      className={className}
      role="img"
      aria-label={`Pieza ${numero}`}
    >
      <g transform={transform}>
        {/* Raíces: su cantidad es lo que distingue un molar de un incisivo */}
        <g fill="#f1e7d8" stroke="#b9a58a" strokeWidth="1.1" strokeLinejoin="round">
          {tipo === "molar" && (
            <>
              <path d="M12 26 L8 4 Q11 1 14 5 L16 26 Z" />
              <path d="M20 26 L20 2 Q23 1 24 5 L24 26 Z" />
              <path d="M28 26 L32 4 Q29 1 27 5 L26 26 Z" />
            </>
          )}
          {tipo === "premolar" && (
            <>
              <path d="M15 28 L12 6 Q15 2 18 6 L19 28 Z" />
              <path d="M25 28 L28 6 Q25 2 22 6 L21 28 Z" />
            </>
          )}
          {tipo === "canino" && <path d="M16 28 L17 2 Q20 -1 23 2 L24 28 Z" />}
          {tipo === "incisivo" && <path d="M16 28 L16 6 Q20 3 24 6 L24 28 Z" />}
        </g>

        {/* Corona: es la parte que se pinta con el estado clínico */}
        <path
          d={
            tipo === "molar"
              ? "M7 30 Q7 24 12 24 L28 24 Q33 24 33 30 L33 48 Q33 56 26 57 L14 57 Q7 56 7 48 Z"
              : tipo === "premolar"
              ? "M9 30 Q9 25 14 25 L26 25 Q31 25 31 30 L31 47 Q31 55 25 56 L15 56 Q9 55 9 47 Z"
              : tipo === "canino"
              ? "M11 30 Q11 26 15 26 L25 26 Q29 26 29 30 L29 46 Q29 54 20 58 Q11 54 11 46 Z"
              : "M11 30 Q11 26 15 26 L25 26 Q29 26 29 30 L29 50 Q29 56 20 57 Q11 56 11 50 Z"
          }
          fill={color}
          stroke="#8a7a63"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Surcos de la cara masticatoria: solo los tienen molares y premolares */}
        {(tipo === "molar" || tipo === "premolar") && (
          <g stroke="#c4b49a" strokeWidth="0.9" strokeLinecap="round" opacity="0.75">
            <line x1="12" y1="46" x2="28" y2="46" />
            <line x1="20" y1="38" x2="20" y2="53" />
          </g>
        )}
      </g>

      {/* La cruz de ausente/extraída va SIN rotar: tiene que leerse igual en
          las dos arcadas. */}
      {tachado && (
        <g stroke="#b91c1c" strokeWidth="3" strokeLinecap="round">
          <line x1="7" y1="12" x2="33" y2="52" />
          <line x1="33" y1="12" x2="7" y2="52" />
        </g>
      )}
    </svg>
  );
}
