-- ============================================================================
-- El administrador también puede emitir recetas
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué cambia: `recetas.sql` dejó emitir solo al rol `medico`. Pero en este
-- consultorio el dueño es el odontólogo Y el administrador con una misma
-- cuenta: entraba como admin, abría la pestaña Recetas y no podía emitir. El
-- usuario lo confirmó el 2026-08-06: "el admin principal va a ser el
-- odontólogo que se registre primero".
--
-- Lo que NO cambia, y es lo que importa: la receta se sigue firmando con la
-- FICHA DE ODONTÓLOGO vinculada a esa cuenta (nombre y `numero_colegiatura`).
-- Un administrador sin ficha vinculada puede pasar esta regla pero la app no
-- lo deja emitir, porque el documento saldría sin firma ni registro
-- profesional. El permiso es de la cuenta; la firma es de la ficha.
--
-- Recepción y asistente siguen sin poder emitir: ven e imprimen las ya
-- emitidas.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.es_odonto_prescriptor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND lower(role) IN ('medico', 'admin', 'superadmin', 'super_admin')
          AND (status IS NULL OR lower(status) IN ('activo', 'active', 'habilitado', 'enabled'))
    );
$$;

-- Verificación ------------------------------------------------------------------
-- ⚠ NO sirve hacer `SELECT public.es_odonto_prescriptor()` acá: el SQL Editor
-- corre como dueño de la base, no como un usuario de la app, así que
-- `auth.uid()` está vacío y la función devuelve FALSE siempre. Eso no significa
-- que esté mal instalada.
--
-- Lo que sí se puede comprobar es qué cuentas cumplen la condición. La del
-- administrador tiene que aparecer con `puede_emitir = true`.
SELECT p.email,
       r.role,
       r.status,
       (
           lower(r.role) IN ('medico', 'admin', 'superadmin', 'super_admin')
           AND (r.status IS NULL OR lower(r.status) IN ('activo', 'active', 'habilitado', 'enabled'))
       ) AS puede_emitir
FROM public.user_roles r
LEFT JOIN public.profiles p ON p.id = r.user_id
ORDER BY puede_emitir DESC, p.email;
