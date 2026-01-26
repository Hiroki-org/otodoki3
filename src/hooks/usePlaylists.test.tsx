import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists, Playlist } from './usePlaylists';
import React from 'react';

// Mock fetch
const mockFetch = vi.fn();

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
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
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Playlist 1', icon: 'icon1', count: 10 },
            { id: '2', name: 'Playlist 2', icon: 'icon2', count: 5, is_default: true },
        ];

        mockFetch.mockResolvedValueOnce({
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
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        // The error thrown in usePlaylists has a status property
        expect((result.current.error as any).message).toBe('Failed to fetch playlists');
        expect((result.current.error as any).status).toBe(500);
    });

    it('should return empty array when no playlists found', async () => {
        mockFetch.mockResolvedValueOnce({
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
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
