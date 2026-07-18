import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

/**
 * Registra una acción administrativa relacionada con usuarios en la tabla
 * `user_admin_audit` (debe existir en la base de datos).
 *
 * Columnas esperadas en la tabla (recomendado):
 * - id (uuid, PK)
 * - actor_id (uuid, quien ejecutó la acción)
 * - target_user_id (uuid, usuario objetivo)
 * - action (text)
 * - success (boolean)
 * - details (text, opcional)
 * - created_at (timestamp)
 */
/**
 * Registra una acción en la tabla `user_admin_audit`.
 * Se utiliza para auditoría administrativa y operativa.
 */
export async function recordAuditAction(payload: {
  actor_id: string | null;
  target_user_id?: string | null;
  action: string;
  details?: string | null;
}) {
  try {
    const { data, error } = await supabase.from("user_admin_audit").insert([
      {
        actor_id: payload.actor_id,
        target_user_id: payload.target_user_id ?? null,
        action: payload.action,
        details: payload.details ?? null,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      logger.error("Error inserting audit record:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    logger.error("Unexpected error recording audit:", err);
    return { data: null, error: err };
  }
}

/** Mantener compatibilidad con el nombre anterior */
export const recordUserAdminAction = recordAuditAction;
