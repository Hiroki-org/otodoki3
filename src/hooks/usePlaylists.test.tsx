import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlaylists, Playlist } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

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
    return Wrapper;
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

    it('should fetch and return playlists successfully', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Playlist 1', icon: 'music', count: 10 },
            { id: '2', name: 'Playlist 2', icon: 'star', count: 5 },
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
    });

    it('should handle API error', async () => {
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
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('should return empty array when data is empty', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: [] }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('should return empty array when playlists field is missing', async () => {
         mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({}), // Missing playlists field
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
