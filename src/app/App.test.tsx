import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// MediaPipe no funciona en jsdom: se sustituye por un doble inerte.
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: vi.fn().mockResolvedValue({}) },
  FaceLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: () => ({ faceLandmarks: [] }),
      close: () => undefined,
    }),
  },
}));

import App from './App';

/** MediaStream falso: jsdom no lo implementa. */
function fakeStream() {
  const track = {
    stop: vi.fn(),
    getSettings: () => ({ width: 1280, height: 720 }),
  };
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  };
}

describe('App — integración', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream()) },
    });
  });

  it('muestra la pantalla de permiso y el aviso de privacidad', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'La Barba' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Activar cámara' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ninguna imagen sale de tu teléfono/i),
    ).toBeInTheDocument();
  });

  it('al activar la cámara entra en modo directo y muestra el selector', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Activar cámara' }));

    await waitFor(() => {
      expect(screen.getByText('Estilo de barba')).toBeInTheDocument();
    });

    // Los 5 estilos están disponibles.
    expect(screen.getByText('Barba completa')).toBeInTheDocument();
    expect(screen.getByText('Perilla y bigote')).toBeInTheDocument();
    expect(screen.getByText('Perilla sola')).toBeInTheDocument();
    expect(screen.getByText('Barba italiana')).toBeInTheDocument();
    expect(screen.getByText('Bigote solo')).toBeInTheDocument();

    // El elemento de vídeo está presente.
    expect(document.querySelector('video')).not.toBeNull();
  });

  it('permite seleccionar un estilo y abre la guía', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Activar cámara' }));
    await waitFor(() =>
      expect(screen.getByText('Estilo de barba')).toBeInTheDocument(),
    );

    await user.click(screen.getByText('Barba italiana'));

    // La ficha del estilo seleccionado aparece en el panel inferior.
    const panelHeader = await screen.findByRole('button', {
      name: 'Guía: Barba italiana',
    });
    expect(panelHeader).toHaveAttribute('aria-expanded', 'false');

    await user.click(panelHeader);
    expect(panelHeader).toHaveAttribute('aria-expanded', 'true');

    // Sin forma de rostro detectada aún, pide centrar el rostro.
    expect(
      screen.getByText(/Coloca tu rostro frente a la cámara/i),
    ).toBeInTheDocument();
  });
});
