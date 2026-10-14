-- ============================================================================
-- El dueño entra UNA vez a cada consultorio y queda como administrador normal
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Corrige dueno_ingreso_unico.sql según lo que el usuario aclaró el
-- 2026-10-14: al entrar, el dueño queda como administrador PERMANENTE de ese
-- consultorio, igual que cualquier administrador (antes era una visita que se
-- cerraba al salir o al cerrar sesión). Lo que sigue valiendo:
--
--   - Entra con dueno_entrar_empresa(), una vez por consultorio. Si después el
--     administrador del consultorio lo saca, NO puede volver a entrar solo.
--   - No puede sumarse a sí mismo con agregar_a_empresa() ni con create-user.
--
-- dueno_salir_empresas() queda sin efecto (devuelve 0): la app ya no la usa,
-- pero una pestaña abierta con la versión anterior podría llamarla al cerrar
-- sesión y no tiene que quitarle nada.
--
-- Va DESPUÉS de dueno_ingreso_unico.sql. Idempotente.
-- ============================================================================

DO $$
BEGIN
    IF to_regclass('public.dueno_ingresos') IS NULL THEN
        RAISE EXCEPTION 'Falta aplicar dueno_ingreso_unico.sql antes que este archivo.';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dueno_entrar_empresa(p_clinica UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.es_dueno_sistema() THEN
        RAISE EXCEPTION 'Solo el dueño del sistema puede entrar así a un consultorio' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.clinicas WHERE id = p_clinica) THEN
        RAISE EXCEPTION 'Ese consultorio no existe' USING ERRCODE = 'P0002';
    END IF;

    -- Ya es miembro (entró antes, o lo sumó el administrador): solo se cambia
    -- de empresa. No gasta nada.
    IF EXISTS (SELECT 1 FROM public.user_roles
               WHERE user_id = auth.uid() AND clinica_id = p_clinica
                 AND public.odonto_estado_activo(status)) THEN
        UPDATE public.profiles SET clinica_activa = p_clinica, updated_at = NOW() WHERE id = auth.uid();
        RETURN;
    END IF;

    -- Ya usó su ingreso y hoy no es miembro (lo sacaron): no vuelve a entrar.
    IF EXISTS (SELECT 1 FROM public.dueno_ingresos
               WHERE user_id = auth.uid() AND clinica_id = p_clinica) THEN
        RAISE EXCEPTION 'Ya usó su único ingreso a este consultorio' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.dueno_ingresos (user_id, clinica_id) VALUES (auth.uid(), p_clinica);

    INSERT INTO public.user_roles (user_id, clinica_id, role, status, permissions)
    VALUES (auth.uid(), p_clinica, 'admin', 'Activo', '{}'::jsonb)
    ON CONFLICT (user_id, clinica_id) DO UPDATE SET role = 'admin', status = 'Activo', updated_at = NOW();

    UPDATE public.profiles SET clinica_activa = p_clinica, updated_at = NOW() WHERE id = auth.uid();
END;
$$;

-- Sin efecto desde 2026-10-14: el ingreso del dueño es permanente.
CREATE OR REPLACE FUNCTION public.dueno_salir_empresas()
RETURNS INTEGER LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
    SELECT 0;
$$;

REVOKE ALL ON FUNCTION public.dueno_entrar_empresa(UUID), public.dueno_salir_empresas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dueno_entrar_empresa(UUID), public.dueno_salir_empresas() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Consultorios donde el dueño es administrador hoy (los que ya usó).
SELECT COALESCE(c.nombre_corto, c.nombre) AS consultorio, r.role AS rol, i.entro_at AS entro
FROM public.user_roles r
JOIN public.sistema_duenos d ON d.user_id = r.user_id
JOIN public.clinicas c ON c.id = r.clinica_id
LEFT JOIN public.dueno_ingresos i ON i.user_id = r.user_id AND i.clinica_id = r.clinica_id
ORDER BY 1;
