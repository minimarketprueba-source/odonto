import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { Toaster, toast } from "sonner";
import { readFileSync } from "node:fs";

/**
 * Este archivo existe por un error que estuvo dando vueltas sin que nadie lo
 * notara: la app montaba el Toaster de shadcn pero NO el de sonner, y 12
 * pantallas avisan con `toast` de sonner. Todos esos mensajes se perdían en
 * silencio — los de "guardado" y también los de error. Se apretaba Guardar y
 * no pasaba nada en la pantalla.
 *
 * Es la trampa 4 del proyecto: algo que parece funcionar y no funciona.
 *
 * Se prueba la librería suelta y no la app entera a propósito: el envoltorio
 * `@/components/ui/sonner` necesita el tema, que necesita la sesión, que
 * necesita el router. Eso probaría los proveedores, no lo que acá importa.
 */

afterEach(cleanup);

describe("avisos de sonner", () => {
  it("con el Toaster montado, el mensaje se ve", async () => {
    render(<Toaster />);
    toast.success("Datos del consultorio guardados.");
    await waitFor(() =>
      expect(screen.getByText("Datos del consultorio guardados.")).toBeInTheDocument()
    );
  });

  it("los errores también se ven", async () => {
    // El que más importa: si un guardado falla y no se ve nada, la persona se
    // va convencida de que quedó guardado.
    render(<Toaster />);
    toast.error("No se pudo guardar.");
    await waitFor(() => expect(screen.getByText("No se pudo guardar.")).toBeInTheDocument());
  });

  it("sin el Toaster montado no se ve nada: así estaba roto", async () => {
    render(<div />);
    toast.success("Este mensaje no lo ve nadie.");
    await new Promise((r) => setTimeout(r, 80));
    expect(screen.queryByText("Este mensaje no lo ve nadie.")).toBeNull();
  });
});

describe("la app monta los dos sistemas de avisos", () => {
  it("App.tsx incluye el Toaster de sonner además del de shadcn", () => {
    // Se lee el archivo en vez de renderizar App, que arrastra router, sesión
    // y consultas. Lo que se quiere garantizar es que nadie borre el import
    // por parecer repetido.
    const app = readFileSync("src/App.tsx", "utf-8");
    expect(app).toContain('from "@/components/ui/sonner"');
    expect(app).toMatch(/<ToasterSonner\s*\/>/);
    expect(app).toMatch(/<Toaster\s*\/>/);
  });

  it("el envoltorio de la app usa el Toaster de la librería sonner", () => {
    const envoltorio = readFileSync("src/components/ui/sonner.tsx", "utf-8");
    expect(envoltorio).toMatch(/from ['"]sonner['"]/);
  });
});
