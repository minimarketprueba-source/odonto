// ============================================================================
// Hook: Suscripciones en Tiempo Real (Supabase Realtime)
// ============================================================================
// Escucha cambios en las tablas clave de la base de datos (Postgres Changes)
// e invalida automáticamente las cachés de React Query para refrescar las
// pantallas sin demoras ni recargas manuales.

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";

export function useRealtimeSubscriptions(enabled = true) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Crear un canal único para los eventos del sistema Sanidad
    const channel = supabase.channel("sanidad-realtime-events");

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fichas_rac" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.rac.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.consultas.all });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "citas" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.citas.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.listaEspera.all });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lista_espera" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.listaEspera.all });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atenciones_enfermeria" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.enfermeria.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.consultas.all });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "internaciones" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.enfermeria.all });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultas" },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.consultas.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.citas.all });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [enabled, queryClient]);

  return { isConnected };
}
