import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// スタブ用の型定義
type StubClient = {
    from: (table: string) => StubClient;
    select: () => Promise<{ data: null; error: null }>;
    order: () => StubClient;
    limit: () => { data: null; error: null };
    upsert: () => Promise<{ error: null }>;
    delete: () => Promise<{ error: null }>;
    rpc: () => { maybeSingle: () => Promise<{ data: null; error: { code: string; message: string } }> };
};

describe('src/lib/supabase.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('環境変数が設定されていない場合、スタブクライアントが返されること', async () => {
    // 環境変数を空に設定
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');

    // createClient が例外を投げるようにモックして、スタブへのフォールバックを強制する
    vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn().mockImplementation(() => {
            throw new Error('Forced error for testing');
        }),
    }));

    // モジュールを動的にインポート
    const { supabase } = await import('./supabase');

    // スタブクライアントのメソッドが存在することを確認
    expect(supabase).toHaveProperty('from');
    expect(supabase).toHaveProperty('select');
    expect(supabase).toHaveProperty('order');
    expect(supabase).toHaveProperty('limit');
    expect(supabase).toHaveProperty('upsert');
    expect(supabase).toHaveProperty('delete');
    expect(supabase).toHaveProperty('rpc');

    // スタブの動作確認
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stub = supabase as any as StubClient;

    expect(stub.from('table')).toBe(supabase);
    expect(stub.order()).toBe(supabase);

    const selectResult = await stub.select();
    expect(selectResult).toEqual({ data: null, error: null });

    const limitResult = stub.limit();
    expect(limitResult).toEqual({ data: null, error: null });

    const upsertResult = await stub.upsert();
    expect(upsertResult).toEqual({ error: null });

    const deleteResult = await stub.delete();
    expect(deleteResult).toEqual({ error: null });

    const rpcResult = await stub.rpc().maybeSingle();
    expect(rpcResult).toEqual({
      data: null,
      error: { code: 'PGRST202', message: 'function not found' }
    });
  });

  it('環境変数が設定されている場合、正常なクライアントが作成されること（モック確認）', async () => {
    // 環境変数を設定
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

    // createClientをモック
    const createClientMock = vi.fn().mockReturnValue({
        from: vi.fn(),
    });

    vi.doMock('@supabase/supabase-js', () => ({
        createClient: createClientMock,
    }));

    // モジュールを動的にインポート
    await import('./supabase');

    // createClientが呼ばれたことを確認
    expect(createClientMock).toHaveBeenCalledWith('https://example.supabase.co', 'test-key');
  });

  it('クライアント作成時にエラーが発生した場合、スタブクライアントが返されること', async () => {
    // 環境変数を設定
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

    // createClient が例外を投げるようにモック
    vi.doMock('@supabase/supabase-js', () => ({
        createClient: vi.fn().mockImplementation(() => {
            throw new Error('Initialization error');
        }),
    }));

    // モジュールを動的にインポート
    const { supabase } = await import('./supabase');

    // スタブクライアントのメソッドが存在することを確認
    expect(supabase).toHaveProperty('from');
    expect(supabase).toHaveProperty('select');

    // スタブの動作確認（すべてのメソッドを呼び出してカバレッジを確保）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stub = supabase as any as StubClient;

    expect(stub.from('table')).toBe(supabase);
    expect(stub.order()).toBe(supabase);

    const selectResult = await stub.select();
    expect(selectResult).toEqual({ data: null, error: null });

    const limitResult = stub.limit();
    expect(limitResult).toEqual({ data: null, error: null });

    const upsertResult = await stub.upsert();
    expect(upsertResult).toEqual({ error: null });

    const deleteResult = await stub.delete();
    expect(deleteResult).toEqual({ error: null });

    const rpcResult = await stub.rpc().maybeSingle();
    expect(rpcResult).toEqual({
      data: null,
      error: { code: 'PGRST202', message: 'function not found' }
    });
  });
});
