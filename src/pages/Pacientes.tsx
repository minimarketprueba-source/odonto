import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Edit,
  User,
  ChevronLeft,
  ChevronRight,
  Minus,
  Shield,
  FolderOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import Swal from 'sweetalert2'
import { matchPaciente } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'
import { usePermissions } from '@/hooks/use-permissions'
import { PacienteForm } from '@/components/pacientes/paciente-form'
import {
  TIPOS_PACIENTE,
  labelTipoPaciente,
  usePacientes,
  useCambiarEstadoPaciente,
  type Paciente,
} from '@/api/pacientes'
import { useEmpresa } from '@/api/empresa'

const POR_PAGINA = 24

function fmtFecha(f: string | null): string {
  if (!f) return '—'
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

export default function Pacientes() {
  const navigate = useNavigate()
  const { hasPermission, canDelete } = usePermissions()
  const empresa = useEmpresa()
  const canEdit = hasPermission('pacientes', 'editar')
  const puedeDarDeBaja = canDelete('pacientes')

  const { data: pacientes = [], isLoading } = usePacientes()
  const cambiarEstado = useCambiarEstadoPaciente()

  const [busqueda, setBusqueda] = useState('')
  const [tipoSel, setTipoSel] = useState('todos')
  const [estadoSel, setEstadoSel] = useState<'activos' | 'inactivos' | 'todos'>('activos')
  const [pagina, setPagina] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null)

  const busquedaDebounced = useDebounce(busqueda, 300)

  const filtrados = useMemo(() => {
    return pacientes.filter((p) => {
      if (estadoSel === 'activos' && !p.activo) return false
      if (estadoSel === 'inactivos' && p.activo) return false
      if (tipoSel !== 'todos') {
        const pTipo = (p.tipo || '').toLowerCase()
        const sel = tipoSel.toLowerCase()
        if (pTipo !== sel) {
          return false
        }
      }
      return matchPaciente(p, busquedaDebounced)
    })
  }, [pacientes, busquedaDebounced, tipoSel, estadoSel])

  const conteoPorTipo = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const p of pacientes) {
      if (estadoSel === 'activos' && !p.activo) continue
      if (estadoSel === 'inactivos' && p.activo) continue
      const t = (p.tipo || '').toLowerCase()
      acc[t] = (acc[t] ?? 0) + 1
    }
    return acc
  }, [pacientes, estadoSel])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const detalle = (p: Paciente): string => {
    const pTipo = (p.tipo || '').toLowerCase()
    const esPersonalANP = ['oficial', 'suboficial', 'funcionario', 'medico', 'personal'].includes(
      pTipo
    )
    const partes =
      pTipo === 'familiar'
        ? [p.familiar_de && `Familiar de: ${p.familiar_de}`, p.telefono && `Tel.: ${p.telefono}`]
        : pTipo === 'civil'
          ? [p.telefono && `Tel.: ${p.telefono}`, p.direccion && p.direccion]
          : esPersonalANP || pTipo === 'policia'
            ? [
                p.grado && `Grado: ${p.grado}`,
                p.unidad && `${esPersonalANP ? 'Función' : 'Unidad'}: ${p.unidad}`,
                p.telefono && `Tel.: ${p.telefono}`,
              ]
            : [
                p.grado && `Grado: ${p.grado}`,
                p.promocion && `Curso: ${p.promocion}`,
                p.unidad && `Sección: ${p.unidad}`,
              ]
    return (
      [...partes, p.fecha_nacimiento && `Nac.: ${fmtFecha(p.fecha_nacimiento)}`]
        .filter(Boolean)
        .join(' · ') || 'Sin datos adicionales'
    )
  }

  const handleToggleActivo = async (p: Paciente) => {
    // Los DOS sentidos preguntan primero. Este botón mide 32 px y está pegado
    // al de editar: desde el celular se le da sin querer, y el paciente
    // desaparecía de la lista en el acto, porque el filtro viene en "Activos".
    // Pasó de verdad con varias fichas recién cargadas.
    const nombre = `${p.apellidos}, ${p.nombres}`
    const confirmar = await Swal.fire(
      p.activo
        ? {
            title: `¿Dar de baja a ${nombre}?`,
            text:
              'Deja de aparecer en la lista y no se le pueden cargar citas. ' +
              'No se borra nada: la historia clínica se conserva y se puede reactivar cuando quiera.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
          }
        : {
            title: `¿Reactivar a ${nombre}?`,
            text: 'Vuelve a aparecer en la lista y se le pueden cargar citas y tratamientos.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a',
          }
    )
    if (!confirmar.isConfirmed) return

    try {
      await cambiarEstado.mutateAsync({ id: p.id, activo: !p.activo })
      toast.success(p.activo ? 'Paciente dado de baja.' : 'Paciente reactivado.')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">
              Pacientes{' '}
              <span className="text-sm font-normal text-muted-foreground">
                ({filtrados.length} de {pacientes.length})
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Padrón de {empresa.nombre_corto} — cadetes, policías, familiares y civiles.
            </p>
          </div>
          {canEdit && (
            <Button
              className="gap-2 shadow-sm"
              onClick={() => {
                setSeleccionado(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> Registrar paciente
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, cédula, unidad o dependencia..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
            />
          </div>
          <Select
            value={tipoSel}
            onValueChange={(v) => {
              setTipoSel(v)
              setPagina(1)
            }}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {TIPOS_PACIENTE.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label} ({conteoPorTipo[t.value] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={estadoSel}
            onValueChange={(v) => {
              setEstadoSel(v as typeof estadoSel)
              setPagina(1)
            }}
          >
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Cargando pacientes...</p>
        ) : visibles.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-card py-12 text-center">
            <User className="mx-auto mb-3 h-12 w-12 text-muted-foreground/60" />
            <p className="text-muted-foreground">
              {busquedaDebounced
                ? `No se encontró ningún paciente con «${busquedaDebounced}».`
                : tipoSel !== 'todos' && (conteoPorTipo[tipoSel] ?? 0) === 0
                  ? `Todavía no hay ninguna ficha de tipo «${
                      TIPOS_PACIENTE.find((t) => t.value === tipoSel)?.label ?? tipoSel
                    }». Registre la primera con el botón de abajo.`
                  : 'No se encontraron pacientes con esos filtros.'}
            </p>
            {canEdit && (
              <Button
                className="mt-4 gap-2"
                onClick={() => {
                  setSeleccionado(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="h-4 w-4" /> Registrar paciente nuevo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((p) => (
              <Card
                key={p.id}
                className={`${!p.activo ? 'bg-muted/20 opacity-60' : 'bg-card'} relative overflow-hidden transition-shadow hover:shadow-md`}
              >
                <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-primary/5 blur-xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold leading-tight text-slate-800 dark:text-slate-200">
                    {p.apellidos}, {p.nombres}
                  </CardTitle>
                  <CardDescription>CI: {p.documento || 'sin cédula'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{labelTipoPaciente(p.tipo)}</Badge>
                    {p.sexo && <Badge variant="outline">{p.sexo === 'F' ? 'F' : 'M'}</Badge>}
                    {!p.activo && <Badge variant="destructive">Inactivo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{detalle(p)}</p>

                  <div className="flex items-center justify-between border-t pt-3">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 gap-1.5 bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
                      onClick={() => navigate(`/pacientes/${p.id}`)}
                    >
                      <FolderOpen className="h-4 w-4" /> Ficha Dental
                    </Button>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar paciente"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSeleccionado(p)
                            setFormOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {puedeDarDeBaja && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={p.activo ? 'Dar de baja' : 'Reactivar'}
                          onClick={() => handleToggleActivo(p)}
                        >
                          {p.activo ? (
                            <Minus className="h-4 w-4 text-red-500" />
                          ) : (
                            <Shield className="h-4 w-4 text-emerald-500" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={paginaActual === 1}
              onClick={() => setPagina(paginaActual - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm text-muted-foreground">
              {paginaActual} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina(paginaActual + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <PacienteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        paciente={seleccionado}
        busquedaInicial={seleccionado ? undefined : busquedaDebounced}
        onCreated={(nuevo) => {
          setBusqueda('')
          toast.success('Paciente registrado con éxito. Abriendo Ficha Dental...')
          // Redirigir directamente a la ficha dental
          navigate(`/pacientes/${nuevo.id}`)
        }}
      />
    </AppLayout>
  )
}
