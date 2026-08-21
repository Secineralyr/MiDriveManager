import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveAccountId, setActiveAccountId } from '../../lib/db/settings';
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
