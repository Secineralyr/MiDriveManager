import {
	getCachedFile,
	listAccountFolders,
	putCachedFile,
	putCachedFolder,
	toFileRecord,
	toFolderRecord,
} from '../db/drive-cache';
import type { DriveClient } from '../api/client';
import type { FolderRecord } from '../db/schema';
import { buildChildrenMap } from './folder-tree';
import type { entities } from 'misskey-js';
import { translateDriveError } from './drive-actions';

/** アップロードに必要なAPI呼び出し */
type UploadClientShape = Pick<DriveClient, 'driveFilesCreate' | 'driveFoldersCreate'>;

/** アップロードする1件(ドロップ先からの相対フォルダ経路付き) */
type UploadEntryShape = {
	/** アップロードするファイル */
	file: File;
	/** ドロップ先からの相対フォルダ経路(直下なら空) */
	path: string[];
};

/** ドロップされた項目の走査に必要なFileSystemDirectoryReaderの部分 */
type DropDirectoryReaderShape = {
	/** 子項目をまとめて読み出す(一度に全件返るとは限らない) */
	readEntries: (
		success: (entries: DropEntryShape[]) => void,
		failure?: (error: DOMException) => void,
	) => void;
};

/** ドロップされた項目の走査に必要なFileSystemEntryの部分 */
type DropEntryShape = {
	/** ファイルかどうか */
	isFile: boolean;
	/** フォルダかどうか */
	isDirectory: boolean;
	/** 項目の名前 */
	name: string;
	/** ファイルの場合にFileを読み出す */
	file?: (success: (file: File) => void, failure?: (error: DOMException) => void) => void;
	/** フォルダの場合に子項目の読み出しを作る */
	createReader?: () => DropDirectoryReaderShape;
};

/** フォルダ経路の解決に使う状態 */
type FolderResolver = {
	/** 対象アカウントのアプリ内ID */
	accountId: string;
	/** APIクライアント */
	client: UploadClientShape;
	/** ドロップ先のフォルダID(ルートはnull) */
	targetFolderId: string | null;
	/** 親キーごとの子フォルダ一覧(作成したフォルダも追加していく) */
	byParent: Record<string, FolderRecord[]>;
};

/**
 * ファイル項目からFileを読み出す
 * @param entry - ドロップされた項目
 * @returns 読み出したFile
 */
const readEntryFile = (entry: DropEntryShape) =>
	new Promise<File>((resolve, reject) => {
		if (entry.file === undefined) {
			reject(new Error(`${entry.name}を読み込めません`));
			return;
		}

		entry.file(resolve, reject);
	});

/**
 * 子項目を1回分読み出す
 * @param reader - 子項目の読み出し
 * @returns 読み出した項目(もうなければ空)
 */
const readBatch = (reader: DropDirectoryReaderShape) =>
	new Promise<DropEntryShape[]>((resolve, reject) => {
		reader.readEntries(resolve, reject);
	});

/**
 * 子項目を空になるまで読み出してまとめる(readEntriesは一度に一部しか返さないため繰り返す)
 * @param reader - 子項目の読み出し
 * @param collected - これまでに読み出した項目
 * @returns すべての子項目
 */
const readAllEntries = async (
	reader: DropDirectoryReaderShape,
	collected: DropEntryShape[] = [],
): Promise<DropEntryShape[]> => {
	const batch = await readBatch(reader);
	if (batch.length === 0) {
		return collected;
	}

	return readAllEntries(reader, [...collected, ...batch]);
};

/**
 * 1つの項目をアップロード対象へ展開する(フォルダは中身を再帰的に辿る)
 * @param entry - ドロップされた項目
 * @param basePath - この項目が属する相対フォルダ経路
 * @returns アップロード対象の一覧
 */
const expandEntry = async (
	entry: DropEntryShape,
	basePath: string[],
): Promise<UploadEntryShape[]> => {
	if (entry.isDirectory) {
		const reader = entry.createReader?.();
		const children = reader === undefined ? [] : await readAllEntries(reader);
		return collectUploadEntriesInternal(children, [...basePath, entry.name]);
	}

	if (entry.isFile) {
		return [{ file: await readEntryFile(entry), path: basePath }];
	}

	return [];
};

/**
 * ドロップされた項目の一覧をアップロード対象へ展開する
 * @param entries - ドロップされた項目の一覧
 * @param basePath - 相対フォルダ経路の起点
 * @returns アップロード対象の一覧
 */
const collectUploadEntriesInternal = async (
	entries: DropEntryShape[],
	basePath: string[],
): Promise<UploadEntryShape[]> => {
	const expanded = await Promise.all(entries.map((entry) => expandEntry(entry, basePath)));
	return expanded.flat();
};

/**
 * 親フォルダ直下の同名フォルダを探し、なければ作成してIDを返す
 * @param resolver - フォルダ経路の解決に使う状態
 * @param parentId - 親フォルダID(ルートはnull)
 * @param name - フォルダ名
 * @returns フォルダID
 */
const resolveChildFolder = async (
	resolver: FolderResolver,
	parentId: string | null,
	name: string,
) => {
	const parentKey = parentId ?? '';
	const siblings = resolver.byParent[parentKey] ?? [];
	const existing = siblings.find((folder) => folder.name === name);
	if (existing !== undefined) {
		return existing.id;
	}

	const created = await resolver.client.driveFoldersCreate({ name, parentId });
	const record = toFolderRecord(resolver.accountId, created);
	await putCachedFolder(record);
	resolver.byParent[parentKey] = [...siblings, record];
	return record.id;
};

/**
 * 相対フォルダ経路をドロップ先から順に解決する(途中のフォルダは必要に応じて作成する)
 * @param resolver - フォルダ経路の解決に使う状態
 * @param path - 相対フォルダ経路
 * @returns 経路の末端のフォルダID(経路が空ならドロップ先)
 */
const resolveFolder = async (resolver: FolderResolver, path: string[]) => {
	let parentId = resolver.targetFolderId;
	for (const name of path) {
		// oxlint-disable-next-line eslint/no-await-in-loop - 親から順に解決する必要がある
		parentId = await resolveChildFolder(resolver, parentId, name);
	}

	return parentId;
};

/**
 * 1件アップロードしてキャッシュへ反映する
 * 同じ内容のファイルが既にある場合、Misskeyは既存のファイルを返すため、キャッシュにあるIDなら既存として通知する
 * @param resolver - フォルダ経路の解決に使う状態
 * @param entry - アップロードする1件
 * @param onExisting - 既存のファイルが返された時の通知
 */
const uploadOne = async (
	resolver: FolderResolver,
	entry: UploadEntryShape,
	onExisting?: (file: entities.DriveFile) => void,
) => {
	const folderId = await resolveFolder(resolver, entry.path);
	const created = await resolver.client.driveFilesCreate({
		file: entry.file,
		name: entry.file.name,
		folderId,
	});
	const cached = await getCachedFile(resolver.accountId, created.id);
	if (cached !== undefined) {
		onExisting?.(created);
		return;
	}

	await putCachedFile(toFileRecord(resolver.accountId, created));
};

/** アップロードに必要なAPI呼び出し */
export type UploadClient = UploadClientShape;

/** アップロードする1件 */
export type UploadEntry = UploadEntryShape;

/** ドロップされた項目(FileSystemEntryのうち走査に必要な部分) */
export type DropEntry = DropEntryShape;

/**
 * ドロップされた項目の一覧をアップロード対象へ展開する(フォルダは中身を再帰的に辿る)
 * @param entries - ドロップされた項目の一覧
 * @returns アップロード対象の一覧(相対フォルダ経路付き)
 */
export const collectUploadEntries = (entries: DropEntry[]) =>
	collectUploadEntriesInternal(entries, []);

/**
 * Fileの一覧をそのままアップロード対象にする(ファイル選択やクリップボード用)
 * @param files - ファイルの一覧
 * @returns アップロード対象の一覧(経路なし)
 */
export const filesToUploadEntries = (files: File[]): UploadEntry[] =>
	files.map((file) => ({ file, path: [] }));

/**
 * ドロップされたDataTransferからアップロード対象を取り出す
 * webkitGetAsEntryはdropイベントの処理中にしか呼べないため、同期的に取り出してから走査する
 * @param transfer - ドロップされたデータ
 * @returns アップロード対象の一覧
 */
export const readDroppedEntries = (transfer: DataTransfer) => {
	const entries = [...transfer.items]
		.map((item) => item.webkitGetAsEntry())
		.filter((entry): entry is FileSystemEntry => entry !== null);
	if (entries.length > 0) {
		return collectUploadEntries(entries);
	}

	return Promise.resolve(filesToUploadEntries([...transfer.files]));
};

/**
 * アップロード対象を1件ずつアップロードする
 * 相対経路のフォルダは同名の既存フォルダを再利用し、なければ作成する
 * @param accountId - 対象アカウントのアプリ内ID
 * @param client - APIクライアント
 * @param input - アップロード対象、ドロップ先、進捗と既存通知
 */
export const uploadEntries = async (
	accountId: string,
	client: UploadClient,
	input: {
		/** アップロード対象の一覧 */
		entries: UploadEntry[];
		/** ドロップ先のフォルダID(ルートはnull) */
		targetFolderId: string | null;
		/** 1件終わるごとに呼ぶ進捗通知(完了件数, 全件数) */
		onProgress?: (done: number, total: number) => void;
		/** 同じ内容のファイルが既にあり、既存のファイルが返された時の通知 */
		onExisting?: (file: entities.DriveFile) => void;
	},
) => {
	const folders = await listAccountFolders(accountId);
	const resolver: FolderResolver = {
		accountId,
		client,
		targetFolderId: input.targetFolderId,
		byParent: buildChildrenMap(folders),
	};
	const total = input.entries.length;
	input.onProgress?.(0, total);

	try {
		for (const [index, entry] of input.entries.entries()) {
			// oxlint-disable-next-line eslint/no-await-in-loop - レート制御のため逐次実行
			await uploadOne(resolver, entry, input.onExisting);
			input.onProgress?.(index + 1, total);
		}
	} catch (error) {
		throw translateDriveError(error);
	}
};
