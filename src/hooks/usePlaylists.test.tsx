import { renderHook, waitFor } from '@testing-library/react';
import { usePlaylists } from './usePlaylists';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactNode } from 'react';

// Wrapper for QueryClientProvider
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    }
    Wrapper.displayName = 'QueryClientWrapper';

    return Wrapper;
};

describe('usePlaylists', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    beforeEach(() => {
        fetchSpy.mockReset();
    });

    afterEach(() => {
        fetchSpy.mockReset();
    });

    it('should fetch playlists successfully', async () => {
        const mockData = {
            playlists: [
                { id: '1', name: 'Favorites', icon: 'heart', count: 10 },
                { id: '2', name: 'Chill', icon: 'music', count: 5 },
            ],
        };

        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(mockData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockData.playlists);
    });

    it('should handle API errors', async () => {
        fetchSpy.mockResolvedValueOnce(new Response(null, {
            status: 500,
            statusText: 'Internal Server Error',
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
    });

    it('should return empty array if playlists field is missing', async () => {
        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it('should return empty array if response is empty', async () => {
        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ playlists: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
