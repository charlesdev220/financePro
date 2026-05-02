import { webcrypto } from 'crypto';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import '@testing-library/jest-dom';

try {
  setupZoneTestEnv();
} catch (error) {
  // @angular-builders/jest ya inicializa el entorno, pero npx jest lo necesita.
  if (!(error instanceof Error && error.message.includes('already been called'))) {
    throw error;
  }
}

// jsdom no implementa Web Crypto API — polyfill con la implementación nativa de Node.js
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

// jsdom no tiene canvas — mock mínimo para Chart.js
const mockCtx: Record<string, unknown> = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  strokeText: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  arcTo: jest.fn(),
  ellipse: jest.fn(),
  fill: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({
    width: 0,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 0,
    fontBoundingBoxAscent: 0,
    fontBoundingBoxDescent: 0,
  })),
  transform: jest.fn(),
  rect: jest.fn(),
  roundRect: jest.fn(),
  clip: jest.fn(),
  isPointInPath: jest.fn(() => false),
  isPointInStroke: jest.fn(() => false),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createConicGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createPattern: jest.fn(() => null),
  canvas: { width: 300, height: 150 },
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => mockCtx),
  configurable: true,
});
