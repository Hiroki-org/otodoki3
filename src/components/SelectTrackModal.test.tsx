import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { SelectTrackModal } from './SelectTrackModal';

// Mock next/image
vi.mock('next/image', () => ({
    default: (props: any) => {
        // eslint-disable-next-line @next/next/no-img-element
        return <img {...props} alt={props.alt} />;
    },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Wrapper to provide QueryClient
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('SelectTrackModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    const playlistId = 'test-playlist-id';

    const mockTracks = [
        {
            track_id: 1,
            type: 'track' as const,
            track_name: 'Track 1',
            artist_name: 'Artist 1',
            artwork_url: 'http://example.com/1.jpg',
            preview_url: 'http://example.com/1.mp3',
        },
        {
            track_id: 2,
            type: 'track' as const,
            track_name: 'Track 2',
            artist_name: 'Artist 2',
            artwork_url: 'http://example.com/2.jpg',
            preview_url: 'http://example.com/2.mp3',
        },
    ];

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        mockOnClose.mockClear();
        mockOnSuccess.mockClear();
        vi.clearAllMocks(); // Clear play/pause mocks too
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('isOpenがfalseの場合、何もレンダリングされないこと', () => {
        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <SelectTrackModal
                    isOpen={false}
                    onClose={mockOnClose}
                    playlistId={playlistId}
                />
            </Wrapper>
        );

        expect(screen.queryByText('お気に入りから曲を選択')).not.toBeInTheDocument();
    });

    it('isOpenがtrueの場合、モーダルが表示され、曲一覧が取得されること', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ tracks: mockTracks }),
        } as Response);

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <SelectTrackModal
                    isOpen={true}
                    onClose={mockOnClose}
                    playlistId={playlistId}
                />
            </Wrapper>
        );

        expect(screen.getByText('お気に入りから曲を選択')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Track 1')).toBeInTheDocument();
        });
        expect(screen.getByText('Artist 1')).toBeInTheDocument();
        expect(screen.getByText('Track 2')).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith('/api/playlists/likes');
    });

    it('曲追加ボタンをクリックすると、APIが呼ばれ、成功時にトーストが表示されること', async () => {
        // First fetch calls
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ tracks: mockTracks }),
        } as Response);

        // Add track call
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        } as Response);

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <SelectTrackModal
                    isOpen={true}
                    onClose={mockOnClose}
                    playlistId={playlistId}
                    onSuccess={mockOnSuccess}
                />
            </Wrapper>
        );

        await waitFor(() => screen.getByText('Track 1'));

        const addButtons = screen.getAllByLabelText('追加');
        fireEvent.click(addButtons[0]);

        // Optimistic update check (icon changes to checkmark/delete)
        await waitFor(() => {
            expect(screen.getAllByLabelText('削除')[0]).toBeInTheDocument();
        });

        expect(fetch).toHaveBeenCalledWith(`/api/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ track_id: 1 }),
        });

        expect(mockOnSuccess).toHaveBeenCalledWith(mockTracks[0]);
        await waitFor(() => expect(screen.getByText('曲を追加しました')).toBeInTheDocument());
    });

    it('曲削除ボタンをクリックすると、APIが呼ばれ、成功時にトーストが表示されること', async () => {
        // First fetch calls
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ tracks: mockTracks }),
        } as Response);

        // Delete track call
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        } as Response);

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <SelectTrackModal
                    isOpen={true}
                    onClose={mockOnClose}
                    playlistId={playlistId}
                    existingTrackIds={[1]} // Track 1 is already added
                />
            </Wrapper>
        );

        await waitFor(() => screen.getByText('Track 1'));

        const deleteButton = screen.getByLabelText('削除');
        fireEvent.click(deleteButton);

        // Optimistic update check (icon changes to add)
        await waitFor(() => {
            // Track 2 is already "追加", so now we expect Track 1 to also be "追加", total 2
            expect(screen.getAllByLabelText('追加')).toHaveLength(2);
        });

        expect(fetch).toHaveBeenCalledWith(`/api/playlists/${playlistId}/tracks`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ track_id: 1 }),
        });

        await waitFor(() => expect(screen.getByText('曲を削除しました')).toBeInTheDocument());
    });

    it('プレビューボタンをクリックすると、音声が再生されること', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ tracks: mockTracks }),
        } as Response);

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <SelectTrackModal
                    isOpen={true}
                    onClose={mockOnClose}
                    playlistId={playlistId}
                />
            </Wrapper>
        );

        await waitFor(() => screen.getByText('Track 1'));

        const previewButton = screen.getByLabelText('プレビュー: Track 1');
        fireEvent.click(previewButton);

        expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });

    it('Escapeキーを押すと、モーダルが閉じること', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ tracks: mockTracks }),
        } as Response);

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <SelectTrackModal
                    isOpen={true}
                    onClose={mockOnClose}
                    playlistId={playlistId}
                />
            </Wrapper>
        );

        await waitFor(() => screen.getByText('お気に入りから曲を選択'));

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(mockOnClose).toHaveBeenCalled();
    });

     it('閉じるボタンをクリックすると、モーダルが閉じること', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ tracks: mockTracks }),
        } as Response);

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <SelectTrackModal
                    isOpen={true}
                    onClose={mockOnClose}
                    playlistId={playlistId}
                />
            </Wrapper>
        );

        await waitFor(() => screen.getByText('お気に入りから曲を選択'));

        const closeButton = screen.getByLabelText('閉じる');
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('取得したトラックがない場合、空の状態が表示されること', async () => {
         vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ tracks: [] }),
        } as Response);

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <SelectTrackModal
                    isOpen={true}
                    onClose={mockOnClose}
                    playlistId={playlistId}
                />
            </Wrapper>
        );

        await waitFor(() => expect(screen.getByText('お気に入りに曲がありません')).toBeInTheDocument());
    });
});
