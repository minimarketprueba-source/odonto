// ============================================================================
// Alta de cuentas de usuario
// ============================================================================
// La llama la pantalla Usuarios ("Crear usuario"). Corre en el servidor de
// Supabase (Edge Function), NO en el navegador.
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
//   4. Pegar TODO este archivo y Deploy.
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen cargadas solas en las
// Edge Functions: no hay que configurar ninguna variable a mano.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return responder({ error: "La función no está configurada en el servidor." }, 500);
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

    // --- 2. ¿Es administrador? ----------------------------------------------
    // Se comprueba en el servidor y no se confía en lo que diga la pantalla:
    // cualquiera puede llamar a esta dirección con su propio token.
    const { data: rolFila } = await admin
      .from("user_roles")
      .select("role, status")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const rol = (rolFila?.role ?? "").toLowerCase();
    const estado = (rolFila?.status ?? "activo").toLowerCase();
    const esAdmin = ["admin", "superadmin", "super_admin"].includes(rol);
    const activo = ["activo", "active", "habilitado", "enabled"].includes(estado);
    if (!esAdmin || !activo) {
      return responder({ error: "Solo un administrador activo puede crear usuarios." }, 403);
    }

    // --- 3. Los datos que llegaron ------------------------------------------
    const cuerpo = await req.json().catch(() => null);
    if (!cuerpo) return responder({ error: "No se recibieron los datos." }, 400);

    const email = String(cuerpo.email ?? "").trim().toLowerCase();
    const password = String(cuerpo.password ?? "");
    const role = String(cuerpo.role ?? "").toLowerCase();

    if (!email || !email.includes("@")) return responder({ error: "Correo no válido." }, 400);
    if (password.length < 6) {
      return responder({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
    }
    if (!ROLES_VALIDOS.includes(role)) {
      return responder({ error: `Rol no válido: ${role}` }, 400);
    }

    // --- 4. Crear la cuenta --------------------------------------------------
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

    if (errCrear || !creado?.user) {
      const msg = errCrear?.message ?? "No se pudo crear la cuenta.";
      // El error crudo de Supabase viene en inglés y no dice qué hacer.
      if (/already been registered|already exists/i.test(msg)) {
        return responder({ error: `Ya existe una cuenta con el correo ${email}.` }, 409);
      }
      return responder({ error: msg }, 400);
    }

    const userId = creado.user.id;

    // --- 5. Ficha y rol ------------------------------------------------------
    // Si algo de esto falla, la cuenta YA existe: se borra para no dejar a
    // alguien pudiendo entrar sin rol ni permisos, que es un estado raro y
    // difícil de detectar después.
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
      { user_id: userId, role, status: "Activo" },
      { onConflict: "user_id" }
    );

    if (errPerfil || errRol) {
      await admin.auth.admin.deleteUser(userId).catch(() => { /* ya está el error de arriba */ });
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
