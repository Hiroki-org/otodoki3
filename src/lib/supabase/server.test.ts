import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from './server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// モック定義
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('src/lib/supabase/server.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('正常系: 正しい環境変数とCookie設定でクライアントを作成する', async () => {
    const mockCookieStore = {
      getAll: vi.fn().mockReturnValue([{ name: 'test', value: 'value' }]),
      set: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cookies as any).mockResolvedValue(mockCookieStore);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue('mock-client');

    const client = await createClient();

    expect(client).toBe('mock-client');
    expect(cookies).toHaveBeenCalled();
    expect(createServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );

    // createServerClientに渡された cookies オブジェクトの動作検証
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = (createServerClient as any).mock.calls;
    const passedOptions = calls[0][2];

    // getAll の検証
    const cookiesResult = passedOptions.cookies.getAll();
    expect(mockCookieStore.getAll).toHaveBeenCalled();
    expect(cookiesResult).toEqual([{ name: 'test', value: 'value' }]);

    // setAll の検証
    const cookiesToSet = [
      { name: 'foo', value: 'bar', options: { path: '/' } },
    ];
    passedOptions.cookies.setAll(cookiesToSet);
    expect(mockCookieStore.set).toHaveBeenCalledWith('foo', 'bar', { path: '/' });
  });

  it('正常系: Server Componentからの書き込みエラーは無視される (try-catch)', async () => {
    const mockCookieStore = {
      getAll: vi.fn(),
      set: vi.fn().mockImplementation(() => {
        throw new Error('Server Component cannot set cookies');
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cookies as any).mockResolvedValue(mockCookieStore);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServerClient as any).mockReturnValue('mock-client');

    await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = (createServerClient as any).mock.calls;
    const passedOptions = calls[0][2];

    // setAll が例外を投げてもキャッチされることを確認
    expect(() => {
        passedOptions.cookies.setAll([{ name: 'foo', value: 'bar', options: {} }]);
    }).not.toThrow();

    expect(mockCookieStore.set).toHaveBeenCalled();
  });

  it('異常系: 環境変数が不足している場合はエラーを投げる (URL欠如)', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(createClient()).rejects.toThrow('Missing required env vars');
  });

  it('異常系: 環境変数が不足している場合はエラーを投げる (KEY欠如)', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(createClient()).rejects.toThrow('Missing required env vars');
  });
});
