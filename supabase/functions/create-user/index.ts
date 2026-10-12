// @ts-nocheck — Este archivo NO es parte de la app: corre en Deno, dentro de
// Supabase. Usa `Deno.serve` e importa con `npm:`, cosas que el TypeScript de
// este proyecto no conoce y marcaría en rojo sin que haya nada mal. Tampoco
// entra en el `tsconfig.json` ni en el build. Quien lo revisa de verdad es
// Supabase al publicarlo.
// ============================================================================
// Alta de cuentas de usuario
// ============================================================================
// La llaman la pantalla Usuarios ("Crear usuario") y la pantalla Empresas (el
// dueño del sistema le crea el administrador a una empresa nueva). Corre en el
// servidor de Supabase (Edge Function), NO en el navegador.
//
// MULTIEMPRESA (2026-10-01): la persona queda en la empresa ACTIVA de quien la
// crea, o en la que indique `clinica_id` si quien llama es dueño del sistema.
// Si el correo ya tiene cuenta (trabaja en otra empresa), NO se crea otra ni se
// le cambia la contraseña: solo se la suma a esta empresa con el rol elegido.
//
// Por qué tiene que estar acá y no en la app: crear una cuenta necesita la
// `service_role key`, que puede TODO sobre la base — leer cualquier ficha,
// borrar cualquier tabla, saltarse todos los permisos. Esa clave no puede
// viajar al navegador, porque cualquiera que abra el código de la página la
// vería. Acá vive en el servidor y nunca sale.
//
// La cuenta se crea con `email_confirm: true`, o sea ya confirmada. Motivo: los
// correos de este consultorio son de un dominio inventado (@odonto.com) y el
// correo de confirmación nunca llega, así que la cuenta quedaría trabada para
// siempre. Como el registro público está cerrado y solo un administrador puede
// llegar hasta acá, no hace falta confirmar nada.
//
// ---------------------------------------------------------------------------
// CÓMO SE PUBLICA (no hace falta instalar nada)
// ---------------------------------------------------------------------------
//   1. Entrar a https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/functions
//   2. "Deploy a new function" → "Via Editor"
//   3. Nombre EXACTO: create-user   (así la busca la app)
//   4. BORRAR TODO el ejemplo que trae el editor (el del "Hello name") y pegar
//      este archivo entero en su lugar. No se mezclan: son dos formas distintas
//      de escribir lo mismo y quedarían dos respuestas peleando.
//   5. Deploy.
//
// Si el editor ofrece un interruptor "Verify JWT", dejarlo COMO VIENE
// (activado). La app manda la sesión del administrador en la cabecera, así que
// pasa esa verificación sin problema.
//
// Las claves ya vienen cargadas solas en las Edge Functions: no hay que
// configurar ninguna variable a mano.
// ============================================================================

// `npm:` y no una URL de esm.sh: es lo que entienden todas las versiones del
// entorno de Supabase, viejas y nuevas.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Roles que esta función acepta asignar. Cualquier otro se rechaza. */
const ROLES_VALIDOS = ["admin", "medico", "recepcion", "asistente", "enfermeria"];

function responder(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  // Supabase renombró las claves: las cuentas viejas tienen
  // SUPABASE_SERVICE_ROLE_KEY y las nuevas SB_SECRET_KEY. Se prueban las dos
  // para que la función sirva igual sin tener que tocarla.
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY");
  if (!url || !serviceKey) {
    return responder(
      {
        error:
          "La función no encuentra la clave del servidor. En el panel: " +
          "Edge Functions → create-user → Secrets, agregar SUPABASE_SERVICE_ROLE_KEY.",
      },
      500
    );
  }

  // Cliente con permisos totales. Solo se usa después de comprobar quién llama.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // --- 1. Quién está llamando ---------------------------------------------
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return responder({ error: "Falta la sesión. Volvé a iniciar sesión." }, 401);

    const { data: authData, error: errAuth } = await admin.auth.getUser(token);
    if (errAuth || !authData?.user) {
      return responder({ error: "Sesión no válida. Volvé a iniciar sesión." }, 401);
    }

    const callerId = authData.user.id;

    // --- 2. ¿Puede crear gente, y en qué empresa? ----------------------------
    const cuerpo = await req.json().catch(() => null);
    if (!cuerpo) return responder({ error: "No se recibieron los datos." }, 400);

    // Permisos consultados con el cliente admin, sin depender de la anon key
    // (con las claves nuevas de Supabase la consulta "como quien llama" podía
    // fallar). OJO: esto REPITE a mano la regla de la base —mi_clinica_id(),
    // odonto_estado_activo() y es_odonto_admin() de multiempresa.sql—. Si se
    // cambia allá, cambiarlo acá y en update-user-password.
    const [{ data: duenoRow }, { data: callerProfile }, { data: callerRoles }] = await Promise.all([
      admin.from("sistema_duenos").select("user_id").eq("user_id", callerId).maybeSingle(),
      admin.from("profiles").select("clinica_activa").eq("id", callerId).maybeSingle(),
      admin.from("user_roles").select("clinica_id, role, status, created_at").eq("user_id", callerId),
    ]);

    const esDueno = !!duenoRow?.user_id;

    // Determinar la clínica activa del usuario que llama
    const rolesActivos = (callerRoles ?? []).filter((r: any) =>
      !r.status || ["activo", "active", "habilitado", "enabled"].includes(String(r.status).toLowerCase())
    );

    let empresaActiva: string | null = null;
    let rolEnEmpresaActiva: string | null = null;

    if (callerProfile?.clinica_activa) {
      const match = rolesActivos.find((r: any) => r.clinica_id === callerProfile.clinica_activa);
      if (match) {
        empresaActiva = match.clinica_id;
        rolEnEmpresaActiva = match.role ? String(match.role).toLowerCase() : null;
      }
    }

    if (!empresaActiva && rolesActivos.length > 0) {
      // Mismo orden que mi_clinica_id(): por fecha de alta y, a igualdad, por id.
      rolesActivos.sort((a: any, b: any) =>
        (a.created_at || "").localeCompare(b.created_at || "") ||
        String(a.clinica_id).localeCompare(String(b.clinica_id))
      );
      empresaActiva = rolesActivos[0].clinica_id;
      rolEnEmpresaActiva = rolesActivos[0].role ? String(rolesActivos[0].role).toLowerCase() : null;
    }

    const esAdminActivo = rolEnEmpresaActiva && ["admin", "superadmin", "super_admin"].includes(rolEnEmpresaActiva);

    const pedida = cuerpo.clinica_id ? String(cuerpo.clinica_id) : null;
    let clinicaId: string | null = null;

    if (pedida && esDueno) {
      clinicaId = pedida; // el dueño da de alta gente en cualquier empresa
    } else if (!pedida && esDueno && empresaActiva) {
      clinicaId = empresaActiva;
    } else if (!pedida || pedida === empresaActiva) {
      if (!esAdminActivo || !empresaActiva) {
        return responder({ error: "Solo un administrador activo puede crear usuarios." }, 403);
      }
      clinicaId = empresaActiva;
    } else {
      return responder({ error: "No puede crear usuarios en otra empresa." }, 403);
    }

    // --- 3. Los datos que llegaron ------------------------------------------
    const email = String(cuerpo.email ?? "").trim().toLowerCase();
    const password = String(cuerpo.password ?? "");
    const role = String(cuerpo.role ?? "").toLowerCase();

    if (!email || !email.includes("@")) return responder({ error: "Correo no válido." }, 400);
    // Igual que la app (src/lib/contrasena.ts).
    if (password.length < 8) {
      return responder({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
    }
    if (!ROLES_VALIDOS.includes(role)) {
      return responder({ error: `Rol no válido: ${role}` }, 400);
    }

    // --- 4. ¿Ya tiene cuenta? ------------------------------------------------
    // Búsqueda EXACTA sin distinguir mayúsculas. En ilike, "_" y "%" son
    // comodines: sin escaparlos, crear a juan_perez@x.com encontraba a
    // juanXperez@x.com y SUMABA A OTRA PERSONA a esta empresa con el rol elegido.
    const patronExacto = email.replace(/[\\%_]/g, (c) => "\\" + c);
    let existenteId: string | null = null;
    const { data: existenteProfile } = await admin
      .from("profiles").select("id").ilike("email", patronExacto).maybeSingle();

    if (existenteProfile?.id) {
      existenteId = existenteProfile.id;
    }

    // Si ya existe, solo se suma a esta empresa sin tocar su contraseña
    if (existenteId) {
      const { error: errSumar } = await admin.from("user_roles").upsert(
        { user_id: existenteId, clinica_id: clinicaId, role, status: "Activo" },
        { onConflict: "user_id,clinica_id" }
      );
      if (errSumar) return responder({ error: errSumar.message }, 500);
      return responder({ user_id: existenteId, email, existente: true });
    }

    // --- 5. Crear la cuenta en auth.admin ------------------------------------
    const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
      email,
      password,
      // Ya confirmada: ver el comentario del encabezado.
      email_confirm: true,
      user_metadata: {
        nombre: cuerpo.nombre ?? null,
        apellido: cuerpo.apellido ?? null,
      },
    });

    let userId: string | null = null;
    let recienCreada = false;

    if (errCrear || !creado?.user) {
      const msg = errCrear?.message ?? "No se pudo crear la cuenta.";
      // Si ya existía en auth.users pero no tenía perfil, lo buscamos para vincularlo
      if (/already been registered|already exists/i.test(msg)) {
        // listUsers() devuelve de a una página: se recorren todas (con un tope).
        let authUser: any = null;
        for (let pagina = 1; pagina <= 20 && !authUser; pagina++) {
          const { data: listData } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
          const usuarios = listData?.users ?? [];
          authUser = usuarios.find((u: any) => u.email?.toLowerCase().trim() === email) ?? null;
          if (usuarios.length < 1000) break;
        }
        if (authUser) {
          userId = authUser.id;
        } else {
          return responder({ error: `Ya existe una cuenta con el correo ${email}.` }, 409);
        }
      } else {
        return responder({ error: msg }, 400);
      }
    } else {
      userId = creado.user.id;
      recienCreada = true;
    }

    // --- 6. Ficha de perfil y rol en la empresa ------------------------------
    const { error: errPerfil } = await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        nombre: cuerpo.nombre ?? null,
        apellido: cuerpo.apellido ?? null,
        telefono: cuerpo.telefono ?? null,
        activo: true,
      },
      { onConflict: "id" }
    );

    const { error: errRol } = await admin.from("user_roles").upsert(
      { user_id: userId, clinica_id: clinicaId, role, status: "Activo" },
      { onConflict: "user_id,clinica_id" }
    );

    if (errPerfil || errRol) {
      // Si la cuenta la acabamos de crear, se borra: si no, queda alguien que
      // puede entrar pero ve "Sin acceso", un estado raro y difícil de notar.
      // Una cuenta que ya existía no se toca.
      if (recienCreada && userId) {
        await admin.auth.admin.deleteUser(userId).catch(() => { /* ya está el error */ });
      }
      return responder(
        { error: `La cuenta no se pudo completar: ${(errPerfil ?? errRol)?.message}` },
        500
      );
    }

    return responder({ user_id: userId, email });
  } catch (e) {
    return responder({ error: (e as Error)?.message ?? "Error inesperado." }, 500);
  }
});
