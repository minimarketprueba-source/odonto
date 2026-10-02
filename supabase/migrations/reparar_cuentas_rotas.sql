-- ============================================================================
-- Reparar cuentas que Supabase no puede leer (2026-10-02)
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Síntoma: superadmin1@odonto.com y superadmin2@odonto.com daban
-- "Database error loading user", y por su culpa la lista de usuarios del
-- panel (Authentication → Users) fallaba entera con "Database error finding
-- users".
--
-- Causa conocida: cuentas creadas escribiendo directo en auth.users (con un
-- INSERT) en vez de usar el panel o la API. Quedan en NULL unas columnas de
-- texto que el servidor de Supabase espera vacías (''), y al leerlas falla.
--
-- Arreglo: poner '' donde hay NULL en esas columnas. No cambia contraseñas,
-- correos ni roles, y no borra nada. Es idempotente.
-- ============================================================================

UPDATE auth.users
SET confirmation_token         = COALESCE(confirmation_token, ''),
    recovery_token             = COALESCE(recovery_token, ''),
    email_change_token_new     = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    email_change               = COALESCE(email_change, ''),
    phone_change               = COALESCE(phone_change, ''),
    phone_change_token         = COALESCE(phone_change_token, ''),
    reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR email_change IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;

-- Verificación: tiene que dar 0.
SELECT count(*) AS cuentas_todavia_rotas
FROM auth.users
WHERE confirmation_token IS NULL OR recovery_token IS NULL
   OR email_change_token_new IS NULL OR email_change IS NULL;
