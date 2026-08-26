import type { AccountRecord, FileRecord } from '../../lib/db/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDatabase, openDatabase } from '../../lib/db/database';
import { clipboardStore } from '../../lib/stores/clipboard.svelte';
import { createDriveShortcuts } from '../../lib/stores/drive-shortcuts';
import { driveStore } from '../../lib/stores/drive.svelte';
import { queueStore } from '../../lib/stores/queue.svelte';
import { selectionStore } from '../../lib/stores/selection.svelte';
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
 * キー入力イベント相当を作る
 * @param key - 押されたキー
 * @param ctrl - Ctrlキーが押されているか
 * @returns イベント相当
 */
const keyInput = (key: string, ctrl: boolean) => ({
	target: null,
	key,
	ctrlKey: ctrl,
	metaKey: false,
	preventDefault: () => {},
});

/**
 * ページの文脈とショートカット処理を作る(f1とf2が一覧にあり、blockedはfalse)
 * @returns ショートカット処理と文脈のモック
 */
const makeShortcuts = () => {
	const openDelete = vi.fn<() => void>();
	const openRename = vi.fn<() => void>();
	const orderedKeys = ['file:f1', 'file:f2'];
	const shortcuts = createDriveShortcuts({
		account: () => account,
		orderedKeys: () => orderedKeys,
		effectiveKeys: () => selectionStore.keys.filter((key) => orderedKeys.includes(key)),
		blocked: () => false,
		openDelete,
		openRename,
	});
	return { shortcuts, openDelete, openRename };
};

/** OSクリップボードへの書き込みを記録するモック */
const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();

/** テストごとにIndexedDBを初期化してf1とf2を入れ、アカウントを開く */
const resetDrive = async () => {
	await closeDatabase();
	stubIndexedDb();
	const db = await openDatabase();
	await db.put('files', makeFile('f1'));
	await db.put('files', makeFile('f2'));
	await driveStore.openAccount('a1');
};

/**
 * テストごとにキュー、選択、クリップボード、OSクリップボードのスタブを初期化する
 * navigatorのスタブはunstubAllGlobalsで戻すとfake-indexeddbのスタブまで外れるため、ファイル内で差し替えたままにする
 */
const reset = async () => {
	await queueStore.whenIdle();
	queueStore.clearFinished();
	selectionStore.clear();
	clipboardStore.clear();
	writeText.mockClear();
	vi.stubGlobal('navigator', { clipboard: { writeText } });
	await resetDrive();
};

describe('キー入力のショートカット', () => {
	beforeEach(reset);

	it('Ctrl+Aで一覧の全件が選択される', () => {
		const { shortcuts } = makeShortcuts();
		shortcuts.handleKeydown(keyInput('a', true));
		expect(selectionStore.keys).toStrictEqual(['file:f1', 'file:f2']);
	});

	it('Ctrl+Cで選択中の項目がコピーとして保持され、OSクリップボードにはファイル名が書き込まれる', () => {
		const { shortcuts } = makeShortcuts();
		selectionStore.selectAll(['file:f1', 'file:f2']);
		shortcuts.handleKeydown(keyInput('c', true));
		expect(clipboardStore.mode).toBe('copy');
		expect(clipboardStore.items).toStrictEqual([
			{ kind: 'file', id: 'f1' },
			{ kind: 'file', id: 'f2' },
		]);
		expect(writeText).toHaveBeenCalledWith('f1.png\nf2.png');
	});

	it('Deleteは選択がある時だけ削除確認を開き、F2は単一選択の時だけ名前の変更を開く', () => {
		const { shortcuts, openDelete, openRename } = makeShortcuts();
		shortcuts.handleKeydown(keyInput('Delete', false));
		expect(openDelete).not.toHaveBeenCalled();

		selectionStore.selectAll(['file:f1', 'file:f2']);
		shortcuts.handleKeydown(keyInput('Delete', false));
		shortcuts.handleKeydown(keyInput('F2', false));
		expect(openDelete).toHaveBeenCalledWith();
		expect(openRename).not.toHaveBeenCalled();
	});

	it('入力欄が発生元の場合は無視する', () => {
		const { shortcuts } = makeShortcuts();
		const input = document.createElement('input');
		shortcuts.handleKeydown({ ...keyInput('a', true), target: input });
		expect(selectionStore.keys).toStrictEqual([]);
	});
});

describe('貼り付けのショートカット', () => {
	beforeEach(reset);

	it('OSクリップボードにファイルがあれば表示中フォルダへのアップロードを積む', () => {
		const { shortcuts } = makeShortcuts();
		const file = new File(['data'], 'image.png', { type: 'image/png' });
		shortcuts.handlePaste({
			target: null,
			clipboardData: { files: [file] },
			preventDefault: () => {},
		});
		expect(queueStore.tasks.at(-1)?.label).toBe('image.pngをアップロード');
		expect(queueStore.tasks.at(-1)?.kind).toBe('upload');
	});

	it('ファイルがなければアプリ内クリップボードを貼り付け、切り取りなら選択を解除する', async () => {
		const { shortcuts } = makeShortcuts();
		// 貼り付け先(表示中のルート)と異なるフォルダにf1を置き、移動が必要な状態にする
		const db = await openDatabase();
		await db.put('files', { ...makeFile('f1'), folderId: 'd1', folderKey: 'd1' });
		selectionStore.selectAll(['file:f1']);
		clipboardStore.setCut('a1', [{ kind: 'file', id: 'f1' }]);
		shortcuts.handlePaste({
			target: null,
			clipboardData: { files: [] },
			preventDefault: () => {},
		});
		// 移動要否の判定が非同期になったため、キューへの投入と選択解除を待って確認する
		await vi.waitFor(() => {
			expect(queueStore.tasks.at(-1)?.kind).toBe('move');
		});
		await queueStore.whenIdle();
		await vi.waitFor(() => {
			expect(selectionStore.keys).toStrictEqual([]);
		});
	});

	it('pasteAppClipboard(背景メニューの入口)でもアプリ内クリップボードが貼り付けられる', async () => {
		const { shortcuts } = makeShortcuts();
		const db = await openDatabase();
		await db.put('files', { ...makeFile('f1'), folderId: 'd1', folderKey: 'd1' });
		clipboardStore.setCut('a1', [{ kind: 'file', id: 'f1' }]);
		await shortcuts.pasteAppClipboard();
		// 移動要否の判定が非同期になったため、キューへの投入を待って確認する
		await vi.waitFor(() => {
			expect(queueStore.tasks.at(-1)?.kind).toBe('move');
		});
	});
});
