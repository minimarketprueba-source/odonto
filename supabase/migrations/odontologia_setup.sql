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
('LIM-02', 'Limpieza Dental (Profilaxis)', 150000.00),
('EMP-03', 'Empaste Simple (Resina)', 250000.00),
('EMP-04', 'Empaste Complejo', 400000.00),
('ENDO-05', 'Endodoncia Unirradicular', 900000.00),
('ENDO-06', 'Endodoncia Multirradicular', 1500000.00),
('EXT-07', 'Extracción Simple', 120000.00),
('EXT-08', 'Extracción de Tercer Molar (Cirugía)', 350000.00),
('COR-09', 'Corona de Metal-Porcelana', 1850000.00),
('COR-10', 'Corona de Zirconio', 2500000.00),
('IMP-11', 'Implante Dental (Fase Quirúrgica)', 3500000.00),
('IMP-12', 'Perno sobre Implante y Corona', 2000000.00),
('RAD-13', 'Radiografía Periapical', 80000.00),
('CIR-14', 'Cirugía Compleja', 350000.00),
('ORT-15', 'Ortodoncia Mantenimiento', 250000.00),
('ORT-16', 'Cementado de Brackets', 150000.00),
('EXT-17', 'Extracción Simple Temporario', 180000.00)
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
