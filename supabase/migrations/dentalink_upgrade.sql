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
