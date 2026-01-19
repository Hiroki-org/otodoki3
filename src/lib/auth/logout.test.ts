import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logout } from './logout';

// Mock createClient
const mockSignOut = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: {
            signOut: mockSignOut,
        },
    }),
}));

describe('logout', () => {
    let originalLocation: Location;

    beforeEach(() => {
        // Save original location
        originalLocation = window.location;

        // Mock window.location
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).location;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).location = { href: '' };

        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore original location
        window.location = originalLocation;
    });

    it('Supabase の signOut を呼び出し、ログインページへリダイレクトする', async () => {
        await logout();

        expect(mockSignOut).toHaveBeenCalledTimes(1);
        expect(window.location.href).toBe('/login');
    });
});
