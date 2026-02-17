import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackCardStack } from './TrackCardStack';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useAutoRefill } from '../hooks/useAutoRefill';
import { useToast } from './ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import { Track } from '../types/track-pool';

// モックの定義
vi.mock('../hooks/useAudioPlayer');
vi.mock('../hooks/useAutoRefill');
vi.mock('./ToastProvider');
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

// SwipeableCard のモック
vi.mock('./SwipeableCard', async () => {
  const React = await import('react');
  return {
    SwipeableCard: React.forwardRef(({ item, onSwipe, isTop, index }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        swipeLeft: () => onSwipe('left', item),
        swipeRight: () => onSwipe('right', item),
      }));
      return (
        <div data-testid={`card-${index}`} aria-label={item.track_name ? `${item.track_name}をスワイプ` : 'チュートリアルカードをスワイプ'}>
          {item.track_name || 'Tutorial'}
          {isTop && <button onClick={() => onSwipe('right', item)}>Swipe Right</button>}
          {isTop && <button onClick={() => onSwipe('left', item)}>Swipe Left</button>}
        </div>
      );
    }),
  };
});

// fetch のモック
const mockFetch = vi.fn();

const mockTracks: Track[] = [
  {
    id: 1,
    track_id: 101,
    artist_name: 'Artist 1',
    track_name: 'Track 1',
    preview_url: 'https://example.com/preview1.mp3',
    artwork_url: 'https://example.com/artwork1.jpg',
    weight: 1,
    fetched_at: new Date().toISOString(),
  },
  {
    id: 2,
    track_id: 102,
    artist_name: 'Artist 2',
    track_name: 'Track 2',
    preview_url: 'https://example.com/preview2.mp3',
    artwork_url: 'https://example.com/artwork2.jpg',
    weight: 1,
    fetched_at: new Date().toISOString(),
  },
];

describe('TrackCardStack', () => {
  const mockPlay = vi.fn();
  const mockStop = vi.fn();
  const mockPause = vi.fn();
  const mockResume = vi.fn();
  const mockPreload = vi.fn();
  const mockPushToast = vi.fn();
  const mockInvalidateQueries = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトはリアルタイマーを使用 (waitForの動作を妨げないため)
    vi.useRealTimers();
    vi.stubGlobal('fetch', mockFetch);

    (useAudioPlayer as any).mockReturnValue({
      play: mockPlay,
      stop: mockStop,
      pause: mockPause,
      resume: mockResume,
      preload: mockPreload,
      isPlaying: false,
      progress: 0,
    });

    (useAutoRefill as any).mockReturnValue({
      isRefilling: false,
      error: null,
      clearError: vi.fn(),
    });

    (useToast as any).mockReturnValue({
      push: mockPushToast,
      dismiss: vi.fn(),
    });

    (useQueryClient as any).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '',
      json: async () => ({}),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('初期表示でチュートリアルカードが表示されること', () => {
    render(<TrackCardStack tracks={mockTracks} />);
    expect(screen.getByText('Tutorial')).toBeInTheDocument();
  });

  it('チュートリアルカードをスワイプすると次のトラックが表示されること', async () => {
    render(<TrackCardStack tracks={mockTracks} />);

    const swipeRightButtons = screen.getAllByText('Swipe Right');
    fireEvent.click(swipeRightButtons[0]);

    expect(screen.getByText('Track 1')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('トラックカードを右スワイプするといいねAPIが呼ばれること', async () => {
    render(<TrackCardStack tracks={mockTracks} />);

    // チュートリアル
    fireEvent.click(screen.getAllByText('Swipe Right')[0]);

    // Track 1
    fireEvent.click(screen.getAllByText('Swipe Right')[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tracks/like',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ track_id: '101' }),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });
  });

  it('トラックカードを左スワイプするとスキップAPIが呼ばれること', async () => {
    render(<TrackCardStack tracks={mockTracks} />);

    // チュートリアル
    fireEvent.click(screen.getAllByText('Swipe Left')[0]);

    // Track 1
    fireEvent.click(screen.getAllByText('Swipe Left')[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tracks/dislike',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ track_id: '101' }),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });
  });

  it('APIエラー時にロールバックされること', async () => {
    // このテストケースのみFake Timersを使用
    vi.useFakeTimers();

    mockFetch.mockRejectedValue(new Error('API Error'));

    render(<TrackCardStack tracks={mockTracks} />);

    // チュートリアル
    fireEvent.click(screen.getAllByText('Swipe Right')[0]);

    // Track 1
    fireEvent.click(screen.getAllByText('Swipe Right')[0]);

    // 楽観的更新で消える
    expect(screen.queryByText('Track 1')).not.toBeInTheDocument();

    // リトライ待ちの時間を進める
    await act(async () => {
       await vi.runAllTimersAsync();
    });

    expect(mockPushToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));

    // ロールバック
    expect(screen.getByText('Track 1')).toBeInTheDocument();
  });

  it('カードがなくなると空状態のメッセージが表示されること', async () => {
    render(<TrackCardStack tracks={[]} />);

    fireEvent.click(screen.getAllByText('Swipe Right')[0]);

    expect(screen.getByText(/今日のディスカバリーはここまで/)).toBeInTheDocument();
  });

  it('外部ボタン（いいね/よくない）クリックでスワイプがトリガーされること', async () => {
     render(<TrackCardStack tracks={mockTracks} />);

     const likeButton = screen.getByLabelText('いいね');
     fireEvent.click(likeButton);

     expect(screen.getByText('Track 1')).toBeInTheDocument();

     fireEvent.click(likeButton);

     expect(screen.queryByText('Track 1')).not.toBeInTheDocument();
     expect(screen.getByText('Track 2')).toBeInTheDocument();

     await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
     });
  });
});
