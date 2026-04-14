import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

global.fetch = vi.fn();

global.EventSource = vi.fn(() => ({
  onmessage: null,
  onerror: null,
  close: vi.fn(),
}));
