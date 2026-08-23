/** トーストの種類(errorは危険色、infoは通常色のインジケーターで表示する) */
type ToastKindShape = 'error' | 'info';

/** トースト1件の内容 */
type ToastItemShape = {
	/** トーストの識別子 */
	id: number;
	/** トーストの種類 */
	kind: ToastKindShape;
	/** 表示するメッセージ */
	message: string;
	/** 自動的に消えるまでの時間(ミリ秒) */
	durationMs: number;
};

/** トーストの状態 */
type ToastState = {
	/** 表示中のトースト一覧(表示した順) */
	toasts: ToastItemShape[];
};

/** 自動的に消えるまでの既定時間(ミリ秒) */
const AUTO_DISMISS_MS = 5000;

const state = $state<ToastState>({ toasts: [] });

/** 次に発行するトーストの識別子 */
let nextId = 1;

/** トーストごとの自動消去タイマー(識別子が数値のためMapを使う) */
const timers = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * トーストを一覧から取り除き、自動消去タイマーを止める
 * @param id - 取り除くトーストの識別子
 */
const removeToast = (id: number) => {
	const timer = timers.get(id);
	if (timer !== undefined) {
		clearTimeout(timer);
		timers.delete(id);
	}
	
	state.toasts = state.toasts.filter((toast) => toast.id !== id);
};

/** トーストの種類 */
export type ToastKind = ToastKindShape;

/** トースト1件の内容 */
export type ToastItem = ToastItemShape;

/** トースト通知を管理するストア */
export const toastStore = {
	/**
	 * 表示中のトースト一覧
	 * @returns トーストの配列(表示した順)
	 */
	get toasts() {
		return state.toasts;
	},

	/**
	 * トーストを表示する(一定時間が経過すると自動的に消える)
	 * @param input - 表示するメッセージと種類
	 * @returns 表示したトーストの識別子
	 */
	show(input: {
		/** 表示するメッセージ */
		message: string;
		/** トーストの種類(省略時はerror) */
		kind?: ToastKindShape;
	}) {
		const id = nextId;
		nextId += 1;
		state.toasts = [
			...state.toasts,
			{
				id,
				kind: input.kind ?? 'error',
				message: input.message,
				durationMs: AUTO_DISMISS_MS,
			},
		];
		
		timers.set(
			id,
			setTimeout(() => {
				removeToast(id);
			}, AUTO_DISMISS_MS),
		);
		return id;
	},

	/**
	 * トーストを閉じる
	 * @param id - 閉じるトーストの識別子
	 */
	dismiss(id: number) {
		removeToast(id);
	},
};
