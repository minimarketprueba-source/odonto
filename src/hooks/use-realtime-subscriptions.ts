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

export const CANAL_REALTIME = "sanidad-realtime-events";

/** Qué cachés se invalidan cuando cambia cada tabla. */
const TABLAS: { tabla: string; claves: (keys: typeof queryKeys) => readonly (readonly unknown[])[] }[] = [
  { tabla: "fichas_rac", claves: (k) => [k.rac.all, k.consultas.all] },
  { tabla: "citas", claves: (k) => [k.citas.all, k.listaEspera.all] },
  { tabla: "lista_espera", claves: (k) => [k.listaEspera.all] },
  { tabla: "atenciones_enfermeria", claves: (k) => [k.enfermeria.all, k.consultas.all] },
  { tabla: "internaciones", claves: (k) => [k.enfermeria.all] },
  { tabla: "consultas", claves: (k) => [k.consultas.all, k.citas.all] },
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
  for (const { tabla, claves } of TABLAS) {
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
