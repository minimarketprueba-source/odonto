import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IdCard, KeyRound, Loader2, Phone, UserCircle2 } from "lucide-react";
import { showSwalSuccess, showSwalError } from "@/lib/swal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { useMiMedico } from "@/api/citas";
import { usePerfilProfesional, guardarPerfilPropio } from "@/api/perfil";
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

  // Nombre y registro profesional propios: prellenan "quién atiende" y la
  // firma de la constancia. Los médicos los toman de su ficha; enfermería y
  // admin los cargan acá.
  const { data: perfilProf } = usePerfilProfesional(user);
  const nombrePerfil = perfilProf?.nombre ?? null;
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [registro, setRegistro] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  // Registro profesional del médico (va a su ficha, como el teléfono).
  const [registroMedico, setRegistroMedico] = useState("");
  const [guardandoRegMed, setGuardandoRegMed] = useState(false);

  useEffect(() => {
    if (!miMedico && nombrePerfil) {
      const partes = nombrePerfil.split(/\s+/);
      setNombre((prev) => prev || partes.slice(0, Math.ceil(partes.length / 2)).join(" "));
      setApellido((prev) => prev || partes.slice(Math.ceil(partes.length / 2)).join(" "));
    }
    if (!miMedico) setRegistro((prev) => prev || perfilProf?.registro || "");
    if (miMedico) setRegistroMedico((prev) => prev || perfilProf?.registro || "");
  }, [miMedico, nombrePerfil, perfilProf?.registro]);

  const guardarRegistroMedico = async () => {
    if (!miMedico) return;
    setGuardandoRegMed(true);
    try {
      await updateMedico(miMedico.id, { numero_colegiatura: registroMedico.trim() || null });
      queryClient.invalidateQueries({ queryKey: queryKeys.medicos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.perfil.all });
      await showSwalSuccess("Número de registro profesional guardado en su ficha.");
    } catch (e) {
      await showSwalError((e as Error).message);
    } finally {
      setGuardandoRegMed(false);
    }
  };

  const guardarNombre = async () => {
    if (!user?.id) return;
    if (!nombre.trim() || !apellido.trim()) {
      await showSwalError("Complete nombre y apellido.");
      return;
    }
    setGuardandoNombre(true);
    try {
      await guardarPerfilPropio(user.id, nombre, apellido, registro);
      queryClient.invalidateQueries({ queryKey: queryKeys.perfil.all });
      await showSwalSuccess(
        `Datos guardados: ${nombre.trim()} ${apellido.trim()}` +
          (registro.trim() ? ` — Reg. Prof. N° ${registro.trim()}` : "") +
          ". Van a aparecer prellenados al registrar atenciones."
      );
    } catch (e) {
      await showSwalError((e as Error).message);
    } finally {
      setGuardandoNombre(false);
    }
  };

  useEffect(() => {
    if (miMedico) setTelefono((miMedico as { telefono?: string | null }).telefono ?? "");
  }, [miMedico]);

  const cambiarPassword = async () => {
    if (pass1.length < 6) { await showSwalError("La contraseña nueva debe tener al menos 6 caracteres."); return; }
    if (pass1 !== pass2) { await showSwalError("Las contraseñas no coinciden."); return; }
    setGuardandoPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass1 });
      if (error) throw new Error(error.message);
      setPass1("");
      setPass2("");
      await showSwalSuccess("Contraseña cambiada correctamente. Úsela desde su próximo ingreso.");
    } catch (e) {
      await showSwalError(`No se pudo cambiar la contraseña: ${(e as Error).message}`);
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
      await showSwalSuccess("Teléfono actualizado en su ficha.");
    } catch (e) {
      await showSwalError((e as Error).message);
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
          <CardContent className="space-y-2 text-sm break-words">
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

        {/* Los médicos ya tienen su nombre en la ficha; el resto lo carga acá. */}
        {!miMedico && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IdCard className="w-5 h-5 text-primary" /> Mi nombre y apellido
              </CardTitle>
              <CardDescription>
                Se usa para prellenar «quién atiende» al registrar atenciones de enfermería.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                <div className="space-y-1">
                  <Label htmlFor="p-nombre">Nombre</Label>
                  <Input id="p-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-apellido">Apellido</Label>
                  <Input id="p-apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="p-registro">N° de registro profesional (opcional)</Label>
                  <Input
                    id="p-registro" placeholder="Ej: 12345" value={registro}
                    onChange={(e) => setRegistro(e.target.value)} className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sale junto a su firma en las constancias de enfermería.
                  </p>
                </div>
              </div>
              <Button onClick={guardarNombre} disabled={guardandoNombre || !nombre.trim() || !apellido.trim()}>
                {guardandoNombre ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar nombre
              </Button>
            </CardContent>
          </Card>
        )}

        {miMedico && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="w-5 h-5 text-primary" /> Mi ficha de profesional
              </CardTitle>
              <CardDescription>El teléfono y el registro aparecen en su ficha y en los documentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="p-telefono">Teléfono de contacto</Label>
                <div className="flex gap-2">
                  <Input
                    id="p-telefono"
                    placeholder="Ej: 0981-123456"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button onClick={guardarTelefono} disabled={guardandoTel}>
                    {guardandoTel ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-reg-medico">N° de registro profesional</Label>
                <div className="flex gap-2">
                  <Input
                    id="p-reg-medico"
                    placeholder="Ej: 12345"
                    value={registroMedico}
                    onChange={(e) => setRegistroMedico(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button onClick={guardarRegistroMedico} disabled={guardandoRegMed}>
                    {guardandoRegMed ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                  </Button>
                </div>
              </div>
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
