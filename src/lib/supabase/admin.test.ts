import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAdminClient } from './admin';
import { createClient } from '@supabase/supabase-js';

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

describe('createAdminClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('環境変数が正しく設定されている場合、Supabase クライアントを作成する', () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

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

    it('NEXT_PUBLIC_SUPABASE_URL が欠落している場合、エラーをスローする', () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

        expect(() => createAdminClient()).toThrow('Missing required env var: NEXT_PUBLIC_SUPABASE_URL');
    });

    it('SUPABASE_SERVICE_ROLE_KEY が欠落している場合、エラーをスローする', () => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;

        expect(() => createAdminClient()).toThrow('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
    });
});
