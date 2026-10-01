// @ts-nocheck — Este archivo NO es parte de la app: corre en Deno, dentro de
// Supabase. Usa `Deno.serve` e importa con `npm:`, cosas que el TypeScript de
// este proyecto no conoce y marcaría en rojo sin que haya nada mal. Tampoco
// entra en el `tsconfig.json` ni en el build. Quien lo revisa de verdad es
// Supabase al publicarlo.
// ============================================================================
// Cambiar la contraseña de otra cuenta
// ============================================================================
// La llama la pantalla Usuarios (el botón de la llave). Corre en el servidor de
// Supabase, NO en el navegador.
//
// Por qué tiene que estar acá: cambiarle la contraseña a OTRA persona necesita
// la `service_role key`, que puede todo sobre la base. Esa clave no puede
// viajar al navegador, porque cualquiera que abra el código de la página la
// vería.
//
// ⚠ Es la función más peligrosa del sistema: quien pueda llamarla se puede
// poner la contraseña que quiera en la cuenta de cualquiera y entrar como esa
// persona. Por eso comprueba TRES cosas antes de tocar nada:
//   1. Que quien llama tenga una sesión válida.
//   2. Que sea administrador ACTIVO, mirando la base y no lo que diga la
//      pantalla.
//   3. Que la cuenta que va a cambiar exista.
//
// Síntoma cuando no está publicada: el navegador NO dice "404". Dice
// "blocked by CORS policy: Response to preflight request doesn't pass access
// control check". Es engañoso: no es un problema de CORS, es que no hay nada
// que responda.
//
// ---------------------------------------------------------------------------
// CÓMO SE PUBLICA (no hace falta instalar nada)
// ---------------------------------------------------------------------------
//   1. Entrar a https://supabase.com/dashboard/project/othuhgapvnpdjhartrut/functions
//   2. "Deploy a new function" → "Via Editor"
//   3. Nombre EXACTO: update-user-password   (así la busca la app)
//   4. BORRAR TODO el ejemplo que trae el editor y pegar este archivo entero.
//   5. Deploy.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  // SUPABASE_SERVICE_ROLE_KEY y las nuevas SB_SECRET_KEY.
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY");
  if (!url || !serviceKey) {
    return responder(
      {
        error:
          "La función no encuentra la clave del servidor. En el panel: " +
          "Edge Functions → update-user-password → Secrets, agregar SUPABASE_SERVICE_ROLE_KEY.",
      },
      500
    );
  }

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

    // --- 2. ¿Es administrador activo de su empresa? -------------------------
    // Se pregunta a la base con la sesión de quien llama (las mismas funciones
    // que usan los permisos).
    const anonKey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");
    const comoQuienLlama = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const [{ data: empresaActiva }, { data: esAdminActivo }] = await Promise.all([
      comoQuienLlama.rpc("mi_clinica_id"),
      comoQuienLlama.rpc("es_odonto_admin"),
    ]);
    if (!esAdminActivo || !empresaActiva) {
      return responder(
        { error: "Solo un administrador activo puede cambiar la contraseña de otra cuenta." },
        403
      );
    }

    // --- 3. Los datos que llegaron ------------------------------------------
    const cuerpo = await req.json().catch(() => null);
    const userId = String(cuerpo?.user_id ?? "").trim();
    const password = String(cuerpo?.password ?? "");

    if (!userId) return responder({ error: "Falta indicar de qué cuenta." }, 400);
    if (password.length < 6) {
      return responder({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
    }

    // --- 3b. ¿Es una persona de SU empresa, y solo de su empresa? -------------
    // Antes un admin podía cambiarle la contraseña a CUALQUIER cuenta de la
    // base. Con varias empresas, eso dejaba al admin de un consultorio tomar la
    // cuenta de alguien de otro y entrar a sus pacientes. Y si la persona
    // trabaja también en otra empresa, su contraseña no es solo de esta.
    const { data: membresias } = await admin
      .from("user_roles").select("clinica_id").eq("user_id", userId);
    const empresas = new Set((membresias ?? []).map((m) => m.clinica_id));
    if (!empresas.has(empresaActiva)) {
      return responder({ error: "Esa persona no trabaja en su empresa." }, 403);
    }
    if (empresas.size > 1) {
      return responder(
        {
          error:
            "Esta persona trabaja también en otra empresa: su contraseña no se puede " +
            "cambiar desde acá. Que la cambie ella desde «Olvidé mi contraseña».",
        },
        403
      );
    }

    // --- 4. Cambiarla --------------------------------------------------------
    const { data: destino, error: errBuscar } = await admin.auth.admin.getUserById(userId);
    if (errBuscar || !destino?.user) {
      return responder({ error: "Esa cuenta no existe." }, 404);
    }

    const { error: errCambio } = await admin.auth.admin.updateUserById(userId, { password });
    if (errCambio) {
      return responder({ error: errCambio.message }, 400);
    }

    // Se devuelve el correo para que la pantalla pueda decir a quién se le
    // cambió, y para que quede en la auditoría con algo legible.
    return responder({ ok: true, email: destino.user.email });
  } catch (e) {
    return responder({ error: (e as Error)?.message ?? "Error inesperado." }, 500);
  }
});
