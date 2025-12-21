import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// 環境変数を優先的に参照（テスト用に PROCESS env の別名も許容）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

// テスト実行時は環境変数が無くてもダミー値でクライアントを作成してテスト内でモックできるようにする
const supabase = (() => {
    if (!supabaseUrl || !supabaseAnonKey) {
        if (process.env.NODE_ENV === 'test') {
            console.warn('Supabase env vars not found; creating client with dummy values for tests.');
            return createClient<Database>(supabaseUrl ?? 'http://localhost', supabaseAnonKey ?? 'anon');
        }
        throw new Error('Supabase URL and Anon Key must be defined in environment variables.');
    }

    return createClient<Database>(supabaseUrl, supabaseAnonKey);
})();

export { supabase };