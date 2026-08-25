/** レートリミッターの内部設定(既定値解決済み) */
type ResolvedOptions = {
	/** リクエスト開始間隔の最小値(ミリ秒) */
	minIntervalMs: number;
	/** レートリミット時の最大再試行回数 */
	maxRetries: number;
	/** 再試行待機の基準時間(ミリ秒)。試行ごとに2倍になる */
	baseBackoffMs: number;
	/** 待機処理 */
	sleep: (ms: number) => Promise<void>;
	/** 現在時刻の取得 */
	now: () => number;
};

/** レートリミッターの実行状態 */
type LimiterState = {
	/** 直近のリクエスト開始時刻。未実行ならnull */
	lastStartAt: number | null;
};

/**
 * 指定時間待機する
 * @param ms - 待機時間(ミリ秒)
 * @returns 待機完了のPromise
 */
const defaultSleep = (ms: number) =>
	// oxlint-disable-next-line promise/avoid-new - setTimeoutをPromise化するには生成が必要
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

/**
 * 直前のタスクの完了を待つ(失敗してもキューの進行は止めない)
 * @param previous - 直前のタスクのPromise
 */
const waitPrevious = async (previous: Promise<unknown>) => {
	try {
		await previous;
	} catch {
		// 直前のタスクの失敗はそのタスクの呼び出し元へ伝わるため、ここでは無視する
	}
};

/**
 * 直前のリクエスト開始から最小間隔が経過するまで待つ
 * @param config - 内部設定
 * @param limiterState - 実行状態
 */
const waitInterval = async (config: ResolvedOptions, limiterState: LimiterState) => {
	if (limiterState.lastStartAt === null) {
		return;
	}
	const wait = config.minIntervalMs - (config.now() - limiterState.lastStartAt);
	if (wait > 0) {
		await config.sleep(wait);
	}
};

/**
 * 最小間隔を空けてタスクを実行し、レートリミット時は待機して再試行する
 * @param task - 実行するタスク
 * @param config - 内部設定
 * @param limiterState - 実行状態
 * @returns タスクの結果
 * @throws {RateLimitError} 再試行の上限を超えてもレートリミットが続く場合
 */
const runWithRetry = async <T>(
	task: () => Promise<T>,
	config: ResolvedOptions,
	limiterState: LimiterState,
): Promise<T> => {
	for (let attempt = 0; ; attempt += 1) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御で逐次実行
		await waitInterval(config, limiterState);
		limiterState.lastStartAt = config.now();
		try {
			// oxlint-disable-next-line eslint/no-await-in-loop - レート制御で逐次実行
			return await task();
		} catch (error) {
			if (!(error instanceof RateLimitError) || attempt >= config.maxRetries) {
				throw error;
			}
			// oxlint-disable-next-line eslint/no-await-in-loop - レート制御で逐次実行
			await config.sleep(error.retryAfterMs ?? config.baseBackoffMs * 2 ** attempt);
		}
	}
};

/** 429応答(レートリミット超過)を表すエラー */
export class RateLimitError extends Error {
	/** 再試行までの待機時間(ミリ秒)。サーバーが提示しない場合はnull */
	retryAfterMs: number | null;

	/**
	 * @param retryAfterMs - 再試行までの待機時間(ミリ秒)。不明ならnull
	 */
	constructor(retryAfterMs: number | null) {
		super('レートリミットを超過しました');
		this.name = 'RateLimitError';
		this.retryAfterMs = retryAfterMs;
	}
}

/** レート制御の設定 */
export type RateLimiterOptions = {
	/** リクエスト開始間隔の最小値(ミリ秒) */
	minIntervalMs?: number;
	/** レートリミット時の最大再試行回数 */
	maxRetries?: number;
	/** 再試行待機の基準時間(ミリ秒)。試行ごとに2倍になる */
	baseBackoffMs?: number;
	/** 待機処理(テスト用に差し替え可能) */
	sleep?: (ms: number) => Promise<void>;
	/** 現在時刻の取得(テスト用に差し替え可能) */
	now?: () => number;
};

/**
 * APIリクエストを直列化し、最小間隔と429時の再試行を一元管理するレートリミッターを作る
 * サーバーによってはレートリミットが厳しいため、一度に大量のリクエストを送らないようにする
 * @param options - レート制御の設定
 * @returns scheduleを持つレートリミッター
 */
export const createRateLimiter = (options: RateLimiterOptions = {}) => {
	const config: ResolvedOptions = {
		minIntervalMs: options.minIntervalMs ?? 500,
		maxRetries: options.maxRetries ?? 3,
		baseBackoffMs: options.baseBackoffMs ?? 1000,
		sleep: options.sleep ?? defaultSleep,
		now: options.now ?? (() => Date.now()),
	};
	const limiterState: LimiterState = { lastStartAt: null };
	let tail: Promise<unknown> = Promise.resolve();

	/**
	 * タスクを直列キューに積み、順番が来たら実行する
	 * @param task - 実行するタスク
	 * @returns タスクの結果
	 */
	const schedule = <T>(task: () => Promise<T>): Promise<T> => {
		const previous = tail;
		const result = (async () => {
			await waitPrevious(previous);
			return runWithRetry(task, config, limiterState);
		})();
		tail = result;
		return result;
	};

	return { schedule };
};
