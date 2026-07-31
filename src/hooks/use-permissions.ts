import { useAuth } from "@/context/auth-context";
import { useMemo } from "react";

export type PermissionType = "ver" | "editar" | "exportar" | "eliminar";

export function usePermissions() {
  const { role, permissions } = useAuth();

  const normalizedRole = role?.toLowerCase() || null;

  const checks = useMemo(() => {
    return {
      isAdmin: normalizedRole === "admin" || normalizedRole === "superadmin" || normalizedRole === "super_admin",
      isMedico: normalizedRole === "medico",
      isRecepcion: normalizedRole === "recepcion",
      isEnfermeria: normalizedRole === "enfermeria",
      isNutricionista: normalizedRole === "nutricionista",
      isFisioterapeuta: normalizedRole === "fisioterapeuta",
      isPsicologo: normalizedRole === "psicologo",
      isGinecologo: normalizedRole === "ginecologo",

      /**
       * Verifica si el usuario tiene un permiso específico en un módulo.
       * @param moduleKey Clave del módulo (ej: 'cadetes', 'seguimiento')
       * @param permType Tipo de permiso (ej: 'ver', 'editar', 'exportar')
       * @returns boolean
       */
      hasPermission: (moduleKey: string, permType: PermissionType = "ver"): boolean => {
        if (normalizedRole === "admin" || normalizedRole === "superadmin" || normalizedRole === "super_admin") return true; // Admins tienen todo
        if (!permissions) return false;

        const modulePerms = permissions[moduleKey] || [];
        return modulePerms.includes(permType);
      },

      /**
       * Verifica si el usuario puede ver un módulo específico.
       */
      canView: (moduleKey: string) => {
        if (normalizedRole === "admin" || normalizedRole === "superadmin" || normalizedRole === "super_admin") return true;
        if (!permissions) return false;
        return (permissions[moduleKey] || []).length > 0;
      },

      /**
       * Verifica si puede eliminar en un módulo.
       * Sin módulo → solo admin. Con módulo → admin o permiso "eliminar" otorgado.
       */
      canDelete: (moduleKey?: string): boolean => {
        if (normalizedRole === "admin" || normalizedRole === "superadmin" || normalizedRole === "super_admin") return true;
        if (!moduleKey || !permissions) return false;
        return (permissions[moduleKey] || []).includes("eliminar");
      },
    };
  }, [normalizedRole, permissions]);

  return checks;
}
