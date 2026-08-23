/** 閉じるアニメーションの時間(ミリ秒) */
const CLOSE_DELAY_MS = 250;

/** 制御に必要なdialog要素の部分 */
type DialogLike = {
	/** 開いているかどうか */
	readonly open: boolean;
	/** モーダルとして開く */
	showModal: () => void;
	/** 閉じる */
	close: () => void;
};

/** 閉じる制御の内部状態 */
type CloserContext = {
	/** 退出アニメーション中かどうか(リアクティブな状態) */
	state: {
		/** 退出アニメーション中かどうか */
		closing: boolean;
	};
	/** 予約中の閉じるタイマー(なければnull) */
	timer: ReturnType<typeof setTimeout> | null;
	/** 閉じるまでの待ち時間(ミリ秒) */
	delayMs: number;
};

/**
 * すぐに表示状態へ戻す(予約済みの閉じる処理は取り消す)
 * @param context - 閉じる制御の内部状態
 * @param dialog - 対象のdialog要素
 */
const showNow = (context: CloserContext, dialog: DialogLike) => {
	if (context.timer !== null) {
		clearTimeout(context.timer);
		context.timer = null;
	}

	context.state.closing = false;
	if (!dialog.open) {
		dialog.showModal();
	}
};

/**
 * 退出スタイルを見せてから閉じる処理を予約する
 * @param context - 閉じる制御の内部状態
 * @param dialog - 対象のdialog要素
 */
const scheduleClose = (context: CloserContext, dialog: DialogLike) => {
	if (!dialog.open || context.timer !== null) {
		return;
	}

	context.state.closing = true;
	context.timer = setTimeout(() => {
		context.timer = null;
		context.state.closing = false;
		dialog.close();
	}, context.delayMs);
};

/**
 * ネイティブdialogの閉じるアニメーション用の制御を作る
 * openがfalseになってもすぐにclose()せず、closing状態でCSSの退出スタイルを見せてから閉じる
 * (ブラウザのallow-discrete対応に依存しないための仕組み)
 * @param delayMs - 閉じるまでの待ち時間(退出アニメーションの時間)
 * @returns closing状態と、effectから呼ぶ同期処理
 */
export const createDialogCloser = (delayMs: number = CLOSE_DELAY_MS) => {
	const state = $state({ closing: false });
	const context: CloserContext = { state, timer: null, delayMs };

	return {
		/**
		 * 退出アニメーション中かどうか(dialogのdata-closing属性に渡す)
		 * @returns 退出アニメーション中ならtrue
		 */
		get closing() {
			return state.closing;
		},

		/**
		 * 表示状態とdialog要素を同期する($effectから呼ぶ)
		 * @param open - 表示するかどうか
		 * @param dialog - 対象のdialog要素(未マウントならnull)
		 */
		sync(open: boolean, dialog: DialogLike | null) {
			if (dialog === null) {
				return;
			}

			if (open) {
				showNow(context, dialog);
			} else {
				scheduleClose(context, dialog);
			}
		},
	};
};
