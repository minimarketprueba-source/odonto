import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../protected-route";

const authState = vi.hoisted(() => ({
  user: null as any,
  role: null as string | null,
  permissions: null as Record<string, string[]> | null,
  isLoading: false,
  logout: vi.fn(),
}));

vi.mock("@/context/auth-context", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => authState,
}));

vi.mock("@/hooks/use-realtime-subscriptions", () => ({
  useRealtimeSubscriptions: vi.fn(),
}));

describe("ProtectedRoute - Guardias de Navegación y Roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.role = null;
    authState.permissions = null;
    authState.isLoading = false;
  });

  it("redirecciona a /auth/login si el usuario no está autenticado", () => {
    render(
      <MemoryRouter initialEntries={["/pacientes"]}>
        <Routes>
          <Route path="/auth/login" element={<div>Pantalla de Login</div>} />
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute moduleKey="pacientes">
                <div>Contenido Privado</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Pantalla de Login")).toBeDefined();
    expect(screen.queryByText("Contenido Privado")).toBeNull();
  });

  it("permite el acceso si la persona tiene rol de Sanidad y permiso en el módulo", () => {
    authState.user = { id: "user-123", email: "medico@sanidad-citas.local" };
    authState.role = "medico";
    authState.permissions = { pacientes: ["ver", "editar"] };

    render(
      <MemoryRouter initialEntries={["/pacientes"]}>
        <Routes>
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute moduleKey="pacientes">
                <div>Pacientes Registrados</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Pacientes Registrados")).toBeDefined();
  });

  it("redirecciona al Dashboard (/) si tiene rol de Sanidad pero carece de permiso en el módulo", () => {
    authState.user = { id: "user-123", email: "medico@sanidad-citas.local" };
    authState.role = "medico";
    authState.permissions = { citas: ["ver"] }; // Sin permiso en 'usuarios'

    render(
      <MemoryRouter initialEntries={["/usuarios"]}>
        <Routes>
          <Route path="/" element={<div>Dashboard Principal</div>} />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute moduleKey="usuarios">
                <div>Gestión de Usuarios</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Dashboard Principal")).toBeDefined();
    expect(screen.queryByText("Gestión de Usuarios")).toBeNull();
  });

  it("muestra la pantalla 'Sin acceso a Sanidad' para roles ajenos como analyst/viewer (Control-Peso)", () => {
    authState.user = { id: "user-cp", email: "analista@control-peso.local" };
    authState.role = "analyst"; // Rol exclusivo de la otra app
    authState.permissions = { cadetes: ["ver"] };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Dashboard de Sanidad</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Sin acceso a Sanidad")).toBeDefined();
    expect(screen.queryByText("Dashboard de Sanidad")).toBeNull();
  });
});
