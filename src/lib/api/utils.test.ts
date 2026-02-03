import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { parseJsonResponse } from './utils';

describe('parseJsonResponse', () => {
    // console.error をモックしてテスト実行時のノイズを減らす
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    afterEach(() => {
        consoleSpy.mockClear();
    });

    afterAll(() => {
        consoleSpy.mockRestore();
    });

    it('Content-Typeがapplication/jsonの場合、JSONデータを返すこと', async () => {
        const mockData = { message: 'success' };
        const response = new Response(JSON.stringify(mockData), {
            headers: { 'content-type': 'application/json' },
        });

        const result = await parseJsonResponse(response);
        expect(result).toEqual(mockData);
    });

    it.each([
        {
            description: 'Content-TypeがJSON以外の場合',
            response: new Response('<html><body>Error</body></html>', {
                headers: { 'content-type': 'text/html' },
            }),
        },
        {
            description: 'Content-Typeヘッダーが存在しない場合',
            response: new Response('Plain text response'),
        },
    ])('$description、エラーを投げること', async ({ response }) => {
        await expect(parseJsonResponse(response)).rejects.toThrow(
            'サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。'
        );
        expect(consoleSpy).toHaveBeenCalled();
    });
});
