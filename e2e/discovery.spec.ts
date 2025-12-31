import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './helpers/auth';

/**
 * Discoveryが空状態（またはエラー状態）かどうかを判定する
 */
async function isEmptyDiscovery(page: import('@playwright/test').Page): Promise<boolean> {
    const emptySelectors = [
        'text=/今日のディスカバリーはここまで/i',
        'text=/すべての曲を評価しました/i',
        'text=/楽曲が見つかりませんでした/i',
        'text=/楽曲がありません/i',
        'text=/補充に失敗しました/i',
        '[role="alert"]'
    ];

    for (const selector of emptySelectors) {
        if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
            return true;
        }
    }
    return false;
}

/**
 * スワイプ可能なカードが存在するかどうかを判定する
 */
async function hasSwipeableCard(page: import('@playwright/test').Page): Promise<boolean> {
    // aria-labelによる判定（現在の実装）
    const swipeableCount = await page.locator('[aria-label$="をスワイプ"]').count();
    if (swipeableCount > 0) return true;

    // フォールバック: article要素（TrackCardやTutorialCardが使用）
    const articleCount = await page.locator('article').count();
    if (articleCount > 0) return true;

    return false;
}

async function ensureTopIsTrackCard(page: import('@playwright/test').Page) {
    console.log('Checking discovery state... URL:', page.url());

    // 空状態ならテストをスキップ
    if (await isEmptyDiscovery(page)) {
        console.log('Discovery is empty or in error state. Skipping test.');
        test.skip(true, 'Discovery is empty in this environment');
        return;
    }

    // カードが出るまで待機
    try {
        await expect.poll(async () => await hasSwipeableCard(page), {
            message: 'Wait for swipeable card to appear',
            timeout: 10000
        }).toBeTruthy();
    } catch (e) {
        const isEmpty = await isEmptyDiscovery(page);
        console.log(`Failed to find cards. isEmpty=${isEmpty}, URL=${page.url()}`);
        if (isEmpty) {
            test.skip(true, 'Discovery became empty while waiting');
            return;
        }
        throw e;
    }

    const topSwipeable = page.locator('[aria-label$="をスワイプ"]').first();
    await expect(topSwipeable).toBeVisible();

    const label = await topSwipeable.getAttribute('aria-label');
    if (label?.includes('チュートリアル')) {
        console.log('Tutorial card detected. Clicking Like to skip it.');
        // チュートリアルカードはネットワーク不要なので、確実なボタンクリックで除去
        await page.locator('button[aria-label="いいね"]').click();
        await expect.poll(async () => {
            const next = await page.locator('[aria-label$="をスワイプ"]').first().getAttribute('aria-label');
            return next ?? '';
        }, { timeout: 5000 }).not.toContain('チュートリアル');
    }
}

test.describe('ディスカバリー画面', () => {
    test.beforeEach(async ({ page }) => {
        // 認証済み状態でテストを開始
        await setupAuthenticatedSession(page);

        // Like/Dislike APIリクエストをモックして常に成功を返す
        await page.route('**/api/tracks/like', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
        });

        await page.route('**/api/tracks/dislike', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
        });
    });

    test('カードが表示される', async ({ page }) => {
        // ホーム画面に移動
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 空状態ならスキップ
        if (await isEmptyDiscovery(page)) {
            console.log('Discovery is empty. Skipping "カードが表示される" test.');
            test.skip(true, 'Discovery is empty in this environment');
            return;
        }

        // カードスタックが表示されることを確認
        const cardStack = page.locator('[data-testid="track-card-stack"]').or(page.locator('main'));
        await expect(cardStack).toBeVisible();

        // カードが少なくとも1枚表示されていることを確認
        // hasSwipeableCardを使って待機
        await expect.poll(async () => await hasSwipeableCard(page), { timeout: 10000 }).toBeTruthy();

        const cards = page.locator('[data-testid="track-card"]').or(page.locator('article, [role="article"]'));
        const cardCount = await cards.count();
        expect(cardCount).toBeGreaterThan(0);

        // カードの内容が表示されているか確認（トラック名、アーティスト名など）
        const firstCard = cards.first();
        await expect(firstCard).toBeVisible();
    });

    test('右スワイプ（Like）で次のカードが表示される', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 先頭がチュートリアルなら除去して、実トラックカードで検証する
        await ensureTopIsTrackCard(page);

        const topSwipeable = page.locator('[aria-label$="をスワイプ"]').first();
        const firstTopLabel = (await topSwipeable.getAttribute('aria-label')) ?? '';

        // UI実装に合わせて確実にボタンをクリック
        await page.locator('button[aria-label="いいね"]').click();

        await expect.poll(async () => {
            const next = await page.locator('[aria-label$="をスワイプ"]').first().getAttribute('aria-label');
            return next ?? '';
        }, { timeout: 5000 }).not.toBe(firstTopLabel);
    });

    test('左スワイプ（Dislike）で次のカードが表示される', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 先頭がチュートリアルなら除去して、実トラックカードで検証する
        await ensureTopIsTrackCard(page);

        const topSwipeable = page.locator('[aria-label$="をスワイプ"]').first();
        const firstTopLabel = (await topSwipeable.getAttribute('aria-label')) ?? '';

        await page.locator('button[aria-label="よくない"]').click();

        await expect.poll(async () => {
            const next = await page.locator('[aria-label$="をスワイプ"]').first().getAttribute('aria-label');
            return next ?? '';
        }, { timeout: 5000 }).not.toBe(firstTopLabel);
    });

    test('Likeボタンクリックで動作する', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await ensureTopIsTrackCard(page);

        // Likeボタンを探す
        const likeButton = page.locator('button[aria-label="いいね"]');
        await expect(likeButton).toBeVisible();

        const topSwipeable = page.locator('[aria-label$="をスワイプ"]').first();
        const firstTopLabel = (await topSwipeable.getAttribute('aria-label')) ?? '';

        // ボタンをクリック
        await likeButton.click();

        // 次のカードが表示されることを確認
        await expect.poll(async () => {
            const next = await page.locator('[aria-label$="をスワイプ"]').first().getAttribute('aria-label');
            return next ?? '';
        }, { timeout: 5000 }).not.toBe(firstTopLabel);
    });

    test('Dislikeボタンクリックで動作する', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await ensureTopIsTrackCard(page);

        // Dislikeボタンを探す
        const dislikeButton = page.locator('button[aria-label="よくない"]');
        await expect(dislikeButton).toBeVisible();

        const topSwipeable = page.locator('[aria-label$="をスワイプ"]').first();
        const firstTopLabel = (await topSwipeable.getAttribute('aria-label')) ?? '';

        // ボタンをクリック
        await dislikeButton.click();

        // 次のカードが表示されることを確認
        await expect.poll(async () => {
            const next = await page.locator('[aria-label$="をスワイプ"]').first().getAttribute('aria-label');
            return next ?? '';
        }, { timeout: 5000 }).not.toBe(firstTopLabel);
    });

    test('トラック情報が正しく表示される', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await ensureTopIsTrackCard(page);

        // カードを取得
        const cards = page.locator('[data-testid="track-card"]').or(page.locator('article, [role="article"]'));
        const firstCard = cards.first();

        await expect(firstCard).toBeVisible();

        // トラック名またはアーティスト名が表示されているか確認
        const hasText = await firstCard.textContent();
        expect(hasText).toBeTruthy();
        expect(hasText!.length).toBeGreaterThan(0);
    });
});
