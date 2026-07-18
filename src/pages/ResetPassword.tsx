import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Contraseña actualizada correctamente. Ahora puedes iniciar sesión.");
      setTimeout(() => navigate("/auth/login"), 2000);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>Ingresa tu nueva contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeat-password">Repetir contraseña</Label>
              <Input
                id="repeat-password"
                type="password"
                value={repeatPassword}
                onChange={e => setRepeatPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {error && <div className="text-destructive text-sm">{error}</div>}
            {message && <div className="text-green-600 text-sm">{message}</div>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/auth/login" className="text-blue-600 underline">Volver al login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
