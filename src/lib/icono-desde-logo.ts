// ============================================================================
// Armar el ícono cuadrado a partir del logo del consultorio
// ============================================================================
// El menú lateral y la pestaña del navegador usan un ícono CUADRADO; el logo
// que sube el consultorio suele ser ancho (símbolo + nombre). Hasta el
// 2026-10-12 solo Mova Dent tenía ícono, porque se lo recortaron a mano (la
// muela de su logo) y se cargó con una migración exclusiva. Cualquier otro
// consultorio veía el diente genérico aunque hubiera subido su logo.
//
// Esto hace lo mismo que se hizo a mano, para todos:
//   1. Busca el SÍMBOLO: el primer bloque de dibujo de izquierda a derecha,
//      separado del resto por una franja vacía, y con forma más o menos
//      cuadrada (la muela, una letra-monograma, un escudo…).
//   2. Si no hay símbolo aparte, usa el logo entero, centrado en el cuadrado.
//   3. Lo pone sobre un fondo que contraste: un logo claro (pensado para
//      fondo oscuro, como el cian de Mova Dent) va sobre fondo oscuro.

export interface Recuadro {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface ImagenRGBA {
  width: number;
  height: number;
  /** RGBA, 4 bytes por píxel (como ImageData.data). */
  data: Uint8ClampedArray | number[];
}

const FONDO_OSCURO = "#0f172a";
const FONDO_CLARO = "#ffffff";
/** Luminancia relativa de FONDO_OSCURO (#0f172a). */
const LUMINANCIA_FONDO_OSCURO = 0.0089;

/**
 * Qué píxeles son "dibujo". Con fondo transparente, los que no lo son. Con
 * fondo de color (un JPG), los que se distinguen claramente del color de la
 * esquina superior izquierda.
 */
export function mascaraDeDibujo(img: ImagenRGBA): { mascara: boolean[]; colorFondo: string | null } {
  const { width, height, data } = img;
  const n = width * height;
  let transparentes = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 16) transparentes++;
  const usaTransparencia = transparentes > n * 0.05;

  const [r0, g0, b0] = [data[0], data[1], data[2]];
  const mascara = new Array<boolean>(n);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    if (usaTransparencia) {
      mascara[i] = a >= 40;
    } else {
      const d =
        Math.abs(data[i * 4] - r0) + Math.abs(data[i * 4 + 1] - g0) + Math.abs(data[i * 4 + 2] - b0);
      mascara[i] = d > 60;
    }
  }
  // Si el logo trae fondo propio (un JPG, o un PNG sin transparencia), el
  // ícono tiene que usar ESE color: si no, queda un recuadro dentro de otro.
  const colorFondo = usaTransparencia
    ? null
    : `#${[r0, g0, b0].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
  return { mascara, colorFondo };
}

/** El rectángulo mínimo que contiene todo el dibujo, o null si está vacío. */
export function recuadroDelDibujo(
  mascara: boolean[],
  width: number,
  height: number,
  zona: { desdeX?: number; hastaX?: number; desdeY?: number; hastaY?: number } = {}
): Recuadro | null {
  const { desdeX = 0, hastaX = width, desdeY = 0, hastaY = height } = zona;
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  for (let y = desdeY; y < hastaY; y++) {
    for (let x = desdeX; x < hastaX; x++) {
      if (mascara[y * width + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, ancho: x1 - x0 + 1, alto: y1 - y0 + 1 };
}

/**
 * Dónde termina el primer bloque de dibujo recorriendo el logo a lo largo de
 * un eje (columnas si es "x", filas si es "y"). -1 si es un solo bloque.
 *
 * Franja vacía mínima para considerar que el bloque terminó: unos píxeles, o
 * el 2 % del largo del dibujo, lo que sea mayor. Así el hueco entre dos letras
 * no se confunde con la separación entre el símbolo y el nombre.
 */
function finDelPrimerBloque(mascara: boolean[], width: number, total: Recuadro, eje: "x" | "y"): number {
  const [desde, largo] = eje === "x" ? [total.x, total.ancho] : [total.y, total.alto];
  const conDibujo = (i: number) => {
    if (eje === "x") {
      for (let y = total.y; y < total.y + total.alto; y++) if (mascara[y * width + i]) return true;
    } else {
      for (let x = total.x; x < total.x + total.ancho; x++) if (mascara[i * width + x]) return true;
    }
    return false;
  };
  const huecoMinimo = Math.max(3, Math.round(largo * 0.02));
  let vacias = 0;
  for (let i = desde; i < desde + largo; i++) {
    if (conDibujo(i)) {
      if (vacias >= huecoMinimo) return i - vacias;
      vacias = 0;
    } else {
      vacias++;
    }
  }
  return -1;
}

/**
 * El símbolo del logo, si tiene uno separado del nombre: a la izquierda (como
 * la muela de Mova Dent) o arriba (símbolo sobre el nombre). Devuelve null si
 * el logo es un solo bloque o el primer bloque no tiene forma de símbolo.
 */
export function buscarSimbolo(mascara: boolean[], width: number, height: number): Recuadro | null {
  const total = recuadroDelDibujo(mascara, width, height);
  if (!total) return null;

  for (const eje of ["x", "y"] as const) {
    const fin = finDelPrimerBloque(mascara, width, total, eje);
    if (fin < 0) continue;
    const simbolo = recuadroDelDibujo(
      mascara, width, height,
      eje === "x" ? { desdeX: total.x, hastaX: fin } : { desdeY: total.y, hastaY: fin }
    );
    if (!simbolo) continue;
    const proporcion = simbolo.ancho / simbolo.alto;
    // Tiene que parecer un símbolo: ni una raya ni un renglón de texto, ni
    // casi todo el logo, ni un adorno diminuto al lado del resto.
    const [suLargo, largoTotal, suGrosor, grosorTotal] = eje === "x"
      ? [simbolo.ancho, total.ancho, simbolo.alto, total.alto]
      : [simbolo.alto, total.alto, simbolo.ancho, total.ancho];
    const pareceSimbolo =
      proporcion >= 0.5 &&
      proporcion <= 1.8 &&
      suLargo < largoTotal * 0.7 &&
      (eje === "x" ? suGrosor >= grosorTotal * 0.5 : suGrosor >= grosorTotal * 0.2);
    if (pareceSimbolo) return simbolo;
  }
  return null;
}

/**
 * Luminancia RELATIVA (0 a 1, la de las pautas de accesibilidad WCAG) del
 * color promedio del dibujo dentro del recuadro.
 */
export function luminanciaDelDibujo(img: ImagenRGBA, mascara: boolean[], r: Recuadro): number {
  const lineal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  let suma = 0, n = 0;
  for (let y = r.y; y < r.y + r.alto; y++) {
    for (let x = r.x; x < r.x + r.ancho; x++) {
      const i = y * img.width + x;
      if (!mascara[i]) continue;
      const [R, G, B] = [img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]];
      suma += 0.2126 * lineal(R) + 0.7152 * lineal(G) + 0.0722 * lineal(B);
      n++;
    }
  }
  return n ? suma / n : 0;
}

/**
 * Qué recortar y sobre qué fondo. Separado del dibujo en el canvas para poder
 * probarlo sin navegador.
 */
export type PlanIcono = { recorte: Recuadro; fondo: string } | { inicial: true };

export function planDeIcono(img: ImagenRGBA): PlanIcono | null {
  const { mascara, colorFondo } = mascaraDeDibujo(img);
  const simbolo = buscarSimbolo(mascara, img.width, img.height);
  const todo = recuadroDelDibujo(mascara, img.width, img.height);
  if (!todo) return null;
  // Sin símbolo y muy alargado (un logo que es solo el nombre escrito): metido
  // entero en 40 px de menú no se lee. Va la inicial, como los contactos sin
  // foto del teléfono.
  if (!simbolo && (todo.ancho / todo.alto > 2.2 || todo.alto / todo.ancho > 2.2)) {
    return { inicial: true };
  }
  const recorte = simbolo ?? todo;
  if (colorFondo) return { recorte, fondo: colorFondo };
  // Fondo transparente: se elige el que más contraste haga con el dibujo
  // (cociente de contraste WCAG). Un dibujo claro se "lava" sobre blanco,
  // como el cian de Mova Dent: va sobre oscuro. Uno oscuro, sobre blanco.
  return { recorte, fondo: fondoQueContrasta(luminanciaDelDibujo(img, mascara, recorte)) };
}

/** Blanco u oscuro: el que más contraste haga con un dibujo de luminancia L. */
function fondoQueContrasta(L: number): string {
  const contraClaro = 1.05 / (L + 0.05);
  const contraOscuro = (L + 0.05) / (LUMINANCIA_FONDO_OSCURO + 0.05);
  return contraOscuro > contraClaro ? FONDO_OSCURO : FONDO_CLARO;
}

/**
 * La placa sobre la que conviene mostrar el logo ENTERO (pantalla de acceso).
 * null si el logo trae fondo propio o está vacío: ahí no hace falta nada.
 *
 * Por qué: el logo de Mova Dent es cian claro, pensado para fondo oscuro, y en
 * el tema claro de la pantalla de acceso se lavaba ("DENT" casi no se leía).
 * A un consultorio con logo oscuro le pasaría lo mismo en el tema oscuro.
 */
export function placaParaLogo(img: ImagenRGBA): string | null {
  const { mascara, colorFondo } = mascaraDeDibujo(img);
  if (colorFondo) return null;
  const todo = recuadroDelDibujo(mascara, img.width, img.height);
  if (!todo) return null;
  return fondoQueContrasta(luminanciaDelDibujo(img, mascara, todo));
}

/** placaParaLogo() leyendo la imagen en el navegador. null si no se pudo. */
export async function placaParaLogoDesde(logo: string): Promise<string | null> {
  try {
    const img = await cargarImagen(logo);
    const lienzo = document.createElement("canvas");
    lienzo.width = img.naturalWidth;
    lienzo.height = img.naturalHeight;
    const ctx = lienzo.getContext("2d");
    if (!ctx || !lienzo.width || !lienzo.height) return null;
    ctx.drawImage(img, 0, 0);
    return placaParaLogo(ctx.getImageData(0, 0, lienzo.width, lienzo.height));
  } catch {
    return null;
  }
}

const LADO_ICONO = 256;

/**
 * Arma el ícono (data URL PNG de 256x256) a partir del logo. Devuelve null si
 * no se pudo leer la imagen. Corre en el navegador.
 */
export async function iconoDesdeLogo(
  logo: string,
  marca: { nombre: string; color: string }
): Promise<string | null> {
  try {
    const img = await cargarImagen(logo);
    const lienzo = document.createElement("canvas");
    lienzo.width = img.naturalWidth;
    lienzo.height = img.naturalHeight;
    const ctx = lienzo.getContext("2d");
    if (!ctx || !lienzo.width || !lienzo.height) return null;
    ctx.drawImage(img, 0, 0);
    const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
    const plan = planDeIcono(datos);
    if (!plan) return null;
    if ("inicial" in plan) return iconoConInicial(marca.nombre, marca.color);

    const icono = document.createElement("canvas");
    icono.width = LADO_ICONO;
    icono.height = LADO_ICONO;
    const c = icono.getContext("2d");
    if (!c) return null;
    c.fillStyle = plan.fondo;
    c.fillRect(0, 0, LADO_ICONO, LADO_ICONO);
    // Margen del 12 % para que no toque los bordes (el menú lo redondea).
    const util = LADO_ICONO * 0.76;
    const { recorte } = plan;
    const escala = Math.min(util / recorte.ancho, util / recorte.alto);
    const w = recorte.ancho * escala;
    const h = recorte.alto * escala;
    c.imageSmoothingQuality = "high";
    c.drawImage(
      img,
      recorte.x, recorte.y, recorte.ancho, recorte.alto,
      (LADO_ICONO - w) / 2, (LADO_ICONO - h) / 2, w, h
    );
    return icono.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** La inicial del consultorio sobre su color (blanco o negro, lo que contraste). */
export function inicialDe(nombre: string): string {
  // Se saltea "Consultorio", "Clínica", "Dr."…: la inicial que identifica es
  // la del nombre propio ("Clínica Sonrisa" → S).
  const genericas = /^(consultorio|cl[ií]nica|centro|odontol[oó]gic[oa]|dental|dr\.?|dra\.?|de|del|la|el)$/i;
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  const propia = palabras.find((p) => !genericas.test(p)) ?? palabras[0] ?? "?";
  return propia.charAt(0).toLocaleUpperCase("es");
}

export function iconoConInicial(nombre: string, color: string): string | null {
  const icono = document.createElement("canvas");
  icono.width = LADO_ICONO;
  icono.height = LADO_ICONO;
  const c = icono.getContext("2d");
  if (!c) return null;
  c.fillStyle = color;
  c.fillRect(0, 0, LADO_ICONO, LADO_ICONO);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const lineal = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
  c.fillStyle = 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? "#ffffff" : "#0f172a";
  c.font = "bold 150px Arial, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(inicialDe(nombre), LADO_ICONO / 2, LADO_ICONO / 2 + 8);
  return icono.toDataURL("image/png");
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Logos guardados como ruta del sistema o data URL: mismo origen. Si
    // algún día viniera de otro dominio, sin esto el canvas quedaría "sucio"
    // y no se podría leer.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer el logo."));
    img.src = src;
  });
}
