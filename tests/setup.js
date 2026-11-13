import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });
