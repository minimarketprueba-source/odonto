# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> El usuario prefiere respuestas en español. No es programador: prefiere que Claude implemente, pruebe y publique los cambios por él, y explicaciones claras sin jerga.

**Sanidad ISEPOL — Citas Médicas**: sistema de citas médicas de la Sanidad Policial (pacientes, agenda, historia clínica, recetas, reportes). SPA React desplegada en Vercel sobre Supabase. Reemplaza a una vieja app Laravel (`saas_citasmedicas`) que ya fue jubilada. Nació como clon del esqueleto de **Control-Peso** (`..\Control-Peso`) y comparte con él el proyecto Supabase, Auth y convenciones.

## Estado actual (2026-07-20) — LEER PRIMERO

- **App en vivo**: https://sanidad-citas.vercel.app · **GitHub**: https://github.com/seccioneeff-lab/sanidad-citas (privado, `seccioneeff-lab`)
- **Deploy**: push a `main` → Vercel despliega solo. La conexión a Supabase está **hardcodeada como default** en `src/lib/supabase.ts` (`DEFAULT_SUPABASE_URL` / `DEFAULT_SUPABASE_ANON_KEY`), así que NO se necesitan env vars en Vercel. La anon key es pública por diseño (la protege el RLS). Orden de config: localStorage > env vars > default.
- **Fases 0-3 COMPLETAS**: F0 esqueleto+auth · F1 pacientes+agenda · F2 consultas/historia clínica+recetas · F3 reportes+lista de espera+mantenimiento. F4 (jubilar Laravel) hecha: la carpeta `saas_citasmedicas` fue borrada. Descartados a propósito: facturación, aseguradoras, mensajería, multi-clínica.
- **Datos en Supabase**: 750 pacientes reales (los cadetes, vía `cadetes.paciente_id`) · **24 profesionales reales cargados** (2026-07-20, desde "COMISIONADOS LISTA DE REVISTA.pdf" del 06/07/2026: 5 Medicina General, 6 Odontología, 7 Psicología, 2 Obstetricia, 2 Nutrición, 2 Fisioterapia; Enfermería y ayudante quedaron fuera a propósito — no manejan agenda) · 0 citas, 0 consultas (arranca en limpio) · catálogos: 14 especialidades (10 originales + Psicología/Obstetricia/Nutrición/Fisioterapia) + 14.270 códigos CIE-10.
- **Usuarios reales creados** (2026-07-20): 32 cuentas `@sanidad-citas.local` con contraseñas temporales únicas — 24 profesionales (rol `medico`, `medicos.user_id` vinculado por cédula) + 8 de enfermería (rol `recepcion` con permisos extendidos: también `consultas` y `recetas` ver/editar, para registrar a nombre de las médicas). Esquema de email: inicial+apellido (ej. `llopez@`). `user_roles.status='Activo'`. Las 6 cuentas genéricas `medico1..3`/`recepcion1..3` fueron eliminadas. Verificado end-to-end por API: login OK y RLS deja leer pacientes/medicos/ficha propia. Las credenciales quedaron en `Escritorio\Credenciales_Sanidad.txt` (el usuario debe repartir y borrar).

## Pendientes (lo que sigue)

1. **Correos reales**: cuando los profesionales tengan correo real, renombrar las cuentas `@sanidad-citas.local` (hoy no pueden recuperar contraseña por email; si alguien la olvida, resetearla por API admin).
2. **Guard en Control-Peso**: que roles medico/recepcion no entren a su Dashboard (su auth-context asigna 'analyst' por defecto solo si no hay rol; los médicos tienen rol, verificar ProtectedRoute).
3. (Cerrados 2026-07-20: carga de 24 profesionales ✓, 32 cuentas creadas y vinculadas ✓, genéricas eliminadas ✓. "Karen Elizabeht" quedó tal cual el PDF por decisión del usuario.)

## Comandos

```bash
npm run dev          # Vite dev server (puerto 5173)
npm run build        # tsc && vite build (type-check bloquea el build)
npm run test:run     # Vitest una corrida
npm run lint         # eslint --max-warnings 0 (hay warnings heredados de la plantilla; lint solo archivos tocados)
npm run type-check   # tsc --noEmit
```

Herramientas locales confirmadas: Node v24, npm 11, git 2.53, VS Code 1.121.

## Contexto técnico clave

- **Supabase compartido** con control de peso: ref `vnkstlvqzkhdfeoqskcf` (región us-west-2). Credenciales de la BD (para scripts de admin por SQL directo) NO están aquí; la anon key sí está en `src/lib/supabase.ts`. Para operaciones de admin sobre la BD se usó PHP de Laragon + PDO pgsql desde la otra máquina; pedir credenciales al usuario si hacen falta.
- **Flujo probado para cargas admin sin credenciales** (2026-07-20, así se cargaron los 24 profesionales): dejar un `.txt` con el SQL en el Escritorio y que el usuario lo pegue en el SQL Editor del dashboard (`https://supabase.com/dashboard/project/vnkstlvqzkhdfeoqskcf/sql/new`) y presione Run; terminar el script con un SELECT de verificación para que el usuario pegue el resultado en el chat. Hacer los INSERT idempotentes (WHERE NOT EXISTS). La lista de revista original está en `Downloads\Documentos\Info_para_ia\COMISIONADOS LISTA DE REVISTA.pdf`.
- **Ojo con el SQL Editor**: NO usar tablas temporales (cada sentencia puede correr en conexión distinta: "relation does not exist") ni confiar en BEGIN/COMMIT entre sentencias — meter todo en UNA sola sentencia WITH. Escribir en `auth.users` por SQL puede tirar "must be owner of table users" aunque parte del script se aplique. Para cuentas de usuario, mejor la **API admin** (`/auth/v1/admin/users`) con la service_role key: el usuario la comparte por chat desde Project Settings → API Keys (NO guardarla en archivos; así se crearon las 32 cuentas el 2026-07-20). Ojo: rotar el JWT secret invalidaría también la anon key hardcodeada en `src/lib/supabase.ts`.
- **Roles** (`user_roles`, tabla compartida): admite `admin` (común a ambos sistemas), `medico`, `recepcion`. Los roles de control de peso (`analyst`/`viewer`) ven pantalla "Sin acceso" (gate en `ProtectedRoute` + `ROLES_SANIDAD` en `auth-context`). No se auto-asigna rol.
- **Permisos**: `user_roles.permissions` = `Record<moduleKey, ('ver'|'editar'|'exportar'|'eliminar')[]>`. Módulos: `pacientes`, `citas`, `consultas`, `recetas`, `lista_espera`, `reportes`, `mantenimiento`, `usuarios`. Defaults por rol en `DEFAULT_PERMISOS_SANIDAD` (auth-context). OJO: la columna `permissions` tiene DEFAULT `'{}'::jsonb` y el fallback usa `?? DEFAULT` que NO cubre `{}` (solo null); al crear usuarios por SQL hay que setear `permissions` explícito o quedan sin módulos (solo Dashboard).
- **RLS**: políticas `sanidad_*` (lectura para personal activo; insert/update en pacientes/citas/consultas/lista_espera/recetas; delete solo admin; gestión de catálogos medicos/especialidades/cie10 solo admin). Funciones `es_sanidad_activo()` / `es_sanidad_admin()`.
- **Capa de datos**: `src/api/<dominio>.ts` con funciones fetch + hooks de React Query; keys en `src/lib/query-client.ts`. Soft-delete (`activo:false`) en vez de DELETE. Páginas en `src/pages/*.tsx`, diálogos/forms en `src/components/`.
- **Postgres vs MySQL**: la BD es Postgres. En scripts, `where('activo', true)` de Laravel genera `= 1` y falla; usar SQL crudo con `WHERE activo`. Búsquedas con `ilike`. CLINICA_ID=1 hardcodeado (institución única).
- `_descartado/` = código de control de peso quitado de la plantilla (ignorado por git/tsc/eslint/vitest); borrable.
- storageKey de auth: `sanidad-citas-<ref>-auth-v1` (namespaced para no chocar con control de peso en localhost).

## Relación con Control-Peso

Ambas apps comparten la misma base Supabase. Las consultas que registra un médico aquí alimentan la pestaña **Sanidad** en la ficha del cadete de Control-Peso (vistas `sanidad_resumen_cadete` y `sanidad_historial_cadete`, solo visibles a admins por RLS). No comparten código, solo datos.

Además (2026-07-18): el formulario de consulta permite indicar **reposo** (`consultas.reposo_tipo` 'local'|'domiciliario' + `reposo_desde`/`reposo_hasta`; NULL = sin reposo). Eso alimenta la página **Actividad Física** de Control-Peso vía la vista `sanidad_reposos_cadete` (solo admins). Migración en `..\Control-Peso\supabase\migrations\20260718_reposos_actividad_fisica.sql` (aplicada).
