-- ============================================================================
-- Historial por fecha y adjuntos clínicos de pacientes
-- ============================================================================
-- Ejecutar una vez en Supabase SQL Editor. Es seguro volver a ejecutarlo.
-- ============================================================================

-- Un tratamiento presupuestado no forma parte de la historia clínica hasta que
-- se lo marca como realizado. Esta fecha evita usar por error la fecha del
-- presupuesto como fecha de atención.
-- ⛔ FRENO (agregado con multiempresa.sql, 2026-10-01) -------------------------
-- Este archivo es de cuando había UNA sola empresa. En una base multiempresa
-- volvería a crear reglas sin empresa y, como las reglas de Postgres se SUMAN,
-- dejaría ver pacientes de un consultorio a otro. Por eso se niega a correr.
-- El instalador (instalacion_completa.sql) lo puede correr: después aplica
-- multiempresa.sql, que deja todo bien.
DO $$
BEGIN
    IF to_regclass('public.sistema_duenos') IS NOT NULL
       AND COALESCE(current_setting('odonto.instalador', true), '') <> 'si' THEN
        RAISE EXCEPTION 'Migración anterior a multiempresa: NO ejecutarla en esta base (ver multiempresa.sql).';
    END IF;
END $$;
-- -----------------------------------------------------------------------------

ALTER TABLE public.presupuesto_detalles
    ADD COLUMN IF NOT EXISTS fecha_realizado DATE,
    ADD COLUMN IF NOT EXISTS realizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Los registros ya existentes que estaban marcados como realizados no tienen
-- su fecha original. Se conserva la fecha de alta como mejor referencia
-- disponible, sin inventar una fecha distinta.
UPDATE public.presupuesto_detalles
SET fecha_realizado = created_at::date
WHERE estado = 'realizado' AND fecha_realizado IS NULL;

CREATE INDEX IF NOT EXISTS idx_presupuesto_detalles_realizados_fecha
    ON public.presupuesto_detalles (fecha_realizado DESC)
    WHERE estado = 'realizado';

-- También protege los cambios hechos desde otra pantalla o integración: ningún
-- procedimiento realizado puede quedar sin fecha ni responsable.
CREATE OR REPLACE FUNCTION public.fn_fijar_fecha_procedimiento_realizado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'realizado' AND NEW.fecha_realizado IS NULL THEN
        NEW.fecha_realizado := CURRENT_DATE;
    END IF;
    IF NEW.estado = 'realizado' AND NEW.realizado_por IS NULL THEN
        NEW.realizado_por := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fijar_fecha_procedimiento_realizado ON public.presupuesto_detalles;
CREATE TRIGGER trg_fijar_fecha_procedimiento_realizado
    BEFORE INSERT OR UPDATE ON public.presupuesto_detalles
    FOR EACH ROW EXECUTE FUNCTION public.fn_fijar_fecha_procedimiento_realizado();

-- Metadatos del archivo. `url` se mantiene para no romper adjuntos anteriores;
-- los nuevos usan archivo_path y se abren mediante una URL firmada temporal.
ALTER TABLE public.paciente_imagenes
    ADD COLUMN IF NOT EXISTS archivo_path TEXT,
    ADD COLUMN IF NOT EXISTS nombre_archivo TEXT,
    ADD COLUMN IF NOT EXISTS mime_type TEXT;

COMMENT ON COLUMN public.paciente_imagenes.archivo_path IS
    'Ruta dentro del bucket privado radiografias; nunca una URL pública.';

-- Radiografías, fotos y PDFs clínicos: el bucket debe ser privado porque
-- contienen información sensible de pacientes. Máximo 15 MB por archivo.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'radiografias',
    'radiografias',
    false,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Quita cualquier política vieja del bucket que pudiera haber dejado archivos
-- expuestos por una configuración anterior.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT polname FROM pg_policy
        WHERE polrelid = 'storage.objects'::regclass
          AND polname LIKE '%radiografias%'
          AND polname NOT LIKE 'odonto_radiografias_archivos_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.polname);
    END LOOP;
END $$;

-- Mismo criterio de acceso que el resto del sistema: personal activo puede
-- leer y cargar; solo administración puede eliminar archivos.
DROP POLICY IF EXISTS odonto_radiografias_archivos_select ON storage.objects;
CREATE POLICY odonto_radiografias_archivos_select ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'radiografias' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_radiografias_archivos_insert ON storage.objects;
CREATE POLICY odonto_radiografias_archivos_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'radiografias' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_radiografias_archivos_update ON storage.objects;
CREATE POLICY odonto_radiografias_archivos_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'radiografias' AND public.es_odonto_activo())
    WITH CHECK (bucket_id = 'radiografias' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_radiografias_archivos_delete ON storage.objects;
CREATE POLICY odonto_radiografias_archivos_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'radiografias' AND public.es_odonto_admin());

NOTIFY pgrst, 'reload schema';
