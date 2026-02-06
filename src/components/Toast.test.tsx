import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Toast } from './Toast';
import React from 'react';

// framer-motion の AnimatePresence はテスト環境でアニメーション待機などが発生する可能性があるため、
// 必要に応じてモック化しますが、まずはそのまま動くか試します。
// 動作しない場合はモックを追加します。

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('メッセージが正しく表示されること', () => {
    const onClose = vi.fn();
    render(
      <Toast
        message="テストメッセージ"
        type="success"
        isVisible={true}
        onClose={onClose}
      />
    );

    expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
  });

  it('指定された時間後にonCloseが呼ばれること', () => {
    const onClose = vi.fn();
    render(
      <Toast
        message="テストメッセージ"
        type="success"
        isVisible={true}
        onClose={onClose}
        duration={3000}
      />
    );

    // Initial state: not called
    expect(onClose).not.toHaveBeenCalled();

    // Advance time by 3000ms
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('成功のスタイルが適用されること', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Toast
        message="成功"
        type="success"
        isVisible={true}
        onClose={onClose}
      />
    );

    const toastDiv = container.querySelector('[role="alert"]');
    expect(toastDiv).toHaveClass('bg-green-500/90');
    // Icon check (simplified by checking presence or class)
    // Lucide icons usually render an SVG.
    expect(container.querySelector('svg')).toHaveClass('text-green-100');
  });

  it('エラーのスタイルが適用されること', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Toast
        message="エラー"
        type="error"
        isVisible={true}
        onClose={onClose}
      />
    );

    const toastDiv = container.querySelector('[role="alert"]');
    expect(toastDiv).toHaveClass('bg-red-500/90');
    expect(container.querySelector('svg')).toHaveClass('text-red-100');
  });

  it('isVisibleがfalseの場合は表示されないこと', () => {
    const onClose = vi.fn();
    render(
      <Toast
        message="消えているはず"
        type="success"
        isVisible={false}
        onClose={onClose}
      />
    );

    expect(screen.queryByText('消えているはず')).not.toBeInTheDocument();
  });
});
