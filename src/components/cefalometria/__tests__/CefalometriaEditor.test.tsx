import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CefalometriaEditor } from '../CefalometriaEditor';
import type { EstudioCefalometrico } from '@/types/cefalometria';

vi.mock('@/api/cefalometria', () => ({
  esRutaDeposito: () => false,
  useUrlImagenCefalometria: () => ({ data: undefined, isError: false }),
}));

vi.mock('@/lib/imprimir', () => ({ imprimirInformeCefalometrico: vi.fn() }));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const estudio: EstudioCefalometrico = {
  id: 'estudio-1',
  paciente_id: 'paciente-1',
  fecha: '2026-10-02',
  titulo: 'Teleradiografía lateral',
  tipo: 'teleradiografia_lateral',
  imagen_url: 'data:image/png;base64,iVBORw0KGgo=',
  puntos: {},
  calibracion: { distanciaRealMm: 10 },
};

describe('CefalometriaEditor', () => {
  it('coloca el primer punto de Ricketts al hacer clic sobre la radiografía', () => {
    const { container } = render(<CefalometriaEditor estudio={estudio} onGuardar={vi.fn()} />);
    const imagen = container.querySelector('img') as HTMLImageElement;
    Object.defineProperty(imagen, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 800, height: 800 }),
    });

    const superficie = container.querySelector('svg.absolute');
    expect(superficie).not.toBeNull();
    fireEvent.mouseDown(superficie!.querySelector('rect')!, { clientX: 400, clientY: 420 });

    expect(superficie!.querySelector('circle[cx="400"][cy="420"]')).toBeInTheDocument();
  });

  it('permite scroll bidireccional y redimensiona el lienzo al hacer zoom', () => {
    const { container, getByTitle } = render(<CefalometriaEditor estudio={estudio} onGuardar={vi.fn()} />);
    const scroller = container.querySelector('.overflow-auto');
    expect(scroller).not.toBeNull();

    const canvasWrapper = scroller!.querySelector('.relative.inline-block') as HTMLElement;
    expect(canvasWrapper.style.width).toBe('800px');
    expect(canvasWrapper.style.height).toBe('800px');

    fireEvent.click(getByTitle('Acercar (Zoom In)'));
    expect(canvasWrapper.style.width).toBe('960px');
    expect(canvasWrapper.style.height).toBe('960px');

    fireEvent.click(getByTitle('Restablecer vista 100% y posición'));
    expect(canvasWrapper.style.width).toBe('800px');
    expect(canvasWrapper.style.height).toBe('800px');
  });

  it('reorganiza Cambiar imagen y Limpiar trazado en la barra y alterna el modo Solo Rayos X', () => {
    const { getByRole, queryByRole } = render(
      <CefalometriaEditor estudio={estudio} onGuardar={vi.fn()} />
    );

    expect(getByRole('button', { name: /Cambiar imagen/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /Limpiar trazado/i })).toBeInTheDocument();

    const btnSoloRayosX = getByRole('button', { name: /Solo Rayos X/i });
    fireEvent.click(btnSoloRayosX);

    expect(queryByRole('button', { name: /Cambiar imagen/i })).toBeNull();
    expect(queryByRole('button', { name: /Limpiar trazado/i })).toBeNull();

    const btnMostrarEdicion = getByRole('button', { name: /Mostrar edición/i });
    fireEvent.click(btnMostrarEdicion);

    expect(getByRole('button', { name: /Cambiar imagen/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /Limpiar trazado/i })).toBeInTheDocument();
  });

  it('convierte URLs remotas de imagen a blob: same-origin para evitar tainting de canvas y las revoca al desmontar', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['img'], { type: 'image/jpeg' }),
    } as Response);
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    const createSpy = vi.fn().mockReturnValue('blob:https://odonto-pied.vercel.app/mock-xray');
    const revokeSpy = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createSpy,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeSpy,
    });

    try {
      const estudioRemoto: EstudioCefalometrico = {
        ...estudio,
        id: 'estudio-remoto',
        imagen_url: 'https://ejemplo.supabase.co/storage/v1/object/sign/cefalometria/placa.jpg',
      };
      const { container, unmount } = render(
        <CefalometriaEditor estudio={estudioRemoto} onGuardar={vi.fn()} />
      );

      await waitFor(() => {
        const imagen = container.querySelector('img') as HTMLImageElement | null;
        expect(imagen?.getAttribute('src')).toBe('blob:https://odonto-pied.vercel.app/mock-xray');
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        estudioRemoto.imagen_url,
        expect.objectContaining({ mode: 'cors', cache: 'no-store' })
      );

      unmount();
      expect(revokeSpy).toHaveBeenCalledWith('blob:https://odonto-pied.vercel.app/mock-xray');
    } finally {
      fetchSpy.mockRestore();
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: origCreateObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: origRevokeObjectURL,
      });
    }
  });
});
