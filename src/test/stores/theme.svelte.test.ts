import { beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase } from '../../lib/db/database';
import { getThemeMode } from '../../lib/db/settings';
import { stubIndexedDb } from '../indexeddb-test-util';
import { themeStore } from '../../lib/stores/theme.svelte';

/** テストごとにIndexedDBを初期化し、テーマをシステム(属性なし)に戻す */
const reset = async () => {
	await closeDatabase();
	stubIndexedDb();
	await themeStore.set('system');
};

/**
 * theme-colorメタタグ(既定とライト用)をヘッドへ追加する
 * @returns 追加したメタタグ
 */
const appendThemeColorMetas = () => {
	const base = document.createElement('meta');
	base.name = 'theme-color';
	base.content = '#1f1f1f';
	const light = document.createElement('meta');
	light.name = 'theme-color';
	light.content = '#f2f2f2';
	light.setAttribute('media', '(prefers-color-scheme: light)');
	document.head.append(base, light);
	return { base, light };
};

describe('テーマストア', () => {
	beforeEach(reset);

	it('ダークを選ぶと属性が付き、保存される', async () => {
		await themeStore.set('dark');
		expect(themeStore.mode).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		await expect(getThemeMode()).resolves.toBe('dark');
	});

	it('手動選択はtheme-colorメタを選んだ色にし、システムでは既定へ戻す', async () => {
		const { base, light } = appendThemeColorMetas();

		await themeStore.set('light');
		expect(base.content).toBe('#f2f2f2');
		expect(light.content).toBe('#f2f2f2');

		await themeStore.set('system');
		expect(base.content).toBe('#1f1f1f');
		expect(light.content).toBe('#f2f2f2');
		base.remove();
		light.remove();
	});

	it('システムを選ぶと属性が外れ、読み込みで保存済みの選択が反映される', async () => {
		await themeStore.set('light');
		await themeStore.set('system');
		expect(document.documentElement.dataset.theme).toBeUndefined();
		await expect(getThemeMode()).resolves.toBe('system');

		await themeStore.set('light');
		document.documentElement.dataset.theme = 'dark';
		await themeStore.load();
		expect(themeStore.mode).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
	});
});
