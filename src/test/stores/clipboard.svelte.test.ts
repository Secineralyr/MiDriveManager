import type { AccountRecord, FileRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import type { ActionsClient } from '../../lib/services/drive-actions';
import { clipboardStore } from '../../lib/stores/clipboard.svelte';
import { queueStore } from '../../lib/stores/queue.svelte';
import { stubIndexedDb } from '../indexeddb-test-util';

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
 * テスト用のファイルキャッシュレコードを作る
 * @param id - ファイルID
 * @returns ファイルキャッシュレコード
 */
const makeFile = (id: string): FileRecord => ({
	accountId: 'a1',
	folderKey: '',
	id,
	createdAt: '2026-08-23T00:00:00.000Z',
	name: `${id}.png`,
	type: 'image/png',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: 100,
	isSensitive: false,
	blurhash: null,
	properties: {},
	url: `https://misskey.example/files/${id}`,
	thumbnailUrl: null,
	comment: null,
	folderId: null,
	userId: null,
});

/**
 * 移動と取り込みをモック化したクライアントを作る
 * @returns クライアントとモック
 */
const makeClient = () => {
	const moveBulk = vi.fn<ActionsClient['driveFilesMoveBulk']>().mockResolvedValue({});
	const uploadFromUrl = vi.fn<ActionsClient['driveFilesUploadFromUrl']>().mockResolvedValue({});
	const client: ActionsClient = {
		driveFoldersCreate: () => Promise.reject(new Error('未使用')),
		driveFoldersUpdate: () => Promise.reject(new Error('未使用')),
		driveFoldersDelete: () => Promise.resolve({}),
		driveFilesUpdate: () => Promise.reject(new Error('未使用')),
		driveFilesDelete: () => Promise.resolve({}),
		driveFilesMoveBulk: moveBulk,
		driveFilesUploadFromUrl: uploadFromUrl,
	};
	return { client, moveBulk, uploadFromUrl };
};

/** テストごとにIndexedDBとクリップボードを初期化する */
const reset = async () => {
	await closeDatabase();
	stubIndexedDb();
	clipboardStore.clear();
	// コピー貼り付け成功時に走るバックグラウンド同期が実ネットワークへ出ないようにする
	vi.stubGlobal(
		'fetch',
		vi.fn<() => Promise<never>>().mockRejectedValue(new Error('テストではネットワーク不可')),
	);
	const db = await openDatabase();
	await db.put('files', makeFile('f1'));
};

describe('クリップボードの保持', () => {
	beforeEach(reset);

	it('コピーと切り取りで内容が保持される', () => {
		clipboardStore.setCopy('a1', [{ kind: 'file', id: 'f1' }]);
		expect(clipboardStore.mode).toBe('copy');
		expect(clipboardStore.hasContent).toBe(true);
		clipboardStore.setCut('a1', [{ kind: 'folder', id: 'd1' }]);
		expect(clipboardStore.mode).toBe('cut');
		clipboardStore.clear();
		expect(clipboardStore.hasContent).toBe(false);
	});

	it('空の状態での貼り付けはnoopになる', async () => {
		const { client } = makeClient();
		await expect(clipboardStore.pasteInto(account, null, () => client)).resolves.toBe('noop');
	});
});

describe('切り取りの貼り付け', () => {
	beforeEach(reset);

	it('同じアカウントなら移動がキューへ積まれクリップボードが空になる', async () => {
		const { client, moveBulk } = makeClient();
		clipboardStore.setCut('a1', [{ kind: 'file', id: 'f1' }]);
		const result = await clipboardStore.pasteInto(account, 'target', () => client);
		expect(result).toBe('moved');
		expect(clipboardStore.hasContent).toBe(false);
		await queueStore.whenIdle();
		expect(moveBulk).toHaveBeenCalledWith({ fileIds: ['f1'], folderId: 'target' });
	});

	it('別アカウントで切り取った項目はエラーになる', async () => {
		const { client, moveBulk } = makeClient();
		clipboardStore.setCut('別のアカウント', [{ kind: 'file', id: 'f1' }]);
		const result = await clipboardStore.pasteInto(account, null, () => client);
		expect(result).toBe('error');
		expect(clipboardStore.error).toBe('切り取った項目は同じアカウント内にのみ移動できます');
		expect(moveBulk).not.toHaveBeenCalled();
	});
});

describe('コピーの貼り付け', () => {
	beforeEach(reset);

	it('キャッシュのURLからの取り込みがキューへ積まれクリップボードは保持される', async () => {
		const { client, uploadFromUrl } = makeClient();
		clipboardStore.setCopy('a1', [{ kind: 'file', id: 'f1' }]);
		const result = await clipboardStore.pasteInto(account, 'target', () => client);
		expect(result).toBe('copied');
		await queueStore.whenIdle();
		expect(uploadFromUrl).toHaveBeenCalledWith({
			url: 'https://misskey.example/files/f1',
			folderId: 'target',
			isSensitive: false,
			comment: null,
		});
		expect(clipboardStore.hasContent).toBe(true);
	});

	it('フォルダだけのコピーはエラーになる', async () => {
		const { client } = makeClient();
		clipboardStore.setCopy('a1', [{ kind: 'folder', id: 'd1' }]);
		const result = await clipboardStore.pasteInto(account, null, () => client);
		expect(result).toBe('error');
		expect(clipboardStore.error).toBe('フォルダはコピーできません');
	});

	it('コピー元のファイルがキャッシュにない場合はエラーになる', async () => {
		const { client } = makeClient();
		clipboardStore.setCopy('a1', [{ kind: 'file', id: '存在しない' }]);
		const result = await clipboardStore.pasteInto(account, null, () => client);
		expect(result).toBe('error');
		expect(clipboardStore.error).toBe('コピー元のファイルが見つかりません');
	});
});

describe('エラーの消去', () => {
	beforeEach(reset);

	it('clearErrorでエラーだけが消え、保持している項目は残る', async () => {
		const { client } = makeClient();
		clipboardStore.setCopy('a1', [{ kind: 'folder', id: 'd1' }]);
		await clipboardStore.pasteInto(account, null, () => client);
		expect(clipboardStore.error).toBe('フォルダはコピーできません');
		clipboardStore.clearError();
		expect(clipboardStore.error).toBeNull();
		expect(clipboardStore.hasContent).toBe(true);
	});
});
