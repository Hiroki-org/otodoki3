import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists, Playlist } from './usePlaylists';
import React from 'react';

// Mock data
const mockPlaylists: Playlist[] = [
    { id: '1', name: 'Playlist 1', icon: 'icon1', count: 10, is_default: true },
    { id: '2', name: 'Playlist 2', icon: 'icon2', count: 5, is_default: false },
];

const mockFetch = vi.fn();

describe('usePlaylists', () => {
    // Setup global fetch mock
    beforeAll(() => {
        vi.stubGlobal('fetch', mockFetch);
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    beforeEach(() => {
        mockFetch.mockReset();
    });

    // Wrapper component generator
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
        Wrapper.displayName = 'QueryClientWrapper';
        return Wrapper;
    };

    it('正常系: プレイリスト一覧が取得できること', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
    });

    it('異常系: 500エラーをハンドリングできること', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({}),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result.current.error as any).status).toBe(500);
    });

    it('エッジケース: 空のレスポンスが返された場合は空配列になること', async () => {
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

    it('エッジケース: playlistsフィールドが存在しない場合は空配列になること', async () => {
         mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}), // No playlists field
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
