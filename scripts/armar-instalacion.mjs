// ============================================================================
// Arma supabase/instalacion_completa.sql: todo lo que necesita la base de un
// consultorio NUEVO, en un solo archivo para pegar en el SQL Editor.
//
//   npm run instalacion
//
// Por qué un generador y no un archivo escrito a mano: las migraciones de
// `supabase/migrations/` se siguen agregando. Copiarlas a mano a otro archivo
// garantiza que algún día queden distintas. Al agregar una migración nueva,
// sumarla a ORDEN (o a SOLO_MOVA_DENT si es un dato propio de Mova Dent) y
// volver a correr este script. Si un archivo no está en ninguna de las dos
// listas, el script se niega a seguir.
// ============================================================================
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'supabase', 'migrations');

// El orden importa: cada archivo usa tablas y funciones de los anteriores.
const ORDEN = [
  'base_schema.sql',
  'odontologia_setup.sql',
  'dentalink_upgrade.sql',
  'auth_roles_setup.sql',
  // Va ANTES de esquema_completo porque define es_odonto_activo(), que
  // esquema_completo ya usa en sus permisos. En la base de Mova Dent se
  // aplicaron en otro orden y no se notó; en una base vacía es un error.
  'rls_completo.sql',
  'esquema_completo.sql',
  'recetas.sql',
  'recetas_admin_prescriptor.sql',
  'empresa.sql',
  'empresa_marca.sql',
  'medicos_vinculo_unico.sql',
  'cefalometria_setup.sql',
  'historial_procedimientos_y_archivos.sql',
  // SIEMPRE el último: ata cada tabla a una empresa y REEMPLAZA todas las
  // reglas de acceso y funciones de permisos que dejaron los anteriores (que
  // son de cuando había una sola empresa).
  'multiempresa.sql',
];

// Datos de Mova Dent: sus precios y su nombre. Un consultorio nuevo arranca
// con los precios de ejemplo de odontologia_setup.sql y carga los suyos.
const SOLO_MOVA_DENT = [
  'actualizar_aranceles_2026_08_05.sql',
  'empresa_nombre_inicial.sql',
  'marca_mova_dent_icono.sql',
];

const existentes = readdirSync(carpeta).filter((f) => f.endsWith('.sql'));
const sinClasificar = existentes.filter((f) => !ORDEN.includes(f) && !SOLO_MOVA_DENT.includes(f));
if (sinClasificar.length) {
  console.error(
    `Hay migraciones que no están en ORDEN ni en SOLO_MOVA_DENT: ${sinClasificar.join(', ')}.\n` +
      'Agregarlas a scripts/armar-instalacion.mjs y volver a correr.'
  );
  process.exit(1);
}

const encabezado = `-- ============================================================================
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
`;

// Todo en UNA transacción: si algo falla, no queda nada a medias. Las
// migraciones que traen su propio BEGIN/COMMIT (multiempresa.sql) los pierden
// acá, porque un COMMIT en el medio cerraría la transacción antes de tiempo.
// La marca odonto.instalador deja pasar los FRENOS de las migraciones viejas:
// el instalador sí puede correrlas, porque multiempresa.sql va después.
const partes = [
  encabezado,
  "\nBEGIN;\nSELECT set_config('odonto.instalador', 'si', true);\n",
];
ORDEN.forEach((archivo, i) => {
  const sql = readFileSync(join(carpeta, archivo), 'utf8')
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .replace(/^(BEGIN|COMMIT);$/gm, '-- ($1 propio del archivo: lo maneja el instalador)');
  partes.push(
    `\n\n-- ############################################################################\n` +
      `-- ${String(i + 1).padStart(2, '0')}. ${archivo}\n` +
      `-- ############################################################################\n\n` +
      sql.trim() +
      '\n'
  );
});

partes.push(`

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

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Si llegó hasta acá sin errores, la base quedó lista. Sigue el paso 3 de la
-- guía: crear la cuenta del administrador.
SELECT 'Instalación terminada' AS resultado,
       (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS tablas,
       (SELECT nombre_corto FROM public.clinicas LIMIT 1) AS consultorio;
`);

const destino = join(raiz, 'supabase', 'instalacion_completa.sql');
writeFileSync(destino, partes.join(''));
console.log(`Listo: supabase/instalacion_completa.sql (${ORDEN.length} bloques).`);
