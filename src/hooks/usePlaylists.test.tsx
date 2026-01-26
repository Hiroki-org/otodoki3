import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { usePlaylists } from "./usePlaylists";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock fetch
const fetchMock = vi.fn();

describe("usePlaylists", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
    });

    afterEach(() => {
        queryClient.clear();
        vi.unstubAllGlobals();
    });

    const createWrapper = () => {
        function Wrapper({ children }: { children: React.ReactNode }) {
            return (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            );
        }
        return Wrapper;
    };

    it("should fetch playlists successfully", async () => {
        const mockPlaylists = [
            { id: "1", name: "Favorites", icon: "heart", count: 10 },
            { id: "2", name: "Rock", icon: "music", count: 5 },
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
    });

    it("should handle API error", async () => {
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

    it("should handle empty playlists", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ playlists: [] }),
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });

    it("should return empty array if playlists field is missing", async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}), // Missing 'playlists' key
        });

        const { result } = renderHook(() => usePlaylists(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual([]);
    });
});
