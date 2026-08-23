/** jsdomにはResizeObserverがないため差し込む、何も観測しない偽の実装 */
class FakeResizeObserver {
	/** 観測を開始する(何もしない) */
	observe() {
		// 何も観測しない
	}

	/** 観測をやめる(何もしない) */
	unobserve() {
		// 何も観測しない
	}

	/** すべての観測をやめる(何もしない) */
	disconnect() {
		// 何も観測しない
	}
}

/**
 * Svelteのbind:clientWidth等が使うResizeObserverを偽の実装に差し替える
 */
export const stubResizeObserver = () => {
	Object.defineProperty(globalThis, 'ResizeObserver', {
		configurable: true,
		writable: true,
		value: FakeResizeObserver,
	});
};
