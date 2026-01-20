import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn (className utility)', () => {
    it('複数のクラス名を結合する', () => {
        const result = cn('class1', 'class2', 'class3')
        expect(result).toBe('class1 class2 class3')
    })

    it('条件付きクラス名を正しく処理する', () => {
        const result = cn(
            'class1',
            true && 'class2',
            false && 'class3',
            undefined,
            null,
            'class4'
        )
        expect(result).toBe('class1 class2 class4')
    })

    it('Tailwind CSS のクラス競合をマージして解決する', () => {
        // px-2 と px-4 が競合する場合、後のものが優先される（tailwind-merge の機能）
        const result = cn('px-2 py-1', 'px-4')
        expect(result).toBe('py-1 px-4')
    })

    it('配列やオブジェクト形式の入力も処理できる', () => {
        const result = cn('class1', ['class2', 'class3'], { class4: true, class5: false })
        expect(result).toBe('class1 class2 class3 class4')
    })
})
