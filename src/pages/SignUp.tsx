import type React from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, Eye, EyeOff, Sparkles } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [repeatPasswordError, setRepeatPasswordError] = useState<string | null>(null)
  const navigate = useNavigate()

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (!validateEmail(e.target.value)) {
      setEmailError("Correo electrónico inválido")
    } else {
      setEmailError(null)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (e.target.value.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres")
    } else {
      setPasswordError(null)
    }
    if (repeatPassword && e.target.value !== repeatPassword) {
      setRepeatPasswordError("Las contraseñas no coinciden")
    } else {
      setRepeatPasswordError(null)
    }
  }

  const handleRepeatPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepeatPassword(e.target.value)
    if (password !== e.target.value) {
      setRepeatPasswordError("Las contraseñas no coinciden")
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
      setError("Por favor corrige los errores antes de continuar.")
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
      navigate("/auth/sign-up-success")
    } catch (error: unknown) {
      let errorMessage = "Ocurrió un error al registrar el usuario"
      if (typeof error === "object" && error !== null && "message" in error && typeof (error as any).message === "string") {
        errorMessage = (error as any).message
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/40 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />

      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />

      <Card className="w-full max-w-lg relative z-10 bg-slate-900/80 backdrop-blur-xl border border-teal-500/20 shadow-2xl shadow-teal-950/50">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-teal-500/30">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Activity className="w-8 h-8 text-teal-400" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-2 mx-auto">
            <Sparkles className="w-3.5 h-3.5" />
            Registro de Personal Clínico
          </div>

          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-200 via-cyan-200 to-white bg-clip-text text-transparent">
            Crear Cuenta de Usuario
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm mt-1">
            Sanidad ISEPOL — Clínica Odontológica
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 font-medium text-xs uppercase tracking-wider">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@odonto.com"
                value={email}
                onChange={handleEmailChange}
                className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500/20 h-11"
                required
                autoComplete="email"
              />
              {emailError && <p className="text-xs text-red-400">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200 font-medium text-xs uppercase tracking-wider">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500/20 h-11 pr-10"
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-200 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="repeat-password" className="text-slate-200 font-medium text-xs uppercase tracking-wider">
                Repetir Contraseña
              </Label>
              <Input
                id="repeat-password"
                type="password"
                placeholder="••••••••"
                value={repeatPassword}
                onChange={handleRepeatPasswordChange}
                className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500/20 h-11"
                required
                autoComplete="new-password"
              />
              {repeatPasswordError && <p className="text-xs text-red-400">{repeatPasswordError}</p>}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold h-11 shadow-lg shadow-teal-500/20 transition-all duration-200"
              disabled={isLoading || !validateForm()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Creando cuenta...
                </div>
              ) : (
                "Crear Cuenta"
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              ¿Ya tienes cuenta?{" "}
              <Link to="/auth/login" className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-4">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
