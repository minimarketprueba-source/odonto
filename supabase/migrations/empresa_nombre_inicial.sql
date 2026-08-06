-- ============================================================================
-- Corregir el nombre del consultorio que quedó de antes
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: `empresa.sql` crea la fila del consultorio con
-- ON CONFLICT DO NOTHING, para no pisar datos que el usuario haya cargado.
-- Pero la fila YA existía desde `esquema_completo.sql` con el nombre viejo
-- ("Clínica Odontológica"). Como la app ahora lee el nombre de la base en vez
-- de tenerlo escrito en el código, ese nombre viejo volvió a aparecer en la
-- pantalla de acceso y en todos los impresos.
--
-- Solo cambia el nombre si TODAVÍA es el viejo. Si ya se editó desde
-- Mantenimiento → Consultorio, no lo toca.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

UPDATE public.clinicas
SET nombre = 'CONSULTORIO ODONTOLÓGICO MOVA DENT',
    updated_at = NOW()
WHERE id = '00000000-0000-4000-a000-000000000001'
  AND (
      nombre IS NULL
      OR btrim(nombre) = ''
      OR lower(btrim(nombre)) IN ('clínica odontológica', 'clinica odontologica')
  );

-- Verificación: tiene que decir CONSULTORIO ODONTOLÓGICO MOVA DENT.
SELECT nombre, ruc, direccion, telefono, email,
       (logo_url IS NOT NULL) AS tiene_logo_propio
FROM public.clinicas
WHERE id = '00000000-0000-4000-a000-000000000001';
