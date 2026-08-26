import { describe, expect, it } from 'vitest';
import { stepIn, stepOut } from '../../lib/utils/transitions';
import type { TransitionConfig } from 'svelte/transition';

const node = document.createElement('div');

/**
 * トランジション設定からcss関数を取り出す(未定義ならテストを失敗させる)
 * @param config - トランジション設定
 * @returns css関数
 */
const getCss = (config: TransitionConfig) => {
	const { css } = config;
	if (css === undefined) {
		throw new Error('css関数がありません');
	}
	return css;
};

describe('ステップ切替のトランジション', () => {
	it('stepInは右にずれた透明の状態から定位置へ戻る', () => {
		const config = stepIn(node);
		const css = getCss(config);
		expect(config.duration).toBe(500);
		expect(css(0, 1)).toBe('opacity: 0; transform: translateX(60px);');
		expect(css(1, 0)).toBe('opacity: 1; transform: translateX(0px);');
	});

	it('stepOutは定位置から左にずれた透明の状態へ抜ける', () => {
		const config = stepOut(node);
		const css = getCss(config);
		expect(config.duration).toBe(500);
		expect(css(0, 1)).toBe('opacity: 0; transform: translateX(-60px);');
		expect(css(1, 0)).toBe('opacity: 1; transform: translateX(0px);');
	});

	it('durationを指定すると時間を上書きできる', () => {
		expect(stepIn(node, { duration: 100 }).duration).toBe(100);
		expect(stepOut(node, { duration: 100 }).duration).toBe(100);
	});
});
