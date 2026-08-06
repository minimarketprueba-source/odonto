-- ============================================================================
-- Marca del consultorio: nombre corto, color e ícono
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: el sistema tiene que poder entregarse a otro consultorio
-- sin tocar una línea de código. Hasta ahora el nombre, la dirección, el
-- teléfono, el RUC y el logo ya se editaban, pero seguían escritos en el código
-- tres cosas de Mova Dent:
--
--   1. El nombre corto ("Mova Dent") del menú lateral y la pestaña.
--   2. El celeste de la banda de la receta y del nombre en los impresos.
--   3. El ícono cuadrado del menú y del navegador.
--
-- Con estas tres columnas, entregar el sistema a otro cliente es: entrar a
-- Mantenimiento → Consultorio, cargar sus datos y subir sus dos imágenes.
--
-- Por qué el ícono va aparte del logo: son formas distintas. El logo es ancho
-- (el de Mova Dent mide 457x124, casi 4:1) y entra bien en el membrete de un
-- papel o en la pantalla de acceso. El ícono es cuadrado y va en el recuadro de
-- 40x40 del menú y en la pestaña del navegador, donde un logo ancho se ve
-- diminuto entre dos franjas vacías.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. Las columnas nuevas ---------------------------------------------------------
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS nombre_corto TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS color_primario TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS icono_url TEXT;

-- 2. Los valores de Mova Dent ----------------------------------------------------
-- Solo si están vacíos: si alguien ya los cargó desde la pantalla, no se pisan.
UPDATE public.clinicas
SET nombre_corto = COALESCE(NULLIF(btrim(nombre_corto), ''), 'Mova Dent'),
    color_primario = COALESCE(NULLIF(btrim(color_primario), ''), '#0e7490'),
    updated_at = NOW()
WHERE id = '00000000-0000-4000-a000-000000000001';

-- 3. Verificación ----------------------------------------------------------------
SELECT nombre, nombre_corto, color_primario,
       (logo_url IS NOT NULL) AS tiene_logo,
       (icono_url IS NOT NULL) AS tiene_icono
FROM public.clinicas
WHERE id = '00000000-0000-4000-a000-000000000001';
