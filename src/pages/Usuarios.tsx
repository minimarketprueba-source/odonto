import { useEffect, useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { showSwal } from "@/components/ui/swal";
import { supabase, getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase";
import { recordAuditAction } from "@/lib/audit";
import {
  useAuth, esEstadoActivo, DEFAULT_PERMISOS_CLINICA, MODULOS_CLINICA, ROLES_CLINICA_OPCIONES,
} from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  RefreshCcw,
  Search,
  Shield,
  UserCog,
  UserMinus,
  UserPlus,
  UserCheck2,
  UserX,
  Users,
  Eye,
  EyeOff,
  KeyRound,
  ClipboardList,
} from "lucide-react";

interface RawProfile {
  [key: string]: any;
  id: string;
}

interface RawRoleRow {
  user_id: string;
  role: string | null;
  status?: string | null;
  updated_at?: string | null;
}

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  role: string;
  statusLabel: string;
  isActive: boolean;
  seccion?: string | null;
  telefono?: string | null;
  raw: RawProfile;
}

// Roles y módulos salen de auth-context: son los mismos que usan el menú, las
// rutas y canView(). Tenerlos en un solo lugar evita que esta pantalla ofrezca
// un rol o un módulo que no existe y deje a la persona sin acceso al guardar.
const ROLE_OPTIONS = ROLES_CLINICA_OPCIONES;

type RoleValue = string;
type RoleFilterValue = "all" | string;
type StatusFilterValue = "all" | "active" | "inactive";

const SYSTEM_MODULES = MODULOS_CLINICA;

const PERMISSION_TYPES = ["ver", "editar", "eliminar", "exportar"] as const;
type PermissionMap = Record<string, string[]>;

const DEFAULT_PERMISSIONS: Record<string, PermissionMap> = DEFAULT_PERMISOS_CLINICA;

interface NewUserForm {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  role: RoleValue;
  seccion: string;
  telefono: string;
}
type SortOptionValue = "recent" | "name" | "role";

const ROLE_FILTER_OPTIONS: { value: RoleFilterValue; label: string }[] = [
  { value: "all", label: "Todos" },
  ...ROLE_OPTIONS,
  { value: "sin_rol", label: "Sin rol asignado" },
];
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;
const SORT_OPTIONS = [
  { value: "recent", label: "Más recientes" },
  { value: "name", label: "Nombre (A-Z)" },
  { value: "role", label: "Rol" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  ...Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label])),
  sin_rol: "Sin rol asignado",
};

const getRoleLabel = (role: string) => ROLE_LABELS[role.toLowerCase()] ?? role;

/**
 * Traduce el error de llamar a una Edge Function que no está publicada.
 *
 * Cuando la función no existe, el navegador NO dice "404": el preflight se
 * queda sin respuesta y lo reporta como "blocked by CORS policy", y la
 * librería de Supabase lo envuelve en "Failed to send a request to the Edge
 * Function". Ninguno de los dos mensajes dice qué hacer, y mandan a buscar un
 * problema de permisos de dominio que no existe.
 */
function mensajeErrorFuncion(error: unknown, nombreFuncion: string): string {
  const texto = error instanceof Error ? error.message : String(error ?? "");
  const noExiste =
    /Failed to send a request|Failed to fetch|NetworkError|FunctionsFetchError/i.test(texto);
  if (noExiste) {
    return (
      `Falta publicar la funcion "${nombreFuncion}" en Supabase. ` +
      "En el panel: Edge Functions -> Deploy a new function -> Via Editor, " +
      `con ese nombre exacto, pegando supabase/functions/${nombreFuncion}/index.ts. ` +
      "Mientras tanto la contrasena se puede cambiar desde Authentication -> Users."
    );
  }
  return texto || "No se pudo actualizar la contrasena.";
}

/** Solo estos roles se pueden asignar desde esta pantalla. */
const esRolAsignable = (role: string) => ROLE_OPTIONS.some((r) => r.value === role);

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

function buildUsers(profiles: RawProfile[], roles: RawRoleRow[]): UserRecord[] {
  const profileById = profiles.reduce<Record<string, RawProfile>>((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const roleByUser = roles.reduce<Record<string, RawRoleRow>>((acc, row) => {
    acc[row.user_id] = row;
    return acc;
  }, {});

  // Unir ambas fuentes: todos los IDs únicos de profiles + roles
  const allIds = new Set([
    ...profiles.map((p) => p.id),
    ...roles.map((r) => r.user_id),
  ]);

  return Array.from(allIds).map((id) => {
    const profile = profileById[id];
    const roleRow = roleByUser[id];

    const email =
      profile?.email ?? profile?.correo ?? profile?.email_principal ?? profile?.username ?? "Sin correo";
    const displayName =
      [profile?.nombre, profile?.apellido]
        .filter((value?: string) => Boolean(value && value.trim().length))
        .join(" ") || profile?.nombre_completo || profile?.full_name || email;

    // Manda `user_roles.status`, que es lo que mira el RLS y lo que escribe
    // Suspender. `profiles.activo` solo se usa si la persona no tiene fila de
    // rol (cuentas de la otra app).
    const isActive = roleRow
      ? esEstadoActivo(roleRow.status)
      : typeof profile?.activo === "boolean"
      ? profile.activo
      : esEstadoActivo(profile?.status);

    return {
      id,
      email,
      displayName,
      createdAt: profile?.created_at ?? profile?.createdAt ?? roleRow?.updated_at ?? null,
      lastLoginAt:
        profile?.last_login_at ??
        profile?.last_sign_in_at ??
        profile?.updated_at ??
        roleRow?.updated_at ??
        null,
      // Sin fila en user_roles no hay acceso: mostrarlo como
      // "solo lectura" hacía creer que la persona podía entrar.
      role: roleRow?.role ?? profile?.role ?? "sin_rol",
      statusLabel: isActive ? "Activo" : "Inactivo",
      isActive,
      seccion: profile?.seccion ?? profile?.area ?? null,
      telefono: profile?.telefono ?? profile?.phone ?? null,
      raw: profile ?? { id } as RawProfile,
    };
  });
}

export default function Usuarios() {
  const { user } = useAuth();
  const { isAdmin: isSystemAdmin } = usePermissions();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [sortOption, setSortOption] = useState<SortOptionValue>("recent");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const isCurrentUserAdmin = isSystemAdmin;
  const [roleDialogUser, setRoleDialogUser] = useState<UserRecord | null>(null);
  const [pendingRole, setPendingRole] = useState<string>("");
  const [pendingPermissions, setPendingPermissions] = useState<PermissionMap>({});
  
  // Estado para cambio de contraseña
  const [passwordDialogUser, setPasswordDialogUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordInDialog, setShowPasswordInDialog] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    role: "medico",
    seccion: "",
    telefono: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Estado para edición de perfil
  const [editProfileUser, setEditProfileUser] = useState<UserRecord | null>(null);
  const [editProfileForm, setEditProfileForm] = useState({ nombre: "", apellido: "" });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Estado para los logs de auditoría
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const AUDIT_PAGE_SIZE = 20;

  const loadAuditLogs = async (page = 0) => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_admin_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * AUDIT_PAGE_SIZE, (page + 1) * AUDIT_PAGE_SIZE - 1);
      if (error) throw error;
      setAuditLogs(data ?? []);
      setAuditPage(page);
    } catch (err) {
      console.error("Error cargando logs de auditoría:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((item) => item.isActive).length;
    const inactive = total - active;
    const admins = users.filter((item) => item.role === "admin").length;
    return { total, active, inactive, admins };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let list = [...users];

    if (query) {
      list = list.filter((record) => {
        return (
          record.displayName.toLowerCase().includes(query) ||
          record.email.toLowerCase().includes(query) ||
          (record.seccion ? record.seccion.toLowerCase().includes(query) : false)
        );
      });
    }

    if (roleFilter !== "all") {
      list = list.filter((record) => record.role === roleFilter);
    }

    if (statusFilter !== "all") {
      const shouldBeActive = statusFilter === "active";
      list = list.filter((record) => record.isActive === shouldBeActive);
    }

    list.sort((a, b) => {
      if (sortOption === "name") {
        return a.displayName.localeCompare(b.displayName, "es");
      }
      if (sortOption === "role") {
        return a.role.localeCompare(b.role, "es");
      }
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return list;
  }, [roleFilter, searchTerm, sortOption, statusFilter, users]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Intentar usar la función RPC que trae emails desde auth.users
      const { data: rpcData, error: rpcError } = await supabase.rpc("list_admin_users");

      if (!rpcError && rpcData) {
        // El `activo` que devuelve la RPC sale de `profiles`, pero quien manda
        // sobre el acceso es `user_roles.status` (es lo que mira el RLS y lo
        // que escribe Suspender). Sin este cruce, suspender a alguien no se
        // veía reflejado en la lista: seguía figurando "Activo".
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("user_id, role, status");
        const estadoPorUsuario = new Map<string, RawRoleRow>(
          (roleRows ?? []).map((r) => [r.user_id, r as RawRoleRow])
        );

        const normalized: UserRecord[] = (rpcData as any[]).map((row) => {
          const rol = estadoPorUsuario.get(row.id);
          const isActive = rol ? esEstadoActivo(rol.status) : row.activo ?? true;
          const displayName = row.username || row.email || "Sin nombre";
          return {
            id: row.id,
            email: row.email ?? "Sin correo",
            displayName,
            createdAt: row.created_at ?? null,
            lastLoginAt: row.last_sign_in_at ?? row.role_updated_at ?? null,
            role: rol?.role ?? row.role ?? "sin_rol",
            statusLabel: isActive ? "Activo" : "Inactivo",
            isActive,
            seccion: null,
            telefono: null,
            raw: { id: row.id } as RawProfile,
          };
        });
        setUsers(normalized);
        return;
      }

      // Fallback: consultas separadas si la función RPC no existe aún
      console.warn("RPC list_admin_users no disponible, usando fallback:", rpcError?.message);
      const [{ data: profileData, error: profilesError }, { data: roleData, error: rolesError }] =
        await Promise.all([
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("user_roles").select("user_id, role, status, updated_at"),
        ]);

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      const normalized = buildUsers((profileData ?? []) as RawProfile[], (roleData ?? []) as RawRoleRow[]);
      setUsers(normalized);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openRoleDialog = async (record: UserRecord) => {
    setRoleDialogUser(record);
    // Si el rol guardado no es asignable (o no tiene), el desplegable queda
    // vacío y Guardar deshabilitado: hay que elegir uno a propósito.
    setPendingRole(esRolAsignable(record.role) ? record.role : "");
    // Cargar permisos existentes del usuario
    const porDefecto = DEFAULT_PERMISSIONS[record.role] ?? {};
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("permissions")
        .eq("user_id", record.id)
        .maybeSingle();
      // `permissions` trae `{}` por defecto en la base: eso no son permisos
      // reales, así que se cae en los del rol.
      const guardados = data?.permissions as PermissionMap | null | undefined;
      const tieneGuardados = !!guardados && typeof guardados === "object" && Object.keys(guardados).length > 0;
      setPendingPermissions(tieneGuardados ? guardados : porDefecto);
    } catch {
      setPendingPermissions(porDefecto);
    }
  };

  const togglePermission = (moduleKey: string, permType: string) => {
    setPendingPermissions((prev) => {
      const current = prev[moduleKey] ?? [];
      const has = current.includes(permType);
      return {
        ...prev,
        [moduleKey]: has
          ? current.filter((p) => p !== permType)
          : [...current, permType],
      };
    });
  };

  const resetNewUserForm = () => {
    setNewUserForm({
      email: "",
      password: "",
      nombre: "",
      apellido: "",
      role: "medico",
      seccion: "",
      telefono: "",
    });
    setCreateError(null);
    setShowNewPassword(false);
  };

  const createUser = async () => {
    if (!newUserForm.email || !newUserForm.password) {
      setCreateError("El correo y la contraseña son obligatorios.");
      return;
    }
    if (newUserForm.password.length < 6) {
      setCreateError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!isCurrentUserAdmin) {
      setCreateError("Solo los administradores pueden crear usuarios.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Sesión no válida. Volvé a iniciar sesión.");

      // Los mismos valores con los que la app se conecta, no las variables de
      // entorno crudas: en Vercel NO están definidas (se usan los valores por
      // defecto de `src/lib/supabase.ts`), así que acá quedaban en `undefined`
      // y la petición se iba a "undefined/functions/v1/create-user".
      const supabaseUrl = getSupabaseUrl();
      const anonKey = getSupabaseAnonKey();

      const res = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          email: newUserForm.email,
          password: newUserForm.password,
          nombre: newUserForm.nombre || undefined,
          apellido: newUserForm.apellido || undefined,
          seccion: newUserForm.seccion || undefined,
          telefono: newUserForm.telefono || undefined,
          role: newUserForm.role,
        }),
      });

      // Leer respuesta como texto primero para evitar crash si no es JSON válido
      const resText = await res.text();
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(`Respuesta inesperada del servidor (status ${res.status})`);
      }

      // Un 404 acá es la funcion sin publicar, no un problema de datos.
      if (res.status === 404) throw new Error(mensajeErrorFuncion(new Error("Failed to fetch"), "create-user"));
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);

      // Registrar auditoría (no bloquea el flujo)
      recordAuditAction({
        actor_id: user?.id ?? null,
        target_user_id: data?.user_id ?? "unknown",
        action: "crear_usuario",
        details: `Email: ${newUserForm.email}, Rol: ${newUserForm.role}`,
      }).catch(() => { /* auditoría no crítica */ });

      // El alta la resuelve una función del servidor que puede no guardar el
      // rol, y `permissions` nace en `{}`, que no son permisos y dejaría a la
      // persona viendo solo el Dashboard. Se reescriben acá con los del rol
      // elegido.
      if (data?.user_id) {
        const { error: errRol } = await supabase.from("user_roles").upsert(
          {
            user_id: data.user_id,
            role: newUserForm.role,
            status: "Activo",
            permissions: DEFAULT_PERMISSIONS[newUserForm.role] ?? {},
          },
          { onConflict: "user_id" }
        );
        if (errRol) {
          toast({
            title: "Cuenta creada, permisos pendientes",
            description: `No se pudieron asignar los permisos (${errRol.message}). Abrí «Rol y permisos» para completarlos.`,
            variant: "destructive",
          });
        }
      }

      // Agregar usuario al estado local inmediatamente (no depender solo de loadUsers)
      const newUser: UserRecord = {
        id: data?.user_id ?? "unknown",
        email: newUserForm.email,
        displayName: [newUserForm.nombre, newUserForm.apellido].filter(Boolean).join(" ") || newUserForm.email,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        role: newUserForm.role,
        statusLabel: "Activo",
        isActive: true,
        seccion: newUserForm.seccion || null,
        telefono: newUserForm.telefono || null,
        raw: { id: data?.user_id ?? "unknown" } as RawProfile,
      };
      setUsers((prev) => [newUser, ...prev]);

      toast({
        title: "Usuario creado",
        description: `${newUserForm.email} ha sido creado con rol ${getRoleLabel(newUserForm.role)}.`,
      });

      resetNewUserForm();
      setCreateDialogOpen(false);
    } catch (error: any) {
      console.error("Error creando usuario:", error);
      setCreateError(error?.message || "No se pudo crear el usuario.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editProfileUser) return;
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nombre: editProfileForm.nombre,
          apellido: editProfileForm.apellido,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editProfileUser.id);
      
      if (error) throw error;
      
      toast({ title: "Perfil actualizado exitosamente" });
      setEditProfileUser(null);
      await loadUsers(); // Refetch para actualizar la lista
    } catch (err) {
      toast({ variant: "destructive", title: "Error al actualizar perfil", description: (err as Error).message });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const updateRole = async () => {
    if (!roleDialogUser) return;
    if (!esRolAsignable(pendingRole)) {
      toast({
        title: "Falta el rol",
        description: "Elegí un rol antes de guardar.",
        variant: "destructive",
      });
      return;
    }
    // Guardar sin ningún módulo tildado deja a la persona viendo solo el
    // Dashboard: mejor avisar que dejarla encerrada sin saber por qué.
    const sinModulos = Object.values(pendingPermissions).every((p) => !p?.length);
    if (pendingRole !== "admin" && sinModulos) {
      toast({
        title: "Sin módulos habilitados",
        description: "Tildá al menos un módulo o esta persona no verá nada más que el Dashboard.",
        variant: "destructive",
      });
      return;
    }
    setIsUpdating(true);
    try {
      if (!isCurrentUserAdmin) {
        toast({
          title: "Permisos insuficientes",
          description: "Solo los administradores pueden cambiar roles.",
          variant: "destructive",
        });
        setIsUpdating(false);
        return;
      }
      const payload = {
        user_id: roleDialogUser.id,
        role: pendingRole,
        status: roleDialogUser.isActive ? "Activo" : "Inactivo",
        permissions: pendingPermissions,
      };
      const { error } = await supabase
        .from("user_roles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((item) =>
          item.id === roleDialogUser.id
            ? {
                ...item,
                role: pendingRole,
              }
            : item
        )
      );

      // Registrar auditoría del cambio de rol/permisos
      recordAuditAction({
        actor_id: user?.id ?? null,
        target_user_id: roleDialogUser.id,
        action: "cambio_rol",
        details: `Rol: ${pendingRole}, Permisos: ${JSON.stringify(pendingPermissions)}`,
      }).catch(() => { /* auditoría no crítica */ });

      toast({
        title: "Rol actualizado",
        description: `${roleDialogUser.displayName} ahora es ${pendingRole}.`,
      });
      setRoleDialogUser(null);
    } catch (error) {
      console.error("Error actualizando rol:", error);
      const detail = error && typeof error === "object" ? (error as any).message || (error as any).details || JSON.stringify(error) : String(error);
      console.debug("updateRole error detail:", detail);
      if ((error as any)?.status === 403) {
        toast({
          title: "Acción prohibida",
          description: "No tienes permisos suficientes para actualizar roles (403).",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleActiveState = async (record: UserRecord) => {
    if (user?.id === record.id) {
      toast({
        title: "Acción no permitida",
        description: "No puedes modificar el estado de tu propia cuenta desde aquí.",
        variant: "destructive",
      });
      return;
    }

    const nextState = !record.isActive;

    const { isConfirmed } = await showSwal({
      icon: nextState ? "question" : "warning",
      title: nextState ? "Reactivar usuario" : "Suspender usuario",
      text: nextState
        ? "El usuario volverá a tener acceso a la plataforma."
        : "El usuario dejará de tener acceso al sistema hasta que lo habilites nuevamente. Si está usando la aplicación en este momento, quedará sin acceso la próxima vez que la abra.",
      showCancelButton: true,
      confirmButtonText: nextState ? "Reactivar" : "Suspender",
    });

    if (!isConfirmed) return;

    setIsUpdating(true);
    try {
      if (!isCurrentUserAdmin) {
        toast({
          title: "Permisos insuficientes",
          description: "Solo los administradores pueden cambiar el estado de otros usuarios.",
          variant: "destructive",
        });
        setIsUpdating(false);
        return;
      }
      // `user_roles.status` es lo que mira `es_sanidad_activo()` en la base y
      // lo que ahora corta el acceso en auth-context: se escribe SIEMPRE.
      // Antes solo se tocaba cuando el perfil no traía `activo`, así que según
      // por dónde se hubiera cargado la lista la suspensión iba a parar a
      // `profiles` y no frenaba nada.
      const payload = {
        user_id: record.id,
        role: esRolAsignable(record.role) ? record.role : null,
        status: nextState ? "Activo" : "Inactivo",
      };
      const { error } = await supabase
        .from("user_roles")
        .upsert(payload, { onConflict: "user_id" })
        .select("user_id, status, role");
      if (error) {
        console.error("Supabase user_roles upsert error:", error);
        if ((error as any)?.status === 403) {
          toast({
            title: "Acción prohibida",
            description: "No tienes permisos suficientes para modificar el estado (403).",
            variant: "destructive",
          });
        }
        throw error;
      }

      // `profiles.activo` se mantiene en sintonía porque lo usa control de
      // peso, pero si falla no se corta: el estado que vale ya quedó guardado.
      if ("activo" in record.raw) {
        const { error: errPerfil } = await supabase
          .from("profiles")
          .update({ activo: nextState })
          .eq("id", record.id);
        if (errPerfil) console.warn("No se pudo sincronizar profiles.activo:", errPerfil.message);
      }
      // Refrescar la lista desde el backend para evitar inconsistencia entre tablas
      await loadUsers();

      // Registrar auditoría de la acción
      try {
        await recordAuditAction({
          actor_id: user?.id ?? null,
          target_user_id: record.id,
          action: nextState ? "reactivar_usuario" : "suspender_usuario",
          details: `Vía UI - toggleActiveState`,
        });
      } catch (auditErr) {
        console.debug("No se pudo registrar auditoría:", auditErr);
      }

      toast({
        title: "Estado actualizado",
        description: `${record.displayName} ahora está ${nextState ? "activo" : "inactivo"}.`,
      });
    } catch (error) {
      console.error("Error cambiando estado:", error);
      // Mostrar detalle del error para facilitar debugging en entorno de desarrollo
      const detail = error && typeof error === "object" ? (error as any).message || (error as any).details || JSON.stringify(error) : String(error);
      console.debug("toggleActiveState error detail:", detail);
      await showSwal({
        icon: "error",
        title: "Error al cambiar estado",
        text: String(detail).slice(0, 1000),
        confirmButtonText: "Cerrar",
      });
      // Registrar auditoría de fallo
      try {
        await recordAuditAction({
          actor_id: user?.id ?? null,
          target_user_id: record.id,
          action: nextState ? "fallo_reactivar_usuario" : "fallo_suspender_usuario",
          details: String(detail).slice(0, 1000),
        });
      } catch (auditErr) {
        console.debug("No se pudo registrar auditoría (error):", auditErr);
      }
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordDialogUser || !newPassword) return;

    if (!isCurrentUserAdmin) {
      toast({
        title: "Permisos insuficientes",
        description: "Solo los administradores pueden cambiar contraseñas de otros usuarios.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.functions.invoke('update-user-password', {
        body: { 
          user_id: passwordDialogUser.id, 
          password: newPassword 
        }
      });

      if (error) throw error;

      // Registrar auditoría del cambio de contraseña
      recordAuditAction({
        actor_id: user?.id ?? null,
        target_user_id: passwordDialogUser.id,
        action: "cambio_contrasenna",
        details: `Contraseña de ${passwordDialogUser.displayName} actualizada por administrador.`,
      }).catch(err => console.debug("Fallo registro auditoría clave:", err));

      toast({
        title: "Contraseña actualizada",
        description: `La contraseña de ${passwordDialogUser.displayName} se ha cambiado correctamente.`,
      });
      setPasswordDialogUser(null);
      setNewPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "No se pudo cambiar la contraseña",
        description: mensajeErrorFuncion(error, "update-user-password"),
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <AppLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10 space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="space-y-2 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">Administración de usuarios</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Gestiona roles, revisa el estado de acceso y audita la actividad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Usuarios totales</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Activos</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100/70 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <UserCheck2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">
                      {(stats.total ? Math.round((stats.active / stats.total) * 100) : 0).toString()}% de la base
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Inactivos</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="rounded-full bg-rose-100/70 p-2 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    <UserX className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-background px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Administradores</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="rounded-full bg-slate-200/70 p-2 text-slate-600 dark:bg-slate-500/10 dark:text-slate-200">
                    <Shield className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold">{stats.admins}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Buscar usuarios</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Nombre, correo o sección"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2 w-full sm:w-36">
                  <Label className="text-xs font-medium text-muted-foreground">Rol</Label>
                  <Select value={roleFilter} onValueChange={(value: RoleFilterValue) => setRoleFilter(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full sm:w-36">
                  <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                  <Select value={statusFilter} onValueChange={(value: StatusFilterValue) => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full sm:w-36">
                  <Label className="text-xs font-medium text-muted-foreground">Ordenar</Label>
                  <Select value={sortOption} onValueChange={(value: SortOptionValue) => setSortOption(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Orden" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2" onClick={loadUsers} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Actualizar
                </Button>
                <Button
                  variant="default"
                  className="gap-2"
                  onClick={() => {
                    if (!isCurrentUserAdmin) {
                      toast({
                        title: "Permisos insuficientes",
                        description: "Solo los administradores pueden crear usuarios.",
                        variant: "destructive",
                      });
                      return;
                    }
                    resetNewUserForm();
                    setCreateDialogOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Nuevo
                </Button>
              </div>
            </div>

            <Separator />

            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                    <th className="px-4 py-2 text-left">Usuario</th>
                    <th className="px-4 py-2 text-left">Rol</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-3">
                          <Loader2 className="h-4 w-4 animate-spin" /> Cargando usuarios…
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No encontramos usuarios con ese criterio de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((record) => (
                      <tr key={record.id} className="transition hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold uppercase text-muted-foreground sm:flex shrink-0">
                              {getInitials(record.displayName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{record.displayName}</p>
                              <p className="text-xs text-muted-foreground truncate">{record.email}</p>
                              {record.telefono && (
                                <p className="text-xs text-muted-foreground">{record.telefono}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {getRoleLabel(record.role)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <Badge variant={record.isActive ? "secondary" : "destructive"}>
                              {record.statusLabel}
                            </Badge>
                            {record.seccion && (
                              <p className="text-xs text-muted-foreground">{record.seccion}</p>
                            )}
                            <div className="text-xs text-muted-foreground sm:hidden">
                              Alta: {formatDate(record.createdAt) ?? "Sin dato"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="hidden flex-col text-right text-xs text-muted-foreground lg:flex">
                              <span>Último acceso: {formatDate(record.lastLoginAt) ?? "Sin registros"}</span>
                              <span>Alta: {formatDate(record.createdAt) ?? "Sin dato"}</span>
                            </div>
                            {isCurrentUserAdmin && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => {
                                    setEditProfileUser(record);
                                    setEditProfileForm({
                                      nombre: record.raw?.nombre || "",
                                      apellido: record.raw?.apellido || "",
                                    });
                                  }}
                                >
                                  <UserCog className="h-4 w-4" />
                                  <span className="hidden sm:inline">Editar Perfil</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => openRoleDialog(record)}
                                >
                                  <UserCog className="h-4 w-4" />
                                  <span className="hidden sm:inline">Rol</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => {
                                    setPasswordDialogUser(record);
                                    setNewPassword("");
                                    setShowPasswordInDialog(false);
                                  }}
                                >
                                  <KeyRound className="h-4 w-4" />
                                  <span className="hidden sm:inline">Clave</span>
                                </Button>
                                <Button
                                  variant={record.isActive ? "ghost" : "outline"}
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => toggleActiveState(record)}
                                >
                                  <UserMinus className="h-4 w-4" />
                                  <span className="hidden sm:inline">{record.isActive ? "Suspender" : "Reactivar"}</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={Boolean(roleDialogUser)} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Actualizar rol</DialogTitle>
              <DialogDescription>
                Elige el rol que tendrá acceso {roleDialogUser?.displayName}. Los cambios se aplican de manera
                inmediata.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label>Selecciona un rol</Label>
                <Select
                  value={pendingRole}
                  onValueChange={(val) => {
                    setPendingRole(val);
                    setPendingPermissions(DEFAULT_PERMISSIONS[val] ?? {});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!esRolAsignable(roleDialogUser?.role ?? "") && (
                  <p className="text-xs text-sky-700 dark:text-sky-400">
                    Esta cuenta hoy figura como «{getRoleLabel(roleDialogUser?.role ?? "")}», que no da acceso
                    al sistema. Al elegir un rol de acá pasa a tener acceso.
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Permisos por módulo
                </Label>
                <div className="rounded-lg border overflow-x-auto">
                  <div className="grid grid-cols-5 min-w-[420px] bg-muted/50 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                    <span>Módulo</span>
                    {PERMISSION_TYPES.map((perm) => (
                      <span key={perm} className="text-center capitalize">{perm}</span>
                    ))}
                  </div>
                  <div className="divide-y min-w-[420px]">
                    {SYSTEM_MODULES.map((mod) => (
                      <div key={mod.key} className="grid grid-cols-5 items-center px-3 py-2 text-sm hover:bg-muted/20">
                        <span>{mod.label}</span>
                        {PERMISSION_TYPES.map((perm) => (
                          <div key={perm} className="flex justify-center">
                            <Checkbox
                              checked={(pendingPermissions[mod.key] ?? []).includes(perm)}
                              onCheckedChange={() => togglePermission(mod.key, perm)}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Al cambiar el rol se resetean los permisos a los valores por defecto del rol. Podés personalizarlos
                  individualmente. El administrador entra a todos los módulos aunque no estén tildados.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRoleDialogUser(null)} disabled={isUpdating}>
                Cancelar
              </Button>
              <Button onClick={updateRole} disabled={isUpdating || !esRolAsignable(pendingRole)} className="gap-2">
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para crear nuevo usuario */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) { setCreateDialogOpen(false); resetNewUserForm(); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Crear nuevo usuario
              </DialogTitle>
              <DialogDescription>
                Completa los datos para dar de alta un nuevo usuario en el sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-nombre">Nombre</Label>
                  <Input
                    id="new-nombre"
                    placeholder="Juan"
                    value={newUserForm.nombre}
                    onChange={(e) => setNewUserForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-apellido">Apellido</Label>
                  <Input
                    id="new-apellido"
                    placeholder="Pérez"
                    value={newUserForm.apellido}
                    onChange={(e) => setNewUserForm((f) => ({ ...f, apellido: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Correo electrónico *</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Contraseña temporal *</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">El usuario deberá cambiar su contraseña en el primer ingreso.</p>
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newUserForm.role} onValueChange={(val: RoleValue) => setNewUserForm((f) => ({ ...f, role: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-seccion">Sección</Label>
                  <Input
                    id="new-seccion"
                    placeholder="Ej: Sección A"
                    value={newUserForm.seccion}
                    onChange={(e) => setNewUserForm((f) => ({ ...f, seccion: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-telefono">Teléfono</Label>
                  <Input
                    id="new-telefono"
                    placeholder="+595 ..."
                    value={newUserForm.telefono}
                    onChange={(e) => setNewUserForm((f) => ({ ...f, telefono: e.target.value }))}
                  />
                </div>
              </div>
              {createError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">{createError}</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetNewUserForm(); }} disabled={isCreating}>
                Cancelar
              </Button>
              <Button onClick={createUser} disabled={isCreating || !newUserForm.email || !newUserForm.password} className="gap-2">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Crear usuario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para cambio de contraseña */}
        <Dialog open={Boolean(passwordDialogUser)} onOpenChange={(open) => !open && setPasswordDialogUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cambiar contraseña</DialogTitle>
              <DialogDescription>
                Establece una nueva contraseña para <strong>{passwordDialogUser?.displayName}</strong> ({passwordDialogUser?.email}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="change-password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="change-password"
                    type={showPasswordInDialog ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdatePassword();
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPasswordInDialog(!showPasswordInDialog)}
                  >
                    {showPasswordInDialog ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPasswordDialogUser(null)} disabled={isUpdatingPassword}>
                Cancelar
              </Button>
              <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword || !newPassword || newPassword.length < 6}>
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Contraseña"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para Editar Perfil */}
        <Dialog open={Boolean(editProfileUser)} onOpenChange={(open) => !open && setEditProfileUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                Editar Perfil
              </DialogTitle>
              <DialogDescription>
                Modifica los datos personales de <strong>{editProfileUser?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre(s)</Label>
                <Input
                  placeholder="Ej: Juan Pérez"
                  value={editProfileForm.nombre}
                  onChange={(e) => setEditProfileForm((prev) => ({ ...prev, nombre: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Apellido(s)</Label>
                <Input
                  placeholder="Opcional"
                  value={editProfileForm.apellido}
                  onChange={(e) => setEditProfileForm((prev) => ({ ...prev, apellido: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditProfileUser(null)} disabled={isUpdatingProfile}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

        {/* Panel de Logs de Auditoría - Solo Admin */}
        {isCurrentUserAdmin && (
          <Card>
            <CardHeader className="space-y-2 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
                <span className="truncate">Logs de Auditoría</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Historial de acciones administrativas y operativas del sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => loadAuditLogs(0)}
                  disabled={auditLoading}
                >
                  {auditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  {auditLogs.length === 0 ? "Cargar logs" : "Actualizar"}
                </Button>
              </div>

              {auditLogs.length > 0 && (
                <>
                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                          <th className="px-4 py-2 text-left w-40">Fecha</th>
                          <th className="px-4 py-2 text-left w-40">Acción</th>
                          <th className="px-4 py-2 text-left">Detalles</th>
                          <th className="px-4 py-2 text-left w-40">Actor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString("es-ES", {
                                day: "2-digit", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground max-w-xs truncate">
                              {log.details ?? "-"}
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                              {log.actor_id ? log.actor_id.slice(0, 8) + "..." : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Página {auditPage + 1}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditPage === 0 || auditLoading}
                        onClick={() => loadAuditLogs(auditPage - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditLogs.length < AUDIT_PAGE_SIZE || auditLoading}
                        onClick={() => loadAuditLogs(auditPage + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {auditLogs.length === 0 && !auditLoading && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Haz clic en «Cargar logs» para ver el historial de operaciones.
                </p>
              )}
            </CardContent>
          </Card>
        )}

    </AppLayout>
  );
}
