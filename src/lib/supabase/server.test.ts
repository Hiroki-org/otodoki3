import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from './server';

// next/headers のモック
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// @supabase/ssr のモック
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((url, key, options) => ({
    url,
    key,
    options,
    mockClient: true,
  })),
}));

describe('createClient (Server)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('環境変数が設定されている場合、Supabaseサーバークライアントを作成する', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const client = await createClient();
    expect(client).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((client as any).mockClient).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((client as any).url).toBe('https://example.supabase.co');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((client as any).key).toBe('anon-key');
  });

  it('NEXT_PUBLIC_SUPABASE_URLが未設定の場合、エラーをスローする', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    await expect(createClient()).rejects.toThrow('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('NEXT_PUBLIC_SUPABASE_ANON_KEYが未設定の場合、エラーをスローする', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(createClient()).rejects.toThrow('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('cookie設定時のエラーを無視する（Server Componentsからの書き込み時など）', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { cookies } = await import('next/headers');
    const mockCookieStore = {
        getAll: vi.fn(() => []),
        set: vi.fn(() => {
            throw new Error('Server Component cannot set cookies');
        }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cookies as any).mockResolvedValue(mockCookieStore);

    const client = await createClient();

    // cookie設定メソッドを呼び出してエラーがスローされないことを確認
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setAll = (client as any).options.cookies.setAll;
    expect(() => setAll([{ name: 'test', value: 'value' }])).not.toThrow();
  });
});
