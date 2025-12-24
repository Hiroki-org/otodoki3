import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateMetadata } from '@/lib/track-pool';
import type { Json } from '@/types/database';

describe('track-pool.ts', () => {
  describe('validateMetadata', () => {
    // 正常系：null/undefined の処理
    it('正常系: null を受け取ると null を返す', () => {
      const result = validateMetadata(null);
      expect(result).toBeNull();
    });

    it('正常系: undefined を受け取ると null を返す', () => {
      const result = validateMetadata(undefined);
      expect(result).toBeNull();
    });

    // 正常系：オブジェクト入力
    it('正常系: シンプルなオブジェクトを受け取る', () => {
      const input = { key: 'value', number: 123 };
      const result = validateMetadata(input);
      expect(result).toEqual(input);
    });

    it('正常系: ネストされたオブジェクトを受け取る', () => {
      const input = { nested: { deep: { value: 'test' } } };
      const result = validateMetadata(input);
      expect(result).toEqual(input);
    });

    it('正常系: オブジェクト内に null を含むことを許可', () => {
      const input = { key: null, value: 'test' };
      const result = validateMetadata(input);
      expect(result).toEqual(input);
    });

    it('正常系: オブジェクト内に配列を含むことを許可', () => {
      const input = { items: [1, 2, 3], name: 'test' };
      const result = validateMetadata(input);
      expect(result).toEqual(input);
    });

    // 正常系：JSON 文字列のパース
    it('正常系: JSON 文字列のオブジェクトをパースする', () => {
      const input = '{"key":"value","number":123}';
      const result = validateMetadata(input);
      expect(result).toEqual({ key: 'value', number: 123 });
    });

    it('正常系: ネストされた JSON 文字列をパースする', () => {
      const input = '{"nested":{"deep":"value"}}';
      const result = validateMetadata(input);
      expect(result).toEqual({ nested: { deep: 'value' } });
    });

    it('正常系: JSON 文字列内に null を含むことを許可', () => {
      const input = '{"key":null,"value":"test"}';
      const result = validateMetadata(input);
      expect(result).toEqual({ key: null, value: 'test' });
    });

    it('正常系: JSON 文字列内に配列を含むことを許可', () => {
      const input = '{"items":[1,2,3]}';
      const result = validateMetadata(input);
      expect(result).toEqual({ items: [1, 2, 3] });
    });

    // 異常系：配列は不許可
    it('異常系: 配列を受け取ると null を返す', () => {
      const result = validateMetadata([1, 2, 3]);
      expect(result).toBeNull();
    });

    it('異常系: JSON 文字列が配列の場合 null を返す', () => {
      const input = '[1, 2, 3]';
      const result = validateMetadata(input);
      expect(result).toBeNull();
    });

    // 異常系：無効な JSON 文字列
    it('異常系: 無効な JSON 文字列は null を返す', () => {
      const input = '{invalid json}';
      const result = validateMetadata(input);
      expect(result).toBeNull();
    });

    it('異常系: 空の JSON 文字列は null を返す', () => {
      const input = '';
      const result = validateMetadata(input);
      expect(result).toBeNull();
    });

    it('異常系: JSON プリミティブ値（文字列）は null を返す', () => {
      const input = '"just a string"';
      const result = validateMetadata(input);
      expect(result).toBeNull();
    });

    it('異常系: JSON プリミティブ値（数値）は null を返す', () => {
      const input = '123';
      const result = validateMetadata(input);
      expect(result).toBeNull();
    });

    it('異常系: JSON プリミティブ値（真偽値）は null を返す', () => {
      const input = 'true';
      const result = validateMetadata(input);
      expect(result).toBeNull();
    });

    it('異常系: JSON null は null を返す', () => {
      const input = 'null';
      const result = validateMetadata(input);
      expect(result).toBeNull();
    });

    // 異常系：オブジェクト以外の値
    it('異常系: 数値を受け取ると null を返す', () => {
      const result = validateMetadata(123);
      expect(result).toBeNull();
    });

    it('異常系: 文字列を受け取ると null を返す', () => {
      // 文字列は JSON パース対象なので、無効な JSON として null
      const result = validateMetadata('not json');
      expect(result).toBeNull();
    });

    it('異常系: 真偽値を受け取ると null を返す', () => {
      const result = validateMetadata(true);
      expect(result).toBeNull();
    });

    // エッジケース
    it('エッジケース: 空のオブジェクト', () => {
      const input = {};
      const result = validateMetadata(input);
      expect(result).toEqual({});
    });

    it('エッジケース: 空の JSON オブジェクト文字列', () => {
      const input = '{}';
      const result = validateMetadata(input);
      expect(result).toEqual({});
    });

    it('エッジケース: 大きなオブジェクト', () => {
      const input = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`key${i}`, i])
      );
      const result = validateMetadata(input);
      expect(result).toEqual(input);
    });

    it('エッジケース: 特殊文字を含むキー', () => {
      const input = { 'key@#$%': 'value', '日本語': 'test' };
      const result = validateMetadata(input);
      expect(result).toEqual(input);
    });

    it('エッジケース: Unicode を含む JSON 文字列', () => {
      const input = '{"日本語":"テスト","emoji":"😀"}';
      const result = validateMetadata(input);
      expect(result).toEqual({ 日本語: 'テスト', emoji: '😀' });
    });
  });
});
