import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylists, Playlist } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a wrapper for the hook with a fresh QueryClient
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
    Wrapper.displayName = 'QueryClientWrapper';
    return Wrapper;
};

describe('usePlaylists', () => {
    beforeEach(() => {
        // Mock global fetch
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        // Clean up mock
        vi.unstubAllGlobals();
    });

    it('should fetch and return playlists successfully', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Favorites', icon: 'heart', count: 10, is_default: true },
            { id: '2', name: 'Workout', icon: 'activity', count: 5 },
        ];

        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: mockPlaylists }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
    });

    it('should handle API errors (500)', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        // Verify error properties if possible, but the hook implementation just sets message "Failed to fetch playlists"
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('should handle empty data', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: [] }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it('should return empty array if response data is missing playlists field', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}), // No playlists field
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
