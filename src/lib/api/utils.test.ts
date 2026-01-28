import { describe, expect, it, vi } from "vitest";
import { parseJsonResponse } from "./utils";

describe("parseJsonResponse", () => {
  it("正常系: 正しいJSONレスポンスがパースされる", async () => {
    const mockData = { message: "success", data: [1, 2, 3] };
    const mockResponse = {
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue(mockData),
      ok: true,
    } as unknown as Response;

    const result = await parseJsonResponse(mockResponse);
    expect(result).toEqual(mockData);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("異常系: JSON以外のContent-Typeの場合はエラーを投げる", async () => {
    const mockText = "<html><body>Error</body></html>";
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockResponse = {
      headers: new Map([["content-type", "text/html"]]),
      text: vi.fn().mockResolvedValue(mockText),
      ok: true, // Status might be 200 but content is wrong
    } as unknown as Response;

    await expect(parseJsonResponse(mockResponse)).rejects.toThrow(
      "サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。"
    );

    expect(mockResponse.text).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Expected JSON but received:", mockText.substring(0, 100));

    consoleSpy.mockRestore();
  });

  it("異常系: Content-Typeが存在しない場合はエラーを投げる", async () => {
    const mockText = "Some text response";
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockResponse = {
      headers: new Map([]), // No content-type
      text: vi.fn().mockResolvedValue(mockText),
      ok: true,
    } as unknown as Response;

    await expect(parseJsonResponse(mockResponse)).rejects.toThrow(
      "サーバーから予期しないレスポンス（HTML）が返されました。ログイン状態を確認してください。"
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
