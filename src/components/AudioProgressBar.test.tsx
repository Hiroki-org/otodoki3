import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AudioProgressBar } from './AudioProgressBar';

describe('AudioProgressBar', () => {
  it('正常な進捗率（0-100）が正しく表示されること', () => {
    const { container } = render(<AudioProgressBar progress={50} />);
    // クラス名で内部のバー要素を取得します
    const innerBar = container.querySelector('.bg-primary') as HTMLElement;

    expect(innerBar).toBeInTheDocument();
    expect(innerBar).toHaveStyle({ width: '50%' });
  });

  it('0未満の値は0にクランプされること', () => {
    const { container } = render(<AudioProgressBar progress={-10} />);
    const innerBar = container.querySelector('.bg-primary') as HTMLElement;

    expect(innerBar).toHaveStyle({ width: '0%' });
  });

  it('100を超える値は100にクランプされること', () => {
    const { container } = render(<AudioProgressBar progress={150} />);
    const innerBar = container.querySelector('.bg-primary') as HTMLElement;

    expect(innerBar).toHaveStyle({ width: '100%' });
  });

  it('不正な値（NaN）は0として扱われること', () => {
    const { container } = render(<AudioProgressBar progress={NaN} />);
    const innerBar = container.querySelector('.bg-primary') as HTMLElement;

    expect(innerBar).toHaveStyle({ width: '0%' });
  });

  it('不正な値（Infinity）は0として扱われること', () => {
    const { container } = render(<AudioProgressBar progress={Infinity} />);
    const innerBar = container.querySelector('.bg-primary') as HTMLElement;

    expect(innerBar).toHaveStyle({ width: '0%' });
  });

  it('アクセシビリティ属性（aria-hidden）が設定されていること', () => {
    const { container } = render(<AudioProgressBar progress={30} />);
    const outerBar = container.firstChild as HTMLElement;

    expect(outerBar).toHaveAttribute('aria-hidden', 'true');
  });
});
