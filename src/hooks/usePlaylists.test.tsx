import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists } from './usePlaylists';
import { ReactNode } from 'react';

// fetchのモック
const mockFetch = vi.fn();

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: ReactNode }) => (
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

    it('プレイリストを正常に取得できること', async () => {
        const mockData = {
            playlists: [
                { id: '1', name: 'Playlist 1', icon: '🎵', count: 10 },
                { id: '2', name: 'Playlist 2', icon: '🎸', count: 5 },
            ],
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockData.playlists);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(false);
    });

    it('プレイリストが空の場合を処理できること', async () => {
        const mockData = { playlists: [] };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('playlistsプロパティが欠落している場合を処理できること', async () => {
        // playlistsプロパティがないレスポンス
        const mockData = {};

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('APIエラーを処理できること', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
    });
});
