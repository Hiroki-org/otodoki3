import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists, Playlist } from './usePlaylists';
import { ReactNode } from 'react';

// Mock data
const mockPlaylists: Playlist[] = [
    { id: '1', name: 'Favorites', icon: 'heart', count: 10, is_default: true },
    { id: '2', name: 'Workout', icon: 'activity', count: 5 }
];

describe('usePlaylists Hook', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        // Reset mocks
        vi.restoreAllMocks();

        // Setup QueryClient with retries disabled
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        // Mock fetch
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    it('正常系: プレイリストの取得に成功する', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ playlists: mockPlaylists }),
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(global.fetch).toHaveBeenCalledWith('/api/playlists');
        expect(result.current.data).toEqual(mockPlaylists);
        expect(result.current.isLoading).toBe(false);
    });

    it('異常系: APIエラー時にエラーを返す', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Failed to fetch playlists');
    });

    it('準正常系: レスポンスにプレイリストが含まれない場合は空配列を返す', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({}), // Missing 'playlists' key
        });

        const { result } = renderHook(() => usePlaylists(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
