import type React from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trophy, Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // const [formTouched, setFormTouched] = useState(false); // Eliminado: no se usa
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [repeatPasswordError, setRepeatPasswordError] = useState<string | null>(null);
  const navigate = useNavigate()

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validaciones en tiempo real
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (!validateEmail(e.target.value)) {
      setEmailError("Correo electrónico inválido");
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (e.target.value.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
    } else {
      setPasswordError(null);
    }
    // También validar coincidencia de contraseñas
    if (repeatPassword && e.target.value !== repeatPassword) {
      setRepeatPasswordError("Las contraseñas no coinciden");
    } else {
      setRepeatPasswordError(null);
    }
  };

  const handleRepeatPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepeatPassword(e.target.value);
    if (password !== e.target.value) {
      setRepeatPasswordError("Las contraseñas no coinciden");
    } else {
      setRepeatPasswordError(null);
    }
  };

  const validateForm = () => {
    if (!validateEmail(email)) return false;
    if (password.length < 6) return false;
    if (password !== repeatPassword) return false;
    if (emailError || passwordError || repeatPasswordError) return false;
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) {
      setError("Por favor corrige los errores antes de continuar.");
      return;
    }
    // Validar datos antes de enviar
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      navigate("/auth/sign-up-success");
    } catch (error: unknown) {
      let errorMessage = "Ocurrió un error";
      if (typeof error === "object" && error !== null && "message" in error && typeof (error as any).message === "string") {
        errorMessage = (error as any).message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-bl from-cyan-400/10 via-slate-50 to-blue-500/10" />
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/5 via-transparent to-cyan-500/5" />

      {/* Floating elements */}
      <div className="absolute top-32 right-32 w-64 h-64 bg-cyan-400/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-32 left-32 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-cyan-500/3 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}} />

      <Card className="w-full max-w-md relative z-10 bg-card/80 backdrop-blur-md border border-border/50 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-accent/20">
              <Trophy className="w-8 h-8 text-primary-foreground drop-shadow-sm" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Crear Cuenta
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Regístrate para gestionar tus ligas deportivas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={handleEmailChange}
                className={`text-foreground placeholder:text-muted-foreground bg-background/50 ${emailError ? 'border-destructive' : ''}`}
                required
                autoComplete="email"
              />
              {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`text-foreground placeholder:text-muted-foreground bg-background/50 ${passwordError ? 'border-destructive' : ''}`}
                  required
                  autoComplete="new-password"
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
              {passwordError && <p className="text-xs text-destructive mt-1">{passwordError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeat-password" className="text-foreground font-medium">Repetir Contraseña</Label>
              <Input
                id="repeat-password"
                type="password"
                placeholder="••••••••"
                value={repeatPassword}
                onChange={handleRepeatPasswordChange}
                className={`text-foreground placeholder:text-muted-foreground bg-background/50 ${repeatPasswordError ? 'border-destructive' : ''}`}
                required
                autoComplete="new-password"
              />
              {repeatPasswordError && <p className="text-xs text-destructive mt-1">{repeatPasswordError}</p>}
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-primary-foreground font-semibold py-3 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              disabled={isLoading || !validateForm()}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando cuenta...
                </div>
              ) : (
                "Crear Cuenta"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/auth/login"
                className="font-medium text-blue-600 hover:text-cyan-500 transition-colors duration-200 underline underline-offset-4"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
