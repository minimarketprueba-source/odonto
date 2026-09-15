-- =====================================================================
-- Migración: Módulo de Cefalometría y Digitalización (Estilo WebCeph)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.cefalometria_estudios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    titulo VARCHAR(200) NOT NULL DEFAULT 'Teleradiografía Lateral',
    tipo VARCHAR(50) NOT NULL DEFAULT 'teleradiografia_lateral',
    imagen_url TEXT NOT NULL,
    puntos JSONB NOT NULL DEFAULT '{}'::jsonb,
    calibracion JSONB NOT NULL DEFAULT '{"distanciaRealMm": 10}'::jsonb,
    mediciones JSONB DEFAULT '[]'::jsonb,
    progreso VARCHAR(50) NOT NULL DEFAULT 'digitalizacion', -- 'digitalizacion', 'analisis', 'tratamiento', 'terminado'
    notas TEXT,
    creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para optimizar búsquedas por paciente y fecha
CREATE INDEX IF NOT EXISTS idx_cefalometria_paciente ON public.cefalometria_estudios(paciente_id);
CREATE INDEX IF NOT EXISTS idx_cefalometria_fecha ON public.cefalometria_estudios(fecha DESC);

-- Habilitar RLS
ALTER TABLE public.cefalometria_estudios ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Permitir lectura de cefalometria a usuarios autenticados"
ON public.cefalometria_estudios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir insercion de cefalometria a usuarios autenticados"
ON public.cefalometria_estudios FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de cefalometria a usuarios autenticados"
ON public.cefalometria_estudios FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Permitir eliminacion de cefalometria a usuarios autenticados"
ON public.cefalometria_estudios FOR DELETE
TO authenticated
USING (true);

-- Comentarios
COMMENT ON TABLE public.cefalometria_estudios IS 'Estudios radiográficos y trazados cefalométricos digitales por paciente.';
