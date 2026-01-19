import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
    describe('正常系', () => {
        it('単一のクラス名をそのまま返す', () => {
            expect(cn('class1')).toBe('class1');
        });

        it('複数のクラス名を結合する', () => {
            expect(cn('class1', 'class2')).toBe('class1 class2');
        });

        it('条件付きクラス名を正しく処理する (true)', () => {
            expect(cn('class1', true && 'class2')).toBe('class1 class2');
        });

        it('条件付きクラス名を正しく処理する (false)', () => {
            expect(cn('class1', false && 'class2')).toBe('class1');
        });

        it('undefined や null を無視する', () => {
            expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
        });

        it('Tailwind のクラス競合を解消する', () => {
            // px-2 が px-4 に上書きされるべき
            expect(cn('px-2', 'px-4')).toBe('px-4');
            // text-red-500 が text-blue-500 に上書きされるべき
            expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
        });

        it('複雑な組み合わせを処理する', () => {
            const isActive = true;
            const isDisabled = false;

            const result = cn(
                'base-class',
                isActive ? 'active' : 'inactive',
                isDisabled && 'disabled',
                'p-4',
                'p-2' // p-4 を上書き
            );

            expect(result).toBe('base-class active p-2');
        });
    });
});
