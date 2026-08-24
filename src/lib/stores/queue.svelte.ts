import type { AccountRecord } from '../db/schema';

/** タスクの種類 */
type TaskKindShape = 'upload' | 'download' | 'delete' | 'move' | 'copy';

/** タスクの状態 */
type TaskStatusShape = 'pending' | 'running' | 'done' | 'failed';

/** タスクの進捗(件数ベース) */
type TaskProgressShape = {
	/** 完了した件数 */
	done: number;
	/** 全体の件数(不明なら0) */
	total: number;
};

/** タスクの実行処理へ渡す進捗報告関数 */
type ProgressReporterShape = (done: number, total: number) => void;

/** キューに積まれたタスク */
type QueueTaskShape = {
	/** タスクの識別子 */
	id: number;
	/** 対象のアカウント */
	account: AccountRecord;
	/** タスクの種類 */
	kind: TaskKindShape;
	/** 進行カードに表示する名前 */
	label: string;
	/** タスクの状態 */
	status: TaskStatusShape;
	/** タスクの進捗 */
	progress: TaskProgressShape;
	/** 失敗時のエラーメッセージ(それ以外はnull) */
	error: string | null;
	/** タスクの実行処理。再試行時にも同じ処理を呼ぶ */
	run: (report: ProgressReporterShape) => Promise<void>;
};

/** キューの状態 */
type QueueState = {
	/** タスクの一覧(積んだ順) */
	tasks: QueueTaskShape[];
};

const state = $state<QueueState>({ tasks: [] });

/** 次に発行するタスクの識別子 */
let nextId = 1;

/** 実行中のキュー処理の完了待ち(未実行ならnull) */
let drainingPromise: PromiseWithResolvers<void> | null = null;

/**
 * 次に実行する待機中のタスクを返す
 * @returns 待機中のタスク。なければundefined
 */
const nextPending = () => state.tasks.find((task) => task.status === 'pending');

/**
 * タスクを1件実行し、結果を状態へ反映する
 * @param task - 実行するタスク
 */
const runTask = async (task: QueueTaskShape) => {
	task.status = 'running';
	task.error = null;

	try {
		await task.run((done, total) => {
			task.progress = { done, total };
		});
		task.status = 'done';
	} catch (error) {
		task.status = 'failed';
		task.error = error instanceof Error ? error.message : '操作に失敗しました';
	}
};

/** 待機中のタスクがなくなるまで1件ずつ順に実行する */
const drain = async () => {
	if (drainingPromise !== null) {
		return;
	}
	drainingPromise = Promise.withResolvers<void>();

	for (let task = nextPending(); task !== undefined; task = nextPending()) {
		// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため直列実行が要件
		await runTask(task);
	}

	drainingPromise.resolve();
	drainingPromise = null;
};

/** タスクの種類 */
export type TaskKind = TaskKindShape;

/** タスクの状態 */
export type TaskStatus = TaskStatusShape;

/** タスクの実行処理へ渡す進捗報告関数 */
export type ProgressReporter = ProgressReporterShape;

/** キューに積まれたタスク */
export type QueueTask = QueueTaskShape;

/** 進行状況の要約 */
export type QueueSummary = 'idle' | 'running' | 'failed';

/** 操作キュー(アップロード・ダウンロード・一括操作を直列に実行する)を管理するストア */
export const queueStore = {
	/**
	 * タスクの一覧
	 * @returns タスクの配列(積んだ順)
	 */
	get tasks() {
		return state.tasks;
	},

	/**
	 * 未完了(待機中または実行中)のタスク数
	 * @returns 件数
	 */
	get activeCount() {
		return state.tasks.filter((task) => task.status === 'pending' || task.status === 'running')
			.length;
	},

	/**
	 * 進行状況の要約(未完了があればrunning、なければ失敗があればfailed、それ以外はidle)
	 * @returns 要約
	 */
	get summary(): QueueSummary {
		if (state.tasks.some((task) => task.status === 'pending' || task.status === 'running')) {
			return 'running';
		}

		return state.tasks.some((task) => task.status === 'failed') ? 'failed' : 'idle';
	},

	/**
	 * タスクを積んで実行を開始する
	 * @param input - アカウント、種類、表示名、実行処理
	 * @returns 積んだタスクの識別子
	 */
	enqueue(input: {
		/** 対象のアカウント */
		account: AccountRecord;
		/** タスクの種類 */
		kind: TaskKindShape;
		/** 進行カードに表示する名前 */
		label: string;
		/** タスクの実行処理 */
		run: (report: ProgressReporterShape) => Promise<void>;
	}) {
		const id = nextId;
		nextId += 1;
		state.tasks = [
			...state.tasks,
			{
				id,
				account: input.account,
				kind: input.kind,
				label: input.label,
				status: 'pending',
				progress: { done: 0, total: 0 },
				error: null,
				run: input.run,
			},
		];
		const _ = drain();
		return id;
	},

	/**
	 * 失敗したタスクを再試行する(待機中に戻し、順番が来たら再実行する)
	 * @param id - 再試行するタスクの識別子
	 */
	retry(id: number) {
		const task = state.tasks.find((candidate) => candidate.id === id);
		if (task === undefined || task.status !== 'failed') {
			return;
		}
		task.status = 'pending';
		task.error = null;
		const _ = drain();
	},

	/**
	 * 完了または失敗したタスクを1件取り除く
	 * @param id - 取り除くタスクの識別子
	 */
	dismiss(id: number) {
		state.tasks = state.tasks.filter(
			(task) => task.id !== id || task.status === 'pending' || task.status === 'running',
		);
	},

	/** 完了または失敗したタスクをすべて取り除く */
	clearFinished() {
		state.tasks = state.tasks.filter(
			(task) => task.status === 'pending' || task.status === 'running',
		);
	},

	/**
	 * 実行中のキュー処理が終わるまで待つ(テストや後続処理の同期用)
	 * @returns 待機中・実行中のタスクがなくなった時点で解決するPromise
	 */
	whenIdle() {
		return drainingPromise === null ? Promise.resolve() : drainingPromise.promise;
	},
};
