import React from "react";
import { render, cleanup, act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SwipeableCard, SwipeableCardRef } from "./SwipeableCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockTrack = {
  type: "track" as const,
  track_id: "track-1",
  track_name: "Test Track",
  artist_name: "Test Artist",
  preview_url: "https://example.com/preview.mp3",
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("SwipeableCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("アニメーション完了後にロックが解除され連続スワイプできる", () => {
    const onSwipe = vi.fn();
    const ref = React.createRef<SwipeableCardRef>();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SwipeableCard ref={ref} item={mockTrack} isTop onSwipe={onSwipe} index={0} />
      </QueryClientProvider>
    );

    act(() => {
      ref.current?.swipeLeft();
    });
    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      ref.current?.swipeRight();
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(onSwipe).toHaveBeenNthCalledWith(1, "left", mockTrack);
    expect(onSwipe).toHaveBeenNthCalledWith(2, "right", mockTrack);
  });

  it("キーボード操作でもロックが解除される", () => {
    const onSwipe = vi.fn();
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <SwipeableCard item={mockTrack} isTop onSwipe={onSwipe} index={0} />
      </QueryClientProvider>
    );
    const card = screen.getByLabelText("Test Track by Test Artistをスワイプ");

    act(() => {
      fireEvent.keyDown(card, { key: "ArrowLeft" });
    });
    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      fireEvent.keyDown(card, { key: "ArrowRight" });
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(onSwipe).toHaveBeenNthCalledWith(1, "left", mockTrack);
    expect(onSwipe).toHaveBeenNthCalledWith(2, "right", mockTrack);
  });
});
