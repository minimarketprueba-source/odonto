import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { MIN_CONTRASENA, AVISO_CONTRASENA_CORTA } from "@/lib/contrasena";

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "__tests__" ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

describe("contraseñas", () => {
  it("piden al menos 8 caracteres", () => {
    expect(MIN_CONTRASENA).toBeGreaterThanOrEqual(8);
    expect(AVISO_CONTRASENA_CORTA).toContain(String(MIN_CONTRASENA));
  });

  it("ninguna pantalla vuelve a escribir el mínimo a mano", () => {
    // Estaba repetido en seis lugares con 6: si se cambia, hay que cambiarlo
    // en src/lib/contrasena.ts y nada más.
    const raiz = join(process.cwd(), "src");
    const conLargoFijo = archivos(raiz).filter((f) =>
      /(password|pass1|newPassword)[\w.]*\.length\s*<\s*\d/.test(readFileSync(f, "utf8"))
    );
    expect(conLargoFijo).toEqual([]);
  });
});
