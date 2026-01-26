import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists } from './usePlaylists';
import { ReactNode } from 'react';

// Mock fetch
const mockFetch = vi.fn();

// Wrapper for React Query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Assign display name to avoid ESLint warnings if necessary, though not strictly required for tests
    Wrapper.displayName = 'QueryClientWrapper';

    return Wrapper;
};

describe('usePlaylists', () => {
    const originalFetch = global.fetch;

    beforeAll(() => {
        global.fetch = mockFetch;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('should fetch playlists successfully', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Playlist 1', icon: '🎵', count: 10 },
            { id: '2', name: 'Playlist 2', icon: '🔥', count: 5 },
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: mockPlaylists }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        // The hook throws an Error with a status property
        expect((result.current.error as any).message).toBe('Failed to fetch playlists');
        expect((result.current.error as any).status).toBe(500);
    });

    it('should handle empty data (missing playlists field)', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}), // Missing playlists field
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('should handle empty data (empty playlists array)', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: [] }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
