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

  it('does not log when tracks are refilled (Optimized)', () => {
    let capturedOnRefill: ((newTracks: CardItem[]) => void) | undefined;

    vi.mocked(useAutoRefillModule.useAutoRefill).mockImplementation(
      (stack, onRefill) => {
        capturedOnRefill = onRefill;
        return { isRefilling: false, error: null, clearError: vi.fn() };
      }
    );

    const tracks: Track[] = [
      { track_id: 1, name: 'Track 1' } as any,
    ];

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <TrackCardStack tracks={tracks} />
      </QueryClientProvider>
    );

    expect(capturedOnRefill).toBeDefined();

    // Trigger refill
    const newTracks: Track[] = [{ track_id: 2, name: 'Track 2' } as any];
    act(() => {
      capturedOnRefill!(newTracks);
    });

    // Optimization expectation: log IS NOT called
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Added 1 unique tracks')
    );
  });
});
