import type React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Shield, Stethoscope, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth, DEMO_USERS } from '@/context/auth-context'
import { useEmpresa } from '@/api/empresa'

/**
 * Traduce los errores de Supabase Auth a algo que se entienda y que diga qué
 * hacer. El mensaje crudo viene en inglés y "Email not confirmed" no le dice a
 * nadie que la cuenta existe pero le falta el clic del correo de confirmación.
 */
function mensajeErrorLogin(err: unknown): string {
  const e = err as { message?: string; code?: string } | null
  const codigo = (e as any)?.code ?? ''
  const texto = e?.message ?? ''

  if (codigo === 'email_not_confirmed' || texto.includes('Email not confirmed')) {
    return 'La cuenta existe pero el correo no está confirmado. Pedí al administrador que la confirme desde Supabase (Authentication → Users).'
  }
  if (codigo === 'invalid_credentials' || texto.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos, o la cuenta todavía no fue creada.'
  }
  if (texto.includes('Failed to fetch') || texto.includes('NetworkError')) {
    return 'No se pudo contactar al servidor. Revisá la conexión a internet.'
  }
  if (codigo === 'over_request_rate_limit' || texto.includes('rate limit')) {
    return 'Demasiados intentos seguidos. Esperá un minuto y volvé a probar.'
  }
  return texto || 'No se pudo iniciar sesión.'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()
  const empresa = useEmpresa()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(mensajeErrorLogin(err))
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoUser = (roleKey: string) => {
    const demo = DEMO_USERS[roleKey]
    if (demo) {
      setEmail(demo.email)
      setPassword('123456')
      setError(null)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-foreground">
      {/* Background visual effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />
      <div className="bg-grid-white/[0.02] absolute inset-0 bg-[size:32px_32px] opacity-30 dark:opacity-100" />

      {/* Glow Orbs */}
      <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-teal-500/10 blur-3xl" />
      <div
        className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl"
        style={{ animationDelay: '2s' }}
      />

      <Card className="relative z-10 w-full max-w-lg border border-primary/20 bg-card/90 text-card-foreground shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-2 text-center">
          {/* El logo va acá y no el nombre escrito: el fondo es oscuro, que es
              para lo que está hecho, y ya trae "MOVA DENT" en su tipografía. */}
          <CardTitle className="mb-1">
            <img
              src={empresa.logo_url || '/mova-dent-logo-transparente.png'}
              alt={empresa.nombre}
              className="mx-auto h-14 w-auto sm:h-16"
            />
          </CardTitle>

          <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Sistema Odontológico Integral
          </div>

          <CardDescription className="mt-1 text-sm text-muted-foreground">
            {empresa.nombre}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wider text-foreground"
              >
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@odonto.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-input bg-background/70 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-wider text-foreground"
                >
                  Contraseña
                </Label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs text-primary transition-colors hover:text-primary/80"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-input bg-background/70 pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-gradient-to-r from-teal-500 to-cyan-500 font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition-all duration-200 hover:from-teal-400 hover:to-cyan-400"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                  Iniciando sesión...
                </div>
              ) : (
                'Iniciar Sesión Clínica'
              )}
            </Button>
          </form>

          {/* Accesos rápidos: solo mientras se desarrolla. En el sitio publicado
              mostrarían los correos de todas las cuentas del sistema, que es
              justo lo que un desconocido necesita para empezar a probar. */}
          {import.meta.env.DEV && (
            <div className="border-t border-border pt-2">
              <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
                ⚡ Accesos Rápidos de Prueba / Demo:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fillDemoUser('medico')}
                  className="h-9 justify-start gap-2 border-border bg-background/40 text-xs text-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <Stethoscope className="h-3.5 w-3.5 text-teal-400" />
                  Odontólogo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fillDemoUser('admin')}
                  className="h-9 justify-start gap-2 border-border bg-background/40 text-xs text-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  Administrador
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fillDemoUser('recepcion')}
                  className="h-9 justify-start gap-2 border-border bg-background/40 text-xs text-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Recepción
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fillDemoUser('enfermeria')}
                  className="h-9 justify-start gap-2 border-border bg-background/40 text-xs text-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
                  Asistente Dental
                </Button>
              </div>
            </div>
          )}

          {/* Las cuentas las crea un administrador desde la pantalla de
              Usuarios: no hay registro abierto al público. */}
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              ¿No tiene cuenta? Solicítela al administrador de la clínica.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
