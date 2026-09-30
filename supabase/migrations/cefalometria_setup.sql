-- ============================================================================
-- Cefalometría: estudios, trazados e imágenes del caso
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- Por qué existe: el módulo se publicó sin esta tabla en la base, y el código
-- "guardaba" en la memoria del navegador cuando no la encontraba. Los trazados
-- quedaban solo en esa computadora y se perdían al limpiar el navegador.
-- ============================================================================

-- 1. Tabla -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cefalometria_estudios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    titulo VARCHAR(200) NOT NULL DEFAULT 'Teleradiografía lateral',
    tipo VARCHAR(50) NOT NULL DEFAULT 'teleradiografia_lateral',
    -- Ruta dentro del depósito `cefalometria` (no una URL: el depósito es
    -- privado y la pantalla pide un enlace temporal cada vez que la muestra).
    imagen_url TEXT NOT NULL DEFAULT '',
    -- Fotos y radiografías complementarias del caso: { "foto_perfil": "<ruta>", ... }
    imagenes JSONB NOT NULL DEFAULT '{}'::jsonb,
    puntos JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Sin `pixelesPorMm` hasta que se calibre con la regla de la radiografía:
    -- un valor de fábrica daría milímetros inventados.
    calibracion JSONB NOT NULL DEFAULT '{"distanciaRealMm": 10}'::jsonb,
    mediciones JSONB DEFAULT '[]'::jsonb,
    progreso VARCHAR(50) NOT NULL DEFAULT 'digitalizacion',
    notas TEXT,
    creado_por UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Por si la tabla se creó con la primera versión de este archivo.
ALTER TABLE public.cefalometria_estudios ADD COLUMN IF NOT EXISTS imagenes JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.cefalometria_estudios ALTER COLUMN imagen_url SET DEFAULT '';
ALTER TABLE public.cefalometria_estudios ALTER COLUMN calibracion SET DEFAULT '{"distanciaRealMm": 10}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cefalometria_paciente ON public.cefalometria_estudios(paciente_id);
CREATE INDEX IF NOT EXISTS idx_cefalometria_fecha ON public.cefalometria_estudios(fecha DESC);

COMMENT ON TABLE public.cefalometria_estudios IS 'Estudios radiográficos y trazados cefalométricos por paciente.';

-- 2. Permisos de la tabla ------------------------------------------------------
-- El mismo criterio que rls_completo.sql: personal activo lee y escribe, borrar
-- es solo del admin. La primera versión de este archivo tenía USING (true), que
-- deja entrar a CUALQUIER cuenta logueada, aunque no tenga rol (trampa 2 del
-- CLAUDE.md). Se borra toda regla que no sea de las nuestras.
ALTER TABLE public.cefalometria_estudios ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT polname FROM pg_policy
        WHERE polrelid = 'public.cefalometria_estudios'::regclass
          AND polname NOT LIKE 'odonto\_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.cefalometria_estudios', r.polname);
    END LOOP;
END $$;

DROP POLICY IF EXISTS odonto_cefalometria_estudios_select ON public.cefalometria_estudios;
CREATE POLICY odonto_cefalometria_estudios_select ON public.cefalometria_estudios
    FOR SELECT TO authenticated USING (public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_estudios_insert ON public.cefalometria_estudios;
CREATE POLICY odonto_cefalometria_estudios_insert ON public.cefalometria_estudios
    FOR INSERT TO authenticated WITH CHECK (public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_estudios_update ON public.cefalometria_estudios;
CREATE POLICY odonto_cefalometria_estudios_update ON public.cefalometria_estudios
    FOR UPDATE TO authenticated
    USING (public.es_odonto_activo()) WITH CHECK (public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_estudios_delete ON public.cefalometria_estudios;
CREATE POLICY odonto_cefalometria_estudios_delete ON public.cefalometria_estudios
    FOR DELETE TO authenticated USING (public.es_odonto_admin());

-- 3. Depósito de imágenes -------------------------------------------------------
-- PRIVADO: son radiografías y fotos de la cara de pacientes. Con un depósito
-- público, cualquiera con el enlace las vería sin iniciar sesión.
-- Límite de 15 MB por archivo; la app de todos modos las achica antes de subir.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cefalometria', 'cefalometria', false, 15728640,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS odonto_cefalometria_archivos_select ON storage.objects;
CREATE POLICY odonto_cefalometria_archivos_select ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'cefalometria' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_archivos_insert ON storage.objects;
CREATE POLICY odonto_cefalometria_archivos_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'cefalometria' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_archivos_update ON storage.objects;
CREATE POLICY odonto_cefalometria_archivos_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'cefalometria' AND public.es_odonto_activo())
    WITH CHECK (bucket_id = 'cefalometria' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_archivos_delete ON storage.objects;
CREATE POLICY odonto_cefalometria_archivos_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'cefalometria' AND public.es_odonto_admin());

-- 4. Que la API vea la tabla nueva sin esperar -----------------------------------
NOTIFY pgrst, 'reload schema';
