import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseJsonResponse } from './utils';

describe('parseJsonResponse', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('正しいJSONレスポンスをパースできること', async () => {
    const mockData = { id: 1, name: 'Test' };
    const response = new Response(JSON.stringify(mockData), {
      headers: { 'content-type': 'application/json' },
    });

    const result = await parseJsonResponse(response);
    expect(result).toEqual(mockData);
  });

  it('Content-TypeがJSONでない場合、エラーをスローすること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = new Response('<html><body>Error</body></html>', {
      headers: { 'content-type': 'text/html' },
    });

    await expect(parseJsonResponse(response)).rejects.toThrow(
      'サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。'
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('Content-Typeが欠落している場合、エラーをスローすること', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = new Response('Some text');
    // Headers are empty by default

    await expect(parseJsonResponse(response)).rejects.toThrow(
      'サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。'
    );
     expect(consoleSpy).toHaveBeenCalled();
  });

  it('Content-Typeにcharsetが含まれていても動作すること', async () => {
     const mockData = { message: 'hello' };
     const response = new Response(JSON.stringify(mockData), {
        headers: { 'content-type': 'application/json; charset=utf-8' }
     });

     const result = await parseJsonResponse(response);
     expect(result).toEqual(mockData);
  });
});
