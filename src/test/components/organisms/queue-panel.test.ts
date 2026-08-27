import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { AccountRecord } from '../../../lib/db/schema';
import QueuePanel from '$components/organisms/QueuePanel.svelte';
import { queueStore } from '../../../lib/stores/queue.svelte';
import { stubElementAnimate } from '../../animation-test-util';
import { tick } from 'svelte';

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
 * 1回目は失敗し、2回目以降は成功する実行処理を作る
 * @returns 実行処理と試行回数
 */
const makeFlakyRun = () => {
	const counter = { attempts: 0 };
	const run = () => {
		counter.attempts += 1;
		return counter.attempts === 1
			? Promise.reject(new Error('削除できませんでした'))
			: Promise.resolve();
	};
	return { run, counter };
};

/**
 * 外部から完了させられるアップロードタスク(進捗1/3)を積む
 * @returns 完了させる操作
 */
const enqueueRunningUpload = () => {
	const gate = Promise.withResolvers<void>();
	queueStore.enqueue({
		account,
		kind: 'upload',
		label: '3件のアップロード',
		run: (report) => {
			report(1, 3);
			return gate.promise;
		},
	});
	return gate;
};

/**
 * jsdomに無いscrollIntoViewをモックで差し込む
 * @returns 呼び出しを記録するモック
 */
const stubScrollIntoView = () => {
	const scrollIntoView = vi.fn<Element['scrollIntoView']>();
	Element.prototype.scrollIntoView = scrollIntoView;
	return scrollIntoView;
};

/** テストごとに完了済みのタスクを消し、トランジション用のanimateを差し込む */
const reset = async () => {
	stubElementAnimate();
	await queueStore.whenIdle();
	queueStore.clearFinished();
};

describe('進行カードの表示', () => {
	beforeEach(reset);

	it('タスクがない時は何も表示しない', () => {
		const { container } = render(QueuePanel);
		expect(container.querySelector('section')).toBeNull();
	});

	it('実行中のタスクは進捗付きで表示され、完了すると完了表示になる', async () => {
		const gate = enqueueRunningUpload();
		render(QueuePanel);
		expect(screen.getByRole('heading').textContent).toBe('1件の操作を実行中');
		expect(screen.getByText('1 / 3')).toBeDefined();

		gate.resolve();
		await queueStore.whenIdle();
		await tick();
		expect(screen.getByRole('heading').textContent).toBe('すべての操作が完了しました');
		expect(screen.getByText('完了')).toBeDefined();
	});
});

describe('進行カードの操作', () => {
	beforeEach(reset);

	it('失敗したタスクはエラーを表示し、再試行ボタンで再実行される', async () => {
		const { run, counter } = makeFlakyRun();
		queueStore.enqueue({ account, kind: 'delete', label: '2件の削除', run });
		await queueStore.whenIdle();
		render(QueuePanel);
		expect(screen.getByText('削除できませんでした')).toBeDefined();

		await fireEvent.click(screen.getByRole('button', { name: '再試行' }));
		await queueStore.whenIdle();
		await tick();
		expect(counter.attempts).toBe(2);
		expect(screen.getByText('完了')).toBeDefined();
	});

	it('完了した操作を消すボタンで完了済みのタスクが消える', async () => {
		queueStore.enqueue({
			account,
			kind: 'move',
			label: '1件の移動',
			run: () => Promise.resolve(),
		});
		await queueStore.whenIdle();
		const { container } = render(QueuePanel);

		await fireEvent.click(screen.getByRole('button', { name: '完了した操作を消す' }));
		await tick();
		expect(container.querySelector('section')).toBeNull();
	});
});

describe('進行カードの自動スクロール', () => {
	beforeEach(reset);

	it('履歴がある状態で新しいタスクが積まれると、その行へスクロールされる', async () => {
		const scrollIntoView = stubScrollIntoView();
		queueStore.enqueue({
			account,
			kind: 'move',
			label: '1件の移動',
			run: () => Promise.resolve(),
		});
		await queueStore.whenIdle();
		render(QueuePanel);
		await tick();
		scrollIntoView.mockClear();

		const gate = enqueueRunningUpload();
		await tick();
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
		gate.resolve();
	});
});
