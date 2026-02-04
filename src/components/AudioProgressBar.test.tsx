import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AudioProgressBar } from './AudioProgressBar';

describe('AudioProgressBar', () => {
  it('正常な進捗率（0-100）が正しく表示されること', () => {
    const { container } = render(<AudioProgressBar progress={50} />);
    // data-testid で内部のバー要素を取得します
    const innerBar = container.querySelector('[data-testid="audio-progress-bar__fill"]') as HTMLElement;

    expect(innerBar).toBeInTheDocument();
    expect(innerBar).toHaveStyle({ width: '50%' });
  });

  it.each([
    { description: '0未満の値は0にクランプされる', progress: -10, expectedWidth: '0%' },
    { description: '100を超える値は100にクランプされる', progress: 150, expectedWidth: '100%' },
    { description: '不正な値（NaN）は0として扱われる', progress: NaN, expectedWidth: '0%' },
    { description: '不正な値（Infinity）は0として扱われる', progress: Infinity, expectedWidth: '0%' },
  ])('$descriptionこと', ({ progress, expectedWidth }) => {
    const { container } = render(<AudioProgressBar progress={progress} />);
    const innerBar = container.querySelector('[data-testid="audio-progress-bar__fill"]');

    expect(innerBar).toBeInTheDocument();
    expect(innerBar).toHaveStyle({ width: expectedWidth });
  });

  it('アクセシビリティ属性（aria-hidden）が設定されていること', () => {
    const { container } = render(<AudioProgressBar progress={30} />);
    const outerBar = container.querySelector('[aria-hidden="true"]');

    expect(outerBar).toBeInTheDocument();
  });
});
