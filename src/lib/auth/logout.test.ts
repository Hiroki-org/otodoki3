import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logout } from './logout'

// vi.hoisted を使用して、vi.mock 内で参照できるように変数を巻き上げる
const mocks = vi.hoisted(() => {
    return {
        signOut: vi.fn(),
        createClient: vi.fn(),
    }
})

// モジュール全体のモック
vi.mock('@/lib/supabase/client', () => ({
    createClient: mocks.createClient
}))

describe('logout', () => {
    const originalLocation = window.location

    beforeEach(() => {
        // 各テストの前にモックをリセット
        vi.clearAllMocks()

        // createClient の戻り値を設定
        mocks.createClient.mockReturnValue({
            auth: {
                signOut: mocks.signOut
            }
        })

        // window.location のモック化
        // JSDOM では window.location は読み取り専用なので、delete して再定義する必要がある
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).location
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.location = { href: '' } as any
    })

    afterEach(() => {
        // テスト後に元の window.location に戻す
        window.location = originalLocation
    })

    it('Supabase の signOut を呼び出し、ログインページへリダイレクトする', async () => {
        await logout()

        // signOut が呼ばれたことを確認
        expect(mocks.signOut).toHaveBeenCalledTimes(1)

        // /login へリダイレクトされたことを確認
        expect(window.location.href).toBe('/login')
    })
})
