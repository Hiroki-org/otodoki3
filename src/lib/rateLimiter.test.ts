import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from './rateLimiter';

describe('rateLimit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should allow requests within limit', () => {
        const key = 'test-key-1';
        const limit = 5;
        const windowMs = 1000;

        for (let i = 0; i < limit; i++) {
            const result = rateLimit(key, limit, windowMs);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(limit - 1 - i);
        }
    });

    it('should block requests exceeding limit', () => {
        const key = 'test-key-2';
        const limit = 2;
        const windowMs = 1000;

        rateLimit(key, limit, windowMs);
        rateLimit(key, limit, windowMs);

        const result = rateLimit(key, limit, windowMs);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it('should refill tokens after time passes', () => {
        const key = 'test-key-3';
        const limit = 2;
        const windowMs = 1000;

        // Consume all tokens
        rateLimit(key, limit, windowMs);
        rateLimit(key, limit, windowMs);
        expect(rateLimit(key, limit, windowMs).allowed).toBe(false);

        // Advance time by windowMs
        vi.advanceTimersByTime(windowMs);

        // Should be allowed again
        const result = rateLimit(key, limit, windowMs);
        expect(result.allowed).toBe(true);
    });

    it('should refill tokens proportionally', () => {
        const key = 'test-key-4';
        const limit = 10;
        const windowMs = 1000;

        // Consume all tokens
        for (let i = 0; i < limit; i++) {
            rateLimit(key, limit, windowMs);
        }
        expect(rateLimit(key, limit, windowMs).allowed).toBe(false);

        // Advance time by half windowMs
        vi.advanceTimersByTime(windowMs / 2);

        // Should have refilled about half tokens
        const result = rateLimit(key, limit, windowMs);
        expect(result.allowed).toBe(true);
        // We consumed 1, so remaining should be around 4 (5 refilled - 1 consumed)
        expect(result.remaining).toBeGreaterThanOrEqual(3);
    });
});
