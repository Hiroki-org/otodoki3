import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylists } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'QueryClientWrapper';
    return Wrapper;
};

describe('usePlaylists', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should return playlists on success', async () => {
        const mockPlaylists = [
            { id: '1', name: 'Playlist 1', icon: 'icon1', count: 10 },
            { id: '2', name: 'Playlist 2', icon: 'icon2', count: 5 },
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
    });

    it('should handle API error', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({}),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
    });

    it('should return empty array when data is empty', async () => {
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

    it('should return empty array when playlists field is missing', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response);

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
