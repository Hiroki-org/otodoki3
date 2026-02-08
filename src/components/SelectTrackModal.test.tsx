import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SelectTrackModal } from './SelectTrackModal';
import { mockTracks } from '../lib/__fixtures__/tracks';

// Audioのモック
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();

const MockAudio = vi.fn(function() {
  return {
    play: mockPlay,
    pause: mockPause,
    onended: null,
  };
});

vi.stubGlobal('Audio', MockAudio);

// Fetchのモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// next/imageのモック
vi.mock('next/image', () => {
  const MockImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  };
  MockImage.displayName = 'MockImage';
  return { default: MockImage };
});

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
  const Check = () => <svg data-testid="icon-check" />;
  Check.displayName = 'Check';
  const Pause = () => <svg data-testid="icon-pause" />;
  Pause.displayName = 'Pause';
  return { X, Music, Check, Pause };
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

describe('SelectTrackModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const playlistId = 'test-playlist';

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockPlay.mockClear();
    mockPause.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('isOpenがfalseの場合、何もレンダリングされないこと', () => {
    render(
      <SelectTrackModal
        isOpen={false}
        onClose={mockOnClose}
        playlistId={playlistId}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('お気に入りから曲を選択')).toBeNull();
  });

  it('isOpenがtrueの場合、ローディング後にトラック一覧が表示されること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: mockTracks }),
    });

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
      />,
      { wrapper: createWrapper() }
    );

    // タイトルの確認
    expect(screen.getByText('お気に入りから曲を選択')).toBeInTheDocument();

    // トラックが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByText(mockTracks[0].track_name)).toBeInTheDocument();
    });

    // Fetchが呼ばれたことを確認
    expect(mockFetch).toHaveBeenCalledWith('/api/playlists/likes');
  });

  it('トラックがない場合、空の状態が表示されること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: [] }),
    });

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('お気に入りに曲がありません')).toBeInTheDocument();
    });
  });

  it('トラックを追加ボタンをクリックするとAPIが呼ばれ、成功トーストが表示されること', async () => {
    mockFetch
      .mockResolvedValueOnce({ // likes fetch
        ok: true,
        json: async () => ({ tracks: mockTracks }),
      })
      .mockResolvedValueOnce({ // add track fetch
        ok: true,
        json: async () => ({}),
      });

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(mockTracks[0].track_name)).toBeInTheDocument();
    });

    // 追加ボタンをクリック
    const addButtons = screen.getAllByLabelText('追加');
    fireEvent.click(addButtons[0]);

    // API呼び出しの確認
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/playlists/${playlistId}/tracks`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ track_id: mockTracks[0].track_id }),
      })
    );

    // onSuccessコールバックの確認
    expect(mockOnSuccess).toHaveBeenCalledWith(mockTracks[0]);

    // トーストの確認
    await waitFor(() => {
      expect(screen.getByText('曲を追加しました')).toBeInTheDocument();
    });
  });

  it('既にプレイリストにある曲を削除できること', async () => {
    mockFetch
      .mockResolvedValueOnce({ // likes fetch
        ok: true,
        json: async () => ({ tracks: mockTracks }),
      })
      .mockResolvedValueOnce({ // delete track fetch
        ok: true,
        json: async () => ({}),
      });

    const existingTrackIds = [mockTracks[0].track_id];

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
        existingTrackIds={existingTrackIds}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(mockTracks[0].track_name)).toBeInTheDocument();
    });

    // 削除ボタン（チェックアイコン）が表示されているはず
    const removeButton = screen.getByLabelText('削除');
    fireEvent.click(removeButton);

    // API呼び出しの確認
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/playlists/${playlistId}/tracks`,
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ track_id: mockTracks[0].track_id }),
      })
    );

    // トーストの確認
    await waitFor(() => {
      expect(screen.getByText('曲を削除しました')).toBeInTheDocument();
    });
  });

  it('プレビュー再生ボタンをクリックすると音声が再生されること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: mockTracks }),
    });

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(mockTracks[0].track_name)).toBeInTheDocument();
    });

    // プレビューボタンをクリック
    const previewButtons = screen.getAllByLabelText(/^プレビュー:/);
    fireEvent.click(previewButtons[0]);

    expect(MockAudio).toHaveBeenCalledWith(mockTracks[0].preview_url);
    expect(mockPlay).toHaveBeenCalled();
  });

  it('同じプレビューボタンを再度クリックすると停止すること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: mockTracks }),
    });

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(mockTracks[0].track_name)).toBeInTheDocument();
    });

    const previewButtons = screen.getAllByLabelText(/^プレビュー:/);

    // 再生
    fireEvent.click(previewButtons[0]);
    expect(mockPlay).toHaveBeenCalled();

    // 停止
    fireEvent.click(previewButtons[0]);
    expect(mockPause).toHaveBeenCalled();
  });

  it('別の曲をプレビューすると前の曲が停止して新しい曲が再生されること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: mockTracks }),
    });

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(mockTracks[0].track_name)).toBeInTheDocument();
    });

    const previewButtons = screen.getAllByLabelText(/^プレビュー:/);

    // 1曲目を再生
    fireEvent.click(previewButtons[0]);
    expect(MockAudio).toHaveBeenCalledWith(mockTracks[0].preview_url);

    // 2曲目を再生
    fireEvent.click(previewButtons[1]);
    expect(mockPause).toHaveBeenCalled(); // 前の曲の停止
    expect(MockAudio).toHaveBeenCalledWith(mockTracks[1].preview_url); // 新しい曲のインスタンス化
  });

  it('追加に失敗した場合、エラーメッセージが表示され状態が戻ること', async () => {
    mockFetch
      .mockResolvedValueOnce({ // likes fetch
        ok: true,
        json: async () => ({ tracks: mockTracks }),
      })
      .mockResolvedValueOnce({ // add track fetch (fail)
        ok: false,
        status: 500,
      });

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(mockTracks[0].track_name)).toBeInTheDocument();
    });

    const addButtons = screen.getAllByLabelText('追加');
    fireEvent.click(addButtons[0]);

    // トーストの確認
    await waitFor(() => {
      expect(screen.getByText('追加に失敗しました')).toBeInTheDocument();
    });
  });

  it('閉じるボタンまたはEscapeキーでモーダルが閉じること', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: [] }),
    });

    render(
      <SelectTrackModal
        isOpen={true}
        onClose={mockOnClose}
        playlistId={playlistId}
      />,
      { wrapper: createWrapper() }
    );

    // 閉じるボタンクリック
    const closeButton = screen.getByLabelText('閉じる');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Escapeキー
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
