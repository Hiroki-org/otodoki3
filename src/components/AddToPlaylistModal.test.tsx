import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// framer-motion のモック
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// QueryClient の作成ヘルパー
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithClient = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
    ),
    queryClient: testQueryClient,
  };
};

describe('AddToPlaylistModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    trackId: 123,
    onSuccess: mockOnSuccess,
  };

  const mockPlaylists = [
    { id: '1', name: 'My Playlist 1', icon: '🎵', count: 5, is_default: false },
    { id: '2', name: 'My Playlist 2', icon: '🎸', count: 10, is_default: false },
    { id: 'default', name: 'Default Playlist', icon: '💿', count: 2, is_default: true },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    // fetch のモックリセット
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('isOpenがfalseの場合、何もレンダリングされないこと', () => {
    renderWithClient(<AddToPlaylistModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('プレイリストを選択')).not.toBeInTheDocument();
  });

  it('isOpenがtrueの場合、モーダルが表示され、プレイリストが取得・表示されること', async () => {
    // プレイリスト取得のモック
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    } as Response);

    renderWithClient(<AddToPlaylistModal {...defaultProps} />);

    // ローディング待機
    await waitFor(() => {
      expect(screen.getByText('プレイリストを選択')).toBeInTheDocument();
    });

    // fetch が呼ばれたことを確認
    expect(fetch).toHaveBeenCalledWith('/api/playlists');

    // プレイリストが表示されることを確認（is_default: false のもののみ）
    await waitFor(() => {
      expect(screen.getByText('My Playlist 1')).toBeInTheDocument();
      expect(screen.getByText('My Playlist 2')).toBeInTheDocument();
    });

    // デフォルトプレイリストは除外されるはず
    expect(screen.queryByText('Default Playlist')).not.toBeInTheDocument();
  });

  it('プレイリスト取得に失敗した場合、エラーがコンソールに出力され、空の状態が表示されること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    renderWithClient(<AddToPlaylistModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('プレイリストがありません')).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch playlists:', 500);
    consoleSpy.mockRestore();
  });

  it('プレイリストをクリックするとトラックが追加され、成功トーストが表示されること', async () => {
    // プレイリスト取得のモック
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    } as Response);

    const { queryClient } = renderWithClient(<AddToPlaylistModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('My Playlist 1')).toBeInTheDocument();
    });

    // invalidateQueries のスパイ
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // トラック追加のモック（成功）
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response);

    // プレイリストをクリック
    fireEvent.click(screen.getByText('My Playlist 1'));

    // fetch が正しいパラメータで呼ばれたことを確認
    expect(fetch).toHaveBeenCalledWith('/api/playlists/1/tracks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ track_id: 123 }),
    });

    // 成功トーストの表示待機
    await waitFor(() => {
      expect(screen.getByText('「My Playlist 1」に追加しました')).toBeInTheDocument();
    });

    // キャッシュ無効化の確認
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlist', '1'] });

    // onSuccess コールバックの確認
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('既に追加されている場合（409 Conflict）、エラートーストが表示されること', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    } as Response);

    renderWithClient(<AddToPlaylistModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('My Playlist 1')).toBeInTheDocument();
    });

    // トラック追加のモック（409 Conflict）
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
    } as Response);

    fireEvent.click(screen.getByText('My Playlist 1'));

    await waitFor(() => {
      expect(screen.getByText('既に追加されています')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('追加に失敗した場合（その他のエラー）、エラートーストが表示されること', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    } as Response);

    renderWithClient(<AddToPlaylistModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('My Playlist 1')).toBeInTheDocument();
    });

    // トラック追加のモック（500 Error）
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    fireEvent.click(screen.getByText('My Playlist 1'));

    await waitFor(() => {
      expect(screen.getByText('追加に失敗しました')).toBeInTheDocument();
    });
  });

  it('閉じるボタンをクリックするとonCloseが呼ばれること', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    } as Response);

    renderWithClient(<AddToPlaylistModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('プレイリストを選択')).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('閉じる');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('Escapeキーを押すとonCloseが呼ばれること', async () => {
     vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    } as Response);

    renderWithClient(<AddToPlaylistModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('プレイリストを選択')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });
});
