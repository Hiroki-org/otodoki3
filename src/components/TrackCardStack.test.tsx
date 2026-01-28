import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { TrackCardStack } from './TrackCardStack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useAutoRefillModule from '../hooks/useAutoRefill';
import { CardItem, Track } from '../types/track-pool';

// Mock dependencies
vi.mock('../hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isPlaying: false,
    progress: 0,
    preload: vi.fn(),
  }),
}));

vi.mock('../hooks/useAutoRefill', () => ({
  useAutoRefill: vi.fn(),
}));

vi.mock('./ToastProvider', () => ({
  useToast: () => ({
    push: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock('./SwipeableCard', () => ({
  SwipeableCard: () => <div data-testid="swipeable-card">Card</div>,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('TrackCardStack', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.resetAllMocks();
  });

  it('does not log any messages to console.log during refill', () => {
    let capturedOnRefill: ((newTracks: CardItem[]) => void) | undefined;

    vi.mocked(useAutoRefillModule.useAutoRefill).mockImplementation(
      (stack, onRefill) => {
        capturedOnRefill = onRefill;
        return { isRefilling: false, error: null, clearError: vi.fn() };
      }
    );

    const tracks: Track[] = [
      {
        type: 'track',
        track_id: 1,
        track_name: 'Track 1',
        artist_name: 'Artist 1',
        preview_url: 'http://example.com/1.mp3',
      },
    ];

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <TrackCardStack tracks={tracks} />
      </QueryClientProvider>
    );

    expect(capturedOnRefill).toBeDefined();

    // Trigger refill
    const newTracks: CardItem[] = [
      {
        type: 'track',
        track_id: 2,
        track_name: 'Track 2',
        artist_name: 'Artist 2',
        preview_url: 'http://example.com/2.mp3',
      },
    ];

    act(() => {
      capturedOnRefill!(newTracks);
    });

    // Optimization expectation: log IS NOT called at all
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
