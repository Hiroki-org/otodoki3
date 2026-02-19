import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackCardStack } from './TrackCardStack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Track } from '../types/track-pool';

// Mock child components if necessary, but SwipeableCard is fine to use directly
// However, to make testing easier (avoiding complex drag simulation), we can rely on the buttons to trigger swipes,
// or use fireEvent on the card if SwipeableCard supports it (it does via keyDown in tests).

// Mock hooks
const mockAudioPlayer = {
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    preload: vi.fn(),
};

vi.mock('../hooks/useAudioPlayer', () => ({
    useAudioPlayer: () => ({
        ...mockAudioPlayer,
        isPlaying: false,
        progress: 0,
    }),
}));

vi.mock('../hooks/useAutoRefill', () => ({
    useAutoRefill: () => ({
        isRefilling: false,
        error: null,
        clearError: vi.fn(),
    }),
}));

// Mock useToast - we can wrap with real provider or mock the hook.
// Since we want to assert toast calls, mocking the hook is better or spying on the provider's context.
// But the component uses `useToast` hook. Let's mock the hook for easier assertion.
const mockPushToast = vi.fn();
vi.mock('./ToastProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./ToastProvider')>();
    return {
        ...actual,
        useToast: () => ({
            push: mockPushToast,
            dismiss: vi.fn(),
        }),
    };
});

// Mock fetch
const mockFetch = vi.fn();
const originalFetch = global.fetch;

describe('TrackCardStack', () => {
    let queryClient: QueryClient;

    const mockTracks: Track[] = [
        {
            type: 'track',
            track_id: 1,
            track_name: 'Test Track 1',
            artist_name: 'Artist 1',
            preview_url: 'https://example.com/1.mp3',
        },
        {
            type: 'track',
            track_id: 2,
            track_name: 'Test Track 2',
            artist_name: 'Artist 2',
            preview_url: 'https://example.com/2.mp3',
        },
    ];

    beforeEach(() => {
        global.fetch = mockFetch;
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
        mockFetch.mockReset();
        mockPushToast.mockReset();

        // Reset audio player mocks
        Object.values(mockAudioPlayer).forEach(mock => {
            mock.mockReset();
        });

        // Setup default fetch response
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({}),
            text: async () => "{}",
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    const renderComponent = (tracks: Track[] = mockTracks) => {
        return render(
            <QueryClientProvider client={queryClient}>
                <TrackCardStack tracks={tracks} />
            </QueryClientProvider>
        );
    };

    it('初期表示でチュートリアルカードが表示されること', () => {
        renderComponent();

        // チュートリアルカードが表示されていることを確認
        expect(screen.getByLabelText('チュートリアルカード')).toBeInTheDocument();

        // コントロールボタンが表示されていることを確認
        expect(screen.getByLabelText('いいね')).toBeInTheDocument();
        expect(screen.getByLabelText('よくない')).toBeInTheDocument();
    });

    it('スワイプでチュートリアルカードが消えること', async () => {
        renderComponent();

        // Tutorial card is top.
        // We trigger a swipe. Using the buttons is the easiest way to trigger logic in TrackCardStack.
        // "Right" button triggers `handleLikeClick` -> `swipeRight` on top card.

        const likeButton = screen.getByLabelText('いいね');

        await act(async () => {
            fireEvent.click(likeButton);
        });

        // After swipe, tutorial card should be gone (removed from stack).
        await waitFor(() => {
            expect(screen.queryByLabelText('チュートリアルカードをスワイプ')).not.toBeInTheDocument();
        });
    });

    it('「いいね」ボタンでAPIが呼ばれ、カードが消えること', async () => {
        renderComponent();

        // 1. Remove tutorial card
        const likeButton = screen.getByLabelText('いいね');
        await act(async () => {
            fireEvent.click(likeButton);
        });

        // Wait for tutorial card to disappear
        await waitFor(() => {
            expect(screen.queryByLabelText('チュートリアルカードをスワイプ')).not.toBeInTheDocument();
        });

        // 2. Like Track 1
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        await act(async () => {
            fireEvent.click(likeButton);
        });

        // Verify API call
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/tracks/like',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ track_id: "1" }),
                })
            );
        });

        // Verify Track 1 is gone, Track 2 is top
        await waitFor(() => {
            expect(screen.queryByText('Test Track 1')).not.toBeInTheDocument();
            expect(screen.getByText('Test Track 2')).toBeVisible();
        });
    });

    it('「よくない」ボタンでAPIが呼ばれ、カードが消えること', async () => {
        renderComponent();

        // 1. Remove tutorial card
        const dislikeButton = screen.getByLabelText('よくない');
        await act(async () => {
            fireEvent.click(dislikeButton);
        });

        // Wait for tutorial card to disappear
        await waitFor(() => {
            expect(screen.queryByLabelText('チュートリアルカードをスワイプ')).not.toBeInTheDocument();
        });

        // 2. Dislike Track 1
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        await act(async () => {
            fireEvent.click(dislikeButton);
        });

        // Verify API call
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/tracks/dislike',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ track_id: "1" }),
                })
            );
        });

        // Dislike triggers a toast
        expect(mockPushToast).toHaveBeenCalled();

        // Verify Track 1 is gone, Track 2 is top
        await waitFor(() => {
            expect(screen.queryByText('Test Track 1')).not.toBeInTheDocument();
            expect(screen.getByText('Test Track 2')).toBeVisible();
        });
    });

    it('スタックが空になったら空の状態を表示すること', async () => {
        // Start with 1 track for faster test
        const singleTrack = [mockTracks[0]];
        renderComponent(singleTrack);

        const likeButton = screen.getByLabelText('いいね');

        // 1. Remove tutorial
        await act(async () => {
            fireEvent.click(likeButton);
        });
        await waitFor(() => {
            expect(screen.queryByLabelText('チュートリアルカードをスワイプ')).not.toBeInTheDocument();
        });

        // 2. Remove Track 1
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await act(async () => {
            fireEvent.click(likeButton);
        });

        // 3. Should show empty message
        await waitFor(() => {
            expect(screen.getByText('今日のディスカバリーはここまで')).toBeInTheDocument();
        });
    });
});
