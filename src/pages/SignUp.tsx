import type React from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useEmpresa } from '@/api/empresa'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [repeatPasswordError, setRepeatPasswordError] = useState<string | null>(null)
  const navigate = useNavigate()
  const empresa = useEmpresa()

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (!validateEmail(e.target.value)) {
      setEmailError('Correo electrónico inválido')
    } else {
      setEmailError(null)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (e.target.value.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres')
    } else {
      setPasswordError(null)
    }
    if (repeatPassword && e.target.value !== repeatPassword) {
      setRepeatPasswordError('Las contraseñas no coinciden')
    } else {
      setRepeatPasswordError(null)
    }
  }

  const handleRepeatPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepeatPassword(e.target.value)
    if (password !== e.target.value) {
      setRepeatPasswordError('Las contraseñas no coinciden')
    } else {
      setRepeatPasswordError(null)
    }
  }

  const validateForm = () => {
    if (!validateEmail(email)) return false
    if (password.length < 6) return false
    if (password !== repeatPassword) return false
    if (emailError || passwordError || repeatPasswordError) return false
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validateForm()) {
      setError('Por favor corrige los errores antes de continuar.')
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      navigate('/auth/sign-up-success')
    } catch (error: unknown) {
      let errorMessage = 'Ocurrió un error al registrar el usuario'
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as any).message === 'string'
      ) {
        errorMessage = (error as any).message
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />
      <div className="bg-grid-white/[0.02] absolute inset-0 bg-[size:32px_32px] opacity-30 dark:opacity-100" />

      <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl" />

      <Card className="relative z-10 w-full max-w-lg border border-primary/20 bg-card/90 text-card-foreground shadow-2xl backdrop-blur-xl">
        <CardHeader className="pb-2 text-center">
          <div className="mb-3 flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-teal-500/30">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-card">
                <Activity className="h-8 w-8 text-teal-400" />
              </div>
            </div>
          </div>

          <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Registro de Personal Clínico
          </div>

          <CardTitle className="bg-gradient-to-r from-primary via-cyan-500 to-foreground bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl">
            Crear Cuenta de Usuario
          </CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            {empresa.nombre}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wider text-foreground"
              >
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@odonto.com"
                value={email}
                onChange={handleEmailChange}
                className="h-11 border-input bg-background/70 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                required
                autoComplete="email"
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wider text-foreground"
              >
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className="h-11 border-input bg-background/70 pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                  required
                  autoComplete="new-password"
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
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="repeat-password"
                className="text-xs font-medium uppercase tracking-wider text-foreground"
              >
                Repetir Contraseña
              </Label>
              <Input
                id="repeat-password"
                type="password"
                placeholder="••••••••"
                value={repeatPassword}
                onChange={handleRepeatPasswordChange}
                className="h-11 border-input bg-background/70 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                required
                autoComplete="new-password"
              />
              {repeatPasswordError && (
                <p className="text-xs text-destructive">{repeatPasswordError}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-gradient-to-r from-teal-500 to-cyan-500 font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition-all duration-200 hover:from-teal-400 hover:to-cyan-400"
              disabled={isLoading || !validateForm()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                  Creando cuenta...
                </div>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          <div className="border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link
                to="/auth/login"
                className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
