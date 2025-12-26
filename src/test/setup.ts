import '@testing-library/jest-dom';
import { vi } from 'vitest';

// JSDOM doesn't implement HTMLMediaElement methods
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    writable: true,
    value: vi.fn(),
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
    writable: true,
    value: vi.fn(),
});
