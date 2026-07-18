# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> El usuario prefiere respuestas en español.

**Sanidad ISEPOL — Citas Médicas**: sistema de citas médicas de la Sanidad Policial (pacientes, agenda, historia clínica). SPA React que reemplaza por fases a la app Laravel `saas_citasmedicas` (que sigue operativa en local durante la transición). Nació como clon del esqueleto de **Control-Peso** (`..\Control-Peso`) y comparte con él proyecto Supabase, Auth, convenciones y CLAUDE.md de referencia.

## Comandos

```bash
npm run dev          # Vite dev server (puerto 5173)
npm run build        # tsc && vite build (type-check bloquea el build)
npm run test:run     # Vitest una corrida
npm run lint         # eslint --max-warnings 0 (hay ~57 warnings heredados de la plantilla)
npm run type-check   # tsc --noEmit
```

## Contexto clave

- **Supabase compartido** con control de peso: ref `vnkstlvqzkhdfeoqskcf`. Tablas de sanidad (migradas desde Laravel/MySQL): `pacientes` (750 reales, vinculados a `cadetes.paciente_id`), `citas`, `consultas`, `medicos`, `especialidades`, `cie10`, `lista_espera`, `recetas`, `configuraciones`. Todas con RLS.
- **Roles** (tabla `user_roles`, compartida): este sistema admite `admin` (común a ambos sistemas), `medico` y `recepcion`. Los roles de control de peso (`analyst`, `viewer`) ven la pantalla "Sin acceso" aquí (gate en `ProtectedRoute` + `ROLES_SANIDAD` en `auth-context`). No se auto-asigna rol por defecto (a diferencia de control de peso).
- **Permisos**: `user_roles.permissions` = `Record<moduleKey, ('ver'|'editar'|'exportar'|'eliminar')[]>`. Módulos de sanidad: `pacientes`, `citas`, `consultas`, `usuarios`, `reportes`. Defaults por rol en `DEFAULT_PERMISOS_SANIDAD` (auth-context).
- **Fases**: F0 esqueleto+auth (hecha) · F1 pacientes+agenda · F2 consultas/historia clínica · F3 dashboard/reportes/lista de espera/recetas · F4 jubilar Laravel. Descartados: facturación, aseguradoras, mensajería, multi-clínica.
- `_descartado/` contiene el código de control de peso que se quitó de la plantilla (ignorado por git/tsc/eslint/vitest) — se puede borrar cuando ya no sirva de referencia.
- La capa de datos sigue el patrón de control de peso: `src/api/<dominio>.ts` con funciones fetch + hooks de React Query, keys en `src/lib/query-client.ts`. Soft-delete (`activo: false`) en vez de DELETE.
- storageKey de auth namespaced `sanidad-citas-<ref>-auth-v1` para no chocar con control de peso en localhost.
- **Pendiente**: guard en control de peso para que roles medico/recepcion no vean su Dashboard; crear usuarios médicos; políticas RLS de escritura para sanidad (ver memoria del proyecto citasmedicas).
