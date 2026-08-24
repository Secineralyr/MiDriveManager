import { afterEach, describe, expect, it, vi } from 'vitest';

/** スマートフォン判定のメディアクエリ(ストアと同じ) */
const PHONE = '(max-width: 640px)';

/** タッチ判定のメディアクエリ(ストアと同じ) */
const COARSE = '(pointer: coarse)';

/** 変更リスナーの呼び出し口 */
type ChangeListener = (event: {
	/** メディアクエリに一致するかどうか */
	matches: boolean;
}) => void;

/**
 * matchMediaの偽実装を差し込み、クエリごとの変更イベントを後から発火できるようにする
 * @param initial - クエリごとの初期の一致状態
 * @returns 変更イベントの発火関数
 */
const stubMatchMedia = (initial: Record<string, boolean>) => {
	const listeners: Record<string, ChangeListener> = {};
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: initial[query] ?? false,
		media: query,
		addEventListener: (_type: string, handler: ChangeListener) => {
			listeners[query] = handler;
		},
	}));
	return (query: string, matches: boolean) => {
		listeners[query]?.({ matches });
	};
};

/**
 * navigatorの偽実装を差し込む
 * @param userAgent - UA文字列
 * @param maxTouchPoints - タッチ点数
 */
const stubNavigator = (userAgent: string, maxTouchPoints: number) => {
	vi.stubGlobal('navigator', { userAgent, maxTouchPoints });
};

describe('ビューポートストア', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('640px以下ならスマートフォンで、タブレット相当にはならない', async () => {
		stubNavigator('Mozilla/5.0 (iPhone)', 5);
		stubMatchMedia({ [PHONE]: true, [COARSE]: true });
		vi.resetModules();
		// 理由: matchMediaのスタブを反映した状態でモジュールを初期化し直すため
		const { viewportStore } = await import('../../lib/stores/viewport.svelte');
		expect(viewportStore.phone).toBe(true);
		expect(viewportStore.touchDevice).toBe(true);
		expect(viewportStore.tablet).toBe(false);
	});

	it('タッチのポインターがあり、スマートフォン幅でなければタブレット相当と判定する', async () => {
		stubNavigator('Mozilla/5.0 (Windows NT 10.0)', 0);
		const fire = stubMatchMedia({ [COARSE]: true });
		vi.resetModules();
		// 理由: matchMediaのスタブを反映した状態でモジュールを初期化し直すため
		const { viewportStore } = await import('../../lib/stores/viewport.svelte');
		expect(viewportStore.tablet).toBe(true);

		fire(PHONE, true);
		expect(viewportStore.tablet).toBe(false);
		expect(viewportStore.phone).toBe(true);
	});

	it('ポインターが細かくてもiPadのUA(Macintosh+タッチ点数)ならタッチ端末と判定する', async () => {
		stubNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5);
		stubMatchMedia({});
		vi.resetModules();
		// 理由: navigatorとmatchMediaのスタブを反映した状態でモジュールを初期化し直すため
		const { viewportStore } = await import('../../lib/stores/viewport.svelte');
		expect(viewportStore.touchDevice).toBe(true);
		expect(viewportStore.tablet).toBe(true);
	});

	it('マウス操作のPCではウィンドウ幅に関わらずタブレット相当にならない', async () => {
		stubNavigator('Mozilla/5.0 (Windows NT 10.0)', 0);
		stubMatchMedia({});
		vi.resetModules();
		// 理由: matchMediaのスタブを反映した状態でモジュールを初期化し直すため
		const { viewportStore } = await import('../../lib/stores/viewport.svelte');
		expect(viewportStore.touchDevice).toBe(false);
		expect(viewportStore.tablet).toBe(false);
	});
});
