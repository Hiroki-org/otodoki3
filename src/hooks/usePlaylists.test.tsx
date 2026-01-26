import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists, type Playlist } from './usePlaylists';
import React from 'react';

// Mock fetch
const mockFetch = vi.fn();

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

    const createWrapper = () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
        const Wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        Wrapper.displayName = 'TestQueryClientProvider';
        return Wrapper;
    };

    it('should return playlists on success', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Favorites', icon: 'heart', count: 10, is_default: true },
            { id: '2', name: 'Rock', icon: 'music', count: 5 },
        ];

        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: mockPlaylists }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockPlaylists);
        expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
    });

    it('should return empty array when no playlists', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ playlists: [] }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual([]);
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

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeInstanceOf(Error);
        expect((result.current.error as any).message).toBe('Failed to fetch playlists');
        expect((result.current.error as any).status).toBe(500);
    });

    it('should handle missing playlists field in response', async () => {
        // Case where response is valid JSON but 'playlists' field is missing or null
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual([]);
    });
});
