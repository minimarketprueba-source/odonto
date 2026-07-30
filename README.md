# ⚖️ Control de Peso — Sistema de Gestión Antropométrica

Sistema para el control y seguimiento antropométrico de cadetes y oficiales
(peso, IMC, ICC, composición corporal, ergometría y salud), con generación de
documentos oficiales en Word y PDF (notas de servicio, notas de trote, nóminas).

Funciona como **aplicación web** (desplegada en Vercel) y como
**aplicación de escritorio Windows** (Electron).

## 🧩 Módulos

- **Cadetes / Oficiales** — padrón, nómina con «puede rendir», importación masiva.
- **Pesadas** — registro de peso, medidas de cintura/cadera (ICC) y método Isaak (masa muscular / % grasa).
- **Seguimiento** — cadetes excedidos, variación semanal, presentaciones mensuales de composición corporal, Nota de Servicio en Word.
- **Ergometría y Salud** — resultados, reposos médicos, historial médico, alta.
- **Trote diario** — nota de trote con oficiales a cargo y numeración correlativa.
- **Usuarios y permisos** — roles `admin` / `analyst` / `viewer` con permisos por módulo.
- **Respaldo** — exportación e importación de datos.

## 🛠️ Stack

React 18 · TypeScript · Vite 6 · Supabase (Auth + Postgres con RLS + Storage + Edge Functions) ·
TanStack Query · Tailwind + shadcn/ui · Recharts · Electron · Sentry.

## 🚀 Puesta en marcha

Requisitos: Node.js 18+ y un proyecto de [Supabase](https://supabase.com).

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar credenciales
#    Copiar .env.example a .env.local y completar con los valores
#    de tu proyecto Supabase (Dashboard → Settings → API)

# 3. Crear el esquema de base de datos
#    Ejecutar scripts/sistema_maestro_completo.sql en el SQL Editor de Supabase
#    (y scripts/salud_reposos_historial.sql para el módulo de salud)

# 4. Levantar el servidor de desarrollo
npm run dev            # http://localhost:5173
```

> La app también puede configurarse **en runtime** desde la página
> «Configurar Supabase» (guarda URL y anon key en localStorage), útil para
> la versión de escritorio.

## 📜 Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo (puerto 5173) |
| `npm run build` | Build de producción (incluye type-check) |
| `npm run preview` | Servir el build localmente |
| `npm test` / `npm run test:run` | Tests (watch / una corrida) |
| `npm run test:coverage` | Tests con cobertura |
| `npm run lint` / `npm run lint:fix` | ESLint (0 warnings permitidos) |
| `npm run type-check` | TypeScript sin emitir |
| `npm run format` | Prettier sobre `src/` |
| `npm run verify-db` | Verificar estructura/conteos en Supabase |
| `npm run electron:dev` | App de escritorio en desarrollo |
| `npm run electron:build:win` | Generar instalador y portable (`release/*.exe`) |

## 📦 Despliegue

- **Web**: push a `main` → Vercel despliega automáticamente (rewrites SPA y headers de seguridad en `vercel.json`).
- **Escritorio**: `npm run electron:build:win` genera en `release/` el instalador (`Setup`) y el portable.
- **Edge Functions**: ver comando de deploy en [CLAUDE.md](CLAUDE.md) (nunca usar `--no-verify-jwt`).

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/README.md](docs/README.md) | Índice de documentación técnica |
| [docs/SEGURIDAD.md](docs/SEGURIDAD.md) | CSP, RLS, roles, sanitización |
| [docs/INSTALACION_EN_OTRO_PC.md](docs/INSTALACION_EN_OTRO_PC.md) | Instalar la app de escritorio en otra PC |
| [CLAUDE.md](CLAUDE.md) | Arquitectura detallada del código |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |

## 🔐 Datos sensibles

Este sistema maneja **datos personales y de salud** de cadetes. Nunca versionar
en git documentos generados (`.docx`, `.xlsx`), capturas con datos reales ni
credenciales — el `.gitignore` ya bloquea estos patrones (ver
[docs/SEGURIDAD.md](docs/SEGURIDAD.md)).
