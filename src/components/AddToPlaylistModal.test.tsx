import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddToPlaylistModal } from './AddToPlaylistModal';

// Fetchのモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Toastのモック
vi.mock('./Toast', () => {
  const MockToast = ({ message }: { message: string }) => <div>{message}</div>;
  MockToast.displayName = 'MockToast';
  return { Toast: MockToast };
});

// lucide-reactのモック
vi.mock('lucide-react', () => {
  const X = () => <svg data-testid="icon-x" />;
  X.displayName = 'X';
  const Music = () => <svg data-testid="icon-music" />;
  Music.displayName = 'Music';
  const ChevronRight = () => <svg data-testid="icon-chevron-right" />;
  ChevronRight.displayName = 'ChevronRight';
  return { X, Music, ChevronRight };
});

// クエリクライアントのセットアップ
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
};

// モックデータ
const mockPlaylists = [
  { id: '1', name: 'プレイリスト1', icon: '🎵', count: 10, is_default: false },
  { id: '2', name: 'プレイリスト2', icon: '🎸', count: 5, is_default: false },
  { id: '3', name: 'デフォルトリスト', icon: '❤️', count: 20, is_default: true },
];

describe('AddToPlaylistModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const trackId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('isOpenがfalseの場合、何もレンダリングされないこと', () => {
    render(
      <AddToPlaylistModal
        isOpen={false}
        onClose={mockOnClose}
        trackId={trackId}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('プレイリストを選択')).toBeNull();
  });

  it('isOpenがtrueの場合、ユーザー作成プレイリストのみが表示されること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    });

    render(
      <AddToPlaylistModal
        isOpen={true}
        onClose={mockOnClose}
        trackId={trackId}
      />,
      { wrapper: createWrapper() }
    );

    // タイトル確認
    expect(screen.getByText('プレイリストを選択')).toBeInTheDocument();

    // プレイリストの表示待ち
    await waitFor(() => {
      expect(screen.getByText('プレイリスト1')).toBeInTheDocument();
    });

    // ユーザープレイリストが表示されているか
    expect(screen.getByText('プレイリスト1')).toBeInTheDocument();
    expect(screen.getByText('プレイリスト2')).toBeInTheDocument();

    // デフォルトプレイリストが表示されていないか
    expect(screen.queryByText('デフォルトリスト')).toBeNull();

    // Fetch確認
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists');
  });

  it('プレイリストがない場合、空の状態が表示されること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: [] }),
    });

    render(
      <AddToPlaylistModal
        isOpen={true}
        onClose={mockOnClose}
        trackId={trackId}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('プレイリストがありません')).toBeInTheDocument();
    });
  });

  it('プレイリストをクリックするとトラックが追加され、モーダルが閉じること', async () => {
    mockFetch
      .mockResolvedValueOnce({ // playlists
        ok: true,
        json: async () => ({ playlists: mockPlaylists }),
      })
      .mockResolvedValueOnce({ // add track
        ok: true,
        json: async () => ({}),
      });

    render(
      <AddToPlaylistModal
        isOpen={true}
        onClose={mockOnClose}
        trackId={trackId}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('プレイリスト1')).toBeInTheDocument();
    });

    // プレイリスト1をクリック
    const playlistButton = screen.getByText('プレイリスト1').closest('button');
    fireEvent.click(playlistButton!);

    // 追加API呼び出し確認
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/playlists/1/tracks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ track_id: trackId }),
      })
    );

    // 成功トースト確認
    await waitFor(() => {
      expect(screen.getByText('「プレイリスト1」に追加しました')).toBeInTheDocument();
    });

    // onSuccessコールバック確認
    expect(mockOnSuccess).toHaveBeenCalled();

    // モーダルが閉じるのを待つ（1500ms後）
    await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('既に追加されている場合、エラートーストが表示されること', async () => {
    mockFetch
      .mockResolvedValueOnce({ // playlists
        ok: true,
        json: async () => ({ playlists: mockPlaylists }),
      })
      .mockResolvedValueOnce({ // add track (conflict)
        ok: false,
        status: 409,
      });

    render(
      <AddToPlaylistModal
        isOpen={true}
        onClose={mockOnClose}
        trackId={trackId}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('プレイリスト1')).toBeInTheDocument();
    });

    const playlistButton = screen.getByText('プレイリスト1').closest('button');
    fireEvent.click(playlistButton!);

    await waitFor(() => {
      expect(screen.getByText('既に追加されています')).toBeInTheDocument();
    });
  });

  it('追加に失敗した場合、エラートーストが表示されること', async () => {
    mockFetch
      .mockResolvedValueOnce({ // playlists
        ok: true,
        json: async () => ({ playlists: mockPlaylists }),
      })
      .mockResolvedValueOnce({ // add track (fail)
        ok: false,
        status: 500,
      });

    render(
      <AddToPlaylistModal
        isOpen={true}
        onClose={mockOnClose}
        trackId={trackId}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('プレイリスト1')).toBeInTheDocument();
    });

    const playlistButton = screen.getByText('プレイリスト1').closest('button');
    fireEvent.click(playlistButton!);

    await waitFor(() => {
      expect(screen.getByText('追加に失敗しました')).toBeInTheDocument();
    });
  });

  it('閉じるボタンまたはEscapeキーでモーダルが閉じること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: [] }),
    });

    render(
      <AddToPlaylistModal
        isOpen={true}
        onClose={mockOnClose}
        trackId={trackId}
      />,
      { wrapper: createWrapper() }
    );

    // 閉じるボタン
    const closeButton = screen.getByLabelText('閉じる');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Escapeキー
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
