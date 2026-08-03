import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import React from "react";

/**
 * Doble del canal de Supabase que se comporta como el real: una vez llamado
 * `subscribe()`, agregar otro `on("postgres_changes", ...)` lanza el mismo
 * error que rompía la pantalla en producción.
 */
function crearCanalFalso() {
  const canal = {
    suscrito: false,
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  canal.on.mockImplementation((tipo: string) => {
    if (canal.suscrito && tipo === "postgres_changes") {
      throw new Error(
        "cannot add `postgres_changes` callbacks for realtime:sanidad-realtime-events after `subscribe()`."
      );
    }
    return canal;
  });
  canal.subscribe.mockImplementation((cb?: (status: string) => void) => {
    canal.suscrito = true;
    if (cb) cb("SUBSCRIBED");
    return canal;
  });
  return canal;
}

let canalFalso = crearCanalFalso();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    // El Supabase real devuelve el MISMO canal si ya existe uno con ese nombre.
    channel: vi.fn(() => canalFalso),
    removeChannel: vi.fn(() => {
      canalFalso = crearCanalFalso();
    }),
  },
}));

import { useRealtimeSubscriptions, CANAL_REALTIME } from "../use-realtime-subscriptions";
import { supabase } from "@/lib/supabase";

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useRealtimeSubscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canalFalso = crearCanalFalso();
  });

  it("se suscribe a los eventos de realtime cuando enabled es true", () => {
    const { result } = renderHook(() => useRealtimeSubscriptions(true), { wrapper });

    expect(supabase.channel).toHaveBeenCalledWith(CANAL_REALTIME);
    expect(canalFalso.on).toHaveBeenCalled();
    expect(canalFalso.subscribe).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);
  });

  it("no se suscribe si enabled es false", () => {
    const { result } = renderHook(() => useRealtimeSubscriptions(false), { wrapper });

    expect(supabase.channel).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  it("dos pantallas a la vez comparten un solo canal, sin volver a suscribirse", () => {
    // ProtectedRoute envuelve cada ruta: al navegar hay dos montados a la vez.
    // Si cada uno abriera su canal, el segundo .on() sobre el canal ya suscrito
    // lanzaría "cannot add postgres_changes callbacks ... after subscribe()".
    const primera = renderHook(() => useRealtimeSubscriptions(true), { wrapper });
    const segunda = renderHook(() => useRealtimeSubscriptions(true), { wrapper });

    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(canalFalso.subscribe).toHaveBeenCalledTimes(1);
    expect(segunda.result.current.isConnected).toBe(true);

    primera.unmount();
    segunda.unmount();
  });

  it("navegar entre pantallas no corta la conexión", () => {
    const anterior = renderHook(() => useRealtimeSubscriptions(true), { wrapper });
    // La ruta nueva se monta antes de que la anterior se desmonte.
    const nueva = renderHook(() => useRealtimeSubscriptions(true), { wrapper });
    anterior.unmount();

    expect(supabase.removeChannel).not.toHaveBeenCalled();
    expect(nueva.result.current.isConnected).toBe(true);

    nueva.unmount();
  });

  it("cierra el canal recién cuando se desmonta la última pantalla", () => {
    const primera = renderHook(() => useRealtimeSubscriptions(true), { wrapper });
    const segunda = renderHook(() => useRealtimeSubscriptions(true), { wrapper });
    const canalAbierto = canalFalso;

    primera.unmount();
    expect(supabase.removeChannel).not.toHaveBeenCalled();

    segunda.unmount();
    expect(supabase.removeChannel).toHaveBeenCalledWith(canalAbierto);
  });
});
