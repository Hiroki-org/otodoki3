import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logout } from "./logout";

// ホイスティング対応: vi.mock内で使用する変数はvi.hoistedで定義する
const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

// Supabaseクライアントのモック化
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mocks.signOut,
    },
  }),
}));

describe("logout", () => {
  // テスト実行前のwindow.locationを保存
  const originalLocation = window.location;

  beforeEach(() => {
    // window.locationをモック化するために削除
    // JSDOMではwindow.locationはread-onlyプロパティのため、削除して再定義する必要がある
    delete (window as any).location;
    window.location = { href: "" } as any;

    // モックの呼び出し履歴をクリア
    vi.clearAllMocks();
  });

  afterEach(() => {
    // テスト終了後にwindow.locationを元に戻す
    window.location = originalLocation;
  });

  it("ログアウト処理を実行し、ログインページへリダイレクトすること", async () => {
    // 関数実行
    await logout();

    // 検証: SupabaseのsignOutメソッドが1回呼ばれたこと
    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    // 検証: ログインページ(/login)へリダイレクトされたこと
    expect(window.location.href).toBe("/login");
  });
});
