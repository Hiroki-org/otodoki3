import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePlaylists } from "./usePlaylists";
import type { Playlist } from "./usePlaylists";
import { ReactNode } from "react";

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Wrapper for QueryClient
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

describe("usePlaylists", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("api/playlists からデータを正常に取得できること", async () => {
    const mockPlaylists: Playlist[] = [
      { id: "1", name: "Playlist 1", icon: "icon1", count: 10, is_default: true },
      { id: "2", name: "Playlist 2", icon: "icon2", count: 5 },
    ];

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    });

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPlaylists);
    expect(fetchMock).toHaveBeenCalledWith("/api/playlists");
  });

  it("APIエラー時にエラーをスローすること", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Failed to fetch playlists");
  });

  it("レスポンスに配列が含まれない場合は空配列を返すこと", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // missing playlists
    });

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});
