import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists, Playlist } from './usePlaylists';

describe('usePlaylists', () => {
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

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('正常系: プレイリストの取得に成功する', async () => {
        const mockPlaylists: Playlist[] = [
            { id: '1', name: 'Playlist 1', icon: '🎵', count: 10 },
            { id: '2', name: 'Playlist 2', icon: '🎸', count: 5 },
        ];

        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
        expect(result.current.error).toBeNull();
    });

    it('異常系: APIエラー時にエラーを返す', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 500,
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('準正常系: データが空の場合は空配列を返す', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: [] }),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('準正常系: レスポンスにplaylistsが含まれない場合は空配列を返す', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({}), // Missing playlists
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
