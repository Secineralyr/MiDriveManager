/** Element.animateの代わりに返す、即座に完了する偽のアニメーション */
type FakeAnimation = {
	/** 再生状態(常に完了扱い) */
	playState: string;
	/** 完了時に呼ばれる処理 */
	onfinish: (() => void) | null;
	/** 中断時に呼ばれる処理 */
	oncancel: (() => void) | null;
	/** アニメーションを中断する(何もしない) */
	cancel: () => void;
};

/**
 * 即座に完了する偽のアニメーションを作る(onfinishはマイクロタスクで呼ぶ)
 * @returns 偽のアニメーション
 */
const createFakeAnimation = () => {
	const animation: FakeAnimation = {
		playState: 'finished',
		onfinish: null,
		oncancel: null,
		cancel: () => {},
	};
	queueMicrotask(() => {
		animation.onfinish?.();
	});
	return animation;
};

/**
 * jsdomにはWeb Animations APIがないため、Svelteのトランジションが使うElement.animateを
 * 即座に完了する偽の実装に差し替える
 */
export const stubElementAnimate = () => {
	Object.defineProperty(Element.prototype, 'animate', {
		configurable: true,
		writable: true,
		value: createFakeAnimation,
	});
};
