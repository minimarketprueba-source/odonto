import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building2, Plus, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useCrearEmpresa, useDarAdministrador, useEmpresasDelSistema, type EmpresaDelSistema } from '@/api/empresas'
import { formatDateDisplay } from '@/lib/utils'

// Solo para el dueño del sistema (la ruta lo exige). Acá se crean empresas y se
// les da administrador; desde acá NO se ven pacientes de ninguna.

const VACIO = { nombre: '', nombreCorto: '', adminEmail: '', adminPassword: '' }

export default function Empresas() {
  const { data: empresas = [], isLoading, error } = useEmpresasDelSistema()
  const crear = useCrearEmpresa()
  const darAdmin = useDarAdministrador()

  const [form, setForm] = useState(VACIO)
  const [paraAdmin, setParaAdmin] = useState<EmpresaDelSistema | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

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

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-2.5 border-b border-border/60 pb-5">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
            <p className="text-xs text-muted-foreground">
              Los consultorios que usan el sistema. Cada uno ve solo sus pacientes; desde acá no se
              ve ninguna ficha clínica.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> Nueva empresa
            </CardTitle>
            <CardDescription>
              Arranca con las especialidades y un sillón cargados. Su administrador carga después los
              datos del consultorio, los precios y al resto del personal.
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
              <Users className="h-4 w-4" /> Empresas en el sistema ({empresas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
            {error && (
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : 'No se pudieron cargar las empresas.'}
              </p>
            )}
            {empresas.map((e) => (
              <div key={e.clinica_id}
                className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{e.nombre_corto}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.nombre}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    {e.administradores || <span className="text-amber-600">Sin administrador</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{e.personas} {Number(e.personas) === 1 ? 'persona' : 'personas'}</span>
                  {e.created_at && <span>desde {formatDateDisplay(e.created_at.slice(0, 10), 'es-PY')}</span>}
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => { setParaAdmin(e); setAdminEmail(''); setAdminPassword('') }}>
                    <UserPlus className="h-3.5 w-3.5" /> Dar administrador
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

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
