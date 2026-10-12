-- ============================================================================
-- Liquidaciones de honorarios: solo el administrador
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué: lo que se le paga a cada odontólogo no es para recepción ni para
-- los demás odontólogos. multiempresa.sql le dio a esta tabla la regla común
-- (cualquier persona activa de la empresa lee y escribe). Esconder la pantalla
-- no alcanza: la anon key es pública y cualquiera con sesión puede consultar
-- la tabla directo. La regla tiene que estar acá, como con las recetas.
--
-- Va DESPUÉS de multiempresa.sql. Si alguna vez se vuelve a correr
-- multiempresa.sql, hay que volver a correr este archivo después.
-- Idempotente.
-- ============================================================================

DO $$
BEGIN
    IF to_regprocedure('public.mi_clinica_id()') IS NULL
       OR to_regprocedure('public.es_odonto_admin()') IS NULL THEN
        RAISE EXCEPTION 'Falta aplicar multiempresa.sql antes que este archivo.';
    END IF;
END $$;

DO $$
DECLARE
    pol RECORD;
    regla CONSTANT TEXT := 'clinica_id = (SELECT public.mi_clinica_id()) AND public.es_odonto_admin()';
BEGIN
    IF to_regclass('public.liquidaciones_odontologos') IS NULL THEN
        RAISE NOTICE 'No existe liquidaciones_odontologos: se omite.';
        RETURN;
    END IF;

    ALTER TABLE public.liquidaciones_odontologos ENABLE ROW LEVEL SECURITY;

    -- Se borran TODAS las reglas de la tabla: se suman, y la común de
    -- multiempresa.sql dejaría leer a cualquiera aunque se agregue esta.
    FOR pol IN SELECT polname FROM pg_policy
               WHERE polrelid = 'public.liquidaciones_odontologos'::regclass LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.liquidaciones_odontologos', pol.polname);
    END LOOP;

    EXECUTE format('CREATE POLICY odonto_liquidaciones_select ON public.liquidaciones_odontologos FOR SELECT TO authenticated USING (%s)', regla);
    EXECUTE format('CREATE POLICY odonto_liquidaciones_insert ON public.liquidaciones_odontologos FOR INSERT TO authenticated WITH CHECK (%s)', regla);
    EXECUTE format('CREATE POLICY odonto_liquidaciones_update ON public.liquidaciones_odontologos FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', regla, regla);
    EXECUTE format('CREATE POLICY odonto_liquidaciones_delete ON public.liquidaciones_odontologos FOR DELETE TO authenticated USING (%s)', regla);
END $$;

-- Tienen que aparecer 4 reglas, todas con es_odonto_admin().
-- La de INSERT no tiene condición de lectura (polqual), solo de escritura
-- (polwithcheck): por eso se muestra la que haya.
SELECT polname AS regla,
       COALESCE(pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid)) AS condicion
FROM pg_policy
WHERE polrelid = 'public.liquidaciones_odontologos'::regclass
ORDER BY polname;
