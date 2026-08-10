import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePresupuestos, useOdontoPrecios, useSaveOdontoPrecio } from '@/api/odontologia'
import {
  DollarSign,
  Search,
  Edit2,
  ListCollapse,
  FileText,
  User,
  Calendar,
  RefreshCw,
  SlidersHorizontal,
  Bookmark,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Presupuestos() {
  const { data: presupuestos = [], isLoading: loadingPres } = usePresupuestos()
  const { data: precios = [], isLoading: loadingPrecios } = useOdontoPrecios()
  const savePrecio = useSaveOdontoPrecio()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  // Price Catalog Form State
  const [editingPrecioId, setEditingPrecioId] = useState<number | null>(null)
  const [precioCodigo, setPrecioCodigo] = useState('')
  const [precioNombre, setPrecioNombre] = useState('')
  const [precioCosto, setPrecioCosto] = useState('')

  const handleSavePrecio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!precioCodigo || !precioNombre || !precioCosto) return

    try {
      await savePrecio.mutateAsync({
        id: editingPrecioId || undefined,
        codigo: precioCodigo,
        nombre: precioNombre,
        costo: Number(precioCosto),
        activo: true,
      })

      toast.success(
        editingPrecioId ? 'Procedimiento actualizado.' : 'Procedimiento agregado al catálogo.'
      )
      setPrecioCodigo('')
      setPrecioNombre('')
      setPrecioCosto('')
      setEditingPrecioId(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleEditPrecioClick = (p: any) => {
    setEditingPrecioId(p.id)
    setPrecioCodigo(p.codigo)
    setPrecioNombre(p.nombre)
    setPrecioCosto(String(p.costo))
  }

  const handleTogglePrecioActivo = async (p: any) => {
    try {
      await savePrecio.mutateAsync({
        ...p,
        activo: !p.activo,
      })
      toast.success(p.activo ? 'Procedimiento desactivado.' : 'Procedimiento reactivado.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const filteredPresupuestos = presupuestos.filter((p) => {
    const nombres = `${p.pacientes?.nombres || ''} ${p.pacientes?.apellidos || ''}`.toLowerCase()
    const doc = (p.pacientes?.documento || '').toLowerCase()
    const titulo = p.titulo.toLowerCase()
    const matchesSearch =
      nombres.includes(search.toLowerCase()) ||
      doc.includes(search.toLowerCase()) ||
      titulo.includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'todos' || p.estado === statusFilter
    return matchesSearch && matchesStatus
  })

  /**
   * Totales de lo que se está viendo: si se filtra o se busca, las cuentas
   * acompañan. Es la respuesta a "cuánto me deben en total".
   *
   * Un plan rechazado o anulado NO cuenta como plata por cobrar: el paciente
   * dijo que no, contarlo infla la deuda de la clínica.
   */
  const totales = useMemo(() => {
    let cotizado = 0
    let cobrado = 0
    let porCobrar = 0
    const pacientesQueDeben = new Set<string>()

    for (const p of filteredPresupuestos) {
      const total = Number(p.total) || 0
      const saldo = Number(p.saldo_pendiente) || 0
      const estado = String(p.estado ?? '').toLowerCase()
      const cuenta = estado !== 'rechazado' && estado !== 'anulado'

      cotizado += total
      cobrado += Math.max(0, total - saldo)
      if (cuenta && saldo > 0) {
        porCobrar += saldo
        pacientesQueDeben.add(p.paciente_id)
      }
    }
    return { cotizado, cobrado, porCobrar, deudores: pacientesQueDeben.size }
  }, [filteredPresupuestos])

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <DollarSign className="h-6 w-6 text-primary" />
            Presupuestos y Aranceles
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestione presupuestos generales de tratamientos dentales y configure el tarifario de
            aranceles.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="presupuestos" className="w-full">
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-xl bg-muted p-1">
            <TabsTrigger
              value="presupuestos"
              className="gap-1.5 rounded-lg py-2 text-xs font-semibold"
            >
              <FileText className="h-4 w-4" /> Presupuestos Clínicos
            </TabsTrigger>
            <TabsTrigger value="tarifas" className="gap-1.5 rounded-lg py-2 text-xs font-semibold">
              <ListCollapse className="h-4 w-4" /> Lista de Precios
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Presupuestos list */}
          <TabsContent value="presupuestos" className="space-y-4 pt-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por paciente, cédula o título del plan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cuánto se cotizó, cuánto entró y cuánto falta cobrar */}
            {!loadingPres && filteredPresupuestos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card className="bg-card p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Total cotizado
                  </p>
                  <p className="text-lg font-extrabold tabular-nums">
                    {totales.cotizado.toLocaleString('es-PY')} ₲
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {filteredPresupuestos.length} plan
                    {filteredPresupuestos.length === 1 ? '' : 'es'}
                  </p>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50/60 p-3 dark:bg-emerald-950/20">
                  <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                    Cobrado
                  </p>
                  <p className="text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {totales.cobrado.toLocaleString('es-PY')} ₲
                  </p>
                  <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
                    Ya entró a la clínica
                  </p>
                </Card>
                <Card className="border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-800/50 dark:bg-indigo-950/30">
                  <p className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400">
                    Por cobrar
                  </p>
                  <p className="text-lg font-extrabold tabular-nums text-indigo-700 dark:text-indigo-300">
                    {totales.porCobrar.toLocaleString('es-PY')} ₲
                  </p>
                  <p className="text-[11px] text-indigo-700/70 dark:text-indigo-400/70">
                    {totales.deudores} paciente{totales.deudores === 1 ? '' : 's'} con saldo
                  </p>
                </Card>
                <Card className="bg-card p-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Cobrado del total
                  </p>
                  <p className="text-lg font-extrabold tabular-nums">
                    {totales.cotizado > 0
                      ? Math.round((totales.cobrado / totales.cotizado) * 100)
                      : 0}
                    %
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {statusFilter === 'todos' && !search
                      ? 'De toda la clínica'
                      : 'De lo que está filtrado'}
                  </p>
                </Card>
              </div>
            )}

            {loadingPres ? (
              <div className="py-12 text-center text-muted-foreground">
                <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
                <p>Cargando presupuestos...</p>
              </div>
            ) : filteredPresupuestos.length === 0 ? (
              <Card className="border-dashed bg-card py-16 text-center text-muted-foreground">
                <DollarSign className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-semibold">No se encontraron presupuestos.</p>
                <p className="mt-1 text-xs">
                  Cree planes de tratamiento ingresando a la ficha dental de cada paciente.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredPresupuestos.map((p) => {
                  const pagado = p.total - p.saldo_pendiente
                  return (
                    <Card
                      key={p.id}
                      className="relative overflow-hidden bg-card shadow-sm transition-colors hover:border-primary/40"
                    >
                      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="max-w-[200px] truncate text-base font-bold">
                              {p.titulo}
                            </CardTitle>
                            <CardDescription className="mt-0.5 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(p.created_at).toLocaleDateString('es-ES')}
                            </CardDescription>
                          </div>
                          <Badge
                            className={
                              p.estado === 'aprobado'
                                ? 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : p.estado === 'finalizado'
                                  ? 'border-0 bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                  : p.estado === 'rechazado'
                                    ? 'border-0 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                                    : 'border-0 bg-muted text-foreground'
                            }
                          >
                            {p.estado}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Patient info */}
                        <div className="flex items-center gap-2 rounded-xl border bg-slate-50 p-2 text-xs dark:bg-slate-900/40">
                          <User className="h-4 w-4 text-primary" />
                          <div className="truncate">
                            <p className="font-semibold text-foreground">
                              {p.pacientes?.apellidos}, {p.pacientes?.nombres}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              CI: {p.pacientes?.documento || 'Sin cédula'}
                            </p>
                          </div>
                        </div>

                        {/* Financial summary */}
                        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                          <div className="rounded-xl border bg-card p-2">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground">
                              Total
                            </p>
                            <p className="truncate font-bold text-foreground">
                              {p.total.toLocaleString()} ₲
                            </p>
                          </div>
                          <div className="rounded-xl border bg-card p-2">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground">
                              Abonado
                            </p>
                            <p className="truncate font-bold text-emerald-600">
                              {pagado.toLocaleString()} ₲
                            </p>
                          </div>
                          <div className="rounded-xl border bg-card p-2">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground">
                              Saldo
                            </p>
                            <p className="truncate font-bold text-destructive">
                              {p.saldo_pendiente.toLocaleString()} ₲
                            </p>
                          </div>
                        </div>

                        {/* Action link */}
                        <div className="flex justify-end border-t pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs font-semibold"
                            asChild
                          >
                            <Link to={`/pacientes/${p.paciente_id}`}>Ver Ficha Paciente</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Aranceles List */}
          <TabsContent value="tarifas" className="pt-3">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Creator Form */}
              <div className="lg:col-span-1">
                <Card className="border-primary/20 shadow-sm">
                  <CardHeader className="bg-primary/5 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      {editingPrecioId ? 'Editar Arancel' : 'Registrar Arancel'}
                    </CardTitle>
                    <CardDescription>
                      Configure los aranceles base para los tratamientos de la clínica.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <form onSubmit={handleSavePrecio} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="pre_codigo">Código Único (Identificador)</Label>
                        <Input
                          id="pre_codigo"
                          placeholder="Ej. EMP-01"
                          required
                          value={precioCodigo}
                          onChange={(e) => setPrecioCodigo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pre_nombre">Nombre del Procedimiento</Label>
                        <Input
                          id="pre_nombre"
                          placeholder="Ej. Resina / Obturación"
                          required
                          value={precioNombre}
                          onChange={(e) => setPrecioNombre(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pre_costo">Costo del Arancel (₲)</Label>
                        <Input
                          id="pre_costo"
                          placeholder="0"
                          type="text"
                          inputMode="numeric"
                          required
                          value={precioCosto}
                          onChange={(e) => setPrecioCosto(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button type="submit" className="flex-1" disabled={savePrecio.isPending}>
                          {savePrecio.isPending ? 'Guardando...' : 'Guardar Arancel'}
                        </Button>
                        {editingPrecioId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingPrecioId(null)
                              setPrecioCodigo('')
                              setPrecioNombre('')
                              setPrecioCosto('')
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Price list grid */}
              <div className="space-y-4 lg:col-span-2">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <Bookmark className="h-5 w-5 text-muted-foreground" />
                      Tarifario Centralizado de Odontología
                    </CardTitle>
                    <CardDescription>
                      Lista completa de tratamientos dentales cotizados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-hidden p-0">
                    {loadingPrecios ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs">Cargando tarifario...</p>
                      </div>
                    ) : precios.length === 0 ? (
                      <p className="py-8 text-center text-xs italic text-muted-foreground">
                        No hay aranceles cargados.
                      </p>
                    ) : (
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full border-collapse text-left">
                          <thead className="border-b border-border/80 bg-slate-100/80 text-muted-foreground dark:bg-slate-800/80">
                            <tr>
                              <th className="p-3 text-center text-[10px] font-bold uppercase tracking-wider">
                                Código
                              </th>
                              <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider">
                                Procedimiento
                              </th>
                              <th className="whitespace-nowrap p-3 text-right text-[10px] font-bold uppercase tracking-wider">
                                Precio Base
                              </th>
                              <th className="p-3 text-center text-[10px] font-bold uppercase tracking-wider">
                                Estado
                              </th>
                              <th className="p-3 text-center text-[10px] font-bold uppercase tracking-wider">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60 bg-card">
                            {precios.map((pr) => (
                              <tr
                                key={pr.id}
                                className={`transition-colors even:bg-slate-50/50 hover:bg-primary/5 dark:even:bg-slate-900/30 ${
                                  !pr.activo
                                    ? 'bg-slate-100/50 opacity-50 dark:bg-slate-900/50'
                                    : ''
                                }`}
                              >
                                <td className="p-3 text-center font-mono font-bold text-foreground">
                                  {pr.codigo}
                                </td>
                                <td className="p-3 font-medium text-foreground">{pr.nombre}</td>
                                <td className="whitespace-nowrap p-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                  {pr.costo.toLocaleString('es-PY')} ₲
                                </td>
                                <td className="p-3 text-center">
                                  <Badge
                                    className={
                                      pr.activo
                                        ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-700 shadow-none dark:text-emerald-300'
                                        : 'border-red-500/20 bg-red-500/15 text-red-700 shadow-none dark:text-red-300'
                                    }
                                  >
                                    {pr.activo ? 'Activo' : 'Inactivo'}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-primary hover:bg-primary/10"
                                      onClick={() => handleEditPrecioClick(pr)}
                                      title="Editar precio"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-7 w-7 ${
                                        pr.activo
                                          ? 'text-destructive hover:bg-destructive/10'
                                          : 'text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                      onClick={() => handleTogglePrecioActivo(pr)}
                                      title={pr.activo ? 'Desactivar arancel' : 'Reactivar arancel'}
                                    >
                                      <Bookmark className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
