-- ============================================================================
-- El dueño del sistema entra a cada consultorio UNA sola vez
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Decisión del usuario (2026-10-12): el dueño (superadmin1) puede entrar a un
-- consultorio para dejarlo configurado, pero UNA vez por consultorio. Antes
-- (2026-10-02) el dueño no veía pacientes nunca; otra sesión agregó un botón
-- "Entrar" que lo dejaba como administrador para siempre. Esto lo acota:
--
--   1. dueno_entrar_empresa(): lo suma como admin y anota el ingreso. Si ya
--      usó su ingreso a ese consultorio, la BASE lo rechaza.
--   2. dueno_salir_empresas(): termina la visita (al cerrar sesión, con
--      "Salir del consultorio" o, a más tardar, al volver a iniciar sesión):
--      le quita el rol y deja de ver los pacientes.
--   3. agregar_a_empresa() ya no deja que el dueño se sume a sí mismo: si no,
--      la regla se salteaba llamando a esa función directamente.
--
-- Si el dueño ya era miembro de ese consultorio por otra vía (lo sumó su
-- administrador), entrar no gasta el ingreso y salir no le quita ese rol.
--
-- Va DESPUÉS de multiempresa.sql. Idempotente.
-- ============================================================================

DO $$
BEGIN
    IF to_regprocedure('public.es_dueno_sistema()') IS NULL THEN
        RAISE EXCEPTION 'Falta aplicar multiempresa.sql antes que este archivo.';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.dueno_ingresos (
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    entro_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    salio_at   TIMESTAMPTZ,
    PRIMARY KEY (user_id, clinica_id)
);

-- Cada dueño ve solo sus ingresos (para que la pantalla sepa cuáles ya usó).
-- Nadie escribe directo: solo las funciones de abajo.
ALTER TABLE public.dueno_ingresos ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.dueno_ingresos'::regclass LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.dueno_ingresos', pol.polname);
    END LOOP;
END $$;
CREATE POLICY dueno_ingresos_select ON public.dueno_ingresos
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.dueno_entrar_empresa(p_clinica UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.es_dueno_sistema() THEN
        RAISE EXCEPTION 'Solo el dueño del sistema puede entrar así a un consultorio' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.clinicas WHERE id = p_clinica) THEN
        RAISE EXCEPTION 'Ese consultorio no existe' USING ERRCODE = 'P0002';
    END IF;

    -- Ya es miembro por otra vía: solo se cambia de empresa, no gasta el ingreso.
    IF EXISTS (SELECT 1 FROM public.user_roles
               WHERE user_id = auth.uid() AND clinica_id = p_clinica
                 AND public.odonto_estado_activo(status))
       AND NOT EXISTS (SELECT 1 FROM public.dueno_ingresos
                       WHERE user_id = auth.uid() AND clinica_id = p_clinica AND salio_at IS NULL) THEN
        UPDATE public.profiles SET clinica_activa = p_clinica, updated_at = NOW() WHERE id = auth.uid();
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM public.dueno_ingresos
               WHERE user_id = auth.uid() AND clinica_id = p_clinica AND salio_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Ya usó su único ingreso a este consultorio' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.dueno_ingresos (user_id, clinica_id)
    VALUES (auth.uid(), p_clinica)
    ON CONFLICT (user_id, clinica_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, clinica_id, role, status, permissions)
    VALUES (auth.uid(), p_clinica, 'admin', 'Activo', '{}'::jsonb)
    ON CONFLICT (user_id, clinica_id) DO UPDATE SET role = 'admin', status = 'Activo', updated_at = NOW();

    UPDATE public.profiles SET clinica_activa = p_clinica, updated_at = NOW() WHERE id = auth.uid();
END;
$$;

-- Termina las visitas abiertas del dueño. Devuelve cuántas cerró.
CREATE OR REPLACE FUNCTION public.dueno_salir_empresas()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    cerradas INTEGER;
BEGIN
    IF NOT public.es_dueno_sistema() THEN
        RETURN 0;
    END IF;

    DELETE FROM public.user_roles r
    USING public.dueno_ingresos i
    WHERE i.user_id = auth.uid() AND i.salio_at IS NULL
      AND r.user_id = i.user_id AND r.clinica_id = i.clinica_id;

    UPDATE public.dueno_ingresos SET salio_at = NOW()
    WHERE user_id = auth.uid() AND salio_at IS NULL;
    GET DIAGNOSTICS cerradas = ROW_COUNT;

    -- Si la empresa activa era una de esas, queda sin empresa (no ve nada).
    UPDATE public.profiles p SET clinica_activa = NULL, updated_at = NOW()
    WHERE p.id = auth.uid() AND p.clinica_activa IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r
                      WHERE r.user_id = p.id AND r.clinica_id = p.clinica_activa);
    RETURN cerradas;
END;
$$;

-- La misma de multiempresa.sql, más un control: el dueño no puede sumarse a
-- sí mismo (tiene que usar dueno_entrar_empresa, que cuenta el ingreso).
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
    IF persona = auth.uid() AND public.es_dueno_sistema() THEN
        RAISE EXCEPTION 'El dueño del sistema entra a un consultorio con el botón «Entrar» (una sola vez)'
            USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.user_roles (user_id, clinica_id, role, status, permissions)
    VALUES (persona, p_clinica, lower(p_rol), 'Activo', '{}'::jsonb)
    ON CONFLICT (user_id, clinica_id) DO UPDATE SET role = EXCLUDED.role, status = 'Activo', updated_at = NOW();
    RETURN persona;
END;
$$;

-- Limpieza: el botón "Entrar" anterior dejaba al dueño como administrador
-- PERMANENTE. Desde el 2026-10-02 el dueño no es miembro de ningún
-- consultorio, así que cualquier membresía suya sin un ingreso abierto viene
-- de ese botón y se quita (después puede usar su único ingreso normalmente).
DO $$
DECLARE
    quitadas INTEGER;
BEGIN
    DELETE FROM public.user_roles r
    USING public.sistema_duenos d
    WHERE r.user_id = d.user_id
      AND NOT EXISTS (SELECT 1 FROM public.dueno_ingresos i
                      WHERE i.user_id = r.user_id AND i.clinica_id = r.clinica_id AND i.salio_at IS NULL);
    GET DIAGNOSTICS quitadas = ROW_COUNT;
    UPDATE public.profiles p SET clinica_activa = NULL
    FROM public.sistema_duenos d
    WHERE p.id = d.user_id AND p.clinica_activa IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r
                      WHERE r.user_id = p.id AND r.clinica_id = p.clinica_activa);
    RAISE NOTICE 'Membresías del dueño quitadas: %', quitadas;
END $$;

REVOKE ALL ON FUNCTION public.dueno_entrar_empresa(UUID), public.dueno_salir_empresas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dueno_entrar_empresa(UUID), public.dueno_salir_empresas() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Tiene que salir "0": el dueño no queda como miembro de ningún consultorio.
SELECT count(*) AS "consultorios donde el dueño sigue siendo miembro"
FROM public.user_roles r
JOIN public.sistema_duenos d ON d.user_id = r.user_id;
