import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAdminClient } from './admin';

// Supabaseクライアントのモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    mockClient: true,
  })),
}));

describe('createAdminClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('環境変数が設定されている場合、Supabaseクライアントを作成する', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const client = createAdminClient();
    expect(client).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((client as any).mockClient).toBe(true);
  });

  it('NEXT_PUBLIC_SUPABASE_URLが未設定の場合、エラーをスローする', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    expect(() => createAdminClient()).toThrow('Missing required env var: NEXT_PUBLIC_SUPABASE_URL');
  });

  it('SUPABASE_SERVICE_ROLE_KEYが未設定の場合、エラーをスローする', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => createAdminClient()).toThrow('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
  });
});
