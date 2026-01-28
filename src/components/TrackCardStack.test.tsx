import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TrackCardStack } from "./TrackCardStack";
import type { Track } from "../types/track-pool";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mocks
vi.mock("../hooks/useAudioPlayer", () => ({
  useAudioPlayer: () => ({
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    preload: vi.fn(),
    isPlaying: false,
    progress: 0,
  }),
}));

vi.mock("../hooks/useAutoRefill", () => ({
  useAutoRefill: () => ({
    isRefilling: false,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock("./ToastProvider", () => ({
  useToast: () => ({
    push: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

const mockTrack: Track = {
  type: "track",
  track_id: 123,
  track_name: "Test Track",
  artist_name: "Test Artist",
  preview_url: "https://example.com/test.mp3",
};

describe("TrackCardStack", () => {
  let queryClient: QueryClient;
  const originalFetch = global.fetch;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
  });

  const renderComponent = (props: React.ComponentProps<typeof TrackCardStack>) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TrackCardStack {...props} />
      </QueryClientProvider>
    );
  };

  it("Custom Playlist: Left swipe (Dislike) calls DELETE /api/playlists/.../tracks", async () => {
    const fetchMock = global.fetch as any;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    renderComponent({
      tracks: [mockTrack],
      mode: "playlist",
      sourcePlaylist: "custom-uuid-123",
    });

    // Find Dislike button (using aria-label or implementation detail)
    // The Dislike button has aria-label="よくない"
    const dislikeBtn = screen.getByLabelText("よくない");

    // 1st click: Swipe Tutorial Card
    fireEvent.click(dislikeBtn);

    // Wait for tutorial swipe animation to finish (200ms + buffer)
    await new Promise((r) => setTimeout(r, 300));

    // 2nd click: Swipe Track Card
    fireEvent.click(dislikeBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/playlists/custom-uuid-123/tracks"),
        expect.objectContaining({
            method: "DELETE",
            body: JSON.stringify({ track_id: "123" }) // Implementation converts to string
        })
      );
    });
  });

  it("Likes Playlist: Left swipe (Dislike) calls POST /api/tracks/dislike", async () => {
    const fetchMock = global.fetch as any;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    renderComponent({
      tracks: [mockTrack],
      mode: "playlist",
      sourcePlaylist: "likes",
    });

    const dislikeBtn = screen.getByLabelText("よくない");

    // 1st click: Swipe Tutorial Card
    fireEvent.click(dislikeBtn);

    // Wait for tutorial swipe animation to finish (200ms + buffer)
    await new Promise((r) => setTimeout(r, 300));

    // 2nd click: Swipe Track Card
    fireEvent.click(dislikeBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/tracks/dislike"),
        expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ track_id: "123" })
        })
      );
    });
  });
});
