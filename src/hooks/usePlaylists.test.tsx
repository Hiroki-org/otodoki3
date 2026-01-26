import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePlaylists, Playlist } from "./usePlaylists";
import { ReactNode } from "react";

// Mock data
const mockPlaylists: Playlist[] = [
  { id: "1", name: "Favorites", icon: "heart", count: 10, is_default: true },
  { id: "2", name: "Gym", icon: "dumbbell", count: 25 },
];

// Helper to create a wrapper
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

describe("usePlaylists", () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("正常系: プレイリストの取得に成功する", async () => {
    // Mock fetch response
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

  it("異常系: APIエラー (500) の場合にエラーを返す", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    const { result } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
    // Check if the error object has status property as implemented in fetchPlaylists
    expect((result.current.error as any).status).toBe(500);
    expect(result.current.error?.message).toBe("Failed to fetch playlists");
  });

  it("準正常系: データが空またはフィールドが不足している場合に空配列を返す", async () => {
    // Case 1: playlists is undefined
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // Missing playlists field
    } as Response);

    const { result: result1 } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    expect(result1.current.data).toEqual([]);

    // Case 2: playlists is empty array
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: [] }),
    } as Response);

    const { result: result2 } = renderHook(() => usePlaylists(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(result2.current.data).toEqual([]);
  });
});
