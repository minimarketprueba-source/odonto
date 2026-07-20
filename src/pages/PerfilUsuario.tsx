import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, Phone, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { useMiMedico } from "@/api/citas";
import { updateMedico } from "@/api/mantenimiento";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

export default function PerfilUsuario() {
  const { user, role } = useAuth();
  const { data: miMedico } = useMiMedico(user?.id);
  const queryClient = useQueryClient();

  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [guardandoPass, setGuardandoPass] = useState(false);

  const [telefono, setTelefono] = useState("");
  const [guardandoTel, setGuardandoTel] = useState(false);

  useEffect(() => {
    if (miMedico) setTelefono((miMedico as { telefono?: string | null }).telefono ?? "");
  }, [miMedico]);

  const cambiarPassword = async () => {
    if (pass1.length < 6) { toast.error("La contraseña nueva debe tener al menos 6 caracteres."); return; }
    if (pass1 !== pass2) { toast.error("Las contraseñas no coinciden."); return; }
    setGuardandoPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass1 });
      if (error) throw new Error(error.message);
      setPass1("");
      setPass2("");
      toast.success("Contraseña cambiada. Úsela desde su próximo ingreso.");
    } catch (e) {
      toast.error(`No se pudo cambiar la contraseña: ${(e as Error).message}`);
    } finally {
      setGuardandoPass(false);
    }
  };

  const guardarTelefono = async () => {
    if (!miMedico) return;
    setGuardandoTel(true);
    try {
      await updateMedico(miMedico.id, { telefono: telefono.trim() || null });
      queryClient.invalidateQueries({ queryKey: queryKeys.medicos.all });
      toast.success("Teléfono actualizado en su ficha.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardandoTel(false);
    }
  };

  const rolLabel =
    role === "admin" ? "Administrador" : role === "medico" ? "Profesional de salud" : role === "recepcion" ? "Recepción / Enfermería" : role ?? "—";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="w-6 h-6 text-primary" /> Mi perfil
            </CardTitle>
            <CardDescription>Sus datos de acceso y su ficha en la Sanidad.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Usuario:</span> <span className="font-medium">{user?.email ?? "—"}</span></p>
            <p><span className="text-muted-foreground">Rol:</span> <span className="font-medium">{rolLabel}</span></p>
            {miMedico && (
              <p>
                <span className="text-muted-foreground">Mi ficha:</span>{" "}
                <span className="font-medium">
                  {miMedico.apellidos}, {miMedico.nombres}
                  {miMedico.especialidad ? ` — ${miMedico.especialidad.nombre}` : ""}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {miMedico && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="w-5 h-5 text-primary" /> Teléfono de contacto
              </CardTitle>
              <CardDescription>Aparece en su ficha de profesional.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                placeholder="Ej: 0981-123456"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={guardarTelefono} disabled={guardandoTel}>
                {guardandoTel ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-5 h-5 text-primary" /> Cambiar mi contraseña
            </CardTitle>
            <CardDescription>
              Elija una contraseña que solo usted conozca. Mínimo 6 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="p-pass1">Contraseña nueva</Label>
              <Input id="p-pass1" type="password" value={pass1} onChange={(e) => setPass1(e.target.value)} className="max-w-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-pass2">Repetir contraseña nueva</Label>
              <Input id="p-pass2" type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} className="max-w-xs" />
            </div>
            <Button onClick={cambiarPassword} disabled={guardandoPass || !pass1 || !pass2}>
              {guardandoPass
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                : "Cambiar contraseña"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
