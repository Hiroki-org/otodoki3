import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// モックのセットアップ
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('createAdminClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('NEXT_PUBLIC_SUPABASE_URLが未定義の場合エラーを投げる', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    const { createAdminClient } = await import('./admin');

    expect(() => createAdminClient()).toThrow('Missing required env var: NEXT_PUBLIC_SUPABASE_URL');
  });

  it('SUPABASE_SERVICE_ROLE_KEYが未定義の場合エラーを投げる', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { createAdminClient } = await import('./admin');

    expect(() => createAdminClient()).toThrow('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
  });

  it('環境変数が正しく設定されている場合、Supabaseクライアントを作成する', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const { createAdminClient } = await import('./admin');
    createAdminClient();

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key',
      {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
      }
    );
  });
});
