import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building2, Plus, ShieldCheck, UserPlus, Users, Settings, LogIn, Loader2, CheckCircle2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { useCrearEmpresa, useDarAdministrador, useEmpresasDelSistema, useIngresosDueno, entrarAEmpresa, type EmpresaDelSistema } from '@/api/empresas'
import Swal from 'sweetalert2'
import { ModalEditarEmpresa } from '@/components/empresas/ModalEditarEmpresa'

// Solo para el dueño del sistema (la ruta lo exige). Acá se crean empresas, se
// configuran sus logos/datos de marca y se les da administrador.

const VACIO = { nombre: '', nombreCorto: '', adminEmail: '', adminPassword: '' }

export default function Empresas() {
  const { empresas: misEmpresas, esDueno } = useAuth()
  const { data: empresas = [], isLoading, error } = useEmpresasDelSistema()
  const crear = useCrearEmpresa()
  const darAdmin = useDarAdministrador()

  const [form, setForm] = useState(VACIO)
  const [paraAdmin, setParaAdmin] = useState<EmpresaDelSistema | null>(null)
  const [paraEditar, setParaEditar] = useState<EmpresaDelSistema | null>(null)
  const [entrandoId, setEntrandoId] = useState<string | null>(null)
  // Cuáles consultorios ya usó el dueño (entra a cada uno una sola vez).
  const { data: ingresos = [] } = useIngresosDueno(esDueno)
  const ingresoDe = (clinicaId: string) => ingresos.find((i) => i.clinica_id === clinicaId)
  const esMiembro = (clinicaId: string) => misEmpresas.some((m) => m.clinica_id === clinicaId)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const idEmpresaActiva = misEmpresas.find((e) => e.activa)?.clinica_id

  const enviarNueva = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.adminEmail.trim()) {
      toast.error('Faltan el nombre de la empresa y el correo de su administrador.')
      return
    }
    try {
      const r = await crear.mutateAsync({
        nombre: form.nombre,
        nombreCorto: form.nombreCorto,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword || undefined,
      })
      if (r.adminError) {
        toast.warning(`Empresa creada, pero sin administrador: ${r.adminError}`, { duration: 10000 })
      } else {
        toast.success(
          r.existente
            ? `Empresa creada. ${form.adminEmail} ya tenía cuenta: entra con su contraseña de siempre.`
            : `Empresa creada con su administrador ${form.adminEmail}.`
        )
      }
      setForm(VACIO)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la empresa.')
    }
  }

  const enviarAdmin = async () => {
    if (!paraAdmin) return
    try {
      const r = await darAdmin.mutateAsync({
        clinicaId: paraAdmin.clinica_id,
        email: adminEmail,
        password: adminPassword || undefined,
      })
      toast.success(
        r.existente
          ? `${adminEmail} ahora es administrador de ${paraAdmin.nombre_corto} (con su contraseña de siempre).`
          : `Cuenta creada: ${adminEmail} es administrador de ${paraAdmin.nombre_corto}.`
      )
      setParaAdmin(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo dar el administrador.')
    }
  }

  const handleEntrarEmpresa = async (empresa: EmpresaDelSistema) => {
    // Si ya es miembro (entró antes), solo se cambia de consultorio: no se pregunta.
    if (!esMiembro(empresa.clinica_id)) {
      const respuesta = await Swal.fire({
        icon: 'warning',
        title: `¿Entrar a ${empresa.nombre_corto || empresa.nombre}?`,
        html:
          'Va a quedar como <b>administrador</b> de este consultorio, y va a ver todo, ' +
          'incluidos los pacientes.<br><br>' +
          'Puede usar este botón <b>una sola vez</b> por consultorio: si después el ' +
          'administrador del consultorio lo saca, no podrá volver a entrar solo.',
        showCancelButton: true,
        confirmButtonText: 'Entrar ahora',
        cancelButtonText: 'Cancelar',
        focusCancel: true,
      })
      if (!respuesta.isConfirmed) return
    }
    const clinicaId = empresa.clinica_id
    setEntrandoId(clinicaId)
    try {
      await entrarAEmpresa(clinicaId)
    } catch (err) {
      setEntrandoId(null)
      toast.error(err instanceof Error ? err.message : 'No se pudo ingresar a la empresa.')
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-2.5 border-b border-border/60 pb-5">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Empresas</h1>
            <p className="text-xs text-muted-foreground">
              Consultorios y empresas que usan el sistema. Puedes personalizar sus logos, membretes,
              colores y entrar a gestionar cada una.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> Nueva empresa
            </CardTitle>
            <CardDescription>
              Arranca con especialidades y un sillón cargados. Una vez creada podrás personalizar su
              logo, aranceles y resto del personal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviarNueva} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-nombre">Nombre completo *</Label>
                <Input id="e-nombre" value={form.nombre} placeholder="CONSULTORIO ODONTOLÓGICO SONRISAS"
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-corto">Nombre corto</Label>
                <Input id="e-corto" value={form.nombreCorto} placeholder="Sonrisas"
                  onChange={(e) => setForm({ ...form, nombreCorto: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-admin">Correo del administrador *</Label>
                <Input id="e-admin" type="email" value={form.adminEmail} placeholder="dra@sonrisas.com"
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-pass">Contraseña inicial</Label>
                <Input id="e-pass" type="password" value={form.adminPassword} autoComplete="new-password"
                  placeholder="Vacía si ya tiene cuenta en otra empresa"
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={crear.isPending} className="gap-2">
                  <Building2 className="h-4 w-4" /> {crear.isPending ? 'Creando…' : 'Crear empresa'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Empresas registradas ({empresas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Cargando empresas…</p>}
            {error && (
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : 'No se pudieron cargar las empresas.'}
              </p>
            )}
            {empresas.map((e) => {
              const esActiva = e.clinica_id === idEmpresaActiva
              const imagenMarca = e.icono_url || e.logo_url
              const ingreso = ingresoDe(e.clinica_id)
              // Usó su ingreso y hoy no es miembro (lo sacaron): ya no puede entrar.
              const ingresoUsado = !!ingreso && !esMiembro(e.clinica_id)

              return (
                <div
                  key={e.clinica_id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                    esActiva ? 'border-primary/50 bg-primary/[0.03] shadow-sm' : 'hover:border-border'
                  }`}
                >
                  {/* Identidad de la empresa */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-slate-900 shadow-sm"
                      style={{ borderColor: e.color_primario || '#334155' }}
                    >
                      {imagenMarca ? (
                        <img
                          src={imagenMarca}
                          alt={e.nombre_corto}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-base font-extrabold text-white"
                          style={{ color: e.color_primario || '#38bdf8' }}
                        >
                          {e.nombre_corto?.charAt(0) || 'C'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-foreground">{e.nombre_corto}</p>
                        {esActiva && (
                          <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> Empresa Activa
                          </Badge>
                        )}
                        {e.ruc && (
                          <Badge variant="outline" className="text-[11px] font-mono">
                            RUC: {e.ruc}
                          </Badge>
                        )}
                      </div>

                      <p className="truncate text-xs text-muted-foreground">{e.nombre}</p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          {e.administradores || <span className="text-amber-600">Sin administrador</span>}
                        </span>
                        {e.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {e.telefono}
                          </span>
                        )}
                        <span>{e.personas} {Number(e.personas) === 1 ? 'persona' : 'personas'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                    {/* Botón Entrar: una sola vez por consultorio (la base lo hace cumplir). */}
                    {ingresoUsado ? (
                      <span
                        className="rounded-md border border-dashed px-2.5 py-1 text-xs text-muted-foreground"
                        title="El dueño del sistema entra a cada consultorio una sola vez."
                      >
                        Ingreso usado el {new Date(ingreso!.entro_at).toLocaleDateString('es-PY')}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={esActiva ? 'secondary' : 'default'}
                        disabled={esActiva || entrandoId === e.clinica_id}
                        className="gap-1.5"
                        onClick={() => handleEntrarEmpresa(e)}
                      >
                        {entrandoId === e.clinica_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogIn className="h-3.5 w-3.5" />
                        )}
                        {esActiva ? 'Adentro ahora' : esMiembro(e.clinica_id) ? 'Ir al consultorio' : 'Entrar (una vez)'}
                      </Button>
                    )}

                    {/* Botón Editar datos y logos */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setParaEditar(e)}
                    >
                      <Settings className="h-3.5 w-3.5" /> Logos y Datos
                    </Button>

                    {/* Botón Dar administrador */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-xs"
                      onClick={() => {
                        setParaAdmin(e)
                        setAdminEmail('')
                        setAdminPassword('')
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Asignar admin
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Modal para editar datos y logos de la empresa */}
      <ModalEditarEmpresa
        empresa={paraEditar}
        open={!!paraEditar}
        onOpenChange={(abierto) => !abierto && setParaEditar(null)}
      />

      {/* Modal para asignar administrador */}
      <Dialog open={!!paraAdmin} onOpenChange={(abierto) => !abierto && setParaAdmin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Administrador de {paraAdmin?.nombre_corto}</DialogTitle>
            <DialogDescription>
              Si la persona ya tiene cuenta (trabaja en otra empresa), dejá la contraseña vacía: se la
              suma con la suya. Si no tiene, poné una contraseña inicial para crearla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="d-email">Correo</Label>
              <Input id="d-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-pass">Contraseña inicial (opcional)</Label>
              <Input id="d-pass" type="password" autoComplete="new-password" value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParaAdmin(null)}>Cancelar</Button>
            <Button onClick={enviarAdmin} disabled={darAdmin.isPending || !adminEmail.trim()}>
              {darAdmin.isPending ? 'Guardando…' : 'Dar administrador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
