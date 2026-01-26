import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists, Playlist } from './usePlaylists';
import React from 'react';

// Create a wrapper for React Query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // Disable retries for testing
            },
        },
    });

    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('usePlaylists', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', mockFetch);
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should fetch playlists successfully', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Favorites', icon: 'star', count: 10, is_default: true },
            { id: '2', name: 'Chill', icon: 'coffee', count: 5 }
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
        expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
    });

    it('should handle API errors', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({}),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        // The error message comes from the implementation: "Failed to fetch playlists"
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('should handle empty data', async () => {
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

    it('should handle missing playlists field (return empty array)', async () => {
        // According to implementation: return data.playlists ?? [];
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
});
