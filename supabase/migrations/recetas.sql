-- ============================================================================
-- Recetas odontológicas
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: `src/api/recetas.ts` existía desde que el sistema se
-- clonó del médico policial, pero estas dos tablas NUNCA se crearon en esta
-- base. La pantalla no existía, así que nadie lo notó: el código llamaba a una
-- tabla inexistente y habría fallado con "PGRST205" en el primer intento.
--
-- Diseño:
--   * `recetas` es la cabecera (a quién, quién la firma, cuándo, diagnóstico).
--   * `receta_items` son los medicamentos, uno por fila.
--   * El número correlativo (R-00001…) lo arma el navegador en
--     `src/api/numeracion.ts`. El candado real contra dos puestos emitiendo a
--     la vez es el índice único `recetas_numero_unico` de acá abajo: sin él,
--     dos recetas podrían salir con el mismo número.
--   * No se borra: una receta equivocada se ANULA (`anulada_at`) y conserva su
--     número, como el talonario de papel. Si desapareciera, el correlativo
--     quedaría con un hueco imposible de explicar.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. Cabecera de la receta -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT NOT NULL,
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    -- ON DELETE SET NULL y no CASCADE: si se borra la ficha del odontólogo, la
    -- receta que le dio al paciente sigue existiendo.
    medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
    cita_id UUID REFERENCES public.citas(id) ON DELETE SET NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    diagnostico TEXT,
    indicaciones TEXT,
    notas TEXT,
    anulada_at TIMESTAMPTZ,
    anulada_por UUID,
    motivo_anulacion TEXT,
    registrado_por UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- El candado del correlativo. `numeracion.ts` busca este nombre en el mensaje
-- de error para saber que tiene que reintentar con el número siguiente.
CREATE UNIQUE INDEX IF NOT EXISTS recetas_numero_unico ON public.recetas (numero);

CREATE INDEX IF NOT EXISTS recetas_paciente_idx ON public.recetas (paciente_id, fecha DESC);

-- 2. Medicamentos de cada receta -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receta_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- CASCADE acá sí: un medicamento no significa nada sin su receta.
    receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    medicamento TEXT NOT NULL,
    dosis TEXT,
    frecuencia TEXT,
    duracion TEXT,
    indicaciones TEXT,
    -- Para que se impriman en el mismo orden en que el odontólogo los cargó.
    orden INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS receta_items_receta_idx ON public.receta_items (receta_id, orden);

-- 3. Quién puede recetar ---------------------------------------------------------
-- Recetar no es lo mismo que trabajar en la clínica: el documento lleva la firma
-- y el registro profesional de quien prescribe. Recepción y asistente ven e
-- imprimen la receta ya emitida, pero no pueden crearla.
--
-- SECURITY DEFINER por lo mismo que `es_odonto_activo()`: corre como dueño de la
-- tabla y no vuelve a pasar por las políticas de `user_roles` (recursión, 42P17).
CREATE OR REPLACE FUNCTION public.es_odonto_prescriptor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND lower(role) = 'medico'
          AND (status IS NULL OR lower(status) IN ('activo', 'active', 'habilitado', 'enabled'))
    );
$$;

-- 4. Permisos de acceso ----------------------------------------------------------
-- Mismo criterio que `rls_completo.sql`, con una diferencia: el INSERT no lo
-- puede hacer cualquier persona activa, solo el odontólogo.
--
-- ⚠ Estas dos tablas también hay que agregarlas a la lista de `rls_completo.sql`
-- si alguna vez se vuelve a correr entero, o quedarían con las reglas genéricas
-- (que dejarían recetar a recepción).
DO $$
DECLARE
    t TEXT;
    tablas TEXT[] := ARRAY['recetas', 'receta_items'];
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- Ver e imprimir: todo el personal activo de la clínica.
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_select', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.es_odonto_activo())',
            'odonto_' || t || '_select', t);

        -- Emitir: solo el odontólogo.
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_insert', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.es_odonto_prescriptor())',
            'odonto_' || t || '_insert', t);

        -- Anular: el odontólogo que receta y el administrador.
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_update', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated '
            'USING (public.es_odonto_prescriptor() OR public.es_odonto_admin()) '
            'WITH CHECK (public.es_odonto_prescriptor() OR public.es_odonto_admin())',
            'odonto_' || t || '_update', t);

        -- Borrar de verdad: solo el admin, y en la práctica nunca (se anula).
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_delete', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.es_odonto_admin())',
            'odonto_' || t || '_delete', t);
    END LOOP;
END $$;

-- 5. Verificación ----------------------------------------------------------------
-- Las dos tablas tienen que aparecer con RLS activado y EXACTAMENTE 4 reglas.
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls_activado,
       count(p.polname) AS reglas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('recetas', 'receta_items')
GROUP BY c.relname, c.relrowsecurity;
