import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists } from './usePlaylists';
import React from 'react';

// Stub global fetch
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Wrapper for React Query
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
    Wrapper.displayName = 'QueryClientProviderWrapper';
    return Wrapper;
};

describe('usePlaylists', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should fetch and return playlists successfully', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Favorites', icon: 'heart', count: 10 },
            { id: '2', name: 'Rock', icon: 'music', count: 5 },
        ];

        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ playlists: mockPlaylists }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(fetchMock).toHaveBeenCalledWith('/api/playlists');
    });

    it('should handle API errors (500)', async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(null, { status: 500, statusText: 'Internal Server Error' })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toEqual(expect.objectContaining({
            message: 'Failed to fetch playlists',
            status: 500
        }));
    });

    it('should return empty array when response is empty or playlists missing', async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({}), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
