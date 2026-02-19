import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Define the shape of the stub client based on src/lib/supabase.ts
type StubClient = {
    from: (table: string) => StubClient;
    select: () => Promise<{ data: null; error: null }>;
    order: () => StubClient;
    limit: () => { data: null; error: null };
    upsert: () => Promise<{ error: null }>;
    delete: () => Promise<{ error: null }>;
    rpc: () => { maybeSingle: () => Promise<{ data: null; error: { code: string; message: string } }> };
};

describe('Supabaseクライアントのフォールバック処理', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('createClientが例外を投げた場合、完全に機能するスタブクライアントを返すべき', async () => {
        // Set env vars so it *tries* to create a real client
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');

        // Mock createClient to throw an error
        vi.doMock('@supabase/supabase-js', () => ({
            createClient: vi.fn().mockImplementation(() => {
                throw new Error('Initialization error');
            }),
        }));

        // Import the module dynamically
        const { supabase } = await import('./supabase');

        // Verify it is the stub client by checking its behavior
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stub = supabase as any as StubClient;

        // Exercise all methods to ensure coverage
        expect(stub.from('any_table')).toBe(stub);
        expect(stub.order()).toBe(stub);

        const selectRes = await stub.select();
        expect(selectRes).toEqual({ data: null, error: null });

        const limitRes = stub.limit();
        expect(limitRes).toEqual({ data: null, error: null });

        const upsertRes = await stub.upsert();
        expect(upsertRes).toEqual({ error: null });

        const deleteRes = await stub.delete();
        expect(deleteRes).toEqual({ error: null });

        const rpcRes = await stub.rpc().maybeSingle();
        expect(rpcRes).toEqual({
            data: null,
            error: { code: 'PGRST202', message: 'function not found' }
        });
    });
});
