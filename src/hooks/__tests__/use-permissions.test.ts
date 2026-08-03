import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

/**
 * "El administrador tiene que poder acceder a todo": la regla vive en
 * usePermissions (canView/hasPermission/canDelete devuelven true para admin
 * sin mirar `permissions`). Estas pruebas la fijan para que ningún cambio
 * futuro deje al admin afuera de un módulo — ni siquiera si su fila en
 * `user_roles` trae permisos vacíos o recortados.
 */

const estado = vi.hoisted(() => ({
  auth: {
    role: null as string | null,
    permissions: null as Record<string, string[]> | null,
  },
}));

vi.mock("@/context/auth-context", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => estado.auth,
}));

import { usePermissions } from "@/hooks/use-permissions";
import { MODULOS_SANIDAD } from "@/context/auth-context";

function conCuenta(role: string | null, permissions: Record<string, string[]> | null) {
  estado.auth = { role, permissions };
  return renderHook(() => usePermissions()).result.current;
}

describe("acceso del administrador", () => {
  it("ve todos los módulos aunque no tenga permisos guardados", () => {
    const p = conCuenta("admin", null);
    for (const m of MODULOS_SANIDAD) {
      expect(p.canView(m.key), `admin no ve ${m.key}`).toBe(true);
    }
  });

  it("ve todos los módulos aunque sus permisos estén vacíos ({})", () => {
    const p = conCuenta("admin", {});
    for (const m of MODULOS_SANIDAD) {
      expect(p.canView(m.key), `admin no ve ${m.key}`).toBe(true);
    }
  });

  it("ve todos los módulos aunque su fila tenga permisos recortados por error", () => {
    // Si alguien guardó permisos explícitos chicos en la cuenta admin, el rol
    // manda igual: el admin nunca queda afuera de una pantalla.
    const p = conCuenta("admin", { pacientes: ["ver"] });
    for (const m of MODULOS_SANIDAD) {
      expect(p.canView(m.key), `admin no ve ${m.key}`).toBe(true);
      expect(p.hasPermission(m.key, "editar"), `admin no edita ${m.key}`).toBe(true);
      expect(p.hasPermission(m.key, "eliminar"), `admin no elimina ${m.key}`).toBe(true);
    }
    expect(p.canDelete()).toBe(true);
    expect(p.isAdmin).toBe(true);
  });

  it("el rol se reconoce sin importar mayúsculas (la base guarda texto libre)", () => {
    const p = conCuenta("Admin", {});
    expect(p.isAdmin).toBe(true);
    expect(p.canView("nutricion")).toBe(true);
  });
});

describe("contraste: los demás roles sí dependen de sus permisos", () => {
  it("un médico solo ve lo que tiene concedido", () => {
    const p = conCuenta("medico", { citas: ["ver", "editar"] });
    expect(p.canView("citas")).toBe(true);
    expect(p.canView("nutricion")).toBe(false);
    expect(p.canView("usuarios")).toBe(false);
    expect(p.canDelete()).toBe(false);
  });

  it("sin rol no se ve nada", () => {
    const p = conCuenta(null, null);
    for (const m of MODULOS_SANIDAD) {
      expect(p.canView(m.key)).toBe(false);
    }
  });
});
