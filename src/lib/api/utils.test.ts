import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseJsonResponse } from './utils';

describe('parseJsonResponse', () => {
    // console.error をモックしてテスト実行時のノイズを減らす
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    afterEach(() => {
        consoleSpy.mockClear();
    });

    it('Content-Typeがapplication/jsonの場合、JSONデータを返すこと', async () => {
        const mockData = { message: 'success' };
        const response = new Response(JSON.stringify(mockData), {
            headers: { 'content-type': 'application/json' },
        });

        const result = await parseJsonResponse(response);
        expect(result).toEqual(mockData);
    });

    it('Content-TypeがJSON以外の場合、エラーを投げること', async () => {
        const htmlContent = '<html><body>Error</body></html>';
        const response = new Response(htmlContent, {
            headers: { 'content-type': 'text/html' },
        });

        await expect(parseJsonResponse(response)).rejects.toThrow(
            'サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。'
        );
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('Content-Typeヘッダーが存在しない場合、エラーを投げること', async () => {
        const textContent = 'Plain text response';
        const response = new Response(textContent);
        // default headers usually don't include content-type unless inferred,
        // but explicitly `new Response` with just body often has null headers or text/plain depending on env.
        // The code checks response.headers?.get("content-type"), so let's ensure it fails if missing.

        // Note: In some environments new Response() automatically adds text/plain.
        // To be safe we can use an object mock if Response behavior is flaky,
        // but let's try real Response first as it's more standard.

        await expect(parseJsonResponse(response)).rejects.toThrow(
            'サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。'
        );
    });
});
