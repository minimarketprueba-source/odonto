# AGENTS.md — Reglas y Memoria del Proyecto Sanidad ISEPOL

## Roles y Matriz de Permisos Sanitarios
- **Roles Registrados en Sanidad**: `admin`, `superadmin`, `super_admin`, `medico`, `recepcion`, `enfermeria`, `nutricionista`, `fisioterapeuta`, `psicologo`, `ginecologo`.
- **Administrador / Superadmin**: Tienen acceso ilimitado a todos los módulos y diagnósticos del sistema.
- **Acceso por Módulos**: Definido en `src/context/auth-context.tsx` (`DEFAULT_PERMISOS_SANIDAD`) y gestionable desde `src/pages/Usuarios.tsx`.

## Regla de Confidencialidad Gineco-Obstétrica
- Las consultas médicas de **Ginecología y Obstetricia** contienen diagnósticos y detalles sensibles.
- **Solo** los usuarios con rol `ginecologo`, `admin`, `superadmin` o `super_admin` pueden ver los datos clínicos completos de una consulta ginecológica.
- Para cualquier otro rol, el sistema debe enmascarar dichos campos con la leyenda **`"🔒 Diagnóstico e información médica reservada (Ginecología y Obstetricia)"`**.

## Suscripciones en Tiempo Real (Supabase Realtime)
- El hook `useRealtimeSubscriptions` (`src/hooks/use-realtime-subscriptions.ts`) escucha eventos `postgres_changes` en `fichas_rac`, `citas`, `lista_espera`, `atenciones_enfermeria`, `internaciones` y `consultas`.
- Invalida la caché de React Query (`queryClient.invalidateQueries`) para refrescar las vistas de forma instantánea.

## Impresión y Exportación a PDF
- Los legajos clínicos completos se generan con `imprimirHistoriaClinicaCompleta` (`src/lib/imprimir.ts`) en un maquetado A4 aislado con QR institucional.
