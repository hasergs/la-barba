import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Estado compartido con la factoría de `vi.mock` (debe declararse con
 * `vi.hoisted` porque `vi.mock` se eleva por encima de los imports).
 */
const state = vi.hoisted(() => ({
  calls: [] as string[],
  gpuBehavior: 'never' as 'never' | 'reject' | 'resolve',
  cpuBehavior: 'resolve' as 'resolve' | 'reject',
}));

interface FakeOptions {
  baseOptions: { delegate: string };
}

function fakeLandmarker() {
  return {
    close: () => undefined,
    detectForVideo: () => ({ faceLandmarks: [] }),
  };
}

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: async () => ({}) },
  FaceLandmarker: {
    createFromOptions: async (_vision: unknown, options: FakeOptions) => {
      const delegate = options.baseOptions.delegate;
      state.calls.push(delegate);

      if (delegate === 'GPU') {
        if (state.gpuBehavior === 'never') {
          // Reproduce el cuelgue real: la promesa nunca se resuelve ni rechaza.
          return new Promise(() => undefined);
        }
        if (state.gpuBehavior === 'reject') {
          throw new Error('GPU no disponible');
        }
      }

      if (delegate === 'CPU' && state.cpuBehavior === 'reject') {
        throw new Error('CPU no disponible');
      }

      return fakeLandmarker();
    },
  },
}));

/** Reimporta el módulo para limpiar el singleton interno entre tests. */
async function freshModule() {
  vi.resetModules();
  return await import('./useFaceLandmarker');
}

beforeEach(() => {
  state.calls.length = 0;
  state.gpuBehavior = 'never';
  state.cpuBehavior = 'resolve';
});

describe('loadFaceLandmarker', () => {
  it('usa CPU como delegate por defecto (rápido y fiable en móvil)', async () => {
    const mod = await freshModule();
    expect(mod.DEFAULT_VISION_DELEGATE).toBe('CPU');
  });

  it('con CPU por defecto carga en un solo intento, sin GPU', async () => {
    const mod = await freshModule();
    await mod.loadFaceLandmarker();
    expect(state.calls).toEqual(['CPU']);
  });

  it('NO se queda colgado si el delegate GPU nunca responde: cae a CPU', async () => {
    state.gpuBehavior = 'never';
    const mod = await freshModule();

    const landmarker = await mod.loadFaceLandmarker('GPU', { gpuTimeoutMs: 60 });

    expect(landmarker).toBeTruthy();
    expect(state.calls).toContain('GPU');
    expect(state.calls).toContain('CPU');
  });

  it('cae a CPU si el delegate GPU lanza', async () => {
    state.gpuBehavior = 'reject';
    const mod = await freshModule();

    await mod.loadFaceLandmarker('GPU', { gpuTimeoutMs: 1000 });

    expect(state.calls).toEqual(['GPU', 'CPU']);
  });

  it('reutiliza la instancia CPU (singleton)', async () => {
    const mod = await freshModule();
    await mod.loadFaceLandmarker('CPU');
    await mod.loadFaceLandmarker('CPU');
    expect(state.calls.filter((delegate) => delegate === 'CPU')).toHaveLength(1);
  });

  it('expone un error claro y permite reintentar si CPU falla', async () => {
    state.cpuBehavior = 'reject';
    const mod = await freshModule();

    await expect(mod.loadFaceLandmarker('CPU')).rejects.toThrow(
      /No se pudo iniciar el modelo de detección facial/,
    );

    state.cpuBehavior = 'resolve';
    await expect(mod.loadFaceLandmarker('CPU')).resolves.toBeTruthy();
  });
});
