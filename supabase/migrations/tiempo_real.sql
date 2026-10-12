-- ============================================================================
-- Avisos en vivo entre computadoras (Supabase Realtime)
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué: cuando recepción cobra o agenda, la pantalla del odontólogo tiene
-- que enterarse sola. La app escucha los cambios de estas tablas, pero la base
-- solo avisa de las que están en la publicación `supabase_realtime`, y ninguna
-- migración las había agregado: el canal conectaba y nunca llegaba nada.
--
-- No abre ningún dato: cada computadora recibe solo los cambios que sus
-- reglas (RLS) le dejan ver, o sea solo los de su propia empresa.
--
-- Idempotente: agrega solo las tablas que existen y que todavía no están.
-- En un Postgres sin Supabase (pruebas del instalador) no hace nada.
-- La lista tiene que coincidir con TABLAS_EN_VIVO de
-- src/hooks/use-realtime-subscriptions.ts.
-- ============================================================================

DO $$
DECLARE
    v_tabla TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        RAISE NOTICE 'No existe la publicación supabase_realtime: se omite.';
        RETURN;
    END IF;

    FOREACH v_tabla IN ARRAY ARRAY[
        'citas', 'pacientes',
        'presupuestos', 'presupuesto_detalles', 'pagos_presupuesto',
        'odontograma_registros', 'evoluciones_clinicas', 'periodontogramas',
        'recetas'
    ]
    LOOP
        IF to_regclass('public.' || v_tabla) IS NULL THEN
            RAISE NOTICE 'La tabla % no existe: se omite.', v_tabla;
        ELSIF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_tabla
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_tabla);
        END IF;
    END LOOP;
END $$;

-- Muestra cómo quedó: tienen que aparecer las 9 tablas.
SELECT tablename AS "tablas con avisos en vivo"
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;
