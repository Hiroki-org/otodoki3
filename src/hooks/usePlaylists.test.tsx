import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylists } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const fetchMock = vi.fn();

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
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('正常系: プレイリストが正しく取得できること', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Favorites', icon: 'heart', count: 10 },
            { id: '2', name: 'Rock', icon: 'music', count: 5 },
        ];

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
    });

    it('異常系: APIエラー時にエラーハンドリングされること', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        // @ts-expect-error custom error property
        expect(result.current.error?.status).toBe(500);
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('準正常系: データが空の場合、空配列が返されること', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: [] }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it('準正常系: レスポンスにplaylistsが含まれない場合、空配列が返されること', async () => {
        fetchMock.mockResolvedValue({
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
