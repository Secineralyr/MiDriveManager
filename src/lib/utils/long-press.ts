// 長押し判定時間
const LONG_PRESS_MS = 500;

// 長押し取り消し移動量
const MOVE_TOLERANCE_PX = 10;

/** 長押しが確定した時の処理(押し始めの座標を渡す) */
type LongPressHandler = (position: {
	/** ビューポート基準のx座標 */
	x: number;
	/** ビューポート基準のy座標 */
	y: number;
}) => void;

/** 長押し検出の内部状態 */
type PressState = {
	/** 現在の処理(undefinedなら無効) */
	handler: LongPressHandler | undefined;
	/** 判定待ちのタイマー */
	timer: ReturnType<typeof setTimeout> | null;
	/** 押し始めのx座標 */
	startX: number;
	/** 押し始めのy座標 */
	startY: number;
	/** 長押しが確定したかどうか */
	fired: boolean;
};

/**
 * 主ポインター(1本目の指や主ボタン)かどうか
 * PointerEventがない環境ではisPrimaryが未定義のため、その場合は主とみなす
 * @param event - ポインターイベント
 * @returns 主ポインターならtrue
 */
const isPrimaryPointer = (event: PointerEvent) => {
	const primary: boolean | undefined = event.isPrimary;
	return primary ?? true;
};

/**
 * 判定待ちのタイマーを取り消す
 * @param state - 内部状態
 */
const cancelPress = (state: PressState) => {
	if (state.timer !== null) {
		clearTimeout(state.timer);
		state.timer = null;
	}
};

/**
 * 押し始めで判定待ちを開始する
 * @param state - 内部状態
 * @param event - ポインターイベント
 */
const startPress = (state: PressState, event: PointerEvent) => {
	if (state.handler === undefined || !isPrimaryPointer(event)) {
		return;
	}

	state.fired = false;
	state.startX = event.clientX;
	state.startY = event.clientY;

	cancelPress(state);
	state.timer = setTimeout(() => {
		state.timer = null;
		state.fired = true;
		state.handler?.({ x: state.startX, y: state.startY });
	}, LONG_PRESS_MS);
};

/**
 * 押し始めから大きく動いたら長押しを取り消す(スクロール操作とみなす)
 * @param state - 内部状態
 * @param event - ポインターイベント
 */
const movePress = (state: PressState, event: PointerEvent) => {
	if (state.timer === null) {
		return;
	}

	const moved =
		Math.abs(event.clientX - state.startX) > MOVE_TOLERANCE_PX ||
		Math.abs(event.clientY - state.startY) > MOVE_TOLERANCE_PX;
	if (moved) {
		cancelPress(state);
	}
};

/**
 * 長押し確定後のクリックを握りつぶす(長押しの指離しがタップ扱いにならないように)
 * @param state - 内部状態
 * @param event - マウスイベント
 */
const suppressClick = (state: PressState, event: MouseEvent) => {
	if (state.fired) {
		state.fired = false;
		event.preventDefault();
		event.stopPropagation();
	}
};

/**
 * 押し始めと移動の監視を登録する
 * @param node - 対象の要素
 * @param state - 内部状態
 * @returns 監視を解除する処理
 */
const attachTracking = (node: HTMLElement, state: PressState) => {
	const handleDown = (event: PointerEvent) => {
		startPress(state, event);
	};
	const handleMove = (event: PointerEvent) => {
		movePress(state, event);
	};
	const handleDragStart = () => {
		// ドラッグ中に発火してメニューが開かないようにドラッグが始まったら長押しは取り消す
		cancelPress(state);
	};

	node.addEventListener('pointerdown', handleDown);
	node.addEventListener('pointermove', handleMove);
	node.addEventListener('dragstart', handleDragStart);

	return () => {
		node.removeEventListener('pointerdown', handleDown);
		node.removeEventListener('pointermove', handleMove);
		node.removeEventListener('dragstart', handleDragStart);
	};
};

/**
 * 押し終わりとクリック抑止の監視を登録する
 * @param node - 対象の要素
 * @param state - 内部状態
 * @returns 監視を解除する処理
 */
const attachRelease = (node: HTMLElement, state: PressState) => {
	const handleEnd = () => {
		cancelPress(state);
	};
	const handleClick = (event: MouseEvent) => {
		suppressClick(state, event);
	};

	node.addEventListener('pointerup', handleEnd);
	node.addEventListener('pointercancel', handleEnd);
	node.addEventListener('pointerleave', handleEnd);
	node.addEventListener('click', handleClick, true);

	return () => {
		node.removeEventListener('pointerup', handleEnd);
		node.removeEventListener('pointercancel', handleEnd);
		node.removeEventListener('pointerleave', handleEnd);
		node.removeEventListener('click', handleClick, true);
	};
};

/**
 * 要素の長押しを検出するSvelteアクション
 * 500ms押し続けると発火する。途中で離したり大きく動かすと取り消す
 * @param node - 対象の要素
 * @param handler - 長押しが確定した時の処理(undefinedなら何もしない)
 * @returns アクションの更新・破棄処理
 */
export const longPress = (node: HTMLElement, handler: LongPressHandler | undefined) => {
	const state: PressState = { handler, timer: null, startX: 0, startY: 0, fired: false };

	const detachTracking = attachTracking(node, state);
	const detachRelease = attachRelease(node, state);

	return {
		/**
		 * 処理を差し替える
		 * @param next - 新しい処理(undefinedなら無効化)
		 */
		update(next: LongPressHandler | undefined) {
			state.handler = next;
			if (next === undefined) {
				cancelPress(state);
			}
		},

		/** イベント登録とタイマーを破棄する */
		destroy() {
			cancelPress(state);
			detachTracking();
			detachRelease();
		},
	};
};
