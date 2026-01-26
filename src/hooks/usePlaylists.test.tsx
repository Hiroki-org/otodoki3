import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePlaylists, Playlist } from "./usePlaylists";
import { ReactNode } from "react";

// QueryClientWrapper の作成
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // テストのタイムアウトを防ぐためリトライを無効化
            },
        },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("usePlaylists", () => {
    beforeEach(() => {
        // fetch のモックをリセット
        vi.unstubAllGlobals();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("正常系: プレイリストの取得に成功する", async () => {
        const mockPlaylists: Playlist[] = [
            { id: "1", name: "Favorites", icon: "heart", count: 10, is_default: true },
            { id: "2", name: "Workout", icon: "activity", count: 5 },
        ];

        // fetch のモック化
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ playlists: mockPlaylists }),
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
    });

    it("異常系: API エラー時にエラー状態になる", async () => {
        // fetch のモック化 (エラー応答)
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
    });

    it("準正常系: データが空の場合に空配列を返す", async () => {
        // fetch のモック化 (空のプレイリスト)
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ playlists: [] }),
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it("準正常系: レスポンスに playlists がない場合に空配列を返す", async () => {
        // fetch のモック化 (playlists キーがない)
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({}),
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
