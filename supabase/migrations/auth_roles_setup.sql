-- ============================================================================
-- Cuentas, perfiles y roles del sistema odontológico
-- ============================================================================
-- Pegar en el SQL Editor del proyecto Odonto y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: las migraciones dentales (base_schema, odontologia_setup,
-- dentalink_upgrade) crean las tablas clínicas pero NO las de cuentas. Sin
-- `user_roles` la app deja entrar y acto seguido muestra "Sin acceso", porque
-- auth-context no puede leer el rol de la persona.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. Perfil de cada cuenta -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT,
    nombre TEXT,
    apellido TEXT,
    registro_profesional TEXT,
    telefono TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Rol y permisos de cada cuenta --------------------------------------------
-- `permissions` en '{}' significa "usar los permisos por defecto del rol"
-- (resolverPermisosSanidad en auth-context trata {} igual que null).
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Activo',
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Quién es admin ------------------------------------------------------------
-- SECURITY DEFINER a propósito: corre como dueño de la tabla, así que NO vuelve
-- a pasar por las políticas de `user_roles`. Si consultara la tabla como el
-- usuario común, la política de admin se llamaría a sí misma (recursión
-- infinita, error 42P17) y nadie podría leer su rol.
CREATE OR REPLACE FUNCTION public.es_odonto_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND lower(role) IN ('admin', 'superadmin', 'super_admin')
          AND (status IS NULL OR lower(status) <> 'suspendido')
    );
$$;

-- 4. Row Level Security --------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_propio ON public.profiles;
CREATE POLICY profiles_select_propio ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.es_odonto_admin());

DROP POLICY IF EXISTS profiles_insert_propio ON public.profiles;
CREATE POLICY profiles_insert_propio ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.es_odonto_admin());

DROP POLICY IF EXISTS profiles_update_propio ON public.profiles;
CREATE POLICY profiles_update_propio ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.es_odonto_admin())
    WITH CHECK (id = auth.uid() OR public.es_odonto_admin());

-- Cada cuenta lee SOLO su propio rol; el admin lee y administra todos.
DROP POLICY IF EXISTS user_roles_select_propio ON public.user_roles;
CREATE POLICY user_roles_select_propio ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.es_odonto_admin());

DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
CREATE POLICY user_roles_admin_insert ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (public.es_odonto_admin());

DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
CREATE POLICY user_roles_admin_update ON public.user_roles
    FOR UPDATE TO authenticated
    USING (public.es_odonto_admin())
    WITH CHECK (public.es_odonto_admin());

DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;
CREATE POLICY user_roles_admin_delete ON public.user_roles
    FOR DELETE TO authenticated
    USING (public.es_odonto_admin());

-- 5. Perfil automático al crear una cuenta -------------------------------------
-- La app también intenta crear el perfil desde el navegador; este trigger evita
-- depender de eso (y de que el RLS lo permita en ese momento).
CREATE OR REPLACE FUNCTION public.fn_crear_perfil_nuevo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, nombre)
    VALUES (
        NEW.id,
        NEW.email,
        split_part(COALESCE(NEW.email, ''), '@', 1),
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN others THEN
    -- Un perfil que falle NUNCA debe impedir que se cree la cuenta.
    RAISE WARNING 'No se pudo crear el perfil de %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- El trigger va sobre `auth.users`, que no siempre es del usuario del SQL
-- Editor ("must be owner of table users"). Si no se puede, el script sigue: la
-- app igual crea el perfil desde el navegador al entrar.
DO $$
BEGIN
    DROP TRIGGER IF EXISTS trg_crear_perfil_nuevo_usuario ON auth.users;
    CREATE TRIGGER trg_crear_perfil_nuevo_usuario
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.fn_crear_perfil_nuevo_usuario();
EXCEPTION WHEN others THEN
    RAISE WARNING 'No se pudo crear el trigger sobre auth.users (%). El perfil se creara desde la app.', SQLERRM;
END $$;

-- 6. Perfil y rol de las cuentas que ya existen --------------------------------
-- Se cruza por email contra auth.users, así no hay que copiar UUIDs a mano.
INSERT INTO public.profiles (id, email, username, nombre)
SELECT u.id, u.email, split_part(u.email, '@', 1), u.raw_user_meta_data ->> 'full_name'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role, status, permissions)
SELECT u.id, r.rol, 'Activo', '{}'::jsonb
FROM auth.users u
JOIN (VALUES
    ('medico@odonto.com',    'medico'),
    ('admin@odonto.com',     'admin'),
    ('recepcion@odonto.com', 'recepcion'),
    ('asistente@odonto.com', 'enfermeria')
) AS r(correo, rol) ON lower(u.email) = r.correo
ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'Activo',
        updated_at = NOW();

-- 7. Verificación --------------------------------------------------------------
SELECT p.email, ur.role, ur.status
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY ur.role;
