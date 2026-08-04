-- ============================================================================
-- Alineación del esquema con lo que la aplicación realmente pide
-- ============================================================================
-- Pegar en el SQL Editor del proyecto Odonto y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: las migraciones anteriores crearon una versión reducida
-- del esquema y el código espera columnas y tablas que ahí no están. Eso
-- producía errores 400/404 en pantalla y, lo más grave, impedía guardar un
-- paciente o una cita.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. La clínica única -----------------------------------------------------------
-- `clinicas.id` es UUID, pero el código mandaba el número 1 (CLINICA_ID), y la
-- base lo rechazaba con "invalid input syntax for type uuid". Se crea la clínica
-- con un UUID FIJO y CONOCIDO para poder referenciarlo desde el código.
-- Si cambiás este UUID, hay que cambiar CLINICA_ID en src/api/pacientes.ts.
INSERT INTO public.clinicas (id, nombre)
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'Clínica Odontológica'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Registro profesional del odontólogo ---------------------------------------
ALTER TABLE public.medicos
    ADD COLUMN IF NOT EXISTS numero_colegiatura TEXT;

-- 3. Ausencias: los nombres de columna que usa el código ------------------------
-- La tabla se creó con fecha_inicio/fecha_fin y el código pide desde/hasta.
-- Se renombra (la tabla está vacía, no hay datos que migrar). El bloque IF
-- evita el error si el script se corre dos veces.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ausencias_medicos'
          AND column_name = 'fecha_inicio'
    ) THEN
        ALTER TABLE public.ausencias_medicos RENAME COLUMN fecha_inicio TO desde;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ausencias_medicos'
          AND column_name = 'fecha_fin'
    ) THEN
        ALTER TABLE public.ausencias_medicos RENAME COLUMN fecha_fin TO hasta;
    END IF;
END $$;

ALTER TABLE public.ausencias_medicos
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL;

-- 4. Columnas que el codigo manda al guardar -----------------------------------
ALTER TABLE public.horarios_medicos
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL;

ALTER TABLE public.especialidades
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL;

-- 5. Avisos de la campanita -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT,
    mensaje TEXT,
    tipo TEXT,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notificaciones_user_idx
    ON public.notificaciones (user_id, created_at DESC);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Una política por acción, todas contra el dueño del aviso.
DROP POLICY IF EXISTS notificaciones_select_propio ON public.notificaciones;
CREATE POLICY notificaciones_select_propio ON public.notificaciones
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS notificaciones_insert_propio ON public.notificaciones;
CREATE POLICY notificaciones_insert_propio ON public.notificaciones
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.es_odonto_admin());

DROP POLICY IF EXISTS notificaciones_update_propio ON public.notificaciones;
CREATE POLICY notificaciones_update_propio ON public.notificaciones
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notificaciones_delete_propio ON public.notificaciones;
CREATE POLICY notificaciones_delete_propio ON public.notificaciones
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6. Auditoría de acciones sobre usuarios ---------------------------------------
CREATE TABLE IF NOT EXISTS public.user_admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    target_user_id UUID,
    action TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_admin_audit ENABLE ROW LEVEL SECURITY;

-- Un registro de auditoría lo escribe cualquiera que actúe, pero solo el admin
-- puede leerlo: si no, cualquiera repasaría quién tocó qué cuenta.
DROP POLICY IF EXISTS user_admin_audit_insert ON public.user_admin_audit;
CREATE POLICY user_admin_audit_insert ON public.user_admin_audit
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS user_admin_audit_select_admin ON public.user_admin_audit;
CREATE POLICY user_admin_audit_select_admin ON public.user_admin_audit
    FOR SELECT TO authenticated USING (public.es_odonto_admin());

-- 7. Catálogo CIE-10 -------------------------------------------------------------
-- La pantalla de Mantenimiento lo consulta. Se crea vacío: los códigos se
-- cargan aparte si se los quiere usar.
CREATE TABLE IF NOT EXISTS public.cie10 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    categoria TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cie10_codigo_unico ON public.cie10 (codigo);

ALTER TABLE public.cie10 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cie10_select ON public.cie10;
CREATE POLICY cie10_select ON public.cie10
    FOR SELECT TO authenticated USING (public.es_odonto_activo());

DROP POLICY IF EXISTS cie10_admin ON public.cie10;
CREATE POLICY cie10_admin ON public.cie10
    FOR ALL TO authenticated
    USING (public.es_odonto_admin()) WITH CHECK (public.es_odonto_admin());

-- 8. Especialidades odontológicas de arranque ------------------------------------
-- Sin al menos una especialidad no se puede dar de alta un odontólogo.
INSERT INTO public.especialidades (nombre, color, descripcion, clinica_id)
SELECT v.nombre, v.color, v.descripcion, '00000000-0000-4000-a000-000000000001'
FROM (VALUES
    ('Odontología General',    '#0ea5e9', 'Diagnóstico, profilaxis y operatoria dental'),
    ('Endodoncia',             '#f59e0b', 'Tratamiento de conductos'),
    ('Periodoncia',            '#10b981', 'Encías y tejidos de soporte'),
    ('Ortodoncia',             '#8b5cf6', 'Corrección de la posición dentaria'),
    ('Cirugía Bucal',          '#ef4444', 'Exodoncias y cirugía menor'),
    ('Odontopediatría',        '#ec4899', 'Atención odontológica de niños'),
    ('Prótesis y Rehabilitación', '#14b8a6', 'Prótesis fija y removible'),
    ('Radiología Oral',        '#64748b', 'Estudios por imágenes')
) AS v(nombre, color, descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM public.especialidades e WHERE lower(e.nombre) = lower(v.nombre)
);

-- 9. Verificación ----------------------------------------------------------------
SELECT 'clinicas' AS tabla, count(*)::text AS filas FROM public.clinicas
UNION ALL SELECT 'especialidades', count(*)::text FROM public.especialidades
UNION ALL SELECT 'notificaciones', count(*)::text FROM public.notificaciones
UNION ALL SELECT 'user_admin_audit', count(*)::text FROM public.user_admin_audit
UNION ALL SELECT 'cie10', count(*)::text FROM public.cie10
UNION ALL SELECT 'medicos.numero_colegiatura', (
    SELECT count(*)::text FROM information_schema.columns
    WHERE table_name = 'medicos' AND column_name = 'numero_colegiatura')
UNION ALL SELECT 'ausencias_medicos.desde', (
    SELECT count(*)::text FROM information_schema.columns
    WHERE table_name = 'ausencias_medicos' AND column_name = 'desde');
