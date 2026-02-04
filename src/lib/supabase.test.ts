import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('src/lib/supabase.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('環境変数が設定されている場合、Supabaseクライアントが正常に作成される', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');

    // モジュールを動的にインポート
    const { supabase } = await import('./supabase');

    expect(supabase).toBeDefined();
    // 本物のクライアントっぽいか確認（authプロパティがあるかなど）
    expect(supabase).toHaveProperty('auth');
    expect(supabase).toHaveProperty('from');
  });

  it('環境変数が不足しており、NODE_ENVがtestの場合、ダミークライアントが作成される', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('NODE_ENV', 'test');

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { supabase } = await import('./supabase');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Supabase env vars not found'));
    expect(supabase).toBeDefined();
    // ダミークライアントでも通常のメソッドは持っているはず
    expect(supabase).toHaveProperty('from');
  });

  it('環境変数が不足しており、ダミークライアント作成も失敗する場合、スタブクライアントが返される', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('NODE_ENV', 'test');

    // createClientをモックしてエラーを投げさせる
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => {
        throw new Error('Create client failed');
      },
    }));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { supabase } = await import('./supabase');

    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create Supabase client with dummy values'),
        expect.any(Error)
    );

    // スタブクライアントの動作確認
    expect(supabase.from('table')).toBe(supabase);
    expect(await supabase.select()).toEqual({ data: null, error: null });
    expect(supabase.order()).toBe(supabase);
    expect(supabase.limit()).toEqual({ data: null, error: null });
    expect(await supabase.upsert({})).toEqual({ error: null });
    expect(await supabase.delete()).toEqual({ error: null });

    const rpcResult = await supabase.rpc('func').maybeSingle();
    expect(rpcResult).toEqual({
        data: null,
        error: { code: 'PGRST202', message: 'function not found' }
    });
  });

  it('環境変数が不足しており、NODE_ENVがtest以外の場合、スタブクライアントが返される', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('NODE_ENV', 'production'); // test以外

    const { supabase } = await import('./supabase');

    // スタブクライアントであることを確認
    expect(supabase.from('table')).toBe(supabase);
    expect(await supabase.select()).toEqual({ data: null, error: null });
  });
});
