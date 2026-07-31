import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import React from "react";

const mockChannel: {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
} = {
  on: vi.fn(),
  subscribe: vi.fn(),
};

mockChannel.on.mockReturnValue(mockChannel);
mockChannel.subscribe.mockImplementation((cb?: (status: string) => void) => {
  if (cb) cb("SUBSCRIBED");
  return mockChannel;
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

import { useRealtimeSubscriptions } from "../use-realtime-subscriptions";
import { supabase } from "@/lib/supabase";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("useRealtimeSubscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockImplementation((cb?: (status: string) => void) => {
      if (cb) cb("SUBSCRIBED");
      return mockChannel;
    });
  });

  it("se suscribe a los eventos de realtime cuando enabled es true", () => {
    const { result } = renderHook(() => useRealtimeSubscriptions(true), { wrapper });

    expect(supabase.channel).toHaveBeenCalledWith("sanidad-realtime-events");
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(result.current.isConnected).toBe(true);
  });

  it("desconecta y remueve el canal al desmontar el hook", () => {
    const { unmount } = renderHook(() => useRealtimeSubscriptions(true), { wrapper });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it("no se suscribe si enabled es false", () => {
    const { result } = renderHook(() => useRealtimeSubscriptions(false), { wrapper });

    expect(supabase.channel).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });
});
