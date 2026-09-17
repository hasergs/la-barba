import '@testing-library/jest-dom/vitest';

// jsdom lacks getUserMedia / MediaStream APIs — provide inert stubs so hooks
// and components can be imported without crashing. Individual tests override.
if (!('mediaDevices' in navigator)) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: () => Promise.reject(new Error('not implemented in jsdom')),
      enumerateDevices: () => Promise.resolve([]),
    },
  });
}
