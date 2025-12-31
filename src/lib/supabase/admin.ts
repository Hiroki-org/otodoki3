import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * service_role 用の Supabase Admin Client を作成する。
 * Cookie 連携は不要（サーバー側でのみ使用）。
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error('Missing required env var: NEXT_PUBLIC_SUPABASE_URL');
    }

    if (!serviceRoleKey) {
        throw new Error('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
    }

    return createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}
