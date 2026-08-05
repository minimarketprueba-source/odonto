-- ============================================================
-- Actualización de Aranceles Odontológicos (2026-08-05)
-- Solicitado por Dra. Nair V
-- ============================================================

INSERT INTO public.odontologia_precios (codigo, nombre, costo, activo) VALUES
-- 1. Actualización de precios existentes
('LIM-02', 'Limpieza Dental (Profilaxis)', 300000.00, true),
('EMP-03', 'Empaste Simple (Resina)', 250000.00, true),
('EMP-04', 'Empaste Complejo', 400000.00, true),
('ENDO-05', 'Endodoncia Unirradicular', 900000.00, true),
('ENDO-06', 'Endodoncia Multirradicular', 1500000.00, true),
('COR-09', 'Corona de Metal-Porcelana', 1850000.00, true),
('COR-10', 'Corona de Zirconio', 2500000.00, true),
('IMP-11', 'Implante Dental (Fase Quirúrgica)', 4000000.00, true),

-- 2. Nuevos aranceles agregados
('RAD-13', 'Radiografía Periapical', 80000.00, true),
('CIR-14', 'Cirugía Compleja', 350000.00, true),
('ORT-15', 'Ortodoncia Mantenimiento', 250000.00, true),
('ORT-16', 'Cementado de Brackets', 150000.00, true),
('EXT-17', 'Extracción Simple Temporario', 180000.00, true),
('PER-18', 'Perno Dental', 350000.00, true),
('EXT-19', 'Exodoncia Temporario Unirradicular', 150000.00, true),
('EXT-20', 'Exodoncia Temporario Multirradicular', 180000.00, true),
('RES-21', 'Resina Temporario', 150000.00, true),
('RES-22', 'Resina Compuesta Temporario', 250000.00, true),
('RES-23', 'Resina Clase 2', 400000.00, true),
('LEV-24', 'Levantamiento de Margen', 200000.00, true)

ON CONFLICT (codigo) DO UPDATE SET 
  nombre = EXCLUDED.nombre,
  costo = EXCLUDED.costo,
  activo = true;
