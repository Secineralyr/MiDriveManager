import { describe, expect, it } from 'vitest';
import { computeBreadcrumbLayout } from '../../lib/utils/breadcrumb-layout';

describe('パンくずを省略しない場合', () => {
	it('全体がコンテナに収まる場合は省略しない', () => {
		const layout = computeBreadcrumbLayout({
			widths: [50, 50, 50],
			containerWidth: 200,
			ellipsisWidth: 20,
			gap: 5,
		});
		expect(layout).toStrictEqual({ collapsed: false, tailStart: 1 });
	});

	it('コンテナ幅が未計測(0)の場合は省略しない', () => {
		const layout = computeBreadcrumbLayout({
			widths: [50, 50, 50],
			containerWidth: 0,
			ellipsisWidth: 20,
			gap: 5,
		});
		expect(layout.collapsed).toBe(false);
	});

	it('項目が2つ以下の場合は省略しない', () => {
		const layout = computeBreadcrumbLayout({
			widths: [500, 500],
			containerWidth: 100,
			ellipsisWidth: 20,
			gap: 5,
		});
		expect(layout.collapsed).toBe(false);
	});
});

describe('パンくずを省略する場合', () => {
	it('収まらない場合は先頭と末尾を残して間を省略する', () => {
		const layout = computeBreadcrumbLayout({
			widths: [50, 60, 60, 50],
			containerWidth: 150,
			ellipsisWidth: 20,
			gap: 5,
		});
		expect(layout).toStrictEqual({ collapsed: true, tailStart: 3 });
	});

	it('余裕がある分だけ末尾側の項目も表示する', () => {
		const layout = computeBreadcrumbLayout({
			widths: [50, 60, 60, 50],
			containerWidth: 200,
			ellipsisWidth: 20,
			gap: 5,
		});
		expect(layout).toStrictEqual({ collapsed: true, tailStart: 2 });
	});

	it('末尾の項目は収まらなくても必ず表示する', () => {
		const layout = computeBreadcrumbLayout({
			widths: [50, 60, 300],
			containerWidth: 100,
			ellipsisWidth: 20,
			gap: 5,
		});
		expect(layout).toStrictEqual({ collapsed: true, tailStart: 2 });
	});
});
