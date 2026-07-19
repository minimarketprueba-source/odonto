# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> El usuario prefiere respuestas en español. No es programador: prefiere que Claude implemente, pruebe y publique los cambios por él, y explicaciones claras sin jerga.

**Sanidad ISEPOL — Citas Médicas**: sistema de citas médicas de la Sanidad Policial (pacientes, agenda, historia clínica, recetas, reportes). SPA React desplegada en Vercel sobre Supabase. Reemplaza a una vieja app Laravel (`saas_citasmedicas`) que ya fue jubilada. Nació como clon del esqueleto de **Control-Peso** (`..\Control-Peso`) y comparte con él el proyecto Supabase, Auth y convenciones.

## Estado actual (2026-07-18) — LEER PRIMERO

- **App en vivo**: https://sanidad-citas.vercel.app · **GitHub**: https://github.com/seccioneeff-lab/sanidad-citas (privado, `seccioneeff-lab`)
- **Deploy**: push a `main` → Vercel despliega solo. La conexión a Supabase está **hardcodeada como default** en `src/lib/supabase.ts` (`DEFAULT_SUPABASE_URL` / `DEFAULT_SUPABASE_ANON_KEY`), así que NO se necesitan env vars en Vercel. La anon key es pública por diseño (la protege el RLS). Orden de config: localStorage > env vars > default.
- **Fases 0-3 COMPLETAS**: F0 esqueleto+auth · F1 pacientes+agenda · F2 consultas/historia clínica+recetas · F3 reportes+lista de espera+mantenimiento. F4 (jubilar Laravel) hecha: la carpeta `saas_citasmedicas` fue borrada. Descartados a propósito: facturación, aseguradoras, mensajería, multi-clínica.
- **Datos en Supabase**: 750 pacientes reales (los cadetes, vía `cadetes.paciente_id`) · **0 médicos, 0 citas, 0 consultas** (se limpiaron los de prueba; arranca en limpio) · catálogos completos: 10 especialidades + 14.270 códigos CIE-10.
- **Usuarios creados** (auth.users): `medico1..3@sanidad-citas.local` (rol medico) y `recepcion1..3@sanidad-citas.local` (rol recepcion). Contraseñas temporales genéricas. Login verificado en producción.

## Pendientes (lo que sigue)

1. **Cargar médicos reales**: el usuario llena `Escritorio\Plantilla_Medicos.xlsx` (Nombres, Apellidos, Especialidad + opcionales). Al recibirla: leerla, insertar en `medicos` (clinica_id=1), y luego **vincular `medicos.user_id`** de cada médico real con la cuenta auth correspondiente (para el filtro "solo mis citas"). La columna `medicos.user_id` (uuid) ya existe.
2. **Correos reales** de médicos/recepción: renombrar las cuentas genéricas cuando haya nómina.
3. **Guard en Control-Peso**: que roles medico/recepcion no entren a su Dashboard (su auth-context asigna 'analyst' por defecto solo si no hay rol; los médicos tienen rol, verificar ProtectedRoute).

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
