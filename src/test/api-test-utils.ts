import { vi } from 'vitest';

/**
 * Supabase クライアントのモックを作成するヘルパー
 */
export function createMockSupabaseClient() {
    // 各クエリで使い回すモック関数を作成
    const createQueryBuilder = (): any => {
        const builder: any = {};
        const methods = [
            'select', 'insert', 'update', 'delete', 'upsert',
            'eq', 'order', 'limit', 'gt', 'lt', 'gte', 'lte',
            'in', 'single', 'not', 'neq', 'is', 'or', 'and'
        ];

        methods.forEach(method => {
            builder[method] = vi.fn((...args) => builder);
        });

        // Promise-like behavior: make it awaitable
        builder.then = vi.fn((resolve, reject) => {
            // デフォルトでは空の結果を返す
            return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        });
        builder.catch = vi.fn((reject) => {
            return Promise.resolve({ data: null, error: null }).catch(reject);
        });

        return builder;
    };

    // from() を呼ぶたびに新しいクエリビルダーを返す
    const fromMock = vi.fn((table: string) => createQueryBuilder());

    return {
        auth: {
            getUser: vi.fn(),
        },
        from: fromMock,
    };
}

/**
 * 認証済みユーザーのモックデータ
 */
export const mockAuthenticatedUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
};

/**
 * NextRequest のモックを作成するヘルパー
 */
export function createMockNextRequest(url: string, options?: RequestInit) {
    return {
        url,
        method: options?.method || 'GET',
        headers: new Headers(options?.headers),
        json: async () => (options?.body ? JSON.parse(options.body as string) : {}),
    } as any;
}

/**
 * モックトラックデータ
 */
export const mockTrackData = {
    track_id: '12345',
    track_name: 'Test Track',
    artist_name: 'Test Artist',
    artwork_url: 'https://example.com/artwork.jpg',
    preview_url: 'https://example.com/preview.mp3',
    type: 'track' as const,
};

/**
 * モックトラックプールデータ
 */
export const mockTrackPoolData = [
    {
        track_id: '12345',
        track_name: 'Test Track 1',
        artist_name: 'Test Artist 1',
        artwork_url: 'https://example.com/artwork1.jpg',
        preview_url: 'https://example.com/preview1.mp3',
    },
    {
        track_id: '67890',
        track_name: 'Test Track 2',
        artist_name: 'Test Artist 2',
        artwork_url: 'https://example.com/artwork2.jpg',
        preview_url: 'https://example.com/preview2.mp3',
    },
];
