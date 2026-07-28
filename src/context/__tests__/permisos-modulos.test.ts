import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_PERMISOS_SANIDAD, MODULOS_SANIDAD, ROLES_SANIDAD, ROLES_SANIDAD_OPCIONES, esEstadoActivo,
} from "@/context/auth-context";

/**
 * La pantalla de Usuarios había quedado con los roles y módulos de control de
 * peso (cadetes, ergometría, respaldo… y los roles analyst/viewer). Como esa
 * pantalla escribe `user_roles.permissions` entera, guardar ahí dejaba a la
 * persona sin ningún módulo de Sanidad y con un rol que no da acceso.
 *
 * Estas pruebas atan las listas de auth-context a lo que realmente piden las
 * rutas y el menú: si mañana se agrega un módulo nuevo y se olvida la lista,
 * falla acá y no en producción.
 */

const claves = new Set(MODULOS_SANIDAD.map((m) => m.key));

function moduleKeysDe(archivo: string): string[] {
  const src = readFileSync(resolve(__dirname, "../..", archivo), "utf8");
  // Cubre las dos formas: moduleKey="citas" (rutas) y moduleKey: "citas" (menú).
  return [...src.matchAll(/moduleKey\s*[:=]\s*"([a-z_]+)"/g)].map((m) => m[1]);
}

describe("módulos y roles de Sanidad", () => {
  it("cada módulo que piden las rutas está en la lista de permisos", () => {
    const usados = moduleKeysDe("App.tsx");
    expect(usados.length).toBeGreaterThan(0);
    for (const key of usados) expect(claves).toContain(key);
  });

  it("cada módulo del menú lateral está en la lista de permisos", () => {
    const usados = moduleKeysDe("components/layout/sidebar.tsx");
    expect(usados.length).toBeGreaterThan(0);
    for (const key of usados) expect(claves).toContain(key);
  });

  it("los roles que se pueden asignar dan acceso al sistema", () => {
    for (const opcion of ROLES_SANIDAD_OPCIONES) {
      expect(ROLES_SANIDAD).toContain(opcion.value);
    }
  });

  it("los permisos por defecto solo usan módulos que existen", () => {
    for (const [rol, permisos] of Object.entries(DEFAULT_PERMISOS_SANIDAD)) {
      expect(ROLES_SANIDAD, `rol ${rol}`).toContain(rol);
      for (const key of Object.keys(permisos)) {
        expect(claves, `módulo ${key} del rol ${rol}`).toContain(key);
      }
    }
  });

  it("todo rol asignable trae permisos por defecto, salvo admin que entra a todo", () => {
    for (const opcion of ROLES_SANIDAD_OPCIONES) {
      const permisos = DEFAULT_PERMISOS_SANIDAD[opcion.value];
      expect(permisos, `faltan permisos por defecto de ${opcion.value}`).toBeDefined();
      expect(Object.keys(permisos).length).toBeGreaterThan(0);
    }
  });
});

/**
 * Suspender escribe `user_roles.status`, pero la lista leía `profiles.activo`
 * (que devuelve la RPC) y auth-context ni siquiera miraba el estado: la cuenta
 * suspendida seguía figurando "Activo" y podía entrar igual.
 */
describe("estado de la cuenta", () => {
  it("suspendida no tiene acceso", () => {
    expect(esEstadoActivo("Inactivo")).toBe(false);
    expect(esEstadoActivo("suspendido")).toBe(false);
  });

  it("activa tiene acceso, sin importar cómo esté escrito", () => {
    expect(esEstadoActivo("Activo")).toBe(true);
    expect(esEstadoActivo("activo")).toBe(true);
    expect(esEstadoActivo("ACTIVE")).toBe(true);
    expect(esEstadoActivo("habilitado")).toBe(true);
  });

  it("sin estado se asume activa: hay filas viejas sin el campo", () => {
    expect(esEstadoActivo(null)).toBe(true);
    expect(esEstadoActivo(undefined)).toBe(true);
    expect(esEstadoActivo("")).toBe(true);
  });
});
