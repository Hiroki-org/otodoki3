import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterAll, beforeEach } from "vitest";
import { usePlaylists } from "./usePlaylists";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Mock data
const mockPlaylists = [
    { id: "1", name: "Favorites", icon: "heart", count: 10 },
    { id: "2", name: "Driving", icon: "car", count: 5 },
];

describe("usePlaylists", () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    beforeEach(() => {
        fetchSpy.mockReset();
    });

    afterAll(() => {
        fetchSpy.mockRestore();
    });

    const createWrapper = () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        return function TestQueryClientProvider({ children }: { children: ReactNode }) {
            return (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );
        };
    };

    it("successfully fetches playlists", async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify({ playlists: mockPlaylists }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockPlaylists);
    });

    it("handles API errors gracefully", async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response(null, {
                status: 500,
                statusText: "Internal Server Error",
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
    });

    it("returns empty array when no playlists found", async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify({ playlists: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it("returns empty array when response structure is invalid/missing playlists", async () => {
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify({}), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            })
        );

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
