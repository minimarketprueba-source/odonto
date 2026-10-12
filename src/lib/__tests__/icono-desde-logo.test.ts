import { describe, it, expect } from "vitest";
import { planDeIcono, buscarSimbolo, mascaraDeDibujo, inicialDe, placaParaLogo, type ImagenRGBA } from "@/lib/icono-desde-logo";

/** Imagen transparente con rectángulos pintados de un color. */
function imagen(
  width: number,
  height: number,
  rects: { x: number; y: number; w: number; h: number; rgb: [number, number, number] }[],
  fondo?: [number, number, number]
): ImagenRGBA {
  const data = new Array<number>(width * height * 4).fill(0);
  if (fondo) for (let i = 0; i < width * height; i++) data.splice(i * 4, 4, ...fondo, 255);
  for (const r of rects)
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) data.splice((y * width + x) * 4, 4, ...r.rgb, 255);
  return { width, height, data };
}

const CIAN: [number, number, number] = [96, 240, 240];
const AZUL: [number, number, number] = [30, 58, 138];

describe("ícono armado desde el logo", () => {
  it("recorta el símbolo de la izquierda, como la muela de Mova Dent", () => {
    // símbolo 40x40 + separación + "nombre" ancho y bajo
    const img = imagen(200, 50, [
      { x: 0, y: 5, w: 40, h: 40, rgb: CIAN },
      { x: 55, y: 15, w: 140, h: 20, rgb: CIAN },
    ]);
    const plan = planDeIcono(img);
    expect(plan).toEqual({ recorte: { x: 0, y: 5, ancho: 40, alto: 40 }, fondo: "#0f172a" });
  });

  it("recorta el símbolo de arriba si va sobre el nombre", () => {
    const img = imagen(120, 120, [
      { x: 40, y: 0, w: 40, h: 40, rgb: AZUL },
      { x: 5, y: 80, w: 110, h: 20, rgb: AZUL },
    ]);
    const plan = planDeIcono(img);
    expect(plan && "recorte" in plan && plan.recorte).toEqual({ x: 40, y: 0, ancho: 40, alto: 40 });
  });

  it("un dibujo claro va sobre fondo oscuro y uno oscuro sobre blanco", () => {
    const claro = planDeIcono(imagen(50, 50, [{ x: 5, y: 5, w: 40, h: 40, rgb: CIAN }]));
    const oscuro = planDeIcono(imagen(50, 50, [{ x: 5, y: 5, w: 40, h: 40, rgb: AZUL }]));
    expect(claro && "fondo" in claro && claro.fondo).toBe("#0f172a");
    expect(oscuro && "fondo" in oscuro && oscuro.fondo).toBe("#ffffff");
  });

  it("si el logo trae fondo propio, el ícono usa ese mismo color", () => {
    // Sin esto quedaba un cuadrado negro dentro de uno blanco.
    const img = imagen(200, 50, [
      { x: 10, y: 5, w: 40, h: 40, rgb: CIAN },
      { x: 65, y: 15, w: 130, h: 20, rgb: CIAN },
    ], [0, 0, 0]);
    const plan = planDeIcono(img);
    expect(plan && "fondo" in plan && plan.fondo).toBe("#000000");
  });

  it("un logo que es solo texto (un bloque alargado) usa la inicial", () => {
    const img = imagen(300, 60, [{ x: 10, y: 20, w: 280, h: 25, rgb: AZUL }]);
    expect(planDeIcono(img)).toEqual({ inicial: true });
  });

  it("un logo cuadrado de un solo bloque se usa entero", () => {
    const img = imagen(80, 80, [{ x: 10, y: 10, w: 60, h: 60, rgb: AZUL }]);
    const plan = planDeIcono(img);
    expect(plan && "recorte" in plan && plan.recorte).toEqual({ x: 10, y: 10, ancho: 60, alto: 60 });
  });

  it("el hueco entre dos letras no se confunde con el fin del símbolo", () => {
    // "letras" de 20 px separadas por 2 px: es un solo bloque de texto.
    const letras = Array.from({ length: 8 }, (_, i) => ({ x: i * 22, y: 10, w: 20, h: 30, rgb: AZUL }));
    const img = imagen(180, 50, letras);
    const { mascara } = mascaraDeDibujo(img);
    expect(buscarSimbolo(mascara, 180, 50)).toBeNull();
  });

  it("la imagen vacía no arma nada", () => {
    expect(planDeIcono(imagen(20, 20, []))).toBeNull();
  });
});

describe("inicial del consultorio", () => {
  it("se saltea las palabras genéricas", () => {
    expect(inicialDe("Clínica Sonrisa Feliz")).toBe("S");
    expect(inicialDe("Consultorio Odontológico Mova Dent")).toBe("M");
    expect(inicialDe("Dra. Ana López")).toBe("A");
  });

  it("usa la primera letra si todo es genérico, y nunca queda vacía", () => {
    expect(inicialDe("Consultorio")).toBe("C");
    expect(inicialDe("ñandutí dental")).toBe("Ñ");
    expect(inicialDe("")).toBe("?");
  });
});

describe("placa del logo en la pantalla de acceso", () => {
  it("un logo claro va sobre placa oscura (el cian de Mova Dent se lavaba en tema claro)", () => {
    expect(placaParaLogo(imagen(100, 30, [{ x: 5, y: 5, w: 90, h: 20, rgb: CIAN }]))).toBe("#0f172a");
  });

  it("un logo oscuro va sobre placa blanca (si no, desaparece en tema oscuro)", () => {
    expect(placaParaLogo(imagen(100, 30, [{ x: 5, y: 5, w: 90, h: 20, rgb: AZUL }]))).toBe("#ffffff");
  });

  it("un logo con fondo propio no lleva placa", () => {
    expect(placaParaLogo(imagen(100, 30, [{ x: 5, y: 5, w: 90, h: 20, rgb: CIAN }], [0, 0, 0]))).toBeNull();
  });
});
