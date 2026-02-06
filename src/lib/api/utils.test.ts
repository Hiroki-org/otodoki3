import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { parseJsonResponse } from './utils';

describe('src/lib/api/utils.ts', () => {
    // console.error をモック
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('正常系: 正しいJSONレスポンスをパースできること', async () => {
        const mockData = { id: 1, name: 'test' };
        const response = {
            headers: {
                get: vi.fn().mockReturnValue('application/json; charset=utf-8'),
            },
            json: vi.fn().mockResolvedValue(mockData),
        } as unknown as Response;

        const result = await parseJsonResponse(response);
        expect(result).toEqual(mockData);
        expect(response.json).toHaveBeenCalled();
    });

    it('異常系: Content-TypeがJSONでない場合（HTMLなど）、エラーを投げること', async () => {
        const htmlContent = '<html><body>Error</body></html>';
        const response = {
            headers: {
                get: vi.fn().mockReturnValue('text/html'),
            },
            text: vi.fn().mockResolvedValue(htmlContent),
        } as unknown as Response;

        await expect(parseJsonResponse(response)).rejects.toThrow(
            'サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。'
        );

        expect(response.text).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Expected JSON but received:',
            htmlContent.substring(0, 100)
        );
    });

    it('異常系: Content-Typeヘッダーが存在しない場合、エラーを投げること', async () => {
        const textContent = 'Internal Server Error';
        const response = {
            headers: {
                get: vi.fn().mockReturnValue(null),
            },
            text: vi.fn().mockResolvedValue(textContent),
        } as unknown as Response;

        await expect(parseJsonResponse(response)).rejects.toThrow(
            'サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。'
        );
    });

    it('異常系: headersプロパティが存在しない場合（モック等）、エラーを投げること', async () => {
        const textContent = 'Error';
        const response = {
            // headers プロパティなし
            text: vi.fn().mockResolvedValue(textContent),
        } as unknown as Response;

        await expect(parseJsonResponse(response)).rejects.toThrow(
            'サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。'
        );
    });
});
