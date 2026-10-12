import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DollarSign, Printer, Plus, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { useMedicosActivos, fechaHoyISO } from '@/api/citas'
import { imprimirReciboLiquidacion } from '@/lib/imprimir'
import { formatDateDisplay } from '@/lib/utils'
import {
  useLiquidaciones,
  useCreateLiquidacion,
  useMarcarLiquidacionPagada,
  type Liquidacion,
} from '@/api/liquidaciones'

/** 01/09/2026. Fecha sin hora: con new Date() saldría un día antes en Paraguay. */
const fechaCorta = (f: string) =>
  formatDateDisplay(f, 'es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function Liquidaciones() {
  const { user } = useAuth()
  const { data: medicos = [] } = useMedicosActivos()
  const { data: liquidaciones = [], isLoading } = useLiquidaciones()

  const createLiquidacion = useCreateLiquidacion()
  const marcarPagada = useMarcarLiquidacionPagada()

  const [openForm, setOpenForm] = useState(false)
  const [medicoId, setMedicoId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [produccion, setProduccion] = useState('')
  const [comision, setComision] = useState('40')

  const handleSave = async () => {
    if (!medicoId || !fechaInicio || !fechaFin || !produccion || !comision) {
      toast.error('Complete todos los campos obligatorios.')
      return
    }
    if (fechaFin < fechaInicio) {
      toast.error('La fecha de fin no puede ser anterior a la de inicio.')
      return
    }
    const porcentaje = Number(comision)
    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      toast.error('La comisión tiene que estar entre 0 y 100 %.')
      return
    }
    try {
      await createLiquidacion.mutateAsync({
        medico_id: medicoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        total_produccion: Number(produccion),
        comision_porcentaje: porcentaje,
        estado: 'borrador',
        generado_por: user?.id,
      })
      toast.success('Liquidación generada con éxito.')
      setOpenForm(false)
      setMedicoId('')
      setProduccion('')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const imprimirRecibo = (l: Liquidacion) => {
    imprimirReciboLiquidacion({
      numero: l.id,
      profesional: l.medico ? `Dr(a). ${l.medico.apellidos}, ${l.medico.nombres}` : 'Odontólogo',
      registroProfesional: l.medico?.numero_colegiatura ?? null,
      desde: fechaCorta(l.fecha_inicio),
      hasta: fechaCorta(l.fecha_fin),
      produccion: Number(l.total_produccion) || 0,
      comisionPorcentaje: Number(l.comision_porcentaje) || 0,
      totalPagar: Number(l.total_pagar) || 0,
      estado: l.estado,
      fechaEmision: fechaCorta(fechaHoyISO()),
    })
  }

  const handlePagar = async (id: number) => {
    try {
      await marcarPagada.mutateAsync(id)
      toast.success('Liquidación marcada como pagada.')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 text-emerald-600" /> Liquidaciones de Honorarios
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestione las comisiones y pagos a los odontólogos.
            </p>
          </div>
          <Button className="gap-2 shadow-sm" onClick={() => setOpenForm(true)}>
            <Plus className="h-4 w-4" /> Generar Liquidación
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Cargando datos...</p>
          ) : liquidaciones.length === 0 ? (
            <div className="bg-muted/10 py-12 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p>No hay liquidaciones generadas.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 font-semibold">Fecha Registro</th>
                  <th className="p-3 font-semibold">Profesional</th>
                  <th className="p-3 font-semibold">Período</th>
                  <th className="p-3 text-right font-semibold">Producción</th>
                  <th className="p-3 text-right font-semibold">Comisión</th>
                  <th className="p-3 text-right font-semibold">A Pagar</th>
                  <th className="p-3 text-center font-semibold">Estado</th>
                  <th className="p-3 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card">
                {liquidaciones.map((l) => (
                  <tr key={l.id}>
                    <td className="p-3">{new Date(l.created_at).toLocaleDateString('es-ES')}</td>
                    <td className="p-3 font-medium">
                      {l.medico
                        ? `Dr(a). ${l.medico.apellidos}, ${l.medico.nombres}`
                        : 'Odontólogo dado de baja'}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {fechaCorta(l.fecha_inicio)} a {fechaCorta(l.fecha_fin)}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {Number(l.total_produccion).toLocaleString('es-PY')} ₲
                    </td>
                    <td className="p-3 text-right">
                      <span className="mr-2 rounded bg-muted px-2 py-0.5 text-xs">
                        {l.comision_porcentaje}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      {Number(l.total_pagar).toLocaleString('es-PY')} ₲
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          l.estado === 'pagado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {l.estado === 'pagado' ? 'Pagado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Imprimir Recibo"
                          onClick={() => imprimirRecibo(l)}
                        >
                          <Printer className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {l.estado === 'borrador' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Marcar Pagado"
                            onClick={() => handlePagar(l.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Liquidación</DialogTitle>
            <DialogDescription>
              Calcule la comisión de un odontólogo para un período.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Odontólogo *</Label>
              <Select value={medicoId} onValueChange={setMedicoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione profesional..." />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.apellidos}, {m.nombres}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha Fin *</Label>
                <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Producción Total (₲) *</Label>
                <Input
                  type="number"
                  placeholder="Ej: 5000000"
                  value={produccion}
                  onChange={(e) => setProduccion(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Comisión (%) *</Label>
                <Input
                  type="number"
                  placeholder="40"
                  value={comision}
                  onChange={(e) => setComision(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted p-3 text-sm">
              <span className="font-semibold text-muted-foreground">Total a Pagar Estimado:</span>
              <span className="text-lg font-bold text-emerald-600">
                {Math.round((Number(produccion) || 0) * ((Number(comision) || 0) / 100)).toLocaleString('es-PY')} ₲
              </span>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={createLiquidacion.isPending}>
              Guardar Borrador de Liquidación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
