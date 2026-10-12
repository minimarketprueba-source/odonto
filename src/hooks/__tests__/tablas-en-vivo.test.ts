import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import { TABLAS_EN_VIVO } from "../use-realtime-subscriptions";

// Hasta el 2026-10-12 se escuchaban tablas del sistema policial que en esta
// base no existen, y Supabase rechazaba el canal entero: no llegaba ningún
// aviso en vivo. Estas pruebas impiden volver a escuchar una tabla inventada
// o una que la base no tenga habilitada.

const carpeta = join(process.cwd(), "supabase", "migrations");
const migraciones = readdirSync(carpeta)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(carpeta, f), "utf8"))
  .join("\n")
  .toLowerCase();
const tiempoReal = readFileSync(join(carpeta, "tiempo_real.sql"), "utf8");

describe("tablas que se escuchan en vivo", () => {
  it.each(TABLAS_EN_VIVO.map((t) => t.tabla))("%s existe en las migraciones", (tabla) => {
    expect(migraciones).toMatch(
      new RegExp(`create table if not exists (public\\.)?${tabla}\\s*\\(`)
    );
  });

  it.each(TABLAS_EN_VIVO.map((t) => t.tabla))(
    "%s está habilitada en tiempo_real.sql",
    (tabla) => {
      expect(tiempoReal).toContain(`'${tabla}'`);
    }
  );
});
