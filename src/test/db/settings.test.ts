import { beforeEach, describe, expect, it } from 'vitest';
import {
	getActiveAccountId,
	getNoticeAccepted,
	getTutorialSeen,
	setActiveAccountId,
	setNoticeAccepted,
	setTutorialSeen,
} from '../../lib/db/settings';
import { closeDatabase } from '../../lib/db/database';
import { stubIndexedDb } from '../indexeddb-test-util';

describe('アクティブアカウントIDの設定', () => {
	beforeEach(async () => {
		await closeDatabase();
		stubIndexedDb();
	});

	it('未設定の場合はnullを返す', async () => {
		await expect(getActiveAccountId()).resolves.toBeNull();
	});

	it('保存したIDを取得できる', async () => {
		await setActiveAccountId('account-1');
		await expect(getActiveAccountId()).resolves.toBe('account-1');
	});

	it('nullを保存すると未選択に戻る', async () => {
		await setActiveAccountId('account-1');
		await setActiveAccountId(null);
		await expect(getActiveAccountId()).resolves.toBeNull();
	});
});

describe('諸注意への同意の設定', () => {
	beforeEach(async () => {
		await closeDatabase();
		stubIndexedDb();
	});

	it('未設定の場合は未同意になり、保存すると同意済みになる', async () => {
		await expect(getNoticeAccepted()).resolves.toBe(false);
		await setNoticeAccepted();
		await expect(getNoticeAccepted()).resolves.toBe(true);
	});
});

describe('チュートリアル表示済みの設定', () => {
	beforeEach(async () => {
		await closeDatabase();
		stubIndexedDb();
	});

	it('未設定の場合は未表示になり、保存すると表示済みになる', async () => {
		await expect(getTutorialSeen()).resolves.toBe(false);
		await setTutorialSeen();
		await expect(getTutorialSeen()).resolves.toBe(true);
	});
});
