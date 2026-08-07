import React, { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePaciente, useCambiarEstadoPaciente } from '@/api/pacientes'
import { fechaHoyISO } from '@/api/citas'
import { usePermissions } from '@/hooks/use-permissions'
import {
  usePacienteAnamnesis,
  useSavePacienteAnamnesis,
  usePresupuestos,
  useCreatePresupuesto,
  useUpdatePresupuesto,
  useDeletePresupuesto,
  usePresupuestoDetalles,
  useAddPresupuestoDetalle,
  useDeletePresupuestoDetalle,
  usePagosPresupuesto,
  usePagosPaciente,
  useAddPagoPresupuesto,
  useDeletePagoPresupuesto,
  usePacienteImagenes,
  useCreatePacienteImagen,
  useConsentimientos,
  useCreateConsentimiento,
  useOdontoPrecios,
  uploadImagenFile,
} from '@/api/odontologia'
import { Combobox } from '@/components/ui/combobox'
import { Odontograma } from '@/components/odontograma/Odontograma'
import { EvolucionClinica } from '@/components/pacientes/EvolucionClinica'
import { Periodontograma } from '@/components/pacientes/Periodontograma'
import { FirmaCanvas } from '@/components/pacientes/FirmaCanvas'
import { Recetas } from '@/components/pacientes/Recetas'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  User,
  HeartPulse,
  DollarSign,
  Image as ImageIcon,
  FileSignature,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Activity,
  Calendar,
  CreditCard,
  FileText,
  ListTodo,
  Printer,
  MessageCircle,
  Pill,
  Loader2,
  UserCheck,
} from 'lucide-react'
import {
  imprimirPresupuesto,
  imprimirPlanillaHistorial,
  imprimirComprobantePagos,
} from '@/lib/imprimir'
import { mensajeEstadoCuenta, enlaceWhatsApp, telefonoParaWhatsApp } from '@/lib/estado-cuenta'
import { useEvoluciones } from '@/api/evoluciones'
import { toast } from 'sonner'
import Swal from 'sweetalert2'
import { useEmpresa } from '@/api/empresa'

export default function FichaPaciente() {
  const { id } = useParams<{ id: string }>()
  const empresa = useEmpresa()
  const { hasPermission } = usePermissions()
  const puedeReactivar = hasPermission('pacientes', 'editar')
  const cambiarEstado = useCambiarEstadoPaciente()
  const pacienteId = id as string
  const [seccionClinica, setSeccionClinica] = useState('odontograma')

  const { data: paciente, isLoading: loadingPaciente } = usePaciente(pacienteId)
  const { data: anamnesis, isLoading: loadingAnamnesis } = usePacienteAnamnesis(pacienteId)
  const saveAnamnesis = useSavePacienteAnamnesis()

  const { data: presupuestos = [] } = usePresupuestos(pacienteId)
  // Para la planilla del historial hacen falta los tratamientos y todos los
  // pagos del paciente, no solo los del plan que esté abierto.
  const { data: evoluciones = [] } = useEvoluciones(pacienteId)
  const { data: pagosPaciente = [] } = usePagosPaciente(pacienteId)
  const createPresupuesto = useCreatePresupuesto()
  const updatePresupuesto = useUpdatePresupuesto()
  const deletePresupuesto = useDeletePresupuesto()

  const { data: precios = [] } = useOdontoPrecios()

  // Active budget detail state
  const [activePresupuestoId, setActivePresupuestoId] = useState<number | null>(null)
  const { data: detalles = [] } = usePresupuestoDetalles(activePresupuestoId || 0)
  const { data: pagos = [] } = usePagosPresupuesto(activePresupuestoId || 0)

  // Cuentas del plan, sacadas de lo que hay cargado. Antes se leían de las
  // columnas `total` y `saldo_pendiente` del presupuesto, que nadie actualizaba:
  // un pago aparecía en el historial y "Total Abonado" seguía en 0 ₲.
  const totalCotizado = useMemo(
    () =>
      detalles.reduce((suma, d) => suma + (Number(d.costo) || 0) - (Number(d.descuento) || 0), 0),
    [detalles]
  )
  const totalAbonado = useMemo(
    () => pagos.reduce((suma, p) => suma + (Number(p.monto) || 0), 0),
    [pagos]
  )
  const saldoPendiente = Math.max(0, totalCotizado - totalAbonado)
  /** Si pagó más de lo cotizado (una seña antes de cargar el plan). */
  const saldoAFavor = Math.max(0, totalAbonado - totalCotizado)

  /**
   * Lo mismo pero sumando TODOS los planes del paciente. Sale de las columnas
   * guardadas de cada presupuesto, que `recalcularTotalesPresupuesto()`
   * mantiene al día. Un plan rechazado no cuenta como deuda.
   */
  const totalGeneral = useMemo(() => {
    let cotizado = 0
    let abonado = 0
    let saldo = 0
    for (const p of presupuestos) {
      const total = Number(p.total) || 0
      const pendiente = Number(p.saldo_pendiente) || 0
      const estado = String(p.estado ?? '').toLowerCase()
      cotizado += total
      abonado += Math.max(0, total - pendiente)
      if (estado !== 'rechazado' && estado !== 'anulado') saldo += pendiente
    }
    return { cotizado, abonado, saldo }
  }, [presupuestos])

  const addDetalle = useAddPresupuestoDetalle()
  const removeDetalle = useDeletePresupuestoDetalle()
  const addPago = useAddPagoPresupuesto()
  const deletePago = useDeletePagoPresupuesto()

  // Images state
  const { data: imagenes = [] } = usePacienteImagenes(pacienteId)
  const addImagenMetadata = useCreatePacienteImagen()
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imgDesc, setImgDesc] = useState('')
  const [imgTipo, setImgTipo] = useState('periapical')

  // Consent states
  const { data: consentimientos = [] } = useConsentimientos(pacienteId)
  const createConsentimientoMutation = useCreateConsentimiento()
  const [consentTitle, setConsentTitle] = useState('Consentimiento para Tratamiento Dental General')
  const [consentContent, setConsentContent] = useState(
    'Por la presente doy mi consentimiento para la realización de los procedimientos dentales detallados en mi plan de tratamiento, incluyendo anestesia local si fuera necesaria. He sido informado de los riesgos y alternativas.'
  )
  const [showFirmaCanvas, setShowFirmaCanvas] = useState(false)

  // Anamnesis Form States
  const [alergias, setAlergias] = useState('')
  const [alergiaLatex, setAlergiaLatex] = useState(false)
  const [alergiaAnestesia, setAlergiaAnestesia] = useState(false)
  const [problemasCardiacos, setProblemasCardiacos] = useState(false)
  const [presionArterial, setPresionArterial] = useState('')
  const [medicamentos, setMedicamentos] = useState('')
  const [enfermedadesSistemicas, setEnfermedadesSistemicas] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const [anamnesisInitialized, setAnamnesisInitialized] = useState(false)

  // Budget details add form state
  const [selTratamientoId, setSelTratamientoId] = useState('')
  const [selPieza, setSelPieza] = useState('')
  const [selCara, setSelCara] = useState('')
  const [selDescuento, setSelDescuento] = useState('')
  // El precio de la tarifa es solo una sugerencia: una misma extracción puede
  // cobrarse distinto según el paciente, así que el importe queda editable.
  const [selCosto, setSelCosto] = useState('')

  // Payment add form state
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState('efectivo')
  const [pagoComentario, setPagoComentario] = useState('')

  // Load anamnesis into state when loaded
  React.useEffect(() => {
    if (anamnesis && !anamnesisInitialized) {
      setAlergias(anamnesis.alergias || '')
      setAlergiaLatex(anamnesis.alergia_latex)
      setAlergiaAnestesia(anamnesis.alergia_anestesia)
      setProblemasCardiacos(anamnesis.problemas_cardiacos)
      setPresionArterial(anamnesis.presion_arterial || '')
      setMedicamentos(anamnesis.medicamentos || '')
      setEnfermedadesSistemicas(anamnesis.enfermedades_sistemicas || '')
      setObservaciones(anamnesis.observaciones || '')
      setAnamnesisInitialized(true)
    }
  }, [anamnesis, anamnesisInitialized])

  if (loadingPaciente || loadingAnamnesis) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="mr-3 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando ficha dental del paciente...</p>
        </div>
      </AppLayout>
    )
  }

  if (!paciente) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Paciente no encontrado</h2>
          <Button className="mt-4 gap-2" asChild>
            <Link to="/pacientes">
              <ArrowLeft className="h-4 w-4" /> Volver a Pacientes
            </Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  // Edad para la receta: en la farmacia se controla la dosis contra la edad,
  // sobre todo en los chicos, así que va impresa junto al documento.
  const edadPaciente = (() => {
    if (!paciente.fecha_nacimiento) return null
    const nac = new Date(`${paciente.fecha_nacimiento}T00:00:00`)
    if (Number.isNaN(nac.getTime())) return null
    const hoy = new Date()
    let años = hoy.getFullYear() - nac.getFullYear()
    const mes = hoy.getMonth() - nac.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) años--
    return años >= 0 ? `${años} años` : null
  })()

  const handleReactivar = async () => {
    const confirmar = await Swal.fire({
      title: '¿Reactivar a este paciente?',
      text: 'Vuelve a aparecer en la lista y se le pueden cargar citas y tratamientos.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    })
    if (!confirmar.isConfirmed) return
    try {
      await cambiarEstado.mutateAsync({ id: pacienteId, activo: true })
      toast.success('Paciente reactivado.')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  // Handle Anamnesis Save
  const handleSaveAnamnesis = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveAnamnesis.mutateAsync({
        paciente_id: pacienteId,
        alergias: alergias || null,
        alergia_latex: alergiaLatex,
        alergia_anestesia: alergiaAnestesia,
        problemas_cardiacos: problemasCardiacos,
        presion_arterial: presionArterial || null,
        medicamentos: medicamentos || null,
        enfermedades_sistemicas: enfermedadesSistemicas || null,
        observaciones: observaciones || null,
      })
      toast.success('Antecedentes médicos guardados correctamente.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  // Handle Create Budget
  const handleCreateBudget = async () => {
    const { value: titulo } = await Swal.fire({
      title: 'Nuevo Plan de Tratamiento',
      input: 'text',
      inputLabel: 'Nombre del presupuesto',
      inputValue: 'Tratamiento Integral',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Debe ingresar un título'
        }
      },
    })

    if (titulo) {
      try {
        const nuevo = await createPresupuesto.mutateAsync({
          pacienteId,
          titulo,
        })
        setActivePresupuestoId(nuevo.id)
        toast.success('Presupuesto creado con éxito.')
      } catch (err) {
        toast.error((err as Error).message)
      }
    }
  }

  // Handle Delete Budget
  const handleDeleteBudget = async (idPres: number) => {
    const confirm = await Swal.fire({
      title: '¿Está seguro?',
      text: 'Se eliminará el presupuesto y todos sus detalles permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    })

    if (confirm.isConfirmed) {
      try {
        await deletePresupuesto.mutateAsync({ id: idPres, pacienteId })
        if (activePresupuestoId === idPres) {
          setActivePresupuestoId(null)
        }
        toast.success('Presupuesto eliminado.')
      } catch (err) {
        toast.error((err as Error).message)
      }
    }
  }

  const handleDeletePayment = async (idPago: number) => {
    const confirm = await Swal.fire({
      title: '¿Borrar pago?',
      text: 'El saldo pendiente volverá a subir.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
    })

    if (confirm.isConfirmed) {
      try {
        await deletePago.mutateAsync(idPago)
        toast.success('Pago eliminado.')
      } catch (err) {
        toast.error((err as Error).message)
      }
    }
  }

  // Add Treatment item to Budget
  /**
   * Planilla con todo lo que se le hizo al paciente: tratamientos, planes y
   * pagos. Es el papel que se archiva en su carpeta o se le entrega.
   */
  const handleImprimirHistorial = () => {
    if (!paciente) return

    const planes = presupuestos.map((p) => {
      const total = Number(p.total) || 0
      const saldo = Number(p.saldo_pendiente) || 0
      return {
        titulo: p.titulo,
        fecha: new Date(p.created_at).toLocaleDateString('es-PY'),
        estado: p.estado,
        total,
        abonado: Math.max(0, total - saldo),
        saldo,
      }
    })

    const totalCobrado = pagosPaciente.reduce((suma, p) => suma + (Number(p.monto) || 0), 0)
    const totalAdeudado = planes.reduce((suma, p) => suma + p.saldo, 0)

    imprimirPlanillaHistorial({
      pacienteNombre: `${paciente.apellidos}, ${paciente.nombres}`,
      pacienteDocumento: paciente.documento,
      pacienteTelefono: paciente.telefono,
      tratamientos: evoluciones.map((e) => ({
        fecha: new Date(e.fecha_registro).toLocaleDateString('es-PY'),
        pieza: e.pieza,
        procedimiento: e.procedimiento || '—',
        nota: e.nota_clinica,
        profesional: e.medico ? `${e.medico.apellidos}, ${e.medico.nombres}` : null,
      })),
      planes,
      pagos: pagosPaciente.map((p) => ({
        fecha: new Date(p.fecha).toLocaleDateString('es-PY'),
        monto: Number(p.monto) || 0,
        metodo: p.tipo_pago ?? '—',
        plan: (p as any).plan ?? null,
      })),
      totalCobrado,
      totalAdeudado,
    })
  }

  /** Los datos de la cuenta del plan abierto, para el comprobante y el mensaje. */
  const datosCuenta = () => ({
    pacienteNombre: `${paciente!.apellidos}, ${paciente!.nombres}`,
    pacienteDocumento: paciente!.documento,
    fecha: new Date().toLocaleDateString('es-PY'),
    planTitulo: activePresupuesto?.titulo ?? null,
    totalCotizado,
    totalAbonado,
    saldoPendiente,
    pagos: pagos.map((p) => ({
      fecha: new Date(p.fecha).toLocaleDateString('es-PY'),
      monto: Number(p.monto) || 0,
      metodo: p.tipo_pago ?? '—',
      comentario: p.comentario ?? null,
    })),
  })

  /** Comprobante de pagos para imprimir o guardar en PDF y mandar. */
  const handleImprimirComprobante = () => {
    if (!paciente) return
    imprimirComprobantePagos(datosCuenta())
  }

  /** Abre WhatsApp con el estado de cuenta escrito, al número del paciente. */
  const handleEnviarWhatsApp = () => {
    if (!paciente) return
    const cuenta = datosCuenta()
    const mensaje = mensajeEstadoCuenta({
      clinica: empresa.nombre,
      pacienteNombre: cuenta.pacienteNombre,
      fecha: cuenta.fecha,
      planTitulo: cuenta.planTitulo,
      totalCotizado: cuenta.totalCotizado,
      totalAbonado: cuenta.totalAbonado,
      saldoPendiente: cuenta.saldoPendiente,
      pagos: cuenta.pagos,
    })

    if (!telefonoParaWhatsApp(paciente.telefono)) {
      toast.info('El paciente no tiene teléfono cargado: elija el contacto en WhatsApp.')
    }
    window.open(enlaceWhatsApp(mensaje, paciente.telefono), '_blank', 'noopener,noreferrer')
  }

  /** Abre el presupuesto como documento para imprimir o guardar en PDF. */
  const handleImprimirPresupuesto = () => {
    if (!activePresupuesto || !paciente) return
    imprimirPresupuesto({
      pacienteNombre: `${paciente.apellidos}, ${paciente.nombres}`,
      pacienteDocumento: paciente.documento,
      titulo: activePresupuesto.titulo,
      fecha: new Date(activePresupuesto.created_at).toLocaleDateString('es-PY'),
      estado: activePresupuesto.estado,
      // Se mandan las cuentas que están a la vista, no las columnas guardadas:
      // el papel que se lleva el paciente tiene que decir lo mismo que la
      // pantalla donde se le explicó.
      total: totalCotizado,
      saldoPendiente,
      detalles: detalles.map((d) => ({
        pieza: d.pieza,
        cara: d.cara,
        tratamiento: (d as any).odontologia_precios?.nombre ?? 'Procedimiento',
        costo: Number(d.costo) || 0,
        descuento: Number(d.descuento) || 0,
      })),
      pagos: pagos.map((p) => ({
        fecha: new Date(p.fecha).toLocaleDateString('es-PY'),
        monto: Number(p.monto) || 0,
        metodo: p.tipo_pago ?? '—',
      })),
    })
  }

  const handleAddProcedure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePresupuestoId || !selTratamientoId) return

    const selectedPre = precios.find((p) => String(p.id) === String(selTratamientoId))
    if (!selectedPre) return

    // Manda el importe escrito; si se dejó vacío, el de la tarifa.
    const costoFinal = selCosto.trim() !== '' ? Number(selCosto) : selectedPre.costo
    if (!Number.isFinite(costoFinal) || costoFinal < 0) {
      toast.error('El importe no es válido.')
      return
    }

    try {
      await addDetalle.mutateAsync({
        presupuesto_id: activePresupuestoId,
        tratamiento_id: selectedPre.id,
        pieza: selPieza ? Number(selPieza) : null,
        cara: selCara || null,
        costo: costoFinal,
        descuento: selDescuento ? Number(selDescuento) : 0,
        estado: 'pendiente',
      })

      setSelTratamientoId('')
      setSelPieza('')
      setSelCara('')
      setSelDescuento('')
      setSelCosto('')
      toast.success('Tratamiento agregado al presupuesto.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  // Record Payment
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activePresupuestoId || !pagoMonto) return

    try {
      await addPago.mutateAsync({
        presupuesto_id: activePresupuestoId,
        monto: Number(pagoMonto),
        tipo_pago: pagoMetodo,
        comentario: pagoComentario || null,
        fecha: fechaHoyISO(),
      })

      setPagoMonto('')
      setPagoComentario('')
      toast.success('Pago registrado correctamente.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    const file = files[0]

    try {
      // Subir archivo (Vía Supabase Storage o DataURL en local)
      const url = await uploadImagenFile(file, pacienteId)

      // Guardar metadatos en Base de Datos
      await addImagenMetadata.mutateAsync({
        paciente_id: pacienteId,
        url,
        tipo: imgTipo,
        descripcion: imgDesc || null,
        fecha: fechaHoyISO(),
      })

      setImgDesc('')
      toast.success('Imagen clínica cargada con éxito.')
    } catch (err) {
      toast.error('Error al subir imagen: ' + (err as Error).message)
    } finally {
      setUploadingImage(false)
      // Reset input
      e.target.value = ''
    }
  }

  // Handle Save Signed Consent
  const handleSaveConsent = async (base64Signature: string) => {
    try {
      await createConsentimientoMutation.mutateAsync({
        paciente_id: pacienteId,
        titulo: consentTitle,
        contenido: consentContent,
        firma: base64Signature,
      })

      setShowFirmaCanvas(false)
      toast.success('Consentimiento firmado y guardado.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const activePresupuesto = presupuestos.find((p) => p.id === activePresupuestoId)

  // Alerta médica si hay riesgos graves
  const tieneAlertasMedicas =
    alergiaLatex || alergiaAnestesia || problemasCardiacos || (anamnesis && anamnesis.alergias)

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header / Patient info */}
        <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border bg-card p-6 shadow-sm md:flex-row md:items-center">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <Button variant="outline" size="icon" className="flex-shrink-0 rounded-xl" asChild>
              <Link to="/pacientes">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <User className="h-6 w-6 text-primary" />
                {paciente.apellidos}, {paciente.nombres}
              </h2>
              <p className="text-sm text-muted-foreground">
                Documento:{' '}
                <span className="font-semibold text-foreground">
                  {paciente.documento || 'Sin Cédula'}
                </span>
                {paciente.telefono && (
                  <>
                    {' '}
                    · Teléfono:{' '}
                    <span className="font-semibold text-foreground">{paciente.telefono}</span>
                  </>
                )}
                {paciente.tipo && (
                  <>
                    {' '}
                    · Categoría:{' '}
                    <span className="font-semibold capitalize text-foreground">
                      {paciente.tipo}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-background"
              onClick={handleImprimirHistorial}
            >
              <Printer className="h-4 w-4" />
              Planilla del historial
            </Button>
            {paciente.activo ? (
              <Badge className="border-0 bg-emerald-100 text-xs text-emerald-800 hover:bg-emerald-200">
                Paciente Activo
              </Badge>
            ) : (
              <>
                <Badge variant="destructive">Inactivo</Badge>
                {/* El botón va acá y no solo en la lista de Pacientes: esa lista
                    filtra por "Activos" de entrada, así que un paciente dado de
                    baja no aparece y no había desde dónde reactivarlo sin saber
                    que primero hay que cambiar el filtro. */}
                {puedeReactivar && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 bg-background"
                    disabled={cambiarEstado.isPending}
                    onClick={handleReactivar}
                  >
                    {cambiarEstado.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Reactivar paciente
                  </Button>
                )}
              </>
            )}
            {alergiaLatex && <Badge variant="destructive">⚠️ Alergia Látex</Badge>}
            {alergiaAnestesia && <Badge variant="destructive">⚠️ Alergia Anestésicos</Badge>}
            {problemasCardiacos && <Badge variant="destructive">⚠️ Riesgo Cardíaco</Badge>}
          </div>
        </div>

        {/* Warning Banner */}
        {tieneAlertasMedicas && (
          <Alert
            variant="destructive"
            className="border-red-300 bg-red-50 text-red-900 dark:bg-red-950/20 dark:text-red-300"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-sm font-bold">
              ATENCIÓN: Antecedentes Clínicos Críticos
            </AlertTitle>
            <AlertDescription className="text-xs">
              {alergiaLatex &&
                '• Paciente con alergia declarada al LÁTEX. Utilice guantes de nitrilo.\n'}
              {alergiaAnestesia &&
                '• Paciente con alergia declarada a ANESTÉSICOS DENTALES (ej. Lidocaína/Mepivacaína).\n'}
              {problemasCardiacos &&
                '• El paciente reporta PROBLEMAS CARDÍACOS. Monitoree presión arterial y evite vasoconstrictores si es necesario.\n'}
              {alergias && `• Otras alergias: ${alergias}.\n`}
              {medicamentos && `• Medicamentos actuales: ${medicamentos}.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs navigation */}
        <Tabs value={seccionClinica} onValueChange={setSeccionClinica} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1.5 lg:grid-cols-8">
            <TabsTrigger
              value="odontograma"
              className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
            >
              <Activity className="h-4 w-4" /> Odontograma
            </TabsTrigger>
            <TabsTrigger
              value="evolucion"
              className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
            >
              <ListTodo className="h-4 w-4" /> Evolución
            </TabsTrigger>
            <TabsTrigger
              value="periodontograma"
              className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
            >
              <HeartPulse className="h-4 w-4" /> Perio.
            </TabsTrigger>
            <TabsTrigger
              value="anamnesis"
              className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
            >
              <FileText className="h-4 w-4" /> Anamnesis
            </TabsTrigger>
            <TabsTrigger
              value="recetas"
              className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
            >
              <Pill className="h-4 w-4" /> Recetas
            </TabsTrigger>
            <TabsTrigger
              value="presupuestos"
              className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
            >
              <DollarSign className="h-4 w-4" /> Planes
            </TabsTrigger>
            <TabsTrigger
              value="imagenes"
              className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
            >
              <ImageIcon className="h-4 w-4" /> Imágenes
            </TabsTrigger>
            <TabsTrigger
              value="consentimientos"
              className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold"
            >
              <FileSignature className="h-4 w-4" /> Firmas
            </TabsTrigger>
          </TabsList>

          {/* 1. Odontograma Tab Content */}
          <TabsContent value="odontograma" className="pt-3">
            <Odontograma pacienteId={pacienteId} />
          </TabsContent>

          {/* Evolución Clínica */}
          <TabsContent value="evolucion" className="pt-3">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <EvolucionClinica pacienteId={pacienteId} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Periodontograma */}
          <TabsContent value="periodontograma" className="pt-3">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <Periodontograma
                  pacienteId={pacienteId}
                  pacienteNombre={`${paciente.apellidos}, ${paciente.nombres}`}
                  pacienteDocumento={paciente.documento}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Anamnesis Tab Content */}
          <TabsContent value="anamnesis" className="pt-3">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <HeartPulse className="h-5 w-5 text-primary" />
                  Ficha Médica y Anamnesis Dental
                </CardTitle>
                <CardDescription>
                  Registre las condiciones de salud y alergias que condicionan los procedimientos
                  quirúrgicos o de anestesia.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAnamnesis} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-4">
                      <h3 className="border-b pb-1 text-sm font-semibold text-primary">
                        Alergias Críticas
                      </h3>
                      <div className="flex items-center justify-between rounded-xl border bg-card p-3">
                        <Label htmlFor="alergia_latex" className="flex cursor-pointer flex-col">
                          <span className="text-sm font-semibold">Alergia al Látex</span>
                          <span className="text-xs text-muted-foreground">
                            Exige instrumental y guantes Nitrilo.
                          </span>
                        </Label>
                        <input
                          id="alergia_latex"
                          type="checkbox"
                          checked={alergiaLatex}
                          onChange={(e) => setAlergiaLatex(e.target.checked)}
                          className="h-5 w-5 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border bg-card p-3">
                        <Label htmlFor="alergia_anestesia" className="flex cursor-pointer flex-col">
                          <span className="text-sm font-semibold">Alergia a la Anestesia</span>
                          <span className="text-xs text-muted-foreground">
                            Antecedentes de shock o intolerancia.
                          </span>
                        </Label>
                        <input
                          id="alergia_anestesia"
                          type="checkbox"
                          checked={alergiaAnestesia}
                          onChange={(e) => setAlergiaAnestesia(e.target.checked)}
                          className="h-5 w-5 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="border-b pb-1 text-sm font-semibold text-primary">
                        Condiciones Cardiovasculares
                      </h3>
                      <div className="flex items-center justify-between rounded-xl border bg-card p-3">
                        <Label htmlFor="cardiacos" className="flex cursor-pointer flex-col">
                          <span className="text-sm font-semibold">Problemas Cardíacos</span>
                          <span className="text-xs text-muted-foreground">
                            Insuficiencia, soplos o marcapasos.
                          </span>
                        </Label>
                        <input
                          id="cardiacos"
                          type="checkbox"
                          checked={problemasCardiacos}
                          onChange={(e) => setProblemasCardiacos(e.target.checked)}
                          className="h-5 w-5 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="presion">Presión Arterial Promedio</Label>
                        <Input
                          id="presion"
                          placeholder="Ej. 120/80 mmHg"
                          value={presionArterial}
                          onChange={(e) => setPresionArterial(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="border-b pb-1 text-sm font-semibold text-primary">
                        Alergias Adicionales
                      </h3>
                      <div className="space-y-1.5">
                        <Label htmlFor="otras_alergias">Detalle de otras alergias</Label>
                        <Textarea
                          id="otras_alergias"
                          placeholder="Penicilina, aspirina, antiinflamatorios, alimentos..."
                          value={alergias}
                          onChange={(e) => setAlergias(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="medicamentos">Medicamentos actuales</Label>
                      <Textarea
                        id="medicamentos"
                        placeholder="Indique anticoagulantes, aspirinas, bifosfonatos u otros de uso diario..."
                        value={medicamentos}
                        onChange={(e) => setMedicamentos(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="enfermedades">Enfermedades Sistémicas</Label>
                      <Textarea
                        id="enfermedades"
                        placeholder="Diabetes, hemofilia, VIH, hepatitis, osteoporosis, asma..."
                        value={enfermedadesSistemicas}
                        onChange={(e) => setEnfermedadesSistemicas(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="observaciones">
                        Observaciones / Notas Clínicas Generales
                      </Label>
                      <Textarea
                        id="observaciones"
                        placeholder="Otros antecedentes relevantes para la salud bucal..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button type="submit" className="gap-2" disabled={saveAnamnesis.isPending}>
                      <Save className="h-4 w-4" />{' '}
                      {saveAnamnesis.isPending ? 'Guardando...' : 'Guardar Ficha Médica'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recetas */}
          <TabsContent value="recetas" className="pt-3">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <Recetas
                  pacienteId={pacienteId}
                  pacienteNombre={`${paciente.apellidos}, ${paciente.nombres}`}
                  pacienteDocumento={paciente.documento}
                  pacienteEdad={edadPaciente}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Presupuestos Tab Content */}
          <TabsContent value="presupuestos" className="pt-3">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Planes list */}
              <div className="space-y-4 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Planes de Tratamiento</h3>
                  <Button size="sm" onClick={handleCreateBudget} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Nuevo Plan
                  </Button>
                </div>

                {/* Consolidado de TODOS los planes: los totales de la derecha son
                    del plan abierto, y un paciente con tres tratamientos no
                    tenía dónde ver cuánto debe en total. */}
                {presupuestos.length > 1 && (
                  <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Todos los tratamientos ({presupuestos.length})
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Cotizado</span>
                      <span className="font-semibold tabular-nums">
                        {totalGeneral.cotizado.toLocaleString('es-PY')} ₲
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Abonado</span>
                      <span className="font-semibold tabular-nums text-emerald-600">
                        {totalGeneral.abonado.toLocaleString('es-PY')} ₲
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5 text-sm">
                      <span className="font-bold">Saldo total</span>
                      <span
                        className={`font-extrabold tabular-nums ${totalGeneral.saldo > 0 ? 'text-destructive' : 'text-emerald-600'}`}
                      >
                        {totalGeneral.saldo.toLocaleString('es-PY')} ₲
                      </span>
                    </div>
                  </div>
                )}

                {presupuestos.length === 0 ? (
                  <Card className="border-dashed py-8 text-center text-muted-foreground">
                    <p className="text-xs">No hay planes de tratamiento creados.</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {presupuestos.map((p) => (
                      <Card
                        key={p.id}
                        className={`relative cursor-pointer overflow-hidden transition-all hover:border-primary/50 ${
                          activePresupuestoId === p.id
                            ? 'border-2 border-primary bg-accent/20 shadow-sm'
                            : ''
                        }`}
                        onClick={() => setActivePresupuestoId(p.id)}
                      >
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
                          <div>
                            <h4 className="max-w-[150px] truncate text-sm font-bold">{p.titulo}</h4>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <Badge
                            className={
                              p.estado === 'aprobado'
                                ? 'border-0 bg-emerald-100 text-emerald-800'
                                : p.estado === 'finalizado'
                                  ? 'border-0 bg-blue-100 text-blue-800'
                                  : 'border-0 bg-slate-100 text-slate-800'
                            }
                          >
                            {p.estado}
                          </Badge>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between p-4 pt-0">
                          <div>
                            <p className="text-[11px] text-muted-foreground">Saldo Pendiente</p>
                            <p className="text-xs font-bold text-destructive">
                              {p.saldo_pendiente.toLocaleString()} ₲
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-muted-foreground">Total Cotizado</p>
                            <p className="text-sm font-bold text-foreground">
                              {p.total.toLocaleString()} ₲
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Budget Details & Payments */}
              <div className="lg:col-span-2">
                {activePresupuesto ? (
                  <div className="space-y-6">
                    {/* Budget Overview */}
                    <Card className="border-primary/30 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between bg-primary/5 p-4">
                        <div>
                          <CardTitle className="text-base font-bold">
                            {activePresupuesto.titulo}
                          </CardTitle>
                          <CardDescription>
                            Creado el{' '}
                            {new Date(activePresupuesto.created_at).toLocaleDateString('es-ES')}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={activePresupuesto.estado}
                            onValueChange={(val) =>
                              updatePresupuesto.mutate({
                                id: activePresupuesto.id,
                                cambios: { estado: val as any },
                              })
                            }
                          >
                            <SelectTrigger className="h-8 w-32 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="borrador">Borrador</SelectItem>
                              <SelectItem value="aprobado">Aprobado</SelectItem>
                              <SelectItem value="rechazado">Rechazado</SelectItem>
                              <SelectItem value="finalizado">Finalizado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={handleImprimirPresupuesto}
                          >
                            <Printer className="h-4 w-4" />
                            Imprimir
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteBudget(activePresupuesto.id)}
                            disabled={deletePresupuesto.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4">
                        {/* Financial Totals */}
                        {/* Los totales se calculan de los procedimientos y los
                            pagos que están a la vista, no de las columnas
                            guardadas del plan: así lo que se muestra siempre
                            coincide con las dos listas de abajo. */}
                        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/50 bg-slate-50 p-4 text-center dark:bg-slate-900/50">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">
                              Total Cotizado
                            </p>
                            <p className="text-base font-bold text-foreground">
                              {totalCotizado.toLocaleString()} ₲
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">
                              Total Abonado
                            </p>
                            <p className="text-base font-bold text-emerald-600">
                              {totalAbonado.toLocaleString()} ₲
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">
                              Saldo Pendiente
                            </p>
                            <p className="text-base font-bold text-destructive">
                              {saldoPendiente.toLocaleString()} ₲
                            </p>
                          </div>
                        </div>
                        {saldoAFavor > 0 && (
                          <p className="-mt-2 text-center text-xs font-semibold text-emerald-600">
                            El paciente tiene {saldoAFavor.toLocaleString()} ₲ a favor.
                          </p>
                        )}

                        {/* List of details/procedures */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground">
                            Tratamientos Incluidos
                          </h4>
                          {detalles.length === 0 ? (
                            <p className="py-4 text-center text-xs italic text-muted-foreground">
                              No hay procedimientos agregados a este plan. Use el formulario de
                              abajo para cotizar.
                            </p>
                          ) : (
                            <div className="overflow-hidden rounded-xl border bg-card text-xs">
                              <table className="w-full border-collapse text-left">
                                <thead className="border-b bg-slate-100/80 text-muted-foreground dark:bg-slate-800/80">
                                  <tr>
                                    <th className="p-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
                                      Diente
                                    </th>
                                    <th className="p-2.5 text-[10px] font-bold uppercase tracking-wider">
                                      Tratamiento
                                    </th>
                                    <th className="whitespace-nowrap p-2.5 text-right text-[10px] font-bold uppercase tracking-wider">
                                      Costo
                                    </th>
                                    <th className="whitespace-nowrap p-2.5 text-right text-[10px] font-bold uppercase tracking-wider">
                                      Desct.
                                    </th>
                                    <th className="whitespace-nowrap p-2.5 text-right text-[10px] font-bold uppercase tracking-wider">
                                      Total
                                    </th>
                                    <th className="p-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
                                      Acción
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {detalles.map((d) => (
                                    <tr
                                      key={d.id}
                                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                                    >
                                      <td className="whitespace-nowrap p-2.5 text-center font-medium">
                                        {d.pieza
                                          ? `${d.pieza} (${d.cara || 'Completo'})`
                                          : 'Boca entera'}
                                      </td>
                                      <td className="p-2.5 font-medium text-foreground">
                                        {d.odontologia_precios?.nombre}
                                      </td>
                                      <td className="whitespace-nowrap p-2.5 text-right tabular-nums">
                                        {d.costo.toLocaleString('es-PY')} ₲
                                      </td>
                                      <td className="whitespace-nowrap p-2.5 text-right tabular-nums text-destructive">
                                        -{d.descuento.toLocaleString('es-PY')} ₲
                                      </td>
                                      <td className="whitespace-nowrap p-2.5 text-right font-bold tabular-nums text-foreground">
                                        {(d.costo - d.descuento).toLocaleString('es-PY')} ₲
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <div className="flex justify-center">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                            onClick={() =>
                                              removeDetalle.mutate({
                                                id: d.id,
                                                presupuestoId: d.presupuesto_id,
                                              })
                                            }
                                            disabled={removeDetalle.isPending}
                                            title="Eliminar tratamiento"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Add treatment form */}
                        <form
                          onSubmit={handleAddProcedure}
                          className="grid grid-cols-1 items-end gap-2 rounded-xl border bg-slate-50 p-3 dark:bg-slate-900/20 sm:grid-cols-4"
                        >
                          <div className="space-y-1 sm:col-span-2">
                            <Label
                              htmlFor="add_tratamiento"
                              className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                              Procedimiento
                            </Label>
                            {/* Con más de treinta tratamientos, una lista sin
                                buscador obliga a recorrerla entera con el dedo
                                cada vez. Se escribe "blanq" y quedan los tres. */}
                            <Combobox
                              id="add_tratamiento"
                              className="h-9 bg-background"
                              value={selTratamientoId}
                              onChange={(valor) => {
                                setSelTratamientoId(valor)
                                // Se propone el precio de la tarifa; queda editable
                                // para cobrar distinto según el caso.
                                const tarifa = precios.find((p) => String(p.id) === String(valor))
                                setSelCosto(tarifa ? String(tarifa.costo) : '')
                              }}
                              placeholder="Buscar tratamiento..."
                              buscarPlaceholder="Escriba parte del nombre o el código"
                              vacioTexto="Ningún tratamiento coincide"
                              opciones={precios.map((pr) => ({
                                value: String(pr.id),
                                label: pr.nombre,
                                detalle: `${pr.costo.toLocaleString('es-PY')} ₲`,
                                // El código no se muestra, pero sirve para buscar
                                // "BLA" o "EXT" y llegar directo al grupo.
                                buscarPor: pr.codigo,
                              }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor="add_pieza"
                              className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                              Diente/Cara
                            </Label>
                            <div className="flex gap-1">
                              <Input
                                id="add_pieza"
                                placeholder="Diente"
                                className="h-8 w-14 bg-background p-1 text-center"
                                value={selPieza}
                                onChange={(e) => setSelPieza(e.target.value)}
                              />
                              <Input
                                placeholder="Cara"
                                className="h-8 w-14 bg-background p-1 text-center uppercase"
                                value={selCara}
                                onChange={(e) => setSelCara(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor="add_costo"
                              className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                              Importe y descuento (₲)
                            </Label>
                            <div className="flex gap-1">
                              <Input
                                id="add_costo"
                                placeholder="Importe"
                                type="text"
                                inputMode="numeric"
                                className="h-9 flex-1 bg-background font-semibold"
                                value={selCosto}
                                onChange={(e) => setSelCosto(e.target.value.replace(/\D/g, ''))}
                              />
                              <Input
                                id="add_descuento"
                                placeholder="Desc."
                                type="text"
                                inputMode="numeric"
                                className="h-9 w-20 bg-background"
                                value={selDescuento}
                                onChange={(e) => setSelDescuento(e.target.value.replace(/\D/g, ''))}
                              />
                            </div>
                          </div>

                          {/* El botón va en su propia fila y a lo ancho: antes era
                              un "+" de 32 px encajado entre dos campos, y en un
                              celular el dedo le erraba y tocaba el input de al
                              lado. El tratamiento parecía no agregarse. */}
                          <div className="space-y-1 sm:col-span-4">
                            <Button
                              type="submit"
                              className="h-10 w-full gap-2"
                              disabled={addDetalle.isPending || !selTratamientoId}
                            >
                              <Plus className="h-4 w-4" />
                              {addDetalle.isPending ? 'Agregando...' : 'Agregar al presupuesto'}
                            </Button>
                            <p className="text-[11px] text-muted-foreground">
                              {selTratamientoId
                                ? 'El importe viene sugerido de la tarifa, pero se puede cambiar en cada caso.'
                                : 'Elija primero un procedimiento de la lista de arriba.'}
                            </p>
                          </div>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Payments */}
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-sm font-bold">
                              <CreditCard className="h-4 w-4 text-emerald-600" />
                              Historial de Pagos y Abonos
                            </CardTitle>
                            <CardDescription>
                              Registre las señas y pagos fraccionados entregados por el paciente.
                            </CardDescription>
                          </div>
                          {/* El estado de cuenta se le manda al paciente: lleva
                              solo la plata, nunca el detalle clínico. */}
                          <div className="flex gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={handleImprimirComprobante}
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Comprobante
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400"
                              onClick={handleEnviarWhatsApp}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4">
                        {pagos.length === 0 ? (
                          <p className="py-4 text-center text-xs italic text-muted-foreground">
                            No se han registrado abonos todavía.
                          </p>
                        ) : (
                          <div className="overflow-hidden rounded-xl border text-xs">
                            <table className="w-full border-collapse text-left">
                              <thead className="border-b bg-slate-100/80 text-muted-foreground dark:bg-slate-800/80">
                                <tr>
                                  <th className="p-2.5 text-[10px] font-bold uppercase tracking-wider">
                                    Fecha
                                  </th>
                                  <th className="p-2.5 text-[10px] font-bold uppercase tracking-wider">
                                    Método
                                  </th>
                                  <th className="p-2.5 text-[10px] font-bold uppercase tracking-wider">
                                    Comentario
                                  </th>
                                  <th className="whitespace-nowrap p-2.5 text-right text-[10px] font-bold uppercase tracking-wider">
                                    Monto
                                  </th>
                                  <th className="p-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
                                    Acción
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60 bg-card">
                                {pagos.map((pa) => (
                                  <tr
                                    key={pa.id}
                                    className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                                  >
                                    <td className="whitespace-nowrap p-2.5">
                                      {new Date(pa.fecha).toLocaleDateString('es-PY')}
                                    </td>
                                    <td className="p-2.5 font-medium capitalize">{pa.tipo_pago}</td>
                                    <td className="p-2.5 italic text-muted-foreground">
                                      {pa.comentario || 'Sin observaciones'}
                                    </td>
                                    <td className="whitespace-nowrap p-2.5 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                      +{pa.monto.toLocaleString('es-PY')} ₲
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <div className="flex justify-center">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeletePayment(pa.id)}
                                          disabled={deletePago.isPending}
                                          title="Borrar abono"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Add payment form */}
                        <form
                          onSubmit={handleAddPayment}
                          className="grid grid-cols-1 items-end gap-2 rounded-xl border bg-slate-50 p-3 dark:bg-slate-900/20 sm:grid-cols-4"
                        >
                          <div className="space-y-1">
                            <Label
                              htmlFor="pago_monto"
                              className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                              Monto de Pago (₲)
                            </Label>
                            <Input
                              id="pago_monto"
                              placeholder="Monto"
                              className="h-8 bg-background"
                              type="text"
                              inputMode="numeric"
                              required
                              value={pagoMonto}
                              onChange={(e) => setPagoMonto(e.target.value.replace(/\D/g, ''))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor="pago_metodo"
                              className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                              Método
                            </Label>
                            <Select value={pagoMetodo} onValueChange={setPagoMetodo}>
                              <SelectTrigger id="pago_metodo" className="h-8 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="efectivo">Efectivo</SelectItem>
                                <SelectItem value="tarjeta">Tarjeta Crédito/Débito</SelectItem>
                                <SelectItem value="transferencia">
                                  Transferencia Bancaria
                                </SelectItem>
                                <SelectItem value="seña">Seña / Entrega</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label
                              htmlFor="pago_comentario"
                              className="text-[10px] font-bold uppercase text-muted-foreground"
                            >
                              Nota de recibo
                            </Label>
                            <div className="flex gap-1">
                              <Input
                                id="pago_comentario"
                                placeholder="Comentarios..."
                                className="h-8 flex-1 bg-background"
                                value={pagoComentario}
                                onChange={(e) => setPagoComentario(e.target.value)}
                              />
                              <Button
                                type="submit"
                                size="sm"
                                className="h-8 gap-1 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                                disabled={addPago.isPending}
                              >
                                <Plus className="h-3.5 w-3.5" /> Abonar
                              </Button>
                            </div>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed bg-card py-20 text-center">
                    <DollarSign className="mx-auto mb-3 h-12 w-12 text-muted-foreground/60" />
                    <h3 className="text-base font-bold">Ficha Financiera</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                      Seleccione un Plan de Tratamiento a la izquierda para visualizar el
                      presupuesto detallado, añadir procedimientos o registrar pagos del paciente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 4. Imágenes Tab Content */}
          <TabsContent value="imagenes" className="pt-3">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Radiografías y Fotografías Clínicas
                  </CardTitle>
                  <CardDescription>
                    Suba y clasifique panorámicas, periapicales u otras imágenes de diagnóstico.
                  </CardDescription>
                </div>
                {/* Upload Section */}
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Tipo
                    </Label>
                    <Select value={imgTipo} onValueChange={setImgTipo}>
                      <SelectTrigger className="h-8 w-32 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="panoramica">Panorámica</SelectItem>
                        <SelectItem value="periapical">Periapical</SelectItem>
                        <SelectItem value="clinica">Foto Clínica</SelectItem>
                        <SelectItem value="otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Descripción
                    </Label>
                    <Input
                      placeholder="Nota rápida..."
                      className="h-8 w-44 bg-background"
                      value={imgDesc}
                      onChange={(e) => setImgDesc(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      id="img_upload"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5"
                      asChild
                      disabled={uploadingImage}
                    >
                      <Label htmlFor="img_upload" className="flex cursor-pointer items-center">
                        <Plus className="h-4 w-4" />{' '}
                        {uploadingImage ? 'Cargando...' : 'Subir Archivo'}
                      </Label>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {imagenes.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
                    <ImageIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No se han subido imágenes clínicas.</p>
                    <p className="mt-1 text-xs">
                      Cargue radiografías para mantener el historial visual del paciente.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {imagenes.map((img) => (
                      <div
                        key={img.id}
                        className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-950">
                          <img
                            src={img.url}
                            alt={img.descripcion || 'Imagen dental'}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            onClick={() => {
                              Swal.fire({
                                imageUrl: img.url,
                                imageAlt: img.descripcion || 'Visualización de Radiografía',
                                title: `Radiografía ${img.tipo}`,
                                text: img.descripcion || '',
                                confirmButtonText: 'Cerrar',
                                width: '650px',
                              })
                            }}
                          />
                        </div>
                        <div className="space-y-1 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className="px-1.5 py-0.5 text-[10px] capitalize"
                            >
                              {img.tipo}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(img.fecha).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          {img.descripcion && (
                            <p
                              className="truncate text-[11px] text-foreground"
                              title={img.descripcion}
                            >
                              {img.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Consentimientos Tab Content */}
          <TabsContent value="consentimientos" className="pt-3">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Creator form */}
              <div className="lg:col-span-1">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <FileSignature className="h-5 w-5 text-primary" />
                      Generar Documento Legal
                    </CardTitle>
                    <CardDescription>
                      Redacte el descargo o consentimiento informado para firmar digitalmente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cons_titulo">Título del Documento</Label>
                      <Input
                        id="cons_titulo"
                        value={consentTitle}
                        onChange={(e) => setConsentTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cons_cuerpo">Cuerpo del Consentimiento</Label>
                      <Textarea
                        id="cons_cuerpo"
                        value={consentContent}
                        onChange={(e) => setConsentContent(e.target.value)}
                        rows={6}
                      />
                    </div>

                    {!showFirmaCanvas ? (
                      <Button className="w-full gap-2" onClick={() => setShowFirmaCanvas(true)}>
                        <FileSignature className="h-4 w-4" /> Proceder a la Firma
                      </Button>
                    ) : (
                      <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                        <Label className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                          ⚠️ Firma Digital del Paciente
                        </Label>
                        <FirmaCanvas
                          onSave={handleSaveConsent}
                          onCancel={() => setShowFirmaCanvas(false)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Signed documents list */}
              <div className="space-y-4 lg:col-span-2">
                <h3 className="text-sm font-bold text-foreground">Documentos Firmados</h3>
                {consentimientos.length === 0 ? (
                  <Card className="border-dashed py-12 text-center text-muted-foreground">
                    <FileSignature className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-sm">
                      No hay contratos ni consentimientos firmados para este paciente.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {consentimientos.map((c) => (
                      <Card key={c.id} className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                          <div>
                            <h4 className="text-sm font-bold">{c.titulo}</h4>
                            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              Firmado el: {new Date(c.firmado_at).toLocaleString('es-ES')}
                            </p>
                          </div>
                          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                            🔒 Firmado Digitalmente
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4 pt-2">
                          <p className="whitespace-pre-wrap rounded-xl border border-border/50 bg-slate-50 p-3 text-xs text-muted-foreground dark:bg-slate-900/50">
                            {c.contenido}
                          </p>
                          {/* Firma render */}
                          <div className="flex items-center gap-4 rounded-xl border bg-slate-50 p-3 dark:bg-slate-900/20">
                            <div className="flex h-14 w-32 items-center justify-center overflow-hidden rounded border bg-white p-1">
                              <img
                                src={c.firma}
                                alt="Firma digital"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              <p className="font-semibold text-foreground">
                                Firma manuscrita en panel digital
                              </p>
                              <p>
                                Firmante: {paciente.apellidos}, {paciente.nombres}
                              </p>
                              <p>CI: {paciente.documento || 'Sin CI'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
