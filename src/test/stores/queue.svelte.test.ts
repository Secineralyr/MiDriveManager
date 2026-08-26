import { beforeEach, describe, expect, it } from 'vitest';
import type { AccountRecord } from '../../lib/db/schema';
import { queueStore } from '../../lib/stores/queue.svelte';

/** テスト用のアカウント */
const account: AccountRecord = {
	id: 'a1',
	host: 'misskey.example',
	token: 'token-1',
	userId: 'u1',
	username: 'alice',
	name: 'アリス',
	avatarUrl: null,
	createdAt: '2026-08-21T00:00:00.000Z',
	lastSyncedAt: null,
};

/**
 * 外部から完了させられるタスクをキューへ積む
 * @param label - タスクの表示名
 * @returns タスクの識別子と完了・失敗の操作
 */
const enqueueDeferred = (label: string) => {
	const gate = Promise.withResolvers<void>();
	const id = queueStore.enqueue({ account, kind: 'delete', label, run: () => gate.promise });
	return { id, gate };
};

/**
 * 1回目は失敗し、2回目以降は成功する実行処理を作る
 * @returns 実行処理と試行回数
 */
const makeFlakyRun = () => {
	const counter = { attempts: 0 };
	const run = () => {
		counter.attempts += 1;
		return counter.attempts === 1
			? Promise.reject(new Error('一時的な失敗'))
			: Promise.resolve();
	};
	return { run, counter };
};

/**
 * 識別子でタスクを探す
 * @param id - タスクの識別子
 * @returns タスク
 * @throws {Error} タスクが見つからない場合
 */
const findTask = (id: number) => {
	const task = queueStore.tasks.find((candidate) => candidate.id === id);
	if (task === undefined) {
		throw new Error('タスクが見つかりません');
	}

	return task;
};

/** キューが次のタスクへ進むまでマイクロタスクを進める */
const flushMicrotasks = async () => {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
};

/** テストごとに完了済みのタスクを消す */
const reset = async () => {
	await queueStore.whenIdle();
	queueStore.clearFinished();
};

describe('操作キューの直列実行', () => {
	beforeEach(reset);

	it('積んだ順に1件ずつ実行され、前のタスクが終わるまで次は始まらない', async () => {
		const first = enqueueDeferred('1件目');
		const second = enqueueDeferred('2件目');
		expect(findTask(first.id).status).toBe('running');
		expect(findTask(second.id).status).toBe('pending');

		first.gate.resolve();
		await flushMicrotasks();
		expect(findTask(first.id).status).toBe('done');
		expect(findTask(second.id).status).toBe('running');

		second.gate.resolve();
		await queueStore.whenIdle();
	});
});

describe('操作キューの進捗と失敗', () => {
	beforeEach(reset);

	it('実行処理からの進捗報告がタスクへ反映される', async () => {
		const id = queueStore.enqueue({
			account,
			kind: 'upload',
			label: '進捗あり',
			run: (report) => {
				report(2, 5);
				return Promise.resolve();
			},
		});
		await queueStore.whenIdle();
		expect(findTask(id).progress).toStrictEqual({ done: 2, total: 5 });
	});

	it('失敗するとfailedになりエラーメッセージが残る', async () => {
		const id = queueStore.enqueue({
			account,
			kind: 'move',
			label: '失敗する',
			run: () => Promise.reject(new Error('移動できませんでした')),
		});
		await queueStore.whenIdle();
		expect(findTask(id).status).toBe('failed');
		expect(findTask(id).error).toBe('移動できませんでした');
	});
});

describe('操作キューの再試行', () => {
	beforeEach(reset);

	it('再試行すると同じ実行処理が再び呼ばれ、成功すればdoneになる', async () => {
		const { run, counter } = makeFlakyRun();
		const id = queueStore.enqueue({ account, kind: 'move', label: '2回目で成功', run });
		await queueStore.whenIdle();
		expect(findTask(id).status).toBe('failed');

		queueStore.retry(id);
		await queueStore.whenIdle();
		expect(findTask(id).status).toBe('done');
		expect(findTask(id).error).toBeNull();
		expect(counter.attempts).toBe(2);
	});
});

describe('操作キューの整理', () => {
	beforeEach(reset);

	it('clearFinishedは完了・失敗したタスクだけを消し、実行中のものは残す', async () => {
		queueStore.enqueue({
			account,
			kind: 'delete',
			label: '完了済み',
			run: () => Promise.resolve(),
		});
		await queueStore.whenIdle();
		const running = enqueueDeferred('実行中');

		queueStore.clearFinished();
		expect(queueStore.tasks.map((task) => task.id)).toStrictEqual([running.id]);

		running.gate.resolve();
		await queueStore.whenIdle();
	});

	it('dismissは実行中のタスクを消さず、完了後なら消す', async () => {
		const running = enqueueDeferred('実行中');
		queueStore.dismiss(running.id);
		expect(queueStore.tasks.map((task) => task.id)).toContain(running.id);

		running.gate.resolve();
		await queueStore.whenIdle();
		queueStore.dismiss(running.id);
		expect(queueStore.tasks.map((task) => task.id)).not.toContain(running.id);
	});
});

describe('操作キューの要約', () => {
	beforeEach(reset);

	it('summaryは未完了があればrunning、失敗が残ればfailed、何もなければidleになる', async () => {
		expect(queueStore.summary).toBe('idle');

		const running = enqueueDeferred('実行中');
		expect(queueStore.summary).toBe('running');

		running.gate.reject(new Error('失敗'));
		await queueStore.whenIdle();
		expect(queueStore.summary).toBe('failed');

		queueStore.clearFinished();
		expect(queueStore.summary).toBe('idle');
	});
});
