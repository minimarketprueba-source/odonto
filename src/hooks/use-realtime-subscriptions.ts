// ============================================================================
// Hook: Suscripciones en Tiempo Real (Supabase Realtime)
// ============================================================================
// Escucha cambios en las tablas clave de la base de datos (Postgres Changes)
// e invalida automáticamente las cachés de React Query para refrescar las
// pantallas sin demoras ni recargas manuales.
//
// OJO — el canal es UNO SOLO para toda la aplicación, compartido con conteo de
// usuarios. `ProtectedRoute` envuelve cada ruta, así que al navegar la ruta
// nueva se monta antes de que la anterior termine de limpiarse: con un canal
// por montaje, Supabase devolvía el mismo objeto ya suscrito y `.on()` sobre
// un canal suscrito lanza "cannot add postgres_changes callbacks ... after
// subscribe()", que rompía la pantalla entera.

import { useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";

export const CANAL_REALTIME = "odonto-tiempo-real";

/**
 * Qué cachés se invalidan cuando cambia cada tabla.
 *
 * OJO: SOLO tablas que existen en esta base. Hasta el 2026-10-12 la lista era
 * la del sistema policial (fichas_rac, lista_espera, atenciones_enfermeria,
 * internaciones, consultas): de las seis solo existía `citas`, y Supabase
 * rechaza el canal ENTERO si una de las tablas pedidas no existe, así que no
 * llegaba ningún aviso. Recepción cobraba y la pantalla del odontólogo seguía
 * mostrando el saldo viejo.
 *
 * Además cada tabla tiene que estar en la publicación `supabase_realtime`
 * (migración `tiempo_real.sql`); si no, el canal conecta pero no avisa nada.
 */
export const TABLAS_EN_VIVO: {
  tabla: string;
  claves: (keys: typeof queryKeys) => readonly (readonly unknown[])[];
}[] = [
  { tabla: "citas", claves: (k) => [k.citas.all] },
  { tabla: "pacientes", claves: (k) => [k.pacientes.all] },
  // Presupuestos, sus procedimientos y pagos, odontograma, anamnesis,
  // imágenes y consentimientos cuelgan todos de ["odontologia"].
  { tabla: "presupuestos", claves: () => [["odontologia"]] },
  { tabla: "presupuesto_detalles", claves: () => [["odontologia"]] },
  { tabla: "pagos_presupuesto", claves: () => [["odontologia"]] },
  { tabla: "odontograma_registros", claves: () => [["odontologia"]] },
  { tabla: "evoluciones_clinicas", claves: (k) => [["evoluciones"], k.procedimientos.all] },
  { tabla: "periodontogramas", claves: () => [["periodontogramas"]] },
  { tabla: "recetas", claves: (k) => [k.recetas.all] },
];

// --- Canal compartido -------------------------------------------------------

let canal: RealtimeChannel | null = null;
let usuarios = 0;
let conectado = false;
const avisar = new Set<(estado: boolean) => void>();

function setConectado(estado: boolean) {
  conectado = estado;
  avisar.forEach((fn) => fn(estado));
}

function abrirCanal(queryClient: QueryClient) {
  if (canal) return;
  const nuevo = supabase.channel(CANAL_REALTIME);
  for (const { tabla, claves } of TABLAS_EN_VIVO) {
    nuevo.on("postgres_changes", { event: "*", schema: "public", table: tabla }, () => {
      for (const queryKey of claves(queryKeys)) {
        queryClient.invalidateQueries({ queryKey });
      }
    });
  }
  nuevo.subscribe((status) => setConectado(status === "SUBSCRIBED"));
  canal = nuevo;
}

function cerrarCanal() {
  if (!canal) return;
  supabase.removeChannel(canal);
  canal = null;
  setConectado(false);
}

/**
 * Mantiene viva la escucha de cambios mientras haya al menos una pantalla que
 * la pida. Devuelve si la conexión está establecida (para el indicador).
 */
export function useRealtimeSubscriptions(enabled = true) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(conectado);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    avisar.add(setIsConnected);
    usuarios += 1;
    abrirCanal(queryClient);
    setIsConnected(conectado);

    return () => {
      avisar.delete(setIsConnected);
      usuarios -= 1;
      // Solo se cierra cuando ya no queda nadie escuchando. Al navegar entre
      // rutas el contador nunca llega a cero, así que la conexión no se corta
      // ni se vuelve a abrir en cada pantalla.
      if (usuarios <= 0) {
        usuarios = 0;
        cerrarCanal();
      }
    };
  }, [enabled, queryClient]);

  return { isConnected };
}
