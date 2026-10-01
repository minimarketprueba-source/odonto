-- ============================================================================
-- INSTALACIÓN COMPLETA DE LA BASE DE UN CONSULTORIO NUEVO
-- ============================================================================
-- ARCHIVO GENERADO por scripts/armar-instalacion.mjs — no editarlo a mano:
-- se corrige la migración original y se vuelve a generar (npm run instalacion).
--
-- Para qué: dejar lista la base de datos de un consultorio que recién empieza.
-- Pasos completos en docs/INSTALAR-NUEVO-CONSULTORIO.md.
--
--   1. Crear un proyecto NUEVO en https://supabase.com (uno por consultorio).
--   2. SQL Editor → New query → pegar TODO este archivo → Run.
--
-- ⚠️  NO ejecutarlo en la base de Mova Dent ni en la de otro consultorio que ya
--     esté en uso: no borra nada, pero le cambiaría el nombre corto y la marca.
--
-- Es idempotente: si se corta a la mitad, se puede volver a ejecutar entero.
-- ============================================================================


-- ############################################################################
-- 01. base_schema.sql
-- ############################################################################

-- Habilitar extensión pgcrypto para gen_random_uuid() si no está
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear tabla clinicas
CREATE TABLE IF NOT EXISTS public.clinicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla especialidades
CREATE TABLE IF NOT EXISTS public.especialidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla medicos
CREATE TABLE IF NOT EXISTS public.medicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    user_id UUID, -- Referencia a auth.users
    especialidad_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    documento TEXT UNIQUE,
    tipo TEXT,
    grado TEXT,
    promocion TEXT,
    unidad TEXT,
    familiar_de TEXT,
    fecha_nacimiento DATE,
    sexo TEXT,
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla citas
CREATE TABLE IF NOT EXISTS public.citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
    paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado TEXT DEFAULT 'programada',
    motivo TEXT,
    notas TEXT,
    agendado_por TEXT,
    admitida_at TIMESTAMP WITH TIME ZONE,
    orden_llegada INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla horarios_medicos
CREATE TABLE IF NOT EXISTS public.horarios_medicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla ausencias_medicos
CREATE TABLE IF NOT EXISTS public.ausencias_medicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ############################################################################
-- 02. odontologia_setup.sql
-- ############################################################################

-- ============================================================================
-- SQL Migration: Setup Tablas de Odontología
-- ============================================================================
-- Pegar este script en el SQL Editor de tu proyecto Supabase y ejecutarlo.
-- Asegura que las tablas clínicas de odontología, los triggers y las políticas
-- de Row Level Security (RLS) queden configuradas correctamente.

-- 1. Catálogo de Precios de Procedimientos Odontológicos
CREATE TABLE IF NOT EXISTS public.odontologia_precios (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    costo NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Registro de Anamnesis / Antecedentes Médicos
CREATE TABLE IF NOT EXISTS public.paciente_anamnesis (
    paciente_id UUID PRIMARY KEY REFERENCES public.pacientes(id) ON DELETE CASCADE,
    alergias TEXT,
    alergia_latex BOOLEAN NOT NULL DEFAULT false,
    alergia_anestesia BOOLEAN NOT NULL DEFAULT false,
    problemas_cardiacos BOOLEAN NOT NULL DEFAULT false,
    presion_arterial VARCHAR(50),
    medicamentos TEXT,
    enfermedades_sistemicas TEXT,
    observaciones TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Registro de Odontograma Digital (Núcleo)
CREATE TABLE IF NOT EXISTS public.odontograma_registros (
    id SERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    pieza INTEGER NOT NULL, -- 11-48 (adulto), 51-85 (infantil)
    cara VARCHAR(20) NOT NULL, -- 'vestibular', 'palatina', 'oclusal', 'mesial', 'distal', 'completo'
    diagnostico VARCHAR(100), -- 'caries', 'fractura', 'ausente', 'microdoncia', etc.
    tratamiento VARCHAR(100), -- 'empaste', 'endodoncia', 'corona', 'implante', 'extraccion', etc.
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente' (requiere atención/rojo), 'realizado' (hecho/azul)
    color VARCHAR(20),
    notas TEXT,
    registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Registro de Presupuestos (Planes de Tratamiento)
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id SERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL DEFAULT 'Plan de Tratamiento',
    estado VARCHAR(20) NOT NULL DEFAULT 'borrador', -- 'borrador', 'aprobado', 'rechazado', 'finalizado'
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    saldo_pendiente NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Detalles de Presupuesto (Procedimientos del Plan)
CREATE TABLE IF NOT EXISTS public.presupuesto_detalles (
    id SERIAL PRIMARY KEY,
    presupuesto_id INTEGER NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
    tratamiento_id INTEGER NOT NULL REFERENCES public.odontologia_precios(id) ON DELETE RESTRICT,
    pieza INTEGER, -- Opcional, para asociar el procedimiento a un diente específico
    cara VARCHAR(20),
    costo NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    descuento NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'realizado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Registro de Pagos (Control de Saldos)
CREATE TABLE IF NOT EXISTS public.pagos_presupuesto (
    id SERIAL PRIMARY KEY,
    presupuesto_id INTEGER NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
    monto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tipo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo', -- 'efectivo', 'tarjeta', 'transferencia'
    comentario TEXT,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    recibido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Registro de Imágenes Clínicas (Radiografías/Fotos)
CREATE TABLE IF NOT EXISTS public.paciente_imagenes (
    id SERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'periapical', -- 'panoramica', 'periapical', 'clinica', 'otra'
    descripcion TEXT,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Consentimientos Informados Firmados
CREATE TABLE IF NOT EXISTS public.consentimientos_paciente (
    id SERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL DEFAULT 'Consentimiento Informado',
    contenido TEXT NOT NULL,
    firma TEXT NOT NULL, -- Firma digital en Base64 o SVG
    firmado_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) en todas las nuevas tablas
ALTER TABLE public.odontologia_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odontograma_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_presupuesto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimientos_paciente ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para usuarios autenticados
DROP POLICY IF EXISTS odontologia_precios_select ON public.odontologia_precios;
CREATE POLICY odontologia_precios_select ON public.odontologia_precios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS odontologia_precios_all ON public.odontologia_precios;
CREATE POLICY odontologia_precios_all ON public.odontologia_precios FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS paciente_anamnesis_all ON public.paciente_anamnesis;
CREATE POLICY paciente_anamnesis_all ON public.paciente_anamnesis FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS odontograma_registros_all ON public.odontograma_registros;
CREATE POLICY odontograma_registros_all ON public.odontograma_registros FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS presupuestos_all ON public.presupuestos;
CREATE POLICY presupuestos_all ON public.presupuestos FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS presupuesto_detalles_all ON public.presupuesto_detalles;
CREATE POLICY presupuesto_detalles_all ON public.presupuesto_detalles FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS pagos_presupuesto_all ON public.pagos_presupuesto;
CREATE POLICY pagos_presupuesto_all ON public.pagos_presupuesto FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS paciente_imagenes_all ON public.paciente_imagenes;
CREATE POLICY paciente_imagenes_all ON public.paciente_imagenes FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS consentimientos_paciente_all ON public.consentimientos_paciente;
CREATE POLICY consentimientos_paciente_all ON public.consentimientos_paciente FOR ALL TO authenticated USING (true);

-- Insertar procedimientos dentales iniciales por defecto si no existen
INSERT INTO public.odontologia_precios (codigo, nombre, costo) VALUES
('CONS-01', 'Consulta Diagnóstica y Presupuesto', 50000.00),
('LIM-02', 'Limpieza Dental (Profilaxis)', 300000.00),
('EMP-03', 'Empaste Simple (Resina)', 250000.00),
('EMP-04', 'Empaste Complejo', 400000.00),
('ENDO-05', 'Endodoncia Unirradicular', 900000.00),
('ENDO-06', 'Endodoncia Multirradicular', 1500000.00),
('EXT-07', 'Extracción Simple', 120000.00),
('EXT-08', 'Extracción de Tercer Molar (Cirugía)', 350000.00),
('COR-09', 'Corona de Metal-Porcelana', 1850000.00),
('COR-10', 'Corona de Zirconio', 2500000.00),
('IMP-11', 'Implante Dental (Fase Quirúrgica)', 4000000.00),
('IMP-12', 'Perno sobre Implante y Corona', 2000000.00),
('RAD-13', 'Radiografía Periapical', 80000.00),
('CIR-14', 'Cirugía Compleja', 350000.00),
('ORT-15', 'Ortodoncia Mantenimiento', 250000.00),
('ORT-16', 'Cementado de Brackets', 150000.00),
('EXT-17', 'Extracción Simple Temporario', 180000.00),
('PER-18', 'Perno Dental', 350000.00),
('EXT-19', 'Exodoncia Temporario Unirradicular', 150000.00),
('EXT-20', 'Exodoncia Temporario Multirradicular', 180000.00),
('RES-21', 'Resina Temporario', 150000.00),
('RES-22', 'Resina Compuesta Temporario', 250000.00),
('RES-23', 'Resina Clase 2', 400000.00),
('LEV-24', 'Levantamiento de Margen', 200000.00)
ON CONFLICT (codigo) DO UPDATE SET costo = EXCLUDED.costo, nombre = EXCLUDED.nombre;

-- Trigger y Función para actualizar el saldo pendiente del presupuesto cuando hay pagos
CREATE OR REPLACE FUNCTION public.fn_actualizar_saldo_presupuesto()
RETURNS TRIGGER AS $$
DECLARE
    v_total_pagos NUMERIC(12, 2);
    v_total_presupuesto NUMERIC(12, 2);
    v_presupuesto_id INTEGER;
BEGIN
    v_presupuesto_id := COALESCE(NEW.presupuesto_id, OLD.presupuesto_id);

    -- Obtener la suma de pagos
    SELECT COALESCE(SUM(monto), 0) INTO v_total_pagos
    FROM public.pagos_presupuesto
    WHERE presupuesto_id = v_presupuesto_id;

    -- Obtener el total del presupuesto
    SELECT total INTO v_total_presupuesto
    FROM public.presupuestos
    WHERE id = v_presupuesto_id;

    -- Actualizar saldo pendiente
    UPDATE public.presupuestos
    SET saldo_pendiente = GREATEST(0, v_total_presupuesto - v_total_pagos),
        updated_at = now()
    WHERE id = v_presupuesto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_actualizar_saldo_presupuesto ON public.pagos_presupuesto;
CREATE TRIGGER trg_actualizar_saldo_presupuesto
AFTER INSERT OR UPDATE OR DELETE ON public.pagos_presupuesto
FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_saldo_presupuesto();

-- Trigger y Función para actualizar el total del presupuesto cuando cambian los detalles
CREATE OR REPLACE FUNCTION public.fn_actualizar_total_presupuesto()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(12, 2);
    v_presupuesto_id INTEGER;
    v_total_pagos NUMERIC(12, 2);
BEGIN
    v_presupuesto_id := COALESCE(NEW.presupuesto_id, OLD.presupuesto_id);

    -- Obtener la suma de detalles
    SELECT COALESCE(SUM(costo - descuento), 0) INTO v_total
    FROM public.presupuesto_detalles
    WHERE presupuesto_id = v_presupuesto_id;

    -- Obtener la suma de pagos
    SELECT COALESCE(SUM(monto), 0) INTO v_total_pagos
    FROM public.pagos_presupuesto
    WHERE presupuesto_id = v_presupuesto_id;

    -- Actualizar total y saldo pendiente
    UPDATE public.presupuestos
    SET total = v_total,
        saldo_pendiente = GREATEST(0, v_total - v_total_pagos),
        updated_at = now()
    WHERE id = v_presupuesto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_actualizar_total_presupuesto ON public.presupuesto_detalles;
CREATE TRIGGER trg_actualizar_total_presupuesto
AFTER INSERT OR UPDATE OR DELETE ON public.presupuesto_detalles
FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_total_presupuesto();


-- ############################################################################
-- 03. dentalink_upgrade.sql
-- ############################################################################

-- ============================================================================
-- SQL Migration: Upgrade a Dentalink-Level Features
-- ============================================================================

-- 1. Tabla de Sillones Dentales (Boxes)
CREATE TABLE IF NOT EXISTS public.sillones_dentales (
    id SERIAL PRIMARY KEY,
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL, -- ej. "Sillón 1", "Box Pediátrico"
    color VARCHAR(20) DEFAULT '#0ea5e9',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.sillones_dentales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sillones_dentales_all ON public.sillones_dentales;
CREATE POLICY sillones_dentales_all ON public.sillones_dentales FOR ALL TO authenticated USING (true);

-- Insertar algunos sillones por defecto
INSERT INTO public.sillones_dentales (nombre, color) VALUES 
('Sillón 1 (Principal)', '#0ea5e9'),
('Sillón 2 (Higiene)', '#10b981'),
('Box 3 (Cirugía)', '#f43f5e')
ON CONFLICT DO NOTHING;

-- 2. Actualizar Citas para soportar Sillones y Estados Dentalink
ALTER TABLE public.citas ADD COLUMN IF NOT EXISTS sillon_id INTEGER REFERENCES public.sillones_dentales(id) ON DELETE SET NULL;
-- Nota: La columna "estado" ya existe como TEXT, usaremos los valores: 
-- 'Confirmada', 'En Sala de Espera', 'En Sillón', 'Finalizada', 'Inasistencia'

-- 3. Tabla de Evoluciones Clínicas (Timeline)
CREATE TABLE IF NOT EXISTS public.evoluciones_clinicas (
    id SERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
    cita_id UUID REFERENCES public.citas(id) ON DELETE SET NULL,
    pieza VARCHAR(10), -- Puede ser nulo si es una nota general
    procedimiento VARCHAR(150),
    nota_clinica TEXT NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.evoluciones_clinicas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS evoluciones_clinicas_all ON public.evoluciones_clinicas;
CREATE POLICY evoluciones_clinicas_all ON public.evoluciones_clinicas FOR ALL TO authenticated USING (true);

-- 4. Tabla de Periodontograma
CREATE TABLE IF NOT EXISTS public.periodontogramas (
    id SERIAL PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    medico_id UUID REFERENCES public.medicos(id) ON DELETE SET NULL,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    datos_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Almacena profundidades, sangrado, placa, etc.
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.periodontogramas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS periodontogramas_all ON public.periodontogramas;
CREATE POLICY periodontogramas_all ON public.periodontogramas FOR ALL TO authenticated USING (true);

-- 5. Tabla de Liquidaciones (Comisiones a Odontólogos)
CREATE TABLE IF NOT EXISTS public.liquidaciones_odontologos (
    id SERIAL PRIMARY KEY,
    medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    total_produccion NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    comision_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 40.00, -- Ej. 40%
    total_pagar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(20) DEFAULT 'borrador', -- 'borrador', 'pagado'
    generado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.liquidaciones_odontologos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS liquidaciones_odontologos_all ON public.liquidaciones_odontologos;
CREATE POLICY liquidaciones_odontologos_all ON public.liquidaciones_odontologos FOR ALL TO authenticated USING (true);

-- Crear función para autocalcular el total a pagar en liquidación
CREATE OR REPLACE FUNCTION public.fn_calcular_total_liquidacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_pagar := NEW.total_produccion * (NEW.comision_porcentaje / 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_calcular_total_liquidacion ON public.liquidaciones_odontologos;
CREATE TRIGGER trg_calcular_total_liquidacion
BEFORE INSERT OR UPDATE ON public.liquidaciones_odontologos
FOR EACH ROW EXECUTE FUNCTION public.fn_calcular_total_liquidacion();


-- ############################################################################
-- 04. auth_roles_setup.sql
-- ############################################################################

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


-- ############################################################################
-- 05. rls_completo.sql
-- ############################################################################

-- ============================================================================
-- Permisos de acceso a los datos (Row Level Security)
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: las tablas del esquema base (pacientes, citas, medicos,
-- especialidades, clinicas, horarios…) quedaron con RLS ACTIVADO pero SIN
-- NINGUNA REGLA. En Postgres eso no significa "abierto", significa "cerrado
-- para todos": la app entra, no ve nada y no puede guardar nada.
--
-- Los síntomas eran: el Dashboard mostrando 0 pacientes con fichas cargadas,
-- los desplegables de especialidades vacíos y el alta fallando con
-- "new row violates row-level security policy".
--
-- Criterio: quien tiene una cuenta activa de la clínica puede leer y escribir
-- los datos clínicos; borrar queda solo para el admin, porque acá se da de baja
-- (activo = false) en lugar de borrar, para no perder la historia del paciente.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. Quién es personal activo de la clínica -------------------------------------
-- SECURITY DEFINER: corre como dueño de la tabla, así no vuelve a pasar por las
-- políticas de `user_roles` (que provocaría una recursión infinita, error 42P17).
CREATE OR REPLACE FUNCTION public.es_odonto_activo()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND lower(role) IN ('admin', 'superadmin', 'super_admin',
                              'medico', 'recepcion', 'enfermeria')
          AND (status IS NULL OR lower(status) IN ('activo', 'active', 'habilitado', 'enabled'))
    );
$$;

-- 2. Las mismas cuatro reglas para cada tabla de datos ---------------------------
-- Se recorren en un bucle en vez de repetir el bloque veinte veces: así no queda
-- ninguna tabla afuera por olvido, que es exactamente lo que pasó antes.
--
-- NO se tocan las tablas con reglas propias ya definidas (profiles, user_roles,
-- notificaciones, cie10, user_admin_audit): esas tienen criterios distintos
-- (cada uno ve lo suyo, la auditoría solo la lee el admin).
DO $$
DECLARE
    t TEXT;
    tablas TEXT[] := ARRAY[
        'clinicas',
        'especialidades',
        'medicos',
        'pacientes',
        'citas',
        'horarios_medicos',
        'ausencias_medicos',
        'sillones_dentales',
        'odontologia_precios',
        'odontograma_registros',
        'periodontogramas',
        'evoluciones_clinicas',
        'paciente_anamnesis',
        'paciente_imagenes',
        'consentimientos_paciente',
        'presupuestos',
        'presupuesto_detalles',
        'pagos_presupuesto',
        'liquidaciones_odontologos',
        'cefalometria_estudios'
    ];
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        -- Si la tabla todavía no existe, se saltea en vez de cortar el script.
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            RAISE NOTICE 'Se saltea %: la tabla no existe', t;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_select', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.es_odonto_activo())',
            'odonto_' || t || '_select', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_insert', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.es_odonto_activo())',
            'odonto_' || t || '_insert', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_update', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated '
            'USING (public.es_odonto_activo()) WITH CHECK (public.es_odonto_activo())',
            'odonto_' || t || '_update', t);

        -- Borrar de verdad: solo el admin. El resto da de baja con activo=false.
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_delete', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.es_odonto_admin())',
            'odonto_' || t || '_delete', t);
    END LOOP;
END $$;

-- 2b. Sacar las reglas viejas que dejaban entrar a cualquiera --------------------
-- Las migraciones anteriores crearon políticas del tipo
--   CREATE POLICY x_all ON tabla FOR ALL TO authenticated USING (true)
-- "true" quiere decir CUALQUIERA que esté logueado: sin rol, recién registrado
-- por la pantalla pública o incluso suspendido. Y como las reglas de Postgres se
-- SUMAN (basta que una permita), esa dejaba sin efecto el criterio de arriba.
--
-- Verificado el 2026-08-04: una cuenta sin ningún rol podía escribir en
-- `sillones_dentales` y `odontologia_precios`. Alcanzaba a los odontogramas,
-- las evoluciones clínicas, la anamnesis, las imágenes y los presupuestos.
--
-- Se borra toda política de estas tablas que no sea de las de arriba (`odonto_`).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.relname AS tabla, p.polname AS politica
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND p.polname NOT LIKE 'odonto\_%'
          AND c.relname IN (
              'clinicas', 'especialidades', 'medicos', 'pacientes', 'citas',
              'horarios_medicos', 'ausencias_medicos', 'sillones_dentales',
              'odontologia_precios', 'odontograma_registros', 'periodontogramas',
              'evoluciones_clinicas', 'paciente_anamnesis', 'paciente_imagenes',
              'consentimientos_paciente', 'presupuestos', 'presupuesto_detalles',
              'pagos_presupuesto', 'liquidaciones_odontologos', 'cefalometria_estudios'
          )
    LOOP
        RAISE NOTICE 'Se quita la regla permisiva %.%', r.tabla, r.politica;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.politica, r.tabla);
    END LOOP;
END $$;

-- 3. Verificación ----------------------------------------------------------------
-- Cada tabla de datos tiene que aparecer con EXACTAMENTE 4 reglas. Si alguna
-- muestra 5 o más, quedó una regla vieja que deja entrar a cualquiera.
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls_activado,
       count(p.polname) AS reglas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY count(p.polname), c.relname;


-- ############################################################################
-- 06. esquema_completo.sql
-- ############################################################################

-- ============================================================================
-- Alineación del esquema con lo que la aplicación realmente pide
-- ============================================================================
-- Pegar en el SQL Editor del proyecto Odonto y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: las migraciones anteriores crearon una versión reducida
-- del esquema y el código espera columnas y tablas que ahí no están. Eso
-- producía errores 400/404 en pantalla y, lo más grave, impedía guardar un
-- paciente o una cita.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. La clínica única -----------------------------------------------------------
-- `clinicas.id` es UUID, pero el código mandaba el número 1 (CLINICA_ID), y la
-- base lo rechazaba con "invalid input syntax for type uuid". Se crea la clínica
-- con un UUID FIJO y CONOCIDO para poder referenciarlo desde el código.
-- Si cambiás este UUID, hay que cambiar CLINICA_ID en src/api/pacientes.ts.
INSERT INTO public.clinicas (id, nombre)
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'Clínica Odontológica'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Datos del odontólogo --------------------------------------------------------
-- La tabla se creó con lo mínimo (nombres, apellidos, especialidad) pero la
-- pantalla de Mantenimiento pide también la cédula, el contacto y el registro
-- profesional. Sin estas columnas el alta fallaba con
-- "Could not find the 'clinica_id' column of 'medicos'": NO SE PODÍA DAR DE
-- ALTA NINGÚN ODONTÓLOGO.
ALTER TABLE public.medicos
    ADD COLUMN IF NOT EXISTS numero_colegiatura TEXT,
    ADD COLUMN IF NOT EXISTS documento TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS telefono TEXT,
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL;

-- Dos fichas con la misma cédula serían la misma persona cargada dos veces.
-- Índice parcial: deja convivir varias fichas sin cédula (todavía sin cargar).
CREATE UNIQUE INDEX IF NOT EXISTS medicos_documento_unico
    ON public.medicos (documento) WHERE documento IS NOT NULL;

-- 3. Ausencias: los nombres de columna que usa el código ------------------------
-- La tabla se creó con fecha_inicio/fecha_fin y el código pide desde/hasta.
-- Se renombra (la tabla está vacía, no hay datos que migrar). El bloque IF
-- evita el error si el script se corre dos veces.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ausencias_medicos'
          AND column_name = 'fecha_inicio'
    ) THEN
        ALTER TABLE public.ausencias_medicos RENAME COLUMN fecha_inicio TO desde;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ausencias_medicos'
          AND column_name = 'fecha_fin'
    ) THEN
        ALTER TABLE public.ausencias_medicos RENAME COLUMN fecha_fin TO hasta;
    END IF;
END $$;

ALTER TABLE public.ausencias_medicos
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL;

-- 4. Columnas que el codigo manda al guardar -----------------------------------
ALTER TABLE public.horarios_medicos
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL;

ALTER TABLE public.especialidades
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL;

-- 5. Avisos de la campanita -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT,
    mensaje TEXT,
    tipo TEXT,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notificaciones_user_idx
    ON public.notificaciones (user_id, created_at DESC);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Una política por acción, todas contra el dueño del aviso.
DROP POLICY IF EXISTS notificaciones_select_propio ON public.notificaciones;
CREATE POLICY notificaciones_select_propio ON public.notificaciones
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS notificaciones_insert_propio ON public.notificaciones;
CREATE POLICY notificaciones_insert_propio ON public.notificaciones
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.es_odonto_admin());

DROP POLICY IF EXISTS notificaciones_update_propio ON public.notificaciones;
CREATE POLICY notificaciones_update_propio ON public.notificaciones
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notificaciones_delete_propio ON public.notificaciones;
CREATE POLICY notificaciones_delete_propio ON public.notificaciones
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6. Auditoría de acciones sobre usuarios ---------------------------------------
CREATE TABLE IF NOT EXISTS public.user_admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    target_user_id UUID,
    action TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_admin_audit ENABLE ROW LEVEL SECURITY;

-- Un registro de auditoría lo escribe cualquiera que actúe, pero solo el admin
-- puede leerlo: si no, cualquiera repasaría quién tocó qué cuenta.
DROP POLICY IF EXISTS user_admin_audit_insert ON public.user_admin_audit;
CREATE POLICY user_admin_audit_insert ON public.user_admin_audit
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS user_admin_audit_select_admin ON public.user_admin_audit;
CREATE POLICY user_admin_audit_select_admin ON public.user_admin_audit
    FOR SELECT TO authenticated USING (public.es_odonto_admin());

-- 7. Catálogo CIE-10 -------------------------------------------------------------
-- La pantalla de Mantenimiento lo consulta. Se crea vacío: los códigos se
-- cargan aparte si se los quiere usar.
CREATE TABLE IF NOT EXISTS public.cie10 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    categoria TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cie10_codigo_unico ON public.cie10 (codigo);

ALTER TABLE public.cie10 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cie10_select ON public.cie10;
CREATE POLICY cie10_select ON public.cie10
    FOR SELECT TO authenticated USING (public.es_odonto_activo());

DROP POLICY IF EXISTS cie10_admin ON public.cie10;
CREATE POLICY cie10_admin ON public.cie10
    FOR ALL TO authenticated
    USING (public.es_odonto_admin()) WITH CHECK (public.es_odonto_admin());

-- 8. Especialidades odontológicas de arranque ------------------------------------
-- Sin al menos una especialidad no se puede dar de alta un odontólogo.
INSERT INTO public.especialidades (nombre, color, descripcion, clinica_id)
SELECT v.nombre, v.color, v.descripcion, '00000000-0000-4000-a000-000000000001'
FROM (VALUES
    ('Odontología General',    '#0ea5e9', 'Diagnóstico, profilaxis y operatoria dental'),
    ('Endodoncia',             '#f59e0b', 'Tratamiento de conductos'),
    ('Periodoncia',            '#10b981', 'Encías y tejidos de soporte'),
    ('Ortodoncia',             '#8b5cf6', 'Corrección de la posición dentaria'),
    ('Cirugía Bucal',          '#ef4444', 'Exodoncias y cirugía menor'),
    ('Odontopediatría',        '#ec4899', 'Atención odontológica de niños'),
    ('Prótesis y Rehabilitación', '#14b8a6', 'Prótesis fija y removible'),
    ('Radiología Oral',        '#64748b', 'Estudios por imágenes')
) AS v(nombre, color, descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM public.especialidades e WHERE lower(e.nombre) = lower(v.nombre)
);

-- 9. Verificación ----------------------------------------------------------------
SELECT 'clinicas' AS tabla, count(*)::text AS filas FROM public.clinicas
UNION ALL SELECT 'especialidades', count(*)::text FROM public.especialidades
UNION ALL SELECT 'notificaciones', count(*)::text FROM public.notificaciones
UNION ALL SELECT 'user_admin_audit', count(*)::text FROM public.user_admin_audit
UNION ALL SELECT 'cie10', count(*)::text FROM public.cie10
UNION ALL SELECT 'medicos.numero_colegiatura', (
    SELECT count(*)::text FROM information_schema.columns
    WHERE table_name = 'medicos' AND column_name = 'numero_colegiatura')
UNION ALL SELECT 'ausencias_medicos.desde', (
    SELECT count(*)::text FROM information_schema.columns
    WHERE table_name = 'ausencias_medicos' AND column_name = 'desde');


-- ############################################################################
-- 07. recetas.sql
-- ############################################################################

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


-- ############################################################################
-- 08. recetas_admin_prescriptor.sql
-- ############################################################################

-- ============================================================================
-- El administrador también puede emitir recetas
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué cambia: `recetas.sql` dejó emitir solo al rol `medico`. Pero en este
-- consultorio el dueño es el odontólogo Y el administrador con una misma
-- cuenta: entraba como admin, abría la pestaña Recetas y no podía emitir. El
-- usuario lo confirmó el 2026-08-06: "el admin principal va a ser el
-- odontólogo que se registre primero".
--
-- Lo que NO cambia, y es lo que importa: la receta se sigue firmando con la
-- FICHA DE ODONTÓLOGO vinculada a esa cuenta (nombre y `numero_colegiatura`).
-- Un administrador sin ficha vinculada puede pasar esta regla pero la app no
-- lo deja emitir, porque el documento saldría sin firma ni registro
-- profesional. El permiso es de la cuenta; la firma es de la ficha.
--
-- Recepción y asistente siguen sin poder emitir: ven e imprimen las ya
-- emitidas.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

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
          AND lower(role) IN ('medico', 'admin', 'superadmin', 'super_admin')
          AND (status IS NULL OR lower(status) IN ('activo', 'active', 'habilitado', 'enabled'))
    );
$$;

-- Verificación ------------------------------------------------------------------
-- ⚠ NO sirve hacer `SELECT public.es_odonto_prescriptor()` acá: el SQL Editor
-- corre como dueño de la base, no como un usuario de la app, así que
-- `auth.uid()` está vacío y la función devuelve FALSE siempre. Eso no significa
-- que esté mal instalada.
--
-- Lo que sí se puede comprobar es qué cuentas cumplen la condición. La del
-- administrador tiene que aparecer con `puede_emitir = true`.
SELECT p.email,
       r.role,
       r.status,
       (
           lower(r.role) IN ('medico', 'admin', 'superadmin', 'super_admin')
           AND (r.status IS NULL OR lower(r.status) IN ('activo', 'active', 'habilitado', 'enabled'))
       ) AS puede_emitir
FROM public.user_roles r
LEFT JOIN public.profiles p ON p.id = r.user_id
ORDER BY puede_emitir DESC, p.email;


-- ############################################################################
-- 09. empresa.sql
-- ############################################################################

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


-- ############################################################################
-- 10. empresa_marca.sql
-- ############################################################################

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


-- ############################################################################
-- 11. medicos_vinculo_unico.sql
-- ############################################################################

-- ============================================================================
-- Una cuenta de acceso, una sola ficha de odontólogo
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: la pantalla de Mantenimiento ya no deja elegir una cuenta
-- que otra ficha esté usando, pero eso es solo el candado de la pantalla. La
-- base lo aceptaba igual, y alcanzaba con dos personas cargando fichas al mismo
-- tiempo, o con una lista desactualizada en el navegador, para que quedaran dos
-- fichas apuntando a la misma cuenta.
--
-- Qué se rompe si pasa: `fetchMiMedico()` (src/api/citas.ts) busca la ficha con
-- `.maybeSingle()`, que espera CERO o UNA fila. Con dos, tira un error y el
-- profesional queda sin poder emitir recetas, sin su firma en la agenda y sin
-- «Mi perfil», con un mensaje que no explica nada.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. ¿Hay duplicados hoy? --------------------------------------------------------
-- Si esto devuelve alguna fila, el índice de abajo va a fallar. Hay que decidir
-- a mano cuál ficha se queda con la cuenta y desvincular la otra
-- (UPDATE public.medicos SET user_id = NULL WHERE id = '<el id que sobra>').
SELECT user_id, count(*) AS fichas, string_agg(apellidos || ', ' || nombres, ' | ') AS quienes
FROM public.medicos
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING count(*) > 1;

-- 2. El candado ------------------------------------------------------------------
-- Parcial (WHERE user_id IS NOT NULL): las fichas sin cuenta vinculada son
-- válidas y pueden ser muchas. En Postgres varios NULL no chocan entre sí, pero
-- se deja explícito para que se entienda al leerlo.
CREATE UNIQUE INDEX IF NOT EXISTS medicos_user_id_unico
    ON public.medicos (user_id)
    WHERE user_id IS NOT NULL;

-- 3. Verificación ----------------------------------------------------------------
-- Tiene que aparecer el índice `medicos_user_id_unico`.
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'medicos' AND indexname = 'medicos_user_id_unico';


-- ############################################################################
-- 12. cefalometria_setup.sql
-- ############################################################################

-- ============================================================================
-- Cefalometría: estudios, trazados e imágenes del caso
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- Por qué existe: el módulo se publicó sin esta tabla en la base, y el código
-- "guardaba" en la memoria del navegador cuando no la encontraba. Los trazados
-- quedaban solo en esa computadora y se perdían al limpiar el navegador.
-- ============================================================================

-- 1. Tabla -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cefalometria_estudios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    titulo VARCHAR(200) NOT NULL DEFAULT 'Teleradiografía lateral',
    tipo VARCHAR(50) NOT NULL DEFAULT 'teleradiografia_lateral',
    -- Ruta dentro del depósito `cefalometria` (no una URL: el depósito es
    -- privado y la pantalla pide un enlace temporal cada vez que la muestra).
    imagen_url TEXT NOT NULL DEFAULT '',
    -- Fotos y radiografías complementarias del caso: { "foto_perfil": "<ruta>", ... }
    imagenes JSONB NOT NULL DEFAULT '{}'::jsonb,
    puntos JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Sin `pixelesPorMm` hasta que se calibre con la regla de la radiografía:
    -- un valor de fábrica daría milímetros inventados.
    calibracion JSONB NOT NULL DEFAULT '{"distanciaRealMm": 10}'::jsonb,
    mediciones JSONB DEFAULT '[]'::jsonb,
    progreso VARCHAR(50) NOT NULL DEFAULT 'digitalizacion',
    notas TEXT,
    creado_por UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Por si la tabla se creó con la primera versión de este archivo.
ALTER TABLE public.cefalometria_estudios ADD COLUMN IF NOT EXISTS imagenes JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.cefalometria_estudios ALTER COLUMN imagen_url SET DEFAULT '';
ALTER TABLE public.cefalometria_estudios ALTER COLUMN calibracion SET DEFAULT '{"distanciaRealMm": 10}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_cefalometria_paciente ON public.cefalometria_estudios(paciente_id);
CREATE INDEX IF NOT EXISTS idx_cefalometria_fecha ON public.cefalometria_estudios(fecha DESC);

COMMENT ON TABLE public.cefalometria_estudios IS 'Estudios radiográficos y trazados cefalométricos por paciente.';

-- 2. Permisos de la tabla ------------------------------------------------------
-- El mismo criterio que rls_completo.sql: personal activo lee y escribe, borrar
-- es solo del admin. La primera versión de este archivo tenía USING (true), que
-- deja entrar a CUALQUIER cuenta logueada, aunque no tenga rol (trampa 2 del
-- CLAUDE.md). Se borra toda regla que no sea de las nuestras.
ALTER TABLE public.cefalometria_estudios ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT polname FROM pg_policy
        WHERE polrelid = 'public.cefalometria_estudios'::regclass
          AND polname NOT LIKE 'odonto\_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.cefalometria_estudios', r.polname);
    END LOOP;
END $$;

DROP POLICY IF EXISTS odonto_cefalometria_estudios_select ON public.cefalometria_estudios;
CREATE POLICY odonto_cefalometria_estudios_select ON public.cefalometria_estudios
    FOR SELECT TO authenticated USING (public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_estudios_insert ON public.cefalometria_estudios;
CREATE POLICY odonto_cefalometria_estudios_insert ON public.cefalometria_estudios
    FOR INSERT TO authenticated WITH CHECK (public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_estudios_update ON public.cefalometria_estudios;
CREATE POLICY odonto_cefalometria_estudios_update ON public.cefalometria_estudios
    FOR UPDATE TO authenticated
    USING (public.es_odonto_activo()) WITH CHECK (public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_estudios_delete ON public.cefalometria_estudios;
CREATE POLICY odonto_cefalometria_estudios_delete ON public.cefalometria_estudios
    FOR DELETE TO authenticated USING (public.es_odonto_admin());

-- 3. Depósito de imágenes -------------------------------------------------------
-- PRIVADO: son radiografías y fotos de la cara de pacientes. Con un depósito
-- público, cualquiera con el enlace las vería sin iniciar sesión.
-- Límite de 15 MB por archivo; la app de todos modos las achica antes de subir.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cefalometria', 'cefalometria', false, 15728640,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS odonto_cefalometria_archivos_select ON storage.objects;
CREATE POLICY odonto_cefalometria_archivos_select ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'cefalometria' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_archivos_insert ON storage.objects;
CREATE POLICY odonto_cefalometria_archivos_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'cefalometria' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_archivos_update ON storage.objects;
CREATE POLICY odonto_cefalometria_archivos_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'cefalometria' AND public.es_odonto_activo())
    WITH CHECK (bucket_id = 'cefalometria' AND public.es_odonto_activo());

DROP POLICY IF EXISTS odonto_cefalometria_archivos_delete ON storage.objects;
CREATE POLICY odonto_cefalometria_archivos_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'cefalometria' AND public.es_odonto_admin());

-- 4. Que la API vea la tabla nueva sin esperar -----------------------------------
NOTIFY pgrst, 'reload schema';


-- ############################################################################
-- 13. historial_procedimientos_y_archivos.sql
-- ############################################################################

-- ============================================================================
-- Historial por fecha y adjuntos clínicos de pacientes
-- ============================================================================
-- Ejecutar una vez en Supabase SQL Editor. Es seguro volver a ejecutarlo.
-- ============================================================================

-- Un tratamiento presupuestado no forma parte de la historia clínica hasta que
-- se lo marca como realizado. Esta fecha evita usar por error la fecha del
-- presupuesto como fecha de atención.
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


-- ############################################################################
-- 14. rls_completo.sql
-- ############################################################################

-- ============================================================================
-- Permisos de acceso a los datos (Row Level Security)
-- ============================================================================
-- Pegar en el SQL Editor y ejecutar (botón Run):
--   https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/sql/new
--
-- Por qué hace falta: las tablas del esquema base (pacientes, citas, medicos,
-- especialidades, clinicas, horarios…) quedaron con RLS ACTIVADO pero SIN
-- NINGUNA REGLA. En Postgres eso no significa "abierto", significa "cerrado
-- para todos": la app entra, no ve nada y no puede guardar nada.
--
-- Los síntomas eran: el Dashboard mostrando 0 pacientes con fichas cargadas,
-- los desplegables de especialidades vacíos y el alta fallando con
-- "new row violates row-level security policy".
--
-- Criterio: quien tiene una cuenta activa de la clínica puede leer y escribir
-- los datos clínicos; borrar queda solo para el admin, porque acá se da de baja
-- (activo = false) en lugar de borrar, para no perder la historia del paciente.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- 1. Quién es personal activo de la clínica -------------------------------------
-- SECURITY DEFINER: corre como dueño de la tabla, así no vuelve a pasar por las
-- políticas de `user_roles` (que provocaría una recursión infinita, error 42P17).
CREATE OR REPLACE FUNCTION public.es_odonto_activo()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND lower(role) IN ('admin', 'superadmin', 'super_admin',
                              'medico', 'recepcion', 'enfermeria')
          AND (status IS NULL OR lower(status) IN ('activo', 'active', 'habilitado', 'enabled'))
    );
$$;

-- 2. Las mismas cuatro reglas para cada tabla de datos ---------------------------
-- Se recorren en un bucle en vez de repetir el bloque veinte veces: así no queda
-- ninguna tabla afuera por olvido, que es exactamente lo que pasó antes.
--
-- NO se tocan las tablas con reglas propias ya definidas (profiles, user_roles,
-- notificaciones, cie10, user_admin_audit): esas tienen criterios distintos
-- (cada uno ve lo suyo, la auditoría solo la lee el admin).
DO $$
DECLARE
    t TEXT;
    tablas TEXT[] := ARRAY[
        'clinicas',
        'especialidades',
        'medicos',
        'pacientes',
        'citas',
        'horarios_medicos',
        'ausencias_medicos',
        'sillones_dentales',
        'odontologia_precios',
        'odontograma_registros',
        'periodontogramas',
        'evoluciones_clinicas',
        'paciente_anamnesis',
        'paciente_imagenes',
        'consentimientos_paciente',
        'presupuestos',
        'presupuesto_detalles',
        'pagos_presupuesto',
        'liquidaciones_odontologos',
        'cefalometria_estudios'
    ];
BEGIN
    FOREACH t IN ARRAY tablas LOOP
        -- Si la tabla todavía no existe, se saltea en vez de cortar el script.
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            RAISE NOTICE 'Se saltea %: la tabla no existe', t;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_select', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.es_odonto_activo())',
            'odonto_' || t || '_select', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_insert', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.es_odonto_activo())',
            'odonto_' || t || '_insert', t);

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_update', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated '
            'USING (public.es_odonto_activo()) WITH CHECK (public.es_odonto_activo())',
            'odonto_' || t || '_update', t);

        -- Borrar de verdad: solo el admin. El resto da de baja con activo=false.
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'odonto_' || t || '_delete', t);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.es_odonto_admin())',
            'odonto_' || t || '_delete', t);
    END LOOP;
END $$;

-- 2b. Sacar las reglas viejas que dejaban entrar a cualquiera --------------------
-- Las migraciones anteriores crearon políticas del tipo
--   CREATE POLICY x_all ON tabla FOR ALL TO authenticated USING (true)
-- "true" quiere decir CUALQUIERA que esté logueado: sin rol, recién registrado
-- por la pantalla pública o incluso suspendido. Y como las reglas de Postgres se
-- SUMAN (basta que una permita), esa dejaba sin efecto el criterio de arriba.
--
-- Verificado el 2026-08-04: una cuenta sin ningún rol podía escribir en
-- `sillones_dentales` y `odontologia_precios`. Alcanzaba a los odontogramas,
-- las evoluciones clínicas, la anamnesis, las imágenes y los presupuestos.
--
-- Se borra toda política de estas tablas que no sea de las de arriba (`odonto_`).
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.relname AS tabla, p.polname AS politica
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND p.polname NOT LIKE 'odonto\_%'
          AND c.relname IN (
              'clinicas', 'especialidades', 'medicos', 'pacientes', 'citas',
              'horarios_medicos', 'ausencias_medicos', 'sillones_dentales',
              'odontologia_precios', 'odontograma_registros', 'periodontogramas',
              'evoluciones_clinicas', 'paciente_anamnesis', 'paciente_imagenes',
              'consentimientos_paciente', 'presupuestos', 'presupuesto_detalles',
              'pagos_presupuesto', 'liquidaciones_odontologos', 'cefalometria_estudios'
          )
    LOOP
        RAISE NOTICE 'Se quita la regla permisiva %.%', r.tabla, r.politica;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.politica, r.tabla);
    END LOOP;
END $$;

-- 3. Verificación ----------------------------------------------------------------
-- Cada tabla de datos tiene que aparecer con EXACTAMENTE 4 reglas. Si alguna
-- muestra 5 o más, quedó una regla vieja que deja entrar a cualquiera.
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls_activado,
       count(p.polname) AS reglas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY count(p.polname), c.relname;


-- ############################################################################
-- CIERRE: un consultorio nuevo no arranca con la marca de Mova Dent
-- ############################################################################
-- empresa_marca.sql le pone "Mova Dent" de nombre corto a la fila del
-- consultorio si está vacío. En una base nueva eso es la marca de otra
-- empresa: se deja el genérico hasta que el consultorio cargue el suyo en
-- Mantenimiento → Consultorio.
UPDATE public.clinicas
SET nombre = 'CONSULTORIO ODONTOLÓGICO',
    nombre_corto = 'Consultorio'
WHERE id = '00000000-0000-4000-a000-000000000001'
  AND nombre_corto = 'Mova Dent'
  AND nombre IS DISTINCT FROM 'CONSULTORIO ODONTOLÓGICO MOVA DENT';

NOTIFY pgrst, 'reload schema';

-- Si llegó hasta acá sin errores, la base quedó lista. Sigue el paso 3 de la
-- guía: crear la cuenta del administrador.
SELECT 'Instalación terminada' AS resultado,
       (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS tablas,
       (SELECT nombre_corto FROM public.clinicas LIMIT 1) AS consultorio;
