import { Page } from '@playwright/test';

/**
 * テストユーザーとしてログインする
 * 環境変数 TEST_USER_EMAIL と TEST_USER_PASSWORD を使用
 */
export async function loginAsTestUser(page: Page) {
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    if (!testEmail || !testPassword) {
        throw new Error(
            'TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required for E2E tests'
        );
    }

    // ログインページに移動
    await page.goto('/login');

    // ログインフォームが表示されるまで待機
    await page.waitForLoadState('networkidle');

    // メールアドレスとパスワードを入力
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    // ログインボタンをクリック
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // ログイン完了を待機（ホーム画面へのリダイレクトまで）
    await page.waitForURL('**/', { timeout: 10000 });
}

/**
 * 認証状態をクリアしてログアウト
 */
export async function logout(page: Page) {
    // ページがまだナビゲートされていない場合（about:blankなど）や、
    // ローカルオリジンでない場合はアプリのルートに移動してからストレージ操作を行う
    const currentUrl = page.url();
    if (currentUrl === 'about:blank' || currentUrl === '' || !currentUrl.includes('localhost')) {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    }

    try {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    } catch (e) {
        // セキュリティエラーなどで localStorage にアクセスできない場合は無視する
        // Playwright の実行ログに残す
        // eslint-disable-next-line no-console
        console.warn('Could not clear local/session storage during logout:', e);
    }

    await page.context().clearCookies();
    await page.context().clearPermissions();
}

/**
 * 認証済みの状態でページを開く
 */
export async function setupAuthenticatedSession(page: Page) {
    await loginAsTestUser(page);
    // ログイン後の状態を確認
    await page.waitForLoadState('networkidle');
}
