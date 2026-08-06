-- ============================================================================
-- Una cuenta de acceso, una sola ficha de odontólogo
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: la pantalla de Mantenimiento ya no deja elegir una cuenta
-- que otra ficha esté usando, pero eso es solo el candado de la pantalla. La
-- base lo aceptaba igual, y alcanzaba con dos personas cargando fichas al mismo
-- tiempo, o con una lista desactualizada en el navegador, para que quedaran dos
-- fichas apuntando a la misma cuenta.
--
-- Qué se rompe si pasa: `fetchMiMedico()` (src/api/citas.ts) busca la ficha con
-- `.maybeSingle()`, que espera CERO o UNA fila. Con dos, tira un error y el
-- profesional queda sin poder emitir recetas, sin su firma en la agenda y sin
-- «Mi perfil», con un mensaje que no explica nada.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. ¿Hay duplicados hoy? --------------------------------------------------------
-- Si esto devuelve alguna fila, el índice de abajo va a fallar. Hay que decidir
-- a mano cuál ficha se queda con la cuenta y desvincular la otra
-- (UPDATE public.medicos SET user_id = NULL WHERE id = '<el id que sobra>').
SELECT user_id, count(*) AS fichas, string_agg(apellidos || ', ' || nombres, ' | ') AS quienes
FROM public.medicos
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING count(*) > 1;

-- 2. El candado ------------------------------------------------------------------
-- Parcial (WHERE user_id IS NOT NULL): las fichas sin cuenta vinculada son
-- válidas y pueden ser muchas. En Postgres varios NULL no chocan entre sí, pero
-- se deja explícito para que se entienda al leerlo.
CREATE UNIQUE INDEX IF NOT EXISTS medicos_user_id_unico
    ON public.medicos (user_id)
    WHERE user_id IS NOT NULL;

-- 3. Verificación ----------------------------------------------------------------
-- Tiene que aparecer el índice `medicos_user_id_unico`.
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'medicos' AND indexname = 'medicos_user_id_unico';
