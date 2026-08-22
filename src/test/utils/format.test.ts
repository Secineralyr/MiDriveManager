import { describe, expect, it } from 'vitest';
import { formatDateTime, formatFileSize } from '../../lib/utils/format';

describe('ファイルサイズの表記', () => {
	it('1024バイト未満はバイト表記になる', () => {
		expect(formatFileSize(0)).toBe('0 B');
		expect(formatFileSize(500)).toBe('500 B');
	});

	it('KB表記になる', () => {
		expect(formatFileSize(1536)).toBe('1.5 KB');
	});

	it('MB表記になる', () => {
		expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
	});

	it('GB表記になる', () => {
		expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
	});

	it('TBを超えてもTBのまま表記する', () => {
		expect(formatFileSize(2048 * 1024 ** 4)).toBe('2048.0 TB');
	});
});

describe('日時の表記', () => {
	it('日本語の日時表記へ変換される', () => {
		const text = formatDateTime('2026-08-22T05:30:00.000Z');
		expect(text).toContain('2026');
		expect(text).not.toBe('');
	});

	it('解釈できない文字列は空文字列になる', () => {
		expect(formatDateTime('これは日時ではない')).toBe('');
	});
});
