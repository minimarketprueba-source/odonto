import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useAuth } from "@/context/auth-context"

// Helper para obtener la ruta correcta del logo
const getLogoPath = () => {
  // En Electron, usar ruta relativa al index.html
  if (typeof window !== 'undefined' && (window as any).electron) {
    return './favicon.png';
  }
  // En web, usar ruta absoluta
  return '/favicon.png';
};

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
      await login(email, password);
      navigate("/");
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        setError((error as any).message);
      } else {
        setError(error instanceof Error ? error.message : "An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-slate-50 to-cyan-400/10" />
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/5 via-transparent to-cyan-500/5" />

      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/3 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}} />

      <Card className="w-full max-w-md relative z-10 bg-card/80 backdrop-blur-md border border-border/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-blue-500/20 overflow-hidden">
              <img src={getLogoPath()} alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Sistema de Gestión Antropométrica
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Ingresa a tu cuenta para gestionar datos antropométricos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-foreground placeholder:text-muted-foreground bg-background/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-foreground placeholder:text-muted-foreground bg-background/50"
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-primary-foreground font-semibold py-3 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </div>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              <Link
                to="/auth/forgot-password"
                className="font-medium text-blue-600 hover:text-cyan-500 transition-colors duration-200 underline underline-offset-4"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link
                to="/auth/sign-up"
                className="font-medium text-blue-600 hover:text-cyan-500 transition-colors duration-200 underline underline-offset-4"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
