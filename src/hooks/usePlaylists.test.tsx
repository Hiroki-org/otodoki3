import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlaylists } from './usePlaylists';
import { ReactNode } from 'react';

// Mock fetch
const fetchSpy = vi.spyOn(global, 'fetch');

// Helper to create a wrapper with a new QueryClient for each test
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
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('successfully fetches and returns playlists', async () => {
    const mockPlaylists = [
      { id: '1', name: 'Favorites', icon: 'heart', count: 10 },
      { id: '2', name: 'Chill', icon: 'music', count: 5 },
    ];

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    } as Response);

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPlaylists);
    expect(fetchSpy).toHaveBeenCalledWith('/api/playlists');
  });

  it('handles error when fetch fails', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Failed to fetch playlists');
  });

  it('returns empty array when data is empty', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: [] }),
    } as Response);

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('returns empty array when response does not contain playlists', async () => {
    fetchSpy.mockResolvedValueOnce({
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
