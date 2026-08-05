import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Activity, Shield, Stethoscope, UserCheck, Sparkles, CheckCircle2 } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth, DEMO_USERS } from "@/context/auth-context"

/**
 * Traduce los errores de Supabase Auth a algo que se entienda y que diga qué
 * hacer. El mensaje crudo viene en inglés y "Email not confirmed" no le dice a
 * nadie que la cuenta existe pero le falta el clic del correo de confirmación.
 */
function mensajeErrorLogin(err: unknown): string {
  const e = err as { message?: string; code?: string } | null
  const codigo = (e as any)?.code ?? ""
  const texto = e?.message ?? ""

  if (codigo === "email_not_confirmed" || texto.includes("Email not confirmed")) {
    return "La cuenta existe pero el correo no está confirmado. Pedí al administrador que la confirme desde Supabase (Authentication → Users)."
  }
  if (codigo === "invalid_credentials" || texto.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos, o la cuenta todavía no fue creada."
  }
  if (texto.includes("Failed to fetch") || texto.includes("NetworkError")) {
    return "No se pudo contactar al servidor. Revisá la conexión a internet."
  }
  if (codigo === "over_request_rate_limit" || texto.includes("rate limit")) {
    return "Demasiados intentos seguidos. Esperá un minuto y volvé a probar."
  }
  return texto || "No se pudo iniciar sesión."
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await login(email, password)
      navigate("/")
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
      setPassword("123456")
      setError(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900 text-slate-100">
      {/* Background visual effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/40 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />

      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

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
            Sistema Odontológico Integral
          </div>

          <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-200 via-cyan-200 to-white bg-clip-text text-transparent">
            Clínica Odontológica
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm mt-1">
            Gestión de Odontograma y Citas
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 font-medium text-xs uppercase tracking-wider">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@odonto.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500/20 h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-200 font-medium text-xs uppercase tracking-wider">
                  Contraseña
                </Label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-teal-500/20 h-11 pr-10"
                  required
                  autoComplete="current-password"
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
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold h-11 shadow-lg shadow-teal-500/20 transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Iniciando sesión...
                </div>
              ) : (
                "Iniciar Sesión Clínica"
              )}
            </Button>
          </form>

          {/* Accesos rápidos: solo mientras se desarrolla. En el sitio publicado
              mostrarían los correos de todas las cuentas del sistema, que es
              justo lo que un desconocido necesita para empezar a probar. */}
          {import.meta.env.DEV && (
          <div className="pt-2 border-t border-slate-800/80">
            <p className="text-xs text-slate-400 text-center mb-3 font-medium">
              ⚡ Accesos Rápidos de Prueba / Demo:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemoUser("medico")}
                className="bg-slate-950/40 border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 text-slate-300 hover:text-teal-300 justify-start h-9 text-xs gap-2"
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                Odontólogo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemoUser("admin")}
                className="bg-slate-950/40 border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 text-slate-300 hover:text-teal-300 justify-start h-9 text-xs gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Administrador
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemoUser("recepcion")}
                className="bg-slate-950/40 border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 text-slate-300 hover:text-teal-300 justify-start h-9 text-xs gap-2"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Recepción
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemoUser("enfermeria")}
                className="bg-slate-950/40 border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 text-slate-300 hover:text-teal-300 justify-start h-9 text-xs gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                Asistente Dental
              </Button>
            </div>
          </div>
          )}

          {/* Las cuentas las crea un administrador desde la pantalla de
              Usuarios: no hay registro abierto al público. */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              ¿No tiene cuenta? Solicítela al administrador de la clínica.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
