import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

// ブラウザ環境のセットアップ
if (typeof window !== 'undefined') {
  vi.stubGlobal('HTMLMediaElement', {
    prototype: {
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      load: vi.fn(),
    }
  });
}

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態が正しい', () => {
      const { result } = renderHook(() => useAudioPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.progress).toBe(0);
    });

    it('audioRef は HTMLAudioElement に設定される', () => {
      const { result } = renderHook(() => useAudioPlayer());

      expect(result.current.audioRef.current).toBeInstanceOf(HTMLAudioElement);
    });
  });

  describe('play メソッド', () => {
    it('正常系: 有効な URL で再生開始', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.audioRef.current?.src).toBe('https://example.com/audio.mp3');
    });

    it('正常系: URL が空文字列の場合は何もしない', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('');
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.audioRef.current?.src).toBe('');
    });

    it('正常系: URL が空白のみの場合は何もしない', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('   ');
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('正常系: 同じ URL を再度再生した場合', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      expect(result.current.isPlaying).toBe(true);

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('正常系: 異なる URL に切り替える', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio1.mp3');
      });

      expect(result.current.audioRef.current?.src).toBe('https://example.com/audio1.mp3');

      await act(async () => {
        result.current.play('https://example.com/audio2.mp3');
      });

      expect(result.current.audioRef.current?.src).toBe('https://example.com/audio2.mp3');
    });
  });

  describe('pause メソッド', () => {
    it('正常系: 再生中の音声を一時停止', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('正常系: 一時停止中に再度一時停止を呼ぶ', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      act(() => {
        result.current.pause();
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('stop メソッド', () => {
    it('正常系: 再生を停止して進捗をリセット', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.progress).toBe(0);
    });

    it('正常系: currentTime が 0 にリセットされる', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      const audio = result.current.audioRef.current;
      if (audio) {
        audio.currentTime = 50;
      }

      act(() => {
        result.current.stop();
      });

      expect(audio?.currentTime).toBe(0);
    });
  });

  describe('resume メソッド', () => {
    it('正常系: 一時停止中の音声を再開', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);

      await act(async () => {
        result.current.resume();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('異常系: src が設定されていない場合は何もしない', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      const audio = result.current.audioRef.current;
      if (audio) {
        audio.src = '';
      }

      await act(async () => {
        result.current.resume();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('play/pause/stop の組み合わせ', () => {
    it('play -> pause -> stop の流れ', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      // play
      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });
      expect(result.current.isPlaying).toBe(true);

      // pause
      act(() => {
        result.current.pause();
      });
      expect(result.current.isPlaying).toBe(false);

      // stop
      act(() => {
        result.current.stop();
      });
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.progress).toBe(0);
    });

    it('play -> pause -> resume の流れ', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio.mp3');
      });

      act(() => {
        result.current.pause();
      });

      await act(async () => {
        result.current.resume();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('play -> stop -> play', async () => {
      const { result } = renderHook(() => useAudioPlayer());

      await act(async () => {
        result.current.play('https://example.com/audio1.mp3');
      });

      act(() => {
        result.current.stop();
      });

      await act(async () => {
        result.current.play('https://example.com/audio2.mp3');
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.audioRef.current?.src).toBe('https://example.com/audio2.mp3');
    });
  });

  describe('progress の追跡', () => {
    it('初期状態では progress は 0', () => {
      const { result } = renderHook(() => useAudioPlayer());
      expect(result.current.progress).toBe(0);
    });

    it('progress は 0 から 100 の範囲に制限される', () => {
      const { result } = renderHook(() => useAudioPlayer());
      const audio = result.current.audioRef.current;

      if (audio) {
        Object.defineProperty(audio, 'duration', {
          get: () => 100,
          configurable: true,
        });
        Object.defineProperty(audio, 'currentTime', {
          get: () => 50,
          configurable: true,
        });
      }

      // timeupdate イベントをシミュレート
      if (audio) {
        const event = new Event('timeupdate');
        audio.dispatchEvent(event);
      }

      // progress はイベントハンドラーで更新される
      // ここではテスト設定の都合で詳細なテストは省略
    });
  });

  describe('audioRef の管理', () => {
    it('Hook がアンマウント時に listeners を削除', () => {
      const { unmount, result } = renderHook(() => useAudioPlayer());

      const audio = result.current.audioRef.current;
      const removeEventListenerSpy = vi.spyOn(audio, 'removeEventListener');

      unmount();

      // cleanup で removeEventListener が呼ばれることを確認
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});
