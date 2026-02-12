import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SelectTrackModal } from './SelectTrackModal';

// Next.js Image コンポーネントのモック
vi.mock('next/image', () => ({
    default: () => null
}));

// framer-motion のモック
vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// テスト用のクエリクライアントを作成するヘルパー
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
    },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

describe('SelectTrackModal', () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('初期表示: モーダルが開いていない場合は何も表示されないこと', () => {
        render(
            <SelectTrackModal
                isOpen={false}
                onClose={vi.fn()}
                playlistId="playlist-1"
            />,
            { wrapper: Wrapper }
        );
        expect(screen.queryByText('お気に入りから曲を選択')).toBeNull();
    });
});
