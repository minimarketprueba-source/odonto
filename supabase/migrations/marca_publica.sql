-- ============================================================================
-- Logo del consultorio en la pantalla de ingreso, para todos sus usuarios
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué: con varias empresas en una sola base, la pantalla de ingreso no
-- sabe de qué consultorio es la persona hasta que entra. Por eso mostraba la
-- última marca usada EN ESE EQUIPO: en un celular o una computadora nueva
-- salía neutra, y un consultorio que no fuera Mova Dent casi nunca veía su
-- logo ahí. El usuario pidió que la presentación del logo sea para todos.
--
-- Solución: cada consultorio tiene un CÓDIGO DE ACCESO (Mova Dent → movadent)
-- y su enlace de ingreso (odonto-pied.vercel.app/?c=movadent). Con el código
-- EXACTO, marca_publica() devuelve solo lo que va en la puerta: nombre, logo,
-- ícono y color. Ningún dato de pacientes, y no se puede listar consultorios
-- (la tabla clinicas sigue sin leerse desde afuera).
--
-- Va DESPUÉS de multiempresa.sql. Idempotente.
-- ============================================================================

DO $$
BEGIN
    IF to_regprocedure('public.mi_clinica_id()') IS NULL THEN
        RAISE EXCEPTION 'Falta aplicar multiempresa.sql antes que este archivo.';
    END IF;
END $$;

ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS codigo_acceso TEXT;

-- "Consultorio Odontológico Mova Dent" → "consultorioodontologicomovadent";
-- se parte del nombre corto ("Mova Dent" → "movadent"), que es más amable.
CREATE OR REPLACE FUNCTION public.codigo_desde_nombre(p_nombre TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
    SELECT NULLIF(
        left(
            regexp_replace(
                translate(lower(coalesce(p_nombre, '')),
                          'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
                '[^a-z0-9]', '', 'g'),
            30),
        '');
$$;

-- Pone el código al crear la empresa (o si se lo vacía), sin repetir: si
-- "movadent" ya existe, usa "movadent2", "movadent3"…
CREATE OR REPLACE FUNCTION public.fn_codigo_acceso_clinica()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    base TEXT;
    candidato TEXT;
    n INT := 1;
BEGIN
    IF NEW.codigo_acceso IS NOT NULL AND btrim(NEW.codigo_acceso) <> '' THEN
        NEW.codigo_acceso := lower(btrim(NEW.codigo_acceso));
        RETURN NEW;
    END IF;
    base := coalesce(public.codigo_desde_nombre(NEW.nombre_corto),
                     public.codigo_desde_nombre(NEW.nombre), 'consultorio');
    candidato := base;
    WHILE EXISTS (SELECT 1 FROM public.clinicas
                  WHERE lower(codigo_acceso) = candidato AND id IS DISTINCT FROM NEW.id) LOOP
        n := n + 1;
        candidato := base || n;
    END LOOP;
    NEW.codigo_acceso := candidato;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_codigo_acceso_clinica ON public.clinicas;
CREATE TRIGGER trg_codigo_acceso_clinica
    BEFORE INSERT OR UPDATE OF codigo_acceso, nombre_corto ON public.clinicas
    FOR EACH ROW EXECUTE FUNCTION public.fn_codigo_acceso_clinica();

-- Las que ya existen: se les asigna uno, de a una (el trigger evita repetir).
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN SELECT id FROM public.clinicas
             WHERE codigo_acceso IS NULL OR btrim(codigo_acceso) = ''
             ORDER BY created_at NULLS LAST, id LOOP
        UPDATE public.clinicas SET codigo_acceso = NULL WHERE id = c.id;
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS clinicas_codigo_acceso_unico
    ON public.clinicas (lower(codigo_acceso));

-- Lo único que se entrega sin sesión, y solo con el código exacto.
CREATE OR REPLACE FUNCTION public.marca_publica(p_codigo TEXT)
RETURNS TABLE (nombre TEXT, nombre_corto TEXT, logo_url TEXT, icono_url TEXT, color_primario TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT c.nombre, c.nombre_corto, c.logo_url, c.icono_url, c.color_primario
    FROM public.clinicas c
    WHERE lower(c.codigo_acceso) = lower(btrim(p_codigo))
      AND btrim(coalesce(p_codigo, '')) <> ''
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.marca_publica(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marca_publica(TEXT) TO anon, authenticated;

-- Tiene que aparecer cada consultorio con su código.
SELECT nombre_corto, codigo_acceso FROM public.clinicas ORDER BY nombre_corto;
