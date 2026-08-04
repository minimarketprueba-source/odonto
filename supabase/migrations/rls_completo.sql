-- ============================================================================
-- Permisos de acceso a los datos (Row Level Security)
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: las tablas del esquema base (pacientes, citas, medicos,
-- especialidades, clinicas, horarios…) quedaron con RLS ACTIVADO pero SIN
-- NINGUNA REGLA. En Postgres eso no significa "abierto", significa "cerrado
-- para todos": la app entra, no ve nada y no puede guardar nada.
--
-- Los síntomas eran: el Dashboard mostrando 0 pacientes con fichas cargadas,
-- los desplegables de especialidades vacíos y el alta fallando con
-- "new row violates row-level security policy".
--
-- Criterio: quien tiene una cuenta activa de la clínica puede leer y escribir
-- los datos clínicos; borrar queda solo para el admin, porque acá se da de baja
-- (activo = false) en lugar de borrar, para no perder la historia del paciente.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. Quién es personal activo de la clínica -------------------------------------
-- SECURITY DEFINER: corre como dueño de la tabla, así no vuelve a pasar por las
-- políticas de `user_roles` (que provocaría una recursión infinita, error 42P17).
CREATE OR REPLACE FUNCTION public.es_odonto_activo()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND lower(role) IN ('admin', 'superadmin', 'super_admin',
                              'medico', 'recepcion', 'enfermeria')
          AND (status IS NULL OR lower(status) IN ('activo', 'active', 'habilitado', 'enabled'))
    );
$$;

-- 2. Las mismas cuatro reglas para cada tabla de datos ---------------------------
-- Se recorren en un bucle en vez de repetir el bloque veinte veces: así no queda
-- ninguna tabla afuera por olvido, que es exactamente lo que pasó antes.
--
-- NO se tocan las tablas con reglas propias ya definidas (profiles, user_roles,
-- notificaciones, cie10, user_admin_audit): esas tienen criterios distintos
-- (cada uno ve lo suyo, la auditoría solo la lee el admin).
DO $$
DECLARE
    t TEXT;
    tablas TEXT[] := ARRAY[
        'clinicas',
        'especialidades',
        'medicos',
        'pacientes',
        'citas',
        'horarios_medicos',
        'ausencias_medicos',
        'sillones_dentales',
        'odontologia_precios',
        'odontograma_registros',
        'periodontogramas',
        'evoluciones_clinicas',
        'paciente_anamnesis',
        'paciente_imagenes',
        'consentimientos_paciente',
        'presupuestos',
        'presupuesto_detalles',
        'pagos_presupuesto',
        'liquidaciones_odontologos'
    ];
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        -- Si la tabla todavía no existe, se saltea en vez de cortar el script.
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            RAISE NOTICE 'Se saltea %: la tabla no existe', t;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_select', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.es_odonto_activo())',
            'odonto_' || t || '_select', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_insert', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.es_odonto_activo())',
            'odonto_' || t || '_insert', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_update', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated '
            'USING (public.es_odonto_activo()) WITH CHECK (public.es_odonto_activo())',
            'odonto_' || t || '_update', t);

        -- Borrar de verdad: solo el admin. El resto da de baja con activo=false.
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_delete', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.es_odonto_admin())',
            'odonto_' || t || '_delete', t);
    END LOOP;
END $$;

-- 2b. Sacar las reglas viejas que dejaban entrar a cualquiera --------------------
-- Las migraciones anteriores crearon políticas del tipo
--   CREATE POLICY x_all ON tabla FOR ALL TO authenticated USING (true)
-- "true" quiere decir CUALQUIERA que esté logueado: sin rol, recién registrado
-- por la pantalla pública o incluso suspendido. Y como las reglas de Postgres se
-- SUMAN (basta que una permita), esa dejaba sin efecto el criterio de arriba.
--
-- Verificado el 2026-08-04: una cuenta sin ningún rol podía escribir en
-- `sillones_dentales` y `odontologia_precios`. Alcanzaba a los odontogramas,
-- las evoluciones clínicas, la anamnesis, las imágenes y los presupuestos.
--
-- Se borra toda política de estas tablas que no sea de las de arriba (`odonto_`).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.relname AS tabla, p.polname AS politica
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND p.polname NOT LIKE 'odonto\_%'
          AND c.relname IN (
              'clinicas', 'especialidades', 'medicos', 'pacientes', 'citas',
              'horarios_medicos', 'ausencias_medicos', 'sillones_dentales',
              'odontologia_precios', 'odontograma_registros', 'periodontogramas',
              'evoluciones_clinicas', 'paciente_anamnesis', 'paciente_imagenes',
              'consentimientos_paciente', 'presupuestos', 'presupuesto_detalles',
              'pagos_presupuesto', 'liquidaciones_odontologos'
          )
    LOOP
        RAISE NOTICE 'Se quita la regla permisiva %.%', r.tabla, r.politica;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.politica, r.tabla);
    END LOOP;
END $$;

-- 3. Verificación ----------------------------------------------------------------
-- Cada tabla de datos tiene que aparecer con EXACTAMENTE 4 reglas. Si alguna
-- muestra 5 o más, quedó una regla vieja que deja entrar a cualquiera.
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls_activado,
       count(p.polname) AS reglas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY count(p.polname), c.relname;
