-- ============================================================================
-- MULTIEMPRESA: varias empresas (consultorios) en una sola base
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Qué hace:
--   * Cada paciente, cita, presupuesto, receta… queda atado a una empresa
--     (columna `clinica_id`), y la BASE solo deja ver y tocar los de la empresa
--     en la que la persona está trabajando. No lo decide la pantalla: un error
--     de pantalla no puede mostrar pacientes de otra empresa.
--   * Una persona puede trabajar en varias empresas, con un rol en cada una
--     (`user_roles` pasa a tener una fila por persona Y empresa). La empresa
--     activa se guarda en `profiles.clinica_activa`.
--   * Los "dueños del sistema" (`sistema_duenos`) crean empresas y les dan
--     administradores, pero NO ven fichas clínicas: para eso tendrían que ser
--     miembros de la empresa, como cualquiera.
--   * Todo lo que ya existe pasa a ser de Mova Dent, que es la única empresa
--     que había (UUID 00000000-0000-4000-a000-000000000001). Nadie pierde nada.
--
-- Va entero dentro de una transacción: si algo falla, no se aplica NADA y la
-- base queda como estaba. Es idempotente: se puede volver a ejecutar.
-- ============================================================================

BEGIN;

-- 1. Dueños del sistema ----------------------------------------------------------
-- Se arranca con las cuentas que ya eran superadmin. Ser dueño NO da acceso a
-- pacientes: ese acceso lo da ser miembro de una empresa (paso 2).
CREATE TABLE IF NOT EXISTS public.sistema_duenos (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.sistema_duenos (user_id)
SELECT DISTINCT user_id FROM public.user_roles
WHERE lower(role) IN ('superadmin', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;

-- 2. Rol por persona Y por empresa ------------------------------------------------
-- Antes: una fila por persona (clave user_id). Ahora: una por persona y empresa.
-- Las filas existentes son todas de Mova Dent.
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS clinica_id UUID;
UPDATE public.user_roles SET clinica_id = '00000000-0000-4000-a000-000000000001'
WHERE clinica_id IS NULL;
ALTER TABLE public.user_roles ALTER COLUMN clinica_id SET NOT NULL;

DO $$
DECLARE
    pk RECORD;
BEGIN
    SELECT conname, array_length(conkey, 1) AS columnas INTO pk
    FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass AND contype = 'p';

    IF pk.conname IS NOT NULL AND pk.columnas = 1 THEN
        EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', pk.conname);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'public.user_roles'::regclass AND contype = 'p') THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, clinica_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_clinica_id_fkey') THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_clinica_id_fkey
            FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_roles_clinica_idx ON public.user_roles (clinica_id);

-- 3. Empresa activa de cada persona ----------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS clinica_activa UUID REFERENCES public.clinicas(id) ON DELETE SET NULL;

-- 4. Funciones que usan los permisos ---------------------------------------------
-- Todas SECURITY DEFINER: corren como dueño de las tablas y no vuelven a pasar
-- por las reglas de `user_roles` (si no, recursión infinita, error 42P17).

CREATE OR REPLACE FUNCTION public.odonto_estado_activo(estado TEXT)
RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE AS $$
    SELECT estado IS NULL OR lower(estado) IN ('activo', 'active', 'habilitado', 'enabled');
$$;

-- La empresa en la que la persona está trabajando: la que eligió, si sigue
-- siendo miembro activo; si no, la primera a la que pertenece. NULL si no
-- pertenece a ninguna, y entonces no ve nada.
CREATE OR REPLACE FUNCTION public.mi_clinica_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(
        (SELECT p.clinica_activa
         FROM public.profiles p
         JOIN public.user_roles r ON r.user_id = p.id AND r.clinica_id = p.clinica_activa
         WHERE p.id = auth.uid() AND public.odonto_estado_activo(r.status)),
        (SELECT r.clinica_id
         FROM public.user_roles r
         WHERE r.user_id = auth.uid() AND public.odonto_estado_activo(r.status)
         ORDER BY r.created_at, r.clinica_id
         LIMIT 1)
    );
$$;

CREATE OR REPLACE FUNCTION public.mi_rol_en_empresa()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT lower(r.role) FROM public.user_roles r
    WHERE r.user_id = auth.uid()
      AND r.clinica_id = public.mi_clinica_id()
      AND public.odonto_estado_activo(r.status);
$$;

CREATE OR REPLACE FUNCTION public.es_odonto_activo()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(public.mi_rol_en_empresa() IN (
        'admin', 'superadmin', 'super_admin', 'medico', 'recepcion', 'enfermeria', 'asistente'
    ), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.es_odonto_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(public.mi_rol_en_empresa() IN ('admin', 'superadmin', 'super_admin'), FALSE);
$$;

-- Emitir recetas: el odontólogo y el admin (ver recetas_admin_prescriptor.sql).
CREATE OR REPLACE FUNCTION public.es_odonto_prescriptor()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(public.mi_rol_en_empresa() IN ('medico', 'admin', 'superadmin', 'super_admin'), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.es_dueno_sistema()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.sistema_duenos WHERE user_id = auth.uid());
$$;

-- Un archivo del depósito es de mi empresa si su primera carpeta es un
-- paciente de mi empresa (así se guardan hoy) o el id de mi empresa.
CREATE OR REPLACE FUNCTION public.ruta_de_mi_empresa(ruta TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT split_part(ruta, '/', 1) = public.mi_clinica_id()::text
        OR EXISTS (SELECT 1 FROM public.pacientes p
                   WHERE p.id::text = split_part(ruta, '/', 1)
                     AND p.clinica_id = public.mi_clinica_id());
$$;

-- 5. Cada tabla de datos queda atada a una empresa --------------------------------
-- Para cada una: columna `clinica_id` obligatoria; lo existente pasa a Mova
-- Dent; al insertar se completa sola con la empresa activa (la pantalla no
-- tiene que mandarla, y no puede mandar otra: lo impiden las reglas del paso 8).
-- Borrar una empresa con datos queda PROHIBIDO (RESTRICT): antes se ponía en
-- NULL y los pacientes habrían quedado huérfanos, visibles para nadie.
DO $$
DECLARE
    t TEXT;
    fk RECORD;
    tablas TEXT[] := ARRAY[
        'pacientes', 'citas', 'medicos', 'especialidades', 'horarios_medicos',
        'ausencias_medicos', 'sillones_dentales', 'odontologia_precios',
        'odontograma_registros', 'periodontogramas', 'evoluciones_clinicas',
        'paciente_anamnesis', 'paciente_imagenes', 'consentimientos_paciente',
        'presupuestos', 'presupuesto_detalles', 'pagos_presupuesto',
        'liquidaciones_odontologos', 'recetas', 'receta_items',
        'cefalometria_estudios', 'user_admin_audit'
    ];
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        IF to_regclass('public.' || t) IS NULL THEN
            RAISE NOTICE 'Se saltea %: la tabla no existe', t;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS clinica_id UUID', t);
        EXECUTE format(
            'UPDATE public.%I SET clinica_id = %L WHERE clinica_id IS NULL',
            t, '00000000-0000-4000-a000-000000000001');

        -- La referencia vieja era ON DELETE SET NULL: se reemplaza.
        FOR fk IN
            SELECT c.conname FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
            WHERE c.conrelid = ('public.' || t)::regclass AND c.contype = 'f'
              AND a.attname = 'clinica_id' AND c.confdeltype <> 'r'
        LOOP
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, fk.conname);
        END LOOP;
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
            WHERE c.conrelid = ('public.' || t)::regclass AND c.contype = 'f' AND a.attname = 'clinica_id'
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (clinica_id) '
                'REFERENCES public.clinicas(id) ON DELETE RESTRICT',
                t, t || '_clinica_id_fkey');
        END IF;

        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN clinica_id SET NOT NULL', t);
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN clinica_id SET DEFAULT public.mi_clinica_id()', t);
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (clinica_id)', t || '_clinica_idx', t);
    END LOOP;
END $$;

-- 6. Lo que era único en toda la base pasa a ser único POR EMPRESA ------------------
-- Una misma cédula puede ser paciente de dos consultorios; cada empresa tiene
-- su propio talonario de recetas (R-00001…) y sus propios códigos de arancel.
-- Se conservan los NOMBRES de los índices viejos: así, si alguien vuelve a
-- correr una migración vieja, su CREATE INDEX IF NOT EXISTS no hace nada en
-- vez de volver a crear el índice global.
DO $$
DECLARE
    con TEXT;
BEGIN
    -- pacientes.documento y odontologia_precios.codigo venían como UNIQUE de columna
    SELECT conname INTO con FROM pg_constraint
    WHERE conrelid = 'public.pacientes'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (documento)';
    IF con IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.pacientes DROP CONSTRAINT %I', con);
    END IF;

    SELECT conname INTO con FROM pg_constraint
    WHERE conrelid = 'public.odontologia_precios'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (codigo)';
    IF con IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.odontologia_precios DROP CONSTRAINT %I', con);
    END IF;

    IF to_regclass('public.medicos_documento_unico') IS NOT NULL
       AND pg_get_indexdef('public.medicos_documento_unico'::regclass) NOT LIKE '%clinica_id%' THEN
        DROP INDEX public.medicos_documento_unico;
    END IF;
    IF to_regclass('public.medicos_user_id_unico') IS NOT NULL
       AND pg_get_indexdef('public.medicos_user_id_unico'::regclass) NOT LIKE '%clinica_id%' THEN
        DROP INDEX public.medicos_user_id_unico;
    END IF;
    IF to_regclass('public.recetas_numero_unico') IS NOT NULL
       AND pg_get_indexdef('public.recetas_numero_unico'::regclass) NOT LIKE '%clinica_id%' THEN
        DROP INDEX public.recetas_numero_unico;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pacientes_documento_por_empresa
    ON public.pacientes (clinica_id, documento) WHERE documento IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS odontologia_precios_codigo_por_empresa
    ON public.odontologia_precios (clinica_id, codigo);
CREATE UNIQUE INDEX IF NOT EXISTS medicos_documento_unico
    ON public.medicos (clinica_id, documento) WHERE documento IS NOT NULL;
-- Una cuenta, una ficha de odontólogo POR EMPRESA: quien atiende en dos
-- consultorios tiene una ficha en cada uno.
CREATE UNIQUE INDEX IF NOT EXISTS medicos_user_id_unico
    ON public.medicos (clinica_id, user_id) WHERE user_id IS NOT NULL;
DO $$
BEGIN
    IF to_regclass('public.recetas') IS NOT NULL THEN
        CREATE UNIQUE INDEX IF NOT EXISTS recetas_numero_unico ON public.recetas (clinica_id, numero);
    END IF;
END $$;

-- 7. Un registro no puede apuntar a otro de OTRA empresa ----------------------------
-- Las referencias (paciente_id, presupuesto_id…) las controla Postgres sin
-- mirar empresas: sin esto, alguien podría colgar un pago de un presupuesto
-- ajeno adivinando su número. El trigger toma la empresa del registro padre
-- y rechaza cualquier mezcla.
--
-- Argumentos: pares columna, tabla_padre.
CREATE OR REPLACE FUNCTION public.fn_misma_empresa()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    i INT := 0;
    valor TEXT;
    empresa_padre UUID;
    fila JSONB := to_jsonb(NEW);
BEGIN
    WHILE i < TG_NARGS LOOP
        valor := fila ->> TG_ARGV[i];
        IF valor IS NOT NULL THEN
            EXECUTE format('SELECT clinica_id FROM public.%I WHERE id::text = $1', TG_ARGV[i + 1])
                INTO empresa_padre USING valor;
            IF empresa_padre IS NOT NULL THEN
                IF NEW.clinica_id IS NULL THEN
                    NEW.clinica_id := empresa_padre;
                ELSIF NEW.clinica_id <> empresa_padre THEN
                    RAISE EXCEPTION 'No se puede vincular con un registro de otra empresa (%.%)',
                        TG_TABLE_NAME, TG_ARGV[i]
                        USING ERRCODE = '42501';
                END IF;
            END IF;
        END IF;
        i := i + 2;
    END LOOP;
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('citas',                     ARRAY['paciente_id','pacientes','medico_id','medicos','sillon_id','sillones_dentales']),
        ('evoluciones_clinicas',      ARRAY['paciente_id','pacientes','medico_id','medicos','cita_id','citas']),
        ('periodontogramas',          ARRAY['paciente_id','pacientes','medico_id','medicos']),
        ('odontograma_registros',     ARRAY['paciente_id','pacientes']),
        ('paciente_anamnesis',        ARRAY['paciente_id','pacientes']),
        ('paciente_imagenes',         ARRAY['paciente_id','pacientes']),
        ('consentimientos_paciente',  ARRAY['paciente_id','pacientes']),
        ('cefalometria_estudios',     ARRAY['paciente_id','pacientes']),
        ('presupuestos',              ARRAY['paciente_id','pacientes']),
        ('presupuesto_detalles',      ARRAY['presupuesto_id','presupuestos','tratamiento_id','odontologia_precios']),
        ('pagos_presupuesto',         ARRAY['presupuesto_id','presupuestos']),
        ('recetas',                   ARRAY['paciente_id','pacientes','medico_id','medicos','cita_id','citas']),
        ('receta_items',              ARRAY['receta_id','recetas']),
        ('horarios_medicos',          ARRAY['medico_id','medicos']),
        ('ausencias_medicos',         ARRAY['medico_id','medicos']),
        ('liquidaciones_odontologos', ARRAY['medico_id','medicos']),
        ('medicos',                   ARRAY['especialidad_id','especialidades'])
    ) AS v(tabla, pares)
    LOOP
        IF to_regclass('public.' || r.tabla) IS NULL THEN CONTINUE; END IF;
        EXECUTE format('DROP TRIGGER IF EXISTS trg_misma_empresa ON public.%I', r.tabla);
        EXECUTE format(
            'CREATE TRIGGER trg_misma_empresa BEFORE INSERT OR UPDATE ON public.%I '
            'FOR EACH ROW EXECUTE FUNCTION public.fn_misma_empresa(%s)',
            r.tabla,
            (SELECT string_agg(quote_literal(x), ', ') FROM unnest(r.pares) AS x));
    END LOOP;
END $$;

-- 8. Reglas de acceso de las tablas de datos ----------------------------------------
-- Cuatro reglas por tabla, siempre con la empresa activa:
--   ver / cargar / modificar → personal activo DE ESA EMPRESA
--   borrar                   → administrador DE ESA EMPRESA
-- Se borra antes TODA regla existente de estas tablas: las reglas se SUMAN, y
-- una vieja sin empresa (por ejemplo USING (true)) abriría todo de nuevo.
-- `(SELECT public.mi_clinica_id())` entre paréntesis: así Postgres la calcula
-- una vez por consulta y no una por fila.
DO $$
DECLARE
    t TEXT;
    pol RECORD;
    emp CONSTANT TEXT := 'clinica_id = (SELECT public.mi_clinica_id())';
    tablas TEXT[] := ARRAY[
        'pacientes', 'citas', 'medicos', 'especialidades', 'horarios_medicos',
        'ausencias_medicos', 'sillones_dentales', 'odontologia_precios',
        'odontograma_registros', 'periodontogramas', 'evoluciones_clinicas',
        'paciente_anamnesis', 'paciente_imagenes', 'consentimientos_paciente',
        'presupuestos', 'presupuesto_detalles', 'pagos_presupuesto',
        'liquidaciones_odontologos', 'recetas', 'receta_items',
        'cefalometria_estudios', 'user_admin_audit'
    ];
    ins TEXT;
    upd TEXT;
    sel TEXT;
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = ('public.' || t)::regclass LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
        END LOOP;

        sel := 'public.es_odonto_activo()';
        ins := 'public.es_odonto_activo()';
        upd := 'public.es_odonto_activo()';
        IF t IN ('recetas', 'receta_items') THEN
            -- La receta lleva firma y registro profesional: emitirla y anularla
            -- es del odontólogo (o del admin), no de recepción.
            ins := 'public.es_odonto_prescriptor()';
            upd := '(public.es_odonto_prescriptor() OR public.es_odonto_admin())';
        ELSIF t = 'user_admin_audit' THEN
            -- Quién tocó qué cuenta: lo escribe cualquiera que actúe, lo lee el admin.
            sel := 'public.es_odonto_admin()';
            upd := 'FALSE';
        END IF;

        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s AND %s)',
            'odonto_' || t || '_select', t, emp, sel);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s AND %s)',
            'odonto_' || t || '_insert', t, emp, ins);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s AND %s) WITH CHECK (%s AND %s)',
            'odonto_' || t || '_update', t, emp, upd, emp, upd);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s AND public.es_odonto_admin())',
            'odonto_' || t || '_delete', t, emp);
    END LOOP;
END $$;

-- 9. Empresas -------------------------------------------------------------------
-- Antes se leían sin iniciar sesión (para el logo del login). Con varias
-- empresas, el login no sabe todavía de qué empresa es la persona: muestra la
-- marca del sistema o la última que se usó en esa computadora. Así nadie de
-- afuera puede listar los consultorios que usan el sistema.
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.clinicas'::regclass LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinicas', pol.polname);
    END LOOP;
END $$;

CREATE POLICY odonto_clinicas_select ON public.clinicas
    FOR SELECT TO authenticated
    USING (
        public.es_dueno_sistema()
        OR EXISTS (SELECT 1 FROM public.user_roles r
                   WHERE r.user_id = auth.uid() AND r.clinica_id = clinicas.id
                     AND public.odonto_estado_activo(r.status))
    );
CREATE POLICY odonto_clinicas_insert ON public.clinicas
    FOR INSERT TO authenticated WITH CHECK (public.es_dueno_sistema());
CREATE POLICY odonto_clinicas_update ON public.clinicas
    FOR UPDATE TO authenticated
    USING (public.es_dueno_sistema() OR (id = (SELECT public.mi_clinica_id()) AND public.es_odonto_admin()))
    WITH CHECK (public.es_dueno_sistema() OR (id = (SELECT public.mi_clinica_id()) AND public.es_odonto_admin()));
CREATE POLICY odonto_clinicas_delete ON public.clinicas
    FOR DELETE TO authenticated USING (public.es_dueno_sistema());

-- 10. Roles: cada uno ve el suyo en la empresa activa; el admin, los de su empresa
-- La lectura queda en la empresa ACTIVA también para la propia fila: la app lee
-- "mi rol" esperando una sola fila. Las empresas de una persona se listan con
-- mis_empresas() (paso 13).
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.user_roles'::regclass LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.polname);
    END LOOP;
END $$;

CREATE POLICY odonto_user_roles_select ON public.user_roles
    FOR SELECT TO authenticated
    USING (clinica_id = (SELECT public.mi_clinica_id())
           AND (user_id = auth.uid() OR public.es_odonto_admin()));
CREATE POLICY odonto_user_roles_insert ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = (SELECT public.mi_clinica_id()) AND public.es_odonto_admin());
CREATE POLICY odonto_user_roles_update ON public.user_roles
    FOR UPDATE TO authenticated
    USING (clinica_id = (SELECT public.mi_clinica_id()) AND public.es_odonto_admin())
    WITH CHECK (clinica_id = (SELECT public.mi_clinica_id()) AND public.es_odonto_admin());
CREATE POLICY odonto_user_roles_delete ON public.user_roles
    FOR DELETE TO authenticated
    USING (clinica_id = (SELECT public.mi_clinica_id()) AND public.es_odonto_admin());

ALTER TABLE public.user_roles ALTER COLUMN clinica_id SET DEFAULT public.mi_clinica_id();

-- 11. Perfiles: el propio, y el admin los de las personas de SU empresa ---------------
-- Antes el admin veía y podía editar el perfil de cualquier cuenta de la base.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.profiles'::regclass LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.polname);
    END LOOP;
END $$;

CREATE POLICY odonto_profiles_select ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid()
           OR (public.es_odonto_admin()
               AND id IN (SELECT r.user_id FROM public.user_roles r
                          WHERE r.clinica_id = (SELECT public.mi_clinica_id()))));
CREATE POLICY odonto_profiles_insert ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY odonto_profiles_update ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid()
           OR (public.es_odonto_admin()
               AND id IN (SELECT r.user_id FROM public.user_roles r
                          WHERE r.clinica_id = (SELECT public.mi_clinica_id()))))
    WITH CHECK (id = auth.uid()
           OR (public.es_odonto_admin()
               AND id IN (SELECT r.user_id FROM public.user_roles r
                          WHERE r.clinica_id = (SELECT public.mi_clinica_id()))));

-- La tabla de dueños: cada uno puede ver si lo es (la app lo usa para mostrar
-- la pantalla Empresas). Nadie la modifica desde la app.
ALTER TABLE public.sistema_duenos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS odonto_sistema_duenos_select ON public.sistema_duenos;
CREATE POLICY odonto_sistema_duenos_select ON public.sistema_duenos
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 12. Archivos (radiografías, fotos, PDF) -----------------------------------------
DO $$
DECLARE
    b TEXT;
BEGIN
    IF to_regclass('storage.objects') IS NULL THEN RETURN; END IF;
    FOREACH b IN ARRAY ARRAY['cefalometria', 'radiografias'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'odonto_' || b || '_archivos_select');
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'odonto_' || b || '_archivos_insert');
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'odonto_' || b || '_archivos_update');
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'odonto_' || b || '_archivos_delete');

        EXECUTE format(
            'CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated '
            'USING (bucket_id = %L AND public.es_odonto_activo() AND public.ruta_de_mi_empresa(name))',
            'odonto_' || b || '_archivos_select', b);
        EXECUTE format(
            'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated '
            'WITH CHECK (bucket_id = %L AND public.es_odonto_activo() AND public.ruta_de_mi_empresa(name))',
            'odonto_' || b || '_archivos_insert', b);
        EXECUTE format(
            'CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated '
            'USING (bucket_id = %L AND public.es_odonto_activo() AND public.ruta_de_mi_empresa(name)) '
            'WITH CHECK (bucket_id = %L AND public.es_odonto_activo() AND public.ruta_de_mi_empresa(name))',
            'odonto_' || b || '_archivos_update', b, b);
        EXECUTE format(
            'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated '
            'USING (bucket_id = %L AND public.es_odonto_admin() AND public.ruta_de_mi_empresa(name))',
            'odonto_' || b || '_archivos_delete', b);
    END LOOP;
END $$;

-- 13. Funciones que llama la app --------------------------------------------------

-- Las empresas en las que trabaja la persona, para el selector de empresa.
CREATE OR REPLACE FUNCTION public.mis_empresas()
RETURNS TABLE (clinica_id UUID, nombre TEXT, nombre_corto TEXT, rol TEXT, activa BOOLEAN)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT c.id, c.nombre::text, COALESCE(c.nombre_corto, c.nombre)::text, lower(r.role),
           c.id = public.mi_clinica_id()
    FROM public.user_roles r
    JOIN public.clinicas c ON c.id = r.clinica_id
    WHERE r.user_id = auth.uid() AND public.odonto_estado_activo(r.status)
    ORDER BY COALESCE(c.nombre_corto, c.nombre);
$$;

-- Cambiar de empresa. Solo a una donde la persona es miembro activo.
CREATE OR REPLACE FUNCTION public.cambiar_empresa(p_clinica UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles
                   WHERE user_id = auth.uid() AND clinica_id = p_clinica
                     AND public.odonto_estado_activo(status)) THEN
        RAISE EXCEPTION 'No pertenece a esa empresa' USING ERRCODE = '42501';
    END IF;
    UPDATE public.profiles SET clinica_activa = p_clinica, updated_at = NOW() WHERE id = auth.uid();
END;
$$;

-- Lo que arranca cargado en una empresa nueva: las especialidades (sin al
-- menos una no se puede dar de alta un odontólogo) y un sillón. Los aranceles
-- NO: son los precios de cada consultorio.
CREATE OR REPLACE FUNCTION public.fn_sembrar_empresa()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.especialidades (nombre, color, descripcion, clinica_id)
    SELECT v.nombre, v.color, v.descripcion, NEW.id
    FROM (VALUES
        ('Odontología General',       '#0ea5e9', 'Diagnóstico, profilaxis y operatoria dental'),
        ('Endodoncia',                '#f59e0b', 'Tratamiento de conductos'),
        ('Periodoncia',               '#10b981', 'Encías y tejidos de soporte'),
        ('Ortodoncia',                '#8b5cf6', 'Corrección de la posición dentaria'),
        ('Cirugía Bucal',             '#ef4444', 'Exodoncias y cirugía menor'),
        ('Odontopediatría',           '#ec4899', 'Atención odontológica de niños'),
        ('Prótesis y Rehabilitación', '#14b8a6', 'Prótesis fija y removible'),
        ('Radiología Oral',           '#64748b', 'Estudios por imágenes')
    ) AS v(nombre, color, descripcion);
    INSERT INTO public.sillones_dentales (nombre, color, clinica_id) VALUES ('Sillón 1', '#0ea5e9', NEW.id);
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sembrar_empresa ON public.clinicas;
CREATE TRIGGER trg_sembrar_empresa AFTER INSERT ON public.clinicas
    FOR EACH ROW EXECUTE FUNCTION public.fn_sembrar_empresa();

-- Pantalla Empresas (solo dueños): todas las empresas con su gente.
CREATE OR REPLACE FUNCTION public.listar_empresas()
RETURNS TABLE (clinica_id UUID, nombre TEXT, nombre_corto TEXT, created_at TIMESTAMPTZ,
               personas BIGINT, administradores TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.es_dueno_sistema() THEN
        RAISE EXCEPTION 'Solo el dueño del sistema' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT c.id, c.nombre::text, COALESCE(c.nombre_corto, c.nombre)::text, c.created_at,
           (SELECT count(*) FROM public.user_roles r WHERE r.clinica_id = c.id),
           (SELECT string_agg(u.email, ', ' ORDER BY u.email)
            FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
            WHERE r.clinica_id = c.id AND lower(r.role) IN ('admin', 'superadmin', 'super_admin'))
    FROM public.clinicas c
    ORDER BY c.created_at;
END;
$$;

-- Crear una empresa (solo dueños). Devuelve su id.
CREATE OR REPLACE FUNCTION public.crear_empresa(p_nombre TEXT, p_nombre_corto TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    nueva UUID;
BEGIN
    IF NOT public.es_dueno_sistema() THEN
        RAISE EXCEPTION 'Solo el dueño del sistema puede crear empresas' USING ERRCODE = '42501';
    END IF;
    IF btrim(COALESCE(p_nombre, '')) = '' THEN
        RAISE EXCEPTION 'Falta el nombre de la empresa';
    END IF;
    INSERT INTO public.clinicas (nombre, nombre_corto, color_primario)
    VALUES (btrim(p_nombre), NULLIF(btrim(COALESCE(p_nombre_corto, '')), ''), '#0e7490')
    RETURNING id INTO nueva;
    RETURN nueva;
END;
$$;

-- Sumar a una persona QUE YA TIENE CUENTA a una empresa, con un rol.
-- Puede hacerlo el dueño (en cualquier empresa) o el admin (en la suya).
-- Las cuentas nuevas se crean con la Edge Function create-user.
CREATE OR REPLACE FUNCTION public.agregar_a_empresa(p_clinica UUID, p_email TEXT, p_rol TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    persona UUID;
BEGIN
    IF NOT (public.es_dueno_sistema()
            OR (p_clinica = public.mi_clinica_id() AND public.es_odonto_admin())) THEN
        RAISE EXCEPTION 'Sin permiso para sumar personas a esa empresa' USING ERRCODE = '42501';
    END IF;
    IF lower(p_rol) NOT IN ('admin', 'medico', 'recepcion', 'enfermeria', 'asistente') THEN
        RAISE EXCEPTION 'Rol no válido: %', p_rol;
    END IF;
    SELECT id INTO persona FROM auth.users WHERE lower(email) = lower(btrim(p_email));
    IF persona IS NULL THEN
        RAISE EXCEPTION 'No existe ninguna cuenta con el correo %', p_email USING ERRCODE = 'P0002';
    END IF;
    INSERT INTO public.user_roles (user_id, clinica_id, role, status, permissions)
    VALUES (persona, p_clinica, lower(p_rol), 'Activo', '{}'::jsonb)
    ON CONFLICT (user_id, clinica_id) DO UPDATE SET role = EXCLUDED.role, status = 'Activo', updated_at = NOW();
    RETURN persona;
END;
$$;

REVOKE ALL ON FUNCTION public.mis_empresas(), public.cambiar_empresa(UUID), public.listar_empresas(),
                       public.crear_empresa(TEXT, TEXT), public.agregar_a_empresa(UUID, TEXT, TEXT)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_empresas(), public.cambiar_empresa(UUID), public.listar_empresas(),
                          public.crear_empresa(TEXT, TEXT), public.agregar_a_empresa(UUID, TEXT, TEXT)
    TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- 14. Verificación ----------------------------------------------------------------
-- Tiene que mostrar Mova Dent con su gente, y quiénes quedaron como dueños.
SELECT 'empresa' AS que, COALESCE(c.nombre_corto, c.nombre) AS detalle,
       (SELECT count(*) FROM public.user_roles r WHERE r.clinica_id = c.id)::text AS cantidad
FROM public.clinicas c
UNION ALL
SELECT 'dueño del sistema', u.email, ''
FROM public.sistema_duenos d JOIN auth.users u ON u.id = d.user_id
UNION ALL
SELECT 'pacientes sin empresa', '', count(*)::text FROM public.pacientes WHERE clinica_id IS NULL;
