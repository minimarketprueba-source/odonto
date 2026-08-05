import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IdCard, KeyRound, Loader2, UserCircle2, Mail } from "lucide-react";
import { showSwalSuccess, showSwalError } from "@/lib/swal";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { useMiMedico } from "@/api/citas";
import { usePerfilProfesional, guardarPerfilPropio, cambiarCorreoPropio } from "@/api/perfil";
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

  // Teléfono de la cuenta, para quien no tiene ficha de odontólogo (admin y
  // recepción): sin esto no había forma de cargar un contacto propio.
  const [telefonoPerfil, setTelefonoPerfil] = useState("");

  const [correoNuevo, setCorreoNuevo] = useState("");
  const [guardandoCorreo, setGuardandoCorreo] = useState(false);

  // Nombre y registro profesional propios: es con lo que queda firmado lo que
  // registre. Los odontólogos los toman de su ficha; el resto los carga acá.
  const { data: perfilProf } = usePerfilProfesional(user);
  const nombrePerfil = perfilProf?.nombre ?? null;
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [registro, setRegistro] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  // Datos de ficha de profesional médico
  const [nombreMedico, setNombreMedico] = useState("");
  const [apellidoMedico, setApellidoMedico] = useState("");
  const [registroMedico, setRegistroMedico] = useState("");
  const [guardandoFichaMedica, setGuardandoFichaMedica] = useState(false);

  useEffect(() => {
    if (!miMedico && nombrePerfil) {
      const partes = nombrePerfil.split(/\s+/);
      setNombre((prev) => prev || partes.slice(0, Math.ceil(partes.length / 2)).join(" "));
      setApellido((prev) => prev || partes.slice(Math.ceil(partes.length / 2)).join(" "));
    }
    if (!miMedico) {
      setRegistro((prev) => prev || perfilProf?.registro || "");
      setTelefonoPerfil((prev) => prev || perfilProf?.telefono || "");
    }
    if (miMedico) {
      setNombreMedico((prev) => prev || miMedico.nombres || "");
      setApellidoMedico((prev) => prev || miMedico.apellidos || "");
      setRegistroMedico((prev) => prev || (miMedico as any).numero_colegiatura || perfilProf?.registro || "");
    }
  }, [miMedico, nombrePerfil, perfilProf?.registro]);

  const guardarFichaMedico = async () => {
    if (!miMedico) return;
    if (!nombreMedico.trim() || !apellidoMedico.trim()) {
      await showSwalError("Debe ingresar su nombre y apellido.");
      return;
    }
    setGuardandoFichaMedica(true);
    try {
      await updateMedico(miMedico.id, {
        nombres: nombreMedico.trim(),
        apellidos: apellidoMedico.trim(),
        telefono: telefono.trim() || null,
        numero_colegiatura: registroMedico.trim() || null,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.medicos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.citas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.perfil.all });
      await showSwalSuccess(`Ficha de profesional actualizada: ${nombreMedico.trim()} ${apellidoMedico.trim()}`);
    } catch (e) {
      await showSwalError((e as Error).message);
    } finally {
      setGuardandoFichaMedica(false);
    }
  };

  const cambiarCorreo = async () => {
    setGuardandoCorreo(true);
    try {
      await cambiarCorreoPropio(correoNuevo);
      setCorreoNuevo("");
      await showSwalSuccess(
        "Le enviamos un enlace de confirmación al correo nuevo. Ábralo desde ese " +
          "correo para terminar el cambio. Mientras tanto, siga entrando con el actual."
      );
    } catch (e) {
      await showSwalError((e as Error).message);
    } finally {
      setGuardandoCorreo(false);
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
      await guardarPerfilPropio(user.id, nombre, apellido, registro, telefonoPerfil);
      queryClient.invalidateQueries({ queryKey: queryKeys.perfil.all });
      await showSwalSuccess(
        `Datos guardados: ${nombre.trim()} ${apellido.trim()}` +
          (registro.trim() ? ` — Reg. Prof. N° ${registro.trim()}` : "") +
          "."
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



  const esAdmin = role === "admin" || role === "superadmin" || role === "super_admin";

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
            <CardDescription>Sus datos de acceso y su ficha profesional.</CardDescription>
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
                <IdCard className="w-5 h-5 text-primary" /> Mis datos personales
              </CardTitle>
              <CardDescription>
                Es el nombre con el que queda firmado lo que registre en el sistema.
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
                    Sale junto a su firma en los documentos que emita.
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="p-telefono-perfil">Teléfono de contacto</Label>
                  <Input
                    id="p-telefono-perfil"
                    placeholder="Ej: 0981 123456"
                    value={telefonoPerfil}
                    onChange={(e) => setTelefonoPerfil(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              </div>
              <Button onClick={guardarNombre} disabled={guardandoNombre || !nombre.trim() || !apellido.trim()}>
                {guardandoNombre ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar mis datos
              </Button>
            </CardContent>
          </Card>
        )}

        {miMedico && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IdCard className="w-5 h-5 text-primary" /> Mi ficha de profesional
              </CardTitle>
              <CardDescription>
                El teléfono de contacto y número de registro profesional aparecen en su ficha y en los documentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                <div className="space-y-1">
                  <Label htmlFor="pm-nombre" className="text-xs">Nombre(s)</Label>
                  <Input
                    id="pm-nombre"
                    value={nombreMedico}
                    disabled={!esAdmin}
                    onChange={(e) => setNombreMedico(e.target.value)}
                    className={!esAdmin ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pm-apellido" className="text-xs">Apellido(s)</Label>
                  <Input
                    id="pm-apellido"
                    value={apellidoMedico}
                    disabled={!esAdmin}
                    onChange={(e) => setApellidoMedico(e.target.value)}
                    className={!esAdmin ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
                  />
                </div>
                {!esAdmin && (
                  <p className="text-[11px] text-muted-foreground sm:col-span-2 italic">
                    ℹ️ Los nombres y apellidos oficiales de los profesionales solo pueden ser modificados por el Administrador desde la pantalla de Mantenimiento.
                  </p>
                )}
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="p-telefono" className="text-xs">Teléfono de contacto</Label>
                  <Input
                    id="p-telefono"
                    placeholder="Ej: 0981-123456"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="p-reg-medico" className="text-xs">N° de registro profesional (Colegiatura)</Label>
                  <Input
                    id="p-reg-medico"
                    placeholder="Ej: 12345"
                    value={registroMedico}
                    onChange={(e) => setRegistroMedico(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={guardarFichaMedico} disabled={guardandoFichaMedica || !nombreMedico.trim() || !apellidoMedico.trim()}>
                {guardandoFichaMedica ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar datos de mi ficha
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-5 h-5 text-primary" /> Cambiar mi correo
            </CardTitle>
            <CardDescription>
              Es el correo con el que entra al sistema. Le va a llegar un enlace al correo
              nuevo para confirmarlo; hasta que lo abra, sigue entrando con el actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 max-w-sm">
              <Label htmlFor="p-correo">Correo nuevo</Label>
              <Input
                id="p-correo"
                type="email"
                placeholder={user?.email ?? "nombre@correo.com"}
                value={correoNuevo}
                onChange={(e) => setCorreoNuevo(e.target.value)}
              />
            </div>
            <Button
              onClick={cambiarCorreo}
              disabled={guardandoCorreo || !correoNuevo.trim() || correoNuevo.trim().toLowerCase() === (user?.email ?? "").toLowerCase()}
            >
              {guardandoCorreo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Cambiar correo
            </Button>
          </CardContent>
        </Card>

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
