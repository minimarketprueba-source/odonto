-- ============================================================================
-- Ícono de Mova Dent guardado en SU base (solo para Mova Dent)
-- ============================================================================
-- Pegar en el SQL Editor de Mova Dent y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué: hasta el 2026-10-01 la muela de Mova Dent era el ícono "de fábrica"
-- del código, y la veía cualquier consultorio que no subiera el suyo. Ahora el
-- de fábrica es un diente genérico, y la marca de cada consultorio vive en su
-- propia base. Mova Dent ya tenía su logo cargado, pero no su ícono.
--
-- Guarda la RUTA del archivo que ya está publicado con el sistema, no la
-- imagen: así no hay que subir nada. NO ejecutar en otro consultorio.
-- Es idempotente: si ya hay un ícono cargado, no lo pisa.
-- ============================================================================

UPDATE public.clinicas
SET icono_url = '/mova-dent-icono.png',
    updated_at = NOW()
WHERE id = '00000000-0000-4000-a000-000000000001'
  AND nombre_corto = 'Mova Dent'
  AND icono_url IS NULL;

SELECT nombre_corto, icono_url FROM public.clinicas;
