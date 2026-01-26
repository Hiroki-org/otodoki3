import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists } from './usePlaylists';
import React from 'react';

// Mock fetch
const mockFetch = vi.fn();

// Wrapper for QueryClientProvider
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('usePlaylists', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', mockFetch);
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should return playlists successfully', async () => {
        const mockPlaylists = [
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
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(false);
    });

    it('should handle API error (e.g., 500)', async () => {
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
        // The error message is "Failed to fetch playlists" as per implementation
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('should return empty array when API returns empty playlists', async () => {
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

    it('should return empty array when API response does not contain playlists field', async () => {
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
