import { beforeEach, describe, expect, it } from 'vitest';
import type { AccountUser } from '../../lib/stores/accounts.svelte';
import { accountsStore } from '../../lib/stores/accounts.svelte';
import { closeDatabase } from '../../lib/db/database';
import { getActiveAccountId } from '../../lib/db/settings';
import { listAccounts } from '../../lib/db/accounts';
import { stubIndexedDb } from '../indexeddb-test-util';

const makeUser = (id: string): AccountUser => ({
	id,
	username: `user${id}`,
	name: `ユーザー${id}`,
	avatarUrl: null,
});

const resetStore = async () => {
	await closeDatabase();
	stubIndexedDb();
	await accountsStore.load();
};

describe('アカウントの追加', () => {
	beforeEach(resetStore);

	it('初期状態ではアカウントが空でアクティブもない', () => {
		expect(accountsStore.accounts).toStrictEqual([]);
		expect(accountsStore.active).toBeNull();
	});

	it('addでアカウントが保存されアクティブになる', async () => {
		const record = await accountsStore.add('misskey.example', 'token-1', makeUser('u1'));
		expect(record.id).toBe('misskey.example:u1');
		expect(accountsStore.active?.id).toBe('misskey.example:u1');
		await expect(getActiveAccountId()).resolves.toBe('misskey.example:u1');
		await expect(listAccounts()).resolves.toHaveLength(1);
	});

	it('nameがnullのユーザーはusernameが表示名になる', async () => {
		const record = await accountsStore.add('misskey.example', 'token-1', {
			...makeUser('u1'),
			name: null,
		});
		expect(record.name).toBe('useru1');
	});

	it('同じアカウントを再度addするとトークンが更新され重複しない', async () => {
		await accountsStore.add('misskey.example', 'token-old', makeUser('u1'));
		await accountsStore.add('misskey.example', 'token-new', makeUser('u1'));
		expect(accountsStore.accounts).toHaveLength(1);
		expect(accountsStore.active?.token).toBe('token-new');
	});
});

describe('アカウントの読み込みと切替', () => {
	beforeEach(resetStore);

	it('switchToでアクティブなアカウントが切り替わり永続化される', async () => {
		await accountsStore.add('misskey.example', 'token-1', makeUser('u1'));
		await accountsStore.add('misskey.example', 'token-2', makeUser('u2'));
		await accountsStore.switchTo('misskey.example:u1');
		expect(accountsStore.active?.id).toBe('misskey.example:u1');
		await expect(getActiveAccountId()).resolves.toBe('misskey.example:u1');
	});

	it('loadで保存済みのアカウントと選択状態が復元される', async () => {
		await accountsStore.add('misskey.example', 'token-1', makeUser('u1'));
		await accountsStore.add('misskey.example', 'token-2', makeUser('u2'));
		await accountsStore.switchTo('misskey.example:u1');

		await accountsStore.load();

		expect(accountsStore.accounts).toHaveLength(2);
		expect(accountsStore.active?.id).toBe('misskey.example:u1');
	});

	it('保存されていた選択が無効な場合は先頭のアカウントにフォールバックする', async () => {
		await accountsStore.add('misskey.example', 'token-1', makeUser('u1'));
		await accountsStore.switchTo('存在しないID');
		await accountsStore.load();
		expect(accountsStore.active?.id).toBe('misskey.example:u1');
	});
});

describe('アカウントの削除', () => {
	beforeEach(resetStore);

	it('removeでアカウントが削除され残りのアカウントがアクティブになる', async () => {
		await accountsStore.add('misskey.example', 'token-1', makeUser('u1'));
		await accountsStore.add('misskey.example', 'token-2', makeUser('u2'));

		await accountsStore.remove('misskey.example:u2');

		expect(accountsStore.accounts).toHaveLength(1);
		expect(accountsStore.active?.id).toBe('misskey.example:u1');
	});

	it('最後のアカウントをremoveするとアクティブがnullになる', async () => {
		await accountsStore.add('misskey.example', 'token-1', makeUser('u1'));
		await accountsStore.remove('misskey.example:u1');
		expect(accountsStore.accounts).toStrictEqual([]);
		expect(accountsStore.active).toBeNull();
		await expect(getActiveAccountId()).resolves.toBeNull();
	});
});
