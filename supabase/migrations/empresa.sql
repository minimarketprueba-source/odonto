-- ============================================================================
-- Datos del consultorio editables desde la app
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué NO se creó una tabla `empresa` nueva: la tabla `clinicas` ya existe
-- desde `base_schema.sql` y ya tiene nombre, dirección, teléfono y email.
-- Además, TODAS las tablas del sistema apuntan a ella por `clinica_id`
-- (pacientes, citas, presupuestos, horarios, recetas…). Una tabla paralela
-- dejaría dos lugares distintos diciendo cuál es el consultorio, y tarde o
-- temprano uno se edita y el otro no. Acá solo se le agregan las dos columnas
-- que faltaban: RUC y logo.
--
-- El logo se guarda como data URL (base64) en una columna de texto, no en
-- Storage. Motivos: no hay que crear ni configurar ningún bucket a mano en el
-- panel, entra en el iframe de impresión sin pelear con la CSP, y es una sola
-- fila. La app lo achica a 600 px antes de guardarlo, así queda en ~50-100 KB.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. Las dos columnas que faltaban -----------------------------------------------
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS ruc TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. La fila del consultorio -----------------------------------------------------
-- Este UUID es el que `CLINICA_ID` tiene fijo en `src/api/pacientes.ts` y con el
-- que se guardan pacientes, citas y recetas. Si la fila no existe, se crea; si
-- ya existe, NO se le pisan los datos que el usuario haya cargado.
INSERT INTO public.clinicas (id, nombre, direccion, telefono, email)
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'CONSULTORIO ODONTOLÓGICO MOVA DENT',
    NULL, NULL, NULL
)
ON CONFLICT (id) DO NOTHING;

-- 3. Quién puede verlos y quién editarlos ----------------------------------------
-- Ver: CUALQUIERA, incluso sin haber iniciado sesión. Hace falta porque el
-- nombre y el logo se muestran en la pantalla de login, que por definición es
-- anterior a tener cuenta. No hay riesgo: son los datos que el consultorio tiene
-- en el cartel de la puerta y que van impresos en cada recibo que se entrega.
-- NO hay ningún dato de pacientes en esta tabla.
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS odonto_clinicas_select ON public.clinicas;
DROP POLICY IF EXISTS odonto_clinicas_select_publico ON public.clinicas;
CREATE POLICY odonto_clinicas_select_publico ON public.clinicas
    FOR SELECT TO anon, authenticated USING (true);

-- Editar: solo el administrador. Cambiar el nombre o el RUC del consultorio
-- cambia todos los documentos que se le entregan al paciente.
--
-- ⚠ `clinicas` está en la lista de `rls_completo.sql`, que le pone las reglas
-- genéricas (`es_odonto_activo()` para escribir). Si se vuelve a correr ese
-- archivo entero, hay que volver a correr ESTE después, o recepción pasaría a
-- poder cambiarle el nombre y el RUC al consultorio.
DROP POLICY IF EXISTS odonto_clinicas_insert ON public.clinicas;
CREATE POLICY odonto_clinicas_insert ON public.clinicas
    FOR INSERT TO authenticated WITH CHECK (public.es_odonto_admin());

DROP POLICY IF EXISTS odonto_clinicas_update ON public.clinicas;
CREATE POLICY odonto_clinicas_update ON public.clinicas
    FOR UPDATE TO authenticated
    USING (public.es_odonto_admin()) WITH CHECK (public.es_odonto_admin());

DROP POLICY IF EXISTS odonto_clinicas_delete ON public.clinicas;
CREATE POLICY odonto_clinicas_delete ON public.clinicas
    FOR DELETE TO authenticated USING (public.es_odonto_admin());

-- 4. Verificación ----------------------------------------------------------------
-- Tienen que aparecer las columnas nuevas y la fila del consultorio.
SELECT id, nombre, ruc, direccion, telefono, email,
       (logo_url IS NOT NULL) AS tiene_logo
FROM public.clinicas
WHERE id = '00000000-0000-4000-a000-000000000001';
