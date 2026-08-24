/** ポインター入力のうち幅の変更に必要な部分 */
type PointerInputLike = {
	/** ビューポート基準のx座標 */
	readonly clientX: number;
	/** ポインターの識別子 */
	readonly pointerId: number;
	/** イベントを受けた要素 */
	readonly currentTarget: EventTarget | null;
};

/** キー入力のうち幅の変更に必要な部分 */
type KeyInputLike = {
	/** 押されたキー */
	readonly key: string;
	/** 既定の動作を抑止する */
	preventDefault: () => void;
};

/** パネル幅の変更の設定 */
type ResizerOptions = {
	/** 初期の幅(px) */
	initial: number;
	/** 幅の下限(px) */
	min: number;
	/** 幅の上限(px) */
	max: number;
	/** 矢印キー1回で変える幅(px) */
	step: number;
	/** パネルが接している辺(leftなら右端の境界、rightなら左端の境界をドラッグする) */
	anchor: 'left' | 'right';
};

/** 幅の変更の内部状態 */
type ResizerState = {
	/** 現在の幅(px) */
	width: number;
	/** ドラッグ中かどうか */
	resizing: boolean;
};

/**
 * 幅を上下限に収める
 * @param options - 幅の設定
 * @param value - 幅(px)
 * @returns 収めた幅
 */
const clampWidth = (options: ResizerOptions, value: number) =>
	Math.min(options.max, Math.max(options.min, value));

/**
 * 境界線のドラッグを開始する(以降のポインターイベントを境界線で受け続ける)
 * @param state - 内部状態
 * @param event - ポインター入力
 */
const startDrag = (state: ResizerState, event: PointerInputLike) => {
	state.resizing = true;
	if (event.currentTarget instanceof Element) {
		event.currentTarget.setPointerCapture(event.pointerId);
	}
};

/**
 * ドラッグ中の位置から幅を更新する(固定辺からポインターまでの距離を幅にする)
 * @param state - 内部状態
 * @param options - 幅の設定
 * @param input - ポインターのx座標と固定辺のx座標(いずれもビューポート基準)
 */
const moveWidth = (
	state: ResizerState,
	options: ResizerOptions,
	input: {
		/** ポインターのx座標 */
		clientX: number;
		/** 固定辺のx座標 */
		edge: number;
	},
) => {
	if (!state.resizing) {
		return;
	}

	const distance =
		options.anchor === 'left' ? input.clientX - input.edge : input.edge - input.clientX;
	state.width = clampWidth(options, distance);
};

/**
 * 矢印キーで幅を変える(固定辺から離れる向きで広がる)
 * @param state - 内部状態
 * @param options - 幅の設定
 * @param event - キー入力
 */
const stepWidth = (state: ResizerState, options: ResizerOptions, event: KeyInputLike) => {
	if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
		return;
	}

	event.preventDefault();
	const growKey = options.anchor === 'left' ? 'ArrowRight' : 'ArrowLeft';
	state.width = clampWidth(
		options,
		state.width + (event.key === growKey ? options.step : -options.step),
	);
};

/**
 * 境界線のドラッグと矢印キーでパネルの幅を変える状態を作る
 * @param options - 幅の初期値・上下限・キー操作の刻み・固定辺
 * @returns 幅と操作の処理
 */
export const createPanelResizer = (options: ResizerOptions) => {
	const state: ResizerState = $state({ width: options.initial, resizing: false });
	return {
		/**
		 * 現在の幅(px)
		 * @returns 幅
		 */
		get width() {
			return state.width;
		},
		/**
		 * ドラッグ中かどうか
		 * @returns ドラッグ中ならtrue
		 */
		get resizing() {
			return state.resizing;
		},
		/**
		 * 境界線のドラッグを開始する
		 * @param event - ポインター入力
		 */
		start(event: PointerInputLike) {
			startDrag(state, event);
		},
		/**
		 * ドラッグ中の位置から幅を更新する
		 * @param event - ポインター入力
		 * @param edge - 固定辺のx座標(ビューポート基準)
		 */
		move(event: PointerInputLike, edge: number) {
			moveWidth(state, options, { clientX: event.clientX, edge });
		},
		/** 境界線のドラッグを終える */
		end() {
			state.resizing = false;
		},
		/**
		 * 矢印キーで幅を変える
		 * @param event - キー入力
		 */
		keydown(event: KeyInputLike) {
			stepWidth(state, options, event);
		},
	};
};
