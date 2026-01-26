import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylists } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import type { ReactNode } from 'react';

// Fetch mock
const mockFetch = vi.fn();

// Use stubGlobal as recommended
beforeAll(() => {
    vi.stubGlobal('fetch', mockFetch);
});

afterAll(() => {
    vi.unstubAllGlobals();
});

// Setup wrapper
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // Important for testing errors
            },
        },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('usePlaylists', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('正常系: プレイリストが正しく取得できる', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Favorites', icon: 'heart', count: 10 },
            { id: '2', name: 'Rock', icon: 'guitar', count: 5 },
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

    it('異常系: APIエラー時にエラーとなる', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({}), // Added as recommended
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
    });

    it('準正常系: レスポンスにplaylistsが含まれない場合、空配列を返す', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}), // Missing playlists
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
        // Assert fetch call as recommended
        expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
    });

    it('準正常系: プレイリストが空の場合、空配列を返す', async () => {
         mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ playlists: [] }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
        expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
    });
});
