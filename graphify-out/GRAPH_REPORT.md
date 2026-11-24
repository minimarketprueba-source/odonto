# Graph Report - Odonto  (2026-11-24)

## Corpus Check
- 251 files · ~207,147 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .css 2, .example 1)

## Summary
- 2040 nodes · 5584 edges · 125 communities (97 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4fd97155`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- Citas.tsx
- dropdown-menu.tsx
- periodontograma.ts
- cn
- ui/sidebar.tsx
- odontologia.ts
- hooks/use-toast.ts
- cefalometria-calculos.ts
- preconsulta-dialog.tsx
- Odontograma.tsx
- useAuth
- compilerOptions
- Usuarios.tsx
- react
- pacientes.ts
- Mantenimiento.tsx
- main.tsx
- alert-dialog.tsx
- scripts
- auth-context.tsx
- supabase.ts
- instalacion_completa.sql
- App.tsx
- components.json
- devDependencies
- CefalometriaEditor.tsx
- ModalEditarEmpresa.tsx
- menubar.tsx
- context-menu.tsx
- multiempresa.sql
- layout/sidebar.tsx
- @tanstack/react-query
- dependencies
- Recetas.tsx
- carousel.tsx
- .prettierrc.json
- FichaPaciente.tsx
- date-picker.tsx
- cita-form.tsx
- form.tsx
- with
- drawer.tsx
- compilerOptions
- procedimientos.ts
- imprimir.ts
- CasoDetalleView.tsx
- sentry.ts
- liquidaciones.ts
- skeleton-dashboard.tsx
- ErrorBoundary.tsx
- Reportes.tsx
- medicamentos.ts
- app-smoke.spec.ts
- lazy-load.tsx
- vitest
- collapsible.tsx
- virtualized-list.tsx
- use-install-pwa.tsx
- use-intersection-observer.ts
- Los módulos
- vite-env.d.ts
- empresa.ts
- recalcularTrasGuardar
- auth.users
- vercel.json
- CLAUDE.md
- lucide-react
- package.json
- PanelBoltonNance.tsx
- icono-desde-logo.ts
- public.recetas
- ⚖️ Control de Peso — Sistema de Gestión Antropométrica
- api/cefalometria.ts
- Input
- productividad.ts
- public.pacientes
- esquema.ts
- empresas.ts
- @emotion/styled@^11.14.1
- build
- sheet.tsx
- Instalar el sistema para un consultorio nuevo
- armar-instalacion.mjs
- supabase
- navigation-menu.tsx
- public.pagos_presupuesto
- public.es_odonto_activo
- create-user/index.ts
- types/cefalometria.ts
- base_schema.sql
- perfil.ts
- pg@^8.22.0
- AGENTS.md — Reglas y Memoria del Proyecto Sanidad ISEPOL
- evoluciones.ts
- cobros.ts
- esquema_completo.sql
- historial_procedimientos_y_archivos.sql
- codigo-acceso.ts
- public.ruta_de_mi_empresa
- public.cefalometria_estudios
- clsx
- @radix-ui/react-toast
- @types/pg@^8.20.3
- @radix-ui/react-switch
- @testing-library/jest-dom
- @radix-ui/react-aspect-ratio
- main.cjs

## God Nodes (most connected - your core abstractions)
1. `cn()` - 239 edges
2. `react` - 111 edges
3. `Button` - 97 edges
4. `FichaPaciente()` - 66 edges
5. `lucide-react` - 65 edges
6. `Input` - 56 edges
7. `Label()` - 50 edges
8. `useAuth()` - 45 edges
9. `Card()` - 43 edges
10. `CardContent()` - 43 edges

## Surprising Connections (you probably didn't know these)
- `3. Los totales guardados no se actualizan solos` --references--> `recalcularTotalesPresupuesto()`  [INFERRED]
  CLAUDE.md → src/api/odontologia.ts
- `Suscripciones en Tiempo Real (Supabase Realtime)` --references--> `useRealtimeSubscriptions()`  [INFERRED]
  .agents/AGENTS.md → src/hooks/use-realtime-subscriptions.ts
- `Lo que se hizo el 2026-08-04/05` --references--> `telefonoParaWhatsApp()`  [INFERRED]
  CLAUDE.md → src/lib/estado-cuenta.ts
- `Cefalometría (revisado el 2026-09-30)` --references--> `useUrlImagenCefalometria()`  [INFERRED]
  CLAUDE.md → src/api/cefalometria.ts
- `Revisión del 2026-10-12` --references--> `handleDbError()`  [INFERRED]
  CLAUDE.md → src/api/odontologia.ts

## Import Cycles
- None detected.

## Communities (125 total, 28 thin omitted)

### Community 0 - "Button"
Cohesion: 0.14
Nodes (39): useIngresosDueno(), DienteFigura(), esSuperior(), Odontograma(), colorPS(), dienteVacio(), INF, Periodontograma() (+31 more)

### Community 1 - "Citas.tsx"
Cohesion: 0.08
Nodes (51): anularConsulta(), AnularConsultaInput, anularReceta(), borrarCita(), citaTieneConsulta(), invalidarTodo(), MOTIVOS_ANULACION, restaurarConsulta() (+43 more)

### Community 2 - "dropdown-menu.tsx"
Cohesion: 0.13
Nodes (21): fetchNotificaciones(), marcarLeida(), marcarTodasLeidas(), Notificacion, useMarcarLeida(), useMarcarTodasLeidas(), useNotificaciones(), haceCuanto() (+13 more)

### Community 3 - "periodontograma.ts"
Cohesion: 0.15
Nodes (16): calcularNIC(), DatosDiente, DatosPeriodontograma, fetchPeriodontogramas(), guardarPeriodontograma(), GuardarPeriodontogramaInput, MedicionSitio, NOMBRE_SITIO (+8 more)

### Community 4 - "cn"
Cohesion: 0.07
Nodes (33): AccordionContent(), AccordionItem(), AccordionTrigger(), Avatar(), AvatarFallback(), AvatarImage(), BreadcrumbEllipsis(), BreadcrumbItem() (+25 more)

### Community 5 - "ui/sidebar.tsx"
Cohesion: 0.08
Nodes (32): Separator(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction(), SidebarGroupContent() (+24 more)

### Community 6 - "odontologia.ts"
Cohesion: 0.08
Nodes (41): ArchivoRadiografiaSubido, ConsentimientoPaciente, createConsentimiento(), createPacienteImagen(), createPresupuesto(), deletePresupuesto(), DetalleRealizadoFila, diaLocal() (+33 more)

### Community 7 - "hooks/use-toast.ts"
Cohesion: 0.08
Nodes (38): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+30 more)

### Community 8 - "cefalometria-calculos.ts"
Cohesion: 0.04
Nodes (60): Actualización cefalométrica estilo WebCeph e IA híbrida (2026-11-23), Cefalometría (revisado el 2026-09-30), ACB_OUTLINE_2, ACB_OUTLINE_3, ACB_REF_NA, ACB_REF_S, ACB_REF_SOR, ANALISIS_DE (+52 more)

### Community 9 - "preconsulta-dialog.tsx"
Cohesion: 0.17
Nodes (20): Cita, useGuardarPreconsulta(), PreconsultaDialog(), PreconsultaDialogProps, vacio(), ReagendarDialogProps, DEV_MODE, requireSanitizedValue() (+12 more)

### Community 10 - "Odontograma.tsx"
Cohesion: 0.10
Nodes (24): OdontogramaRegistro, DienteFiguraProps, tipoDeDiente(), TipoDiente, buscarEstado(), CaraDental, CARAS_DENTALES, EstadoDental (+16 more)

### Community 11 - "useAuth"
Cohesion: 0.14
Nodes (24): Ausencia, createAusencia(), CreateAusenciaInput, createHorario(), CreateHorarioInput, deleteAusencia(), deleteHorario(), DIAS_SEMANA (+16 more)

### Community 12 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, isolatedModules, jsx, lib, module (+13 more)

### Community 13 - "Usuarios.tsx"
Cohesion: 0.09
Nodes (28): Checkbox(), recordAuditAction(), recordUserAdminAction, logger, detalleDeError(), esRolAsignable(), estadoHttpDe(), FilaListaUsuarios (+20 more)

### Community 14 - "react"
Cohesion: 0.11
Nodes (17): class-variance-authority, react, AppLayoutProps, ClinicalLayout(), clinicalNavigation, clinicalTools, Alert(), AlertDescription() (+9 more)

### Community 15 - "pacientes.ts"
Cohesion: 0.18
Nodes (15): CLINICA_ID_UNICA_LEGADO, createPaciente(), CreatePacienteInput, desactivarPaciente(), fetchPaciente(), fetchPacientes(), mensajeError(), reactivarPaciente() (+7 more)

### Community 16 - "Mantenimiento.tsx"
Cohesion: 0.20
Nodes (20): countCie10(), createCie10(), createEspecialidad(), createMedico(), CreateMedicoInput, CuentaVinculable, Especialidad, fetchCuentasVinculables() (+12 more)

### Community 17 - "main.tsx"
Cohesion: 0.15
Nodes (14): claveTema(), Theme, ThemeContext, ThemeContextValue, ThemeProvider(), ThemeProviderProps, useTheme(), Toaster() (+6 more)

### Community 18 - "alert-dialog.tsx"
Cohesion: 0.12
Nodes (17): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogPortal() (+9 more)

### Community 19 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, build:electron, dev, electron:build:win, electron:dev, format, format:check (+11 more)

### Community 20 - "auth-context.tsx"
Cohesion: 0.18
Nodes (16): AuthContext, AuthContextType, AuthProvider(), DEFAULT_PERMISOS_CLINICA, EmpresaDeUsuario, esEstadoActivo(), MODULOS_CLINICA, normalizarRol() (+8 more)

### Community 21 - "supabase.ts"
Cohesion: 0.21
Nodes (14): AuthError, clearProjectStorage(), clearStorageKey(), getSupabaseAnonKey(), getSupabaseUrl(), globalForSupabase, handleAuthError(), initSupabaseClient() (+6 more)

### Community 22 - "instalacion_completa.sql"
Cohesion: 0.08
Nodes (43): clinicas_codigo_acceso_unico, notificaciones_user_idx, public.ausencias_medicos, public.cambiar_empresa(), public.cefalometria_estudios, public.cie10, public.citas, public.clinicas (+35 more)

### Community 23 - "App.tsx"
Cohesion: 0.18
Nodes (21): App(), AuthCallback, AuthRedirect(), Cefalometria, Citas, ConfigurarSupabase, ConfirmarCorreo, Dashboard (+13 more)

### Community 24 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 25 - "devDependencies"
Cohesion: 0.03
Nodes (69): devDependencies, autoprefixer@^10.4.20, baseline-browser-mapping@^2.10.0, @commitlint/cli@^18.4.3, @commitlint/config-conventional@^18.4.3, concurrently@^8.2.2, dotenv@^17.2.3, electron-builder@^24.9.1 (+61 more)

### Community 26 - "CefalometriaEditor.tsx"
Cohesion: 0.14
Nodes (26): CefalometriaEditor(), estudio, Slider(), alinearPlantillaASNaMe(), calcularSintesisRicketts(), detectarContornoAnatomicoEnCanvas(), detectarPuntosEnRadiografia(), generarPlantillaCanonica() (+18 more)

### Community 27 - "ModalEditarEmpresa.tsx"
Cohesion: 0.23
Nodes (18): sonner, EmpresaDelSistema, ReagendarDialog(), ModalEditarEmpresa(), ModalEditarEmpresaProps, CommandDialog(), Dialog(), DialogContent() (+10 more)

### Community 28 - "menubar.tsx"
Cohesion: 0.12
Nodes (12): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarPortal(), MenubarRadioItem(), MenubarSeparator() (+4 more)

### Community 29 - "context-menu.tsx"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 30 - "multiempresa.sql"
Cohesion: 0.08
Nodes (17): public.dueno_entrar_empresa(), clinicas_codigo_acceso_unico, public.fn_codigo_acceso_clinica(), public.marca_publica(), trg_codigo_acceso_clinica, odontologia_precios_codigo_por_empresa, public.cambiar_empresa(), public.crear_empresa() (+9 more)

### Community 31 - "layout/sidebar.tsx"
Cohesion: 0.30
Nodes (10): getLogoPath(), Sidebar(), useSidebar(), armados, armar(), placas, useIconoEmpresa(), useMarcaNavegador() (+2 more)

### Community 32 - "@tanstack/react-query"
Cohesion: 0.24
Nodes (9): @tanstack/react-query, canalFalso, abrirCanal(), avisar, CANAL_REALTIME, cerrarCanal(), setConectado(), useRealtimeSubscriptions() (+1 more)

### Community 33 - "dependencies"
Cohesion: 0.03
Nodes (63): dependencies, class-variance-authority@^0.7.1, date-fns@^4.1.0, date-fns-tz@^3.2.0, embla-carousel-react@8.5.1, @emotion/react@^11.14.0, @hookform/resolvers@^3.10.0, input-otp@1.4.1 (+55 more)

### Community 34 - "Recetas.tsx"
Cohesion: 0.15
Nodes (19): emitirConNumero(), esConflictoDeNumero(), MAX_INTENTOS_NUMERO, siguienteNumero(), anularReceta(), createReceta(), CreateRecetaInput, FALTA_MIGRACION_RECETAS (+11 more)

### Community 35 - "carousel.tsx"
Cohesion: 0.19
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 36 - ".prettierrc.json"
Cohesion: 0.18
Nodes (10): arrowParens, bracketSpacing, endOfLine, jsxSingleQuote, plugins, printWidth, semi, singleQuote (+2 more)

### Community 37 - "FichaPaciente.tsx"
Cohesion: 0.15
Nodes (20): fetchOdontoPrecios(), fetchPacienteImagenes(), fetchPagosPresupuesto(), Presupuesto, uploadImagenFile(), useOdontoPrecios(), usePacienteImagenes(), usePagosPresupuesto() (+12 more)

### Community 38 - "date-picker.tsx"
Cohesion: 0.28
Nodes (11): date-fns, react-day-picker, Calendar(), CalendarDayButton(), DatePicker(), DatePickerProps, DatePickerWithRange(), DatePickerWithRangeProps (+3 more)

### Community 39 - "cita-form.tsx"
Cohesion: 0.17
Nodes (29): evaluarDisponibilidad(), esPacienteExterno(), labelTipoPaciente(), Paciente, TIPOS_PACIENTE, usePacientes(), CitaForm(), CitaFormProps (+21 more)

### Community 40 - "form.tsx"
Cohesion: 0.19
Nodes (12): @radix-ui/react-slot@1.1.1, @radix-ui/react-slot, FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext (+4 more)

### Community 41 - "with"
Cohesion: 0.06
Nodes (30): default, description, required, name, runs-on, steps, app_name, url (+22 more)

### Community 42 - "drawer.tsx"
Cohesion: 0.22
Nodes (7): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerPortal(), DrawerTitle()

### Community 43 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, strict, include

### Community 44 - "procedimientos.ts"
Cohesion: 0.24
Nodes (7): fetchProcedimientosPaciente(), NuevoProcedimiento, ProcedimientoSanitario, TipoProcedimiento, TIPOS_PROCEDIMIENTO, useProcedimientosPaciente(), queryKeys

### Community 45 - "imprimir.ts"
Cohesion: 0.13
Nodes (25): EMPRESA_PREDETERMINADA, getEmpresa(), DatosComprobantePagos, DatosImpresionPeriodontograma, DatosImpresionPresupuesto, DatosImpresionProductividad, DatosImpresionReceta, DatosPlanillaHistorial (+17 more)

### Community 46 - "CasoDetalleView.tsx"
Cohesion: 0.10
Nodes (21): sweetalert2@^11.26.3, sweetalert2, CasoDetalleView(), CasoDetalleViewProps, fechaVisible(), IconoMarcador(), ImagenGuardada(), PestanaConfig (+13 more)

### Community 47 - "sentry.ts"
Cohesion: 0.14
Nodes (5): @sentry/react@^7.91.0, @sentry/tracing@^7.91.0, @sentry/react, @sentry/tracing, SentryErrorBoundary

### Community 48 - "liquidaciones.ts"
Cohesion: 0.36
Nodes (7): createLiquidacion(), fetchLiquidaciones(), Liquidacion, marcarLiquidacionPagada(), useCreateLiquidacion(), useLiquidaciones(), useMarcarLiquidacionPagada()

### Community 49 - "skeleton-dashboard.tsx"
Cohesion: 0.64
Nodes (7): SkeletonDashboard(), SkeletonLineChart(), SkeletonPieChart(), SkeletonStatsCard(), SkeletonTable(), SkeletonTableRow(), Skeleton()

### Community 50 - "ErrorBoundary.tsx"
Cohesion: 0.32
Nodes (5): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, esErrorDeVersionNueva(), recargarUnaVez()

### Community 51 - "Reportes.tsx"
Cohesion: 0.20
Nodes (19): fechaHoyISO(), fechaLocalISO(), OdontoPrecio, useSaveOdontoPrecio(), useProductividadReporte(), AppLayout(), Tabs(), TabsContent() (+11 more)

### Community 52 - "medicamentos.ts"
Cohesion: 0.33
Nodes (8): alergiasEnConflicto(), buscarMedicamentos(), MedicamentoFrecuente, MEDICAMENTOS_FRECUENTES, normalizarTexto(), obtenerCategoriasMedicamentos(), SENALES_AINE, SENALES_PENICILINA

### Community 53 - "app-smoke.spec.ts"
Cohesion: 0.18
Nodes (9): prepararSesion(), responderSupabase(), rutasProtegidas, session, prepararSesion(), responderSupabase(), session, @playwright/test@^1.60.0 (+1 more)

### Community 54 - "lazy-load.tsx"
Cohesion: 0.47
Nodes (5): LazyLoad(), LazyLoadProps, LoadingFallback(), LoadingFallbackProps, withLazyLoad()

### Community 55 - "vitest"
Cohesion: 0.10
Nodes (13): @testing-library/react, vitest, carpeta, migraciones, tiempoReal, conCuenta(), estado, TABLAS_EN_VIVO (+5 more)

### Community 57 - "virtualized-list.tsx"
Cohesion: 0.25
Nodes (6): react-virtualized-auto-sizer@^1.0.26, react-window@^1.8.11, react-virtualized-auto-sizer, react-window, VirtualizedList, VirtualizedListProps

### Community 58 - "use-install-pwa.tsx"
Cohesion: 0.67
Nodes (3): BeforeInstallPromptEvent, InstallPWAPrompt(), useInstallPWA()

### Community 59 - "use-intersection-observer.ts"
Cohesion: 0.29
Nodes (3): useInfiniteScroll(), useIntersectionObserver(), UseIntersectionObserverProps

### Community 60 - "Los módulos"
Cohesion: 0.07
Nodes (28): 🫀 Anamnesis, 📐 Cefalometría, 📅 Citas, 📲 Envío por WhatsApp, 📋 Evolución, ✍️ Firmas, 🕐 Horarios, 🖼️ Imágenes (+20 more)

### Community 61 - "vite-env.d.ts"
Cohesion: 0.40
Nodes (4): *.css, ImportMeta, ImportMetaEnv, Window

### Community 62 - "empresa.ts"
Cohesion: 0.19
Nodes (24): achicarIcono(), achicarLogo(), actualizarEmpresa(), ActualizarEmpresaInput, empresaKeys, fetchEmpresa(), guardarCache(), idEmpresaActiva() (+16 more)

### Community 63 - "recalcularTrasGuardar"
Cohesion: 0.13
Nodes (15): addPagoPresupuesto(), addPresupuestoDetalle(), deletePagoPresupuesto(), deletePresupuestoDetalle(), recalcularTotalesPresupuesto(), recalcularTrasGuardar(), updatePresupuestoDetalle(), useAddPagoPresupuesto() (+7 more)

### Community 64 - "auth.users"
Cohesion: 0.15
Nodes (14): public.agregar_a_empresa(), trg_crear_perfil_nuevo_usuario, public.es_odonto_admin(), public.fn_crear_perfil_nuevo_usuario(), public.profiles, public.user_roles, trg_crear_perfil_nuevo_usuario, public.agregar_a_empresa() (+6 more)

### Community 66 - "CLAUDE.md"
Cohesion: 0.10
Nodes (20): Comandos, Convenciones, Copias separadas (instalación aparte), Cosas que YA NO son pendientes (verificadas el 2026-08-06), Cuentas, Cómo verificar, Datos cargados (2026-08-05), Dónde está todo (+12 more)

### Community 67 - "lucide-react"
Cohesion: 0.23
Nodes (16): lucide-react, RealtimeIndicator(), RealtimeIndicatorProps, Header(), Combobox(), ComboboxProps, OpcionCombobox, Command() (+8 more)

### Community 68 - "package.json"
Cohesion: 0.05
Nodes (41): author, cmdk@1.0.4, grapify@^1.0.7, @radix-ui/react-checkbox@1.1.3, @radix-ui/react-context-menu@2.2.4, @radix-ui/react-label@2.1.1, @radix-ui/react-scroll-area@1.2.2, @radix-ui/react-select@2.1.4 (+33 more)

### Community 69 - "PanelBoltonNance.tsx"
Cohesion: 0.13
Nodes (20): DIENTES_INF_12, DIENTES_INF_6, DIENTES_SUP_12, DIENTES_SUP_6, FilaUap, numOrUndef(), PanelBoltonNance(), PanelBoltonNanceProps (+12 more)

### Community 70 - "icono-desde-logo.ts"
Cohesion: 0.20
Nodes (18): buscarSimbolo(), cargarImagen(), finDelPrimerBloque(), fondoQueContrasta(), iconoConInicial(), iconoDesdeLogo(), ImagenRGBA, inicialDe() (+10 more)

### Community 71 - "public.recetas"
Cohesion: 0.15
Nodes (15): public.evoluciones_clinicas, public.fn_calcular_total_liquidacion(), public.liquidaciones_odontologos, public.periodontogramas, public.sillones_dentales, trg_calcular_total_liquidacion, medicos_user_id_unico, medicos_documento_unico (+7 more)

### Community 72 - "⚖️ Control de Peso — Sistema de Gestión Antropométrica"
Cohesion: 0.12
Nodes (10): 📜 Comandos, ⚖️ Control de Peso — Sistema de Gestión Antropométrica, 🔐 Datos sensibles, 📦 Despliegue, 📚 Documentación, 🧩 Módulos, 🚀 Puesta en marcha, 🛠️ Stack (+2 more)

### Community 73 - "api/cefalometria.ts"
Cohesion: 0.21
Nodes (15): RFC-4122, CefalometriaNoInstaladaError, comprimir(), eliminarEstudioCefalometrico(), esRutaDeposito(), getEstudiosPorPaciente(), guardarEstudioCefalometrico(), obtenerUrlImagen() (+7 more)

### Community 74 - "Input"
Cohesion: 0.28
Nodes (10): useMiMedico(), cambiarCorreoPropio(), EvolucionClinica(), EvolucionClinicaProps, Input, Label(), Textarea, Cefalometria() (+2 more)

### Community 75 - "productividad.ts"
Cohesion: 0.17
Nodes (13): AtencionProductividad, diaSiguiente(), EvolucionFila, fetchProduccionDental(), FiltrosProductividad, formatSexo(), horaDe(), ProduccionDental (+5 more)

### Community 76 - "public.pacientes"
Cohesion: 0.25
Nodes (14): pacientes_documento_por_empresa, public.ruta_de_mi_empresa(), public.consentimientos_paciente, public.fn_actualizar_saldo_presupuesto(), public.fn_actualizar_total_presupuesto(), public.odontograma_registros, public.odontologia_precios, public.paciente_anamnesis (+6 more)

### Community 77 - "esquema.ts"
Cohesion: 0.22
Nodes (12): 1. Los ids son UUID, el código heredado los trata como números, 2. RLS activado sin políticas significa "cerrado para todos", 3. Los totales guardados no se actualizan solos, 4. Módulos que fingían funcionar, 5. Faltan columnas que el código pide, Las cinco trampas de este proyecto, avisarEsquemaFaltante(), ErrorSupabase (+4 more)

### Community 78 - "empresas.ts"
Cohesion: 0.21
Nodes (13): actualizarEmpresaPorId(), ActualizarEmpresaPorIdInput, clave, darAdministrador(), entrarAEmpresa(), faltaMigracionIngreso(), IngresoDueno, limpiarMarcaYCambiarA() (+5 more)

### Community 80 - "build"
Cohesion: 0.17
Nodes (12): build, appId, directories, files, nsis, productName, win, output (+4 more)

### Community 81 - "sheet.tsx"
Cohesion: 0.26
Nodes (9): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle() (+1 more)

### Community 82 - "Instalar el sistema para un consultorio nuevo"
Cohesion: 0.18
Nodes (10): Instalar el sistema para un consultorio nuevo, Mantenimiento: cuando se agregan cambios a la base, Paso 1 — Crear la base de datos, Paso 2 — Instalar las tablas, Paso 3 — Cerrar el registro público, Paso 4 — Crear la cuenta del administrador, Paso 5 — Publicar la función que crea usuarios, Paso 6 — Anotar los datos de conexión (+2 more)

### Community 83 - "armar-instalacion.mjs"
Cohesion: 0.20
Nodes (8): carpeta, destino, existentes, ORDEN, partes, raiz, sinClasificar, SOLO_MOVA_DENT

### Community 84 - "supabase"
Cohesion: 0.24
Nodes (5): react-router-dom, ProtectedRoute(), authState, liquidacionesComo(), supabase

### Community 85 - "navigation-menu.tsx"
Cohesion: 0.24
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 86 - "public.pagos_presupuesto"
Cohesion: 0.33
Nodes (9): public.fn_actualizar_saldo_presupuesto(), public.fn_actualizar_total_presupuesto(), public.odontologia_precios, public.pagos_presupuesto, public.presupuesto_detalles, public.presupuestos, trg_actualizar_saldo_presupuesto, trg_actualizar_total_presupuesto (+1 more)

### Community 87 - "public.es_odonto_activo"
Cohesion: 0.32
Nodes (3): public.es_odonto_activo(), public.es_odonto_prescriptor(), public.fn_misma_empresa()

### Community 88 - "create-user/index.ts"
Cohesion: 0.25
Nodes (3): CORS, ROLES_VALIDOS, CORS

### Community 89 - "types/cefalometria.ts"
Cohesion: 0.25
Nodes (7): CalibracionRegla, CoordenadaPunto, DefinicionPunto, FilaNance, RegistroCasoClinico, TipoEstudioCefalometrico, TipoPuntoCefalometrico

### Community 90 - "base_schema.sql"
Cohesion: 0.50
Nodes (7): public.ausencias_medicos, public.citas, public.clinicas, public.especialidades, public.horarios_medicos, public.medicos, public.pacientes

### Community 91 - "perfil.ts"
Cohesion: 0.48
Nodes (6): esColumnaFaltante(), fetchPerfilProfesional(), guardarPerfilPropio(), PerfilProfesional, unirNombre(), usePerfilProfesional()

### Community 93 - "AGENTS.md — Reglas y Memoria del Proyecto Sanidad ISEPOL"
Cohesion: 0.33
Nodes (5): AGENTS.md — Reglas y Memoria del Proyecto Sanidad ISEPOL, Impresión y Exportación a PDF, Regla de Confidencialidad Gineco-Obstétrica, Roles y Matriz de Permisos Sanitarios, Suscripciones en Tiempo Real (Supabase Realtime)

### Community 94 - "evoluciones.ts"
Cohesion: 0.47
Nodes (5): createEvolucion(), EvolucionClinica, fetchEvoluciones(), useCreateEvolucion(), useEvoluciones()

### Community 95 - "cobros.ts"
Cohesion: 0.60
Nodes (4): controlarPago(), controlarProcedimiento(), gs(), ResultadoControl

### Community 96 - "esquema_completo.sql"
Cohesion: 0.40
Nodes (5): medicos_documento_unico, notificaciones_user_idx, public.cie10, public.notificaciones, public.user_admin_audit

### Community 97 - "historial_procedimientos_y_archivos.sql"
Cohesion: 0.60
Nodes (3): idx_presupuesto_detalles_realizados_fecha, public.fn_fijar_fecha_procedimiento_realizado(), trg_fijar_fecha_procedimiento_realizado

### Community 98 - "codigo-acceso.ts"
Cohesion: 1.00
Nodes (3): codigoDeAcceso(), guardarCodigo(), normalizarCodigo()

### Community 100 - "public.cefalometria_estudios"
Cohesion: 0.83
Nodes (3): idx_cefalometria_fecha, idx_cefalometria_paciente, public.cefalometria_estudios

### Community 157 - "main.cjs"
Cohesion: 0.12
Nodes (10): { app, BrowserWindow, shell }, esDesarrollo, path, { contextBridge }, electron@^28.0.0, vite@^6.0.7, @vitejs/plugin-react@^4.3.4, electron (+2 more)

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4122`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 607 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Button`, `Citas.tsx`, `dropdown-menu.tsx`, `cn`, `ui/sidebar.tsx`, `hooks/use-toast.ts`, `preconsulta-dialog.tsx`, `Odontograma.tsx`, `useAuth`, `Usuarios.tsx`, `Mantenimiento.tsx`, `main.tsx`, `alert-dialog.tsx`, `auth-context.tsx`, `App.tsx`, `CefalometriaEditor.tsx`, `ModalEditarEmpresa.tsx`, `menubar.tsx`, `context-menu.tsx`, `layout/sidebar.tsx`, `@tanstack/react-query`, `dependencies`, `Recetas.tsx`, `carousel.tsx`, `FichaPaciente.tsx`, `date-picker.tsx`, `cita-form.tsx`, `form.tsx`, `drawer.tsx`, `CasoDetalleView.tsx`, `ErrorBoundary.tsx`, `Reportes.tsx`, `lazy-load.tsx`, `vitest`, `virtualized-list.tsx`, `use-install-pwa.tsx`, `use-intersection-observer.ts`, `empresa.ts`, `lucide-react`, `package.json`, `PanelBoltonNance.tsx`, `Input`, `sheet.tsx`, `supabase`, `navigation-menu.tsx`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **What connects `RFC-4122` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.14204081632653062 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `Button`, `Citas.tsx`, `dropdown-menu.tsx`, `ui/sidebar.tsx`, `hooks/use-toast.ts`, `Odontograma.tsx`, `Usuarios.tsx`, `react`, `alert-dialog.tsx`, `CefalometriaEditor.tsx`, `ModalEditarEmpresa.tsx`, `menubar.tsx`, `context-menu.tsx`, `layout/sidebar.tsx`, `carousel.tsx`, `FichaPaciente.tsx`, `date-picker.tsx`, `cita-form.tsx`, `form.tsx`, `drawer.tsx`, `skeleton-dashboard.tsx`, `Reportes.tsx`, `lucide-react`, `Input`, `sheet.tsx`, `navigation-menu.tsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `Citas.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07597402597402597 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `Button`, `Citas.tsx`, `dropdown-menu.tsx`, `cn`, `ui/sidebar.tsx`, `hooks/use-toast.ts`, `preconsulta-dialog.tsx`, `Odontograma.tsx`, `useAuth`, `Usuarios.tsx`, `react`, `Mantenimiento.tsx`, `alert-dialog.tsx`, `CefalometriaEditor.tsx`, `ModalEditarEmpresa.tsx`, `menubar.tsx`, `context-menu.tsx`, `layout/sidebar.tsx`, `dependencies`, `Recetas.tsx`, `carousel.tsx`, `FichaPaciente.tsx`, `date-picker.tsx`, `cita-form.tsx`, `CasoDetalleView.tsx`, `ErrorBoundary.tsx`, `Reportes.tsx`, `empresa.ts`, `package.json`, `Input`, `sheet.tsx`, `supabase`, `navigation-menu.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `dropdown-menu.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1330049261083744 - nodes in this community are weakly interconnected._