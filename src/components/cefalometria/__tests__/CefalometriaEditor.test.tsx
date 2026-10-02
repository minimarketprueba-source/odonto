import { fireEvent, render } from '@testing-library/react';
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
});
