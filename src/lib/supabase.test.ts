import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('supabase client initialization', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // モジュールの状態をリセットして、再インポート時にトップレベルコードが再実行されるようにする
        vi.resetModules();
        // 環境変数をリセット
        vi.unstubAllEnvs();
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('環境変数が設定されている場合、createClientが正しく呼ばれること', async () => {
        // 環境変数を設定
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.com');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'valid-anon-key');

        // createClientのモック
        const createClientMock = vi.fn(() => 'real-client');
        vi.doMock('@supabase/supabase-js', () => ({
            createClient: createClientMock,
        }));

        // モジュールを動的インポート
        const { supabase } = await import('./supabase');

        expect(createClientMock).toHaveBeenCalledWith('https://example.com', 'valid-anon-key');
        expect(supabase).toBe('real-client');
    });

    it('テスト環境で環境変数が不足している場合、ダミー値でcreateClientが試行されること', async () => {
        // 環境変数を空にする
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
        // NODE_ENVはデフォルトで 'test' だが明示的に設定
        vi.stubEnv('NODE_ENV', 'test');

        const createClientMock = vi.fn(() => 'dummy-client');
        vi.doMock('@supabase/supabase-js', () => ({
            createClient: createClientMock,
        }));

        const { supabase } = await import('./supabase');

        // テスト環境用のフォールバック値を確認
        expect(createClientMock).toHaveBeenCalledWith('http://127.0.0.1', 'anon');
        expect(supabase).toBe('dummy-client');
    });

    it('本番/開発環境で環境変数が不足している場合、スタブクライアントが返されること', async () => {
        // 環境変数を空にする
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
        vi.stubEnv('NODE_ENV', 'development'); // test以外にする

        const createClientMock = vi.fn();
        vi.doMock('@supabase/supabase-js', () => ({
            createClient: createClientMock,
        }));

        const { supabase } = await import('./supabase');

        // createClientは呼ばれないはず
        expect(createClientMock).not.toHaveBeenCalled();

        // スタブの動作確認
        expect(supabase).toHaveProperty('from');
        // @ts-ignore: スタブの型定義に依存するため
        const stub = supabase as any;
        expect(await stub.select()).toEqual({ data: null, error: null });
        expect(await stub.upsert()).toEqual({ error: null });
    });

    it('テスト環境でダミー値での作成も失敗した場合、スタブクライアントが返されること', async () => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
        vi.stubEnv('NODE_ENV', 'test');

        // createClientがエラーを投げるように設定
        const createClientMock = vi.fn(() => {
            throw new Error('Supabase init failed');
        });
        vi.doMock('@supabase/supabase-js', () => ({
            createClient: createClientMock,
        }));

        const { supabase } = await import('./supabase');

        expect(createClientMock).toHaveBeenCalled();
        // エラーになってもスタブが返る
        expect(supabase).toHaveProperty('from');
        expect(consoleWarnSpy).toHaveBeenCalled();
    });
});
