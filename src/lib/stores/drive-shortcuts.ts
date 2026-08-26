import { clipboardFiles, writeClipboardText } from '../utils/os-clipboard';
import { parseSelectionKey, selectionStore } from './selection.svelte';
import type { AccountRecord } from '../db/schema';
import type { ShortcutAction } from '../utils/shortcuts';
import { clipboardStore } from './clipboard.svelte';
import { driveStore } from './drive.svelte';
import { driveTasks } from './drive-tasks';
import { itemName } from './item-name';
import { resolveShortcut } from '../utils/shortcuts';

/** ショートカット処理がページから受け取る文脈(変化する値は関数で受け取る) */
type ShortcutContext = {
	/** 対象のアカウント */
	account: () => AccountRecord;
	/** 一覧の表示順の選択キー */
	orderedKeys: () => string[];
	/** 一覧に存在する選択中の選択キー */
	effectiveKeys: () => string[];
	/** ダイアログやプレビューの表示中など、ショートカットを無効にする状態かどうか */
	blocked: () => boolean;
	/** 削除確認を開く */
	openDelete: () => void;
	/** 名前の変更を開く */
	openRename: () => void;
};

/** キー入力のうちショートカット判定に必要な部分 */
type KeyInputLike = {
	/** イベントの発生元 */
	readonly target: EventTarget | null;
	/** 押されたキー */
	readonly key: string;
	/** Ctrlキーが押されているか */
	readonly ctrlKey: boolean;
	/** Cmdキーが押されているか */
	readonly metaKey: boolean;
	/** 既定の動作を抑止する */
	preventDefault: () => void;
};

/** 貼り付けイベントのうち処理に必要な部分 */
type PasteInputLike = {
	/** イベントの発生元 */
	readonly target: EventTarget | null;
	/** クリップボードのデータ(なければnull) */
	readonly clipboardData: Parameters<typeof clipboardFiles>[0];
	/** 既定の動作を抑止する */
	preventDefault: () => void;
};

/**
 * 発生元が入力欄かどうか
 * @param target - イベントの発生元
 * @returns 入力欄(input、textarea、contenteditable)ならtrue
 */
const isEditableTarget = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

/**
 * 入力中やダイアログ表示中はショートカットを無効にする
 * @param context - ページから受け取る文脈
 * @param target - イベントの発生元
 * @returns 無効にするならtrue
 */
const shouldIgnore = (context: ShortcutContext, target: EventTarget | null) =>
	context.blocked() || isEditableTarget(target);

/**
 * 選択中の項目を切り取りとしてクリップボードへ入れる
 * OSクリップボードにはファイル名を書き込む
 * @param context - ページから受け取る文脈
 */
const cutSelection = (context: ShortcutContext) => {
	const items = context.effectiveKeys().map((key) => parseSelectionKey(key));
	if (items.length === 0) {
		return;
	}

	clipboardStore.setCut(context.account().id, items);

	const names = items.map((item) => itemName(item)).filter((name) => name !== undefined);
	const _ = writeClipboardText(names.join('\n'));
};

/**
 * アプリ内クリップボードの内容の貼り付け(移動または複製)を操作キューへ積む
 * @param context - ページから受け取る文脈
 */
const pasteClipboard = async (context: ShortcutContext) => {
	const result = await clipboardStore.pasteInto(context.account(), driveStore.currentFolderId);
	if (result === 'moved') {
		selectionStore.clear();
	}
};

/**
 * ショートカット操作を実行する
 * @param context - ページから受け取る文脈
 * @param action - 実行する操作
 */
const runShortcut = (context: ShortcutContext, action: ShortcutAction) => {
	const handlers: Record<ShortcutAction, () => void> = {
		selectAll: () => {
			selectionStore.selectAll(context.orderedKeys());
		},
		cut: () => {
			cutSelection(context);
		},
		delete: () => {
			if (context.effectiveKeys().length > 0) {
				context.openDelete();
			}
		},
		rename: () => {
			if (context.effectiveKeys().length === 1) {
				context.openRename();
			}
		},
		clearSelection: () => {
			selectionStore.clear();
		},
	};

	handlers[action]();
};

/**
 * 貼り付けの内容に応じて、OSのファイルのアップロードかアプリ内クリップボードの貼り付けを行う
 * @param context - ページから受け取る文脈
 * @param clipboardData - クリップボードのデータ
 */
const pasteFrom = (context: ShortcutContext, clipboardData: PasteInputLike['clipboardData']) => {
	const files = clipboardFiles(clipboardData);
	if (files.length > 0) {
		driveTasks.uploadFiles(context.account(), {
			files,
			targetFolderId: driveStore.currentFolderId,
		});
		return;
	}

	const _ = pasteClipboard(context);
};

/**
 * ページのショートカット(キー入力と貼り付け)の処理を作る
 * @param context - ページから受け取る文脈
 * @returns キー入力と貼り付けのイベント処理
 */
export const createDriveShortcuts = (context: ShortcutContext) => ({
	/**
	 * ショートカット操作を直接実行する(コンテキストメニューなどキー入力以外の入口用)
	 * @param action - 実行する操作
	 */
	run(action: ShortcutAction) {
		runShortcut(context, action);
	},

	/**
	 * アプリ内クリップボードの貼り付けを直接実行する(背景メニューなどキー入力以外の入口用)
	 * @returns 貼り付け処理の完了を待つPromise
	 */
	pasteAppClipboard() {
		return pasteClipboard(context);
	},

	/**
	 * キー入力からショートカットを実行する
	 * @param event - キーボードイベント
	 */
	handleKeydown(event: KeyInputLike) {
		if (shouldIgnore(context, event.target)) {
			return;
		}

		const action = resolveShortcut({ key: event.key, ctrl: event.ctrlKey || event.metaKey });
		if (action === null) {
			return;
		}

		event.preventDefault();
		runShortcut(context, action);
	},

	/**
	 * Ctrl+Vの貼り付けを処理する
	 * OSクリップボードにファイル(コピーした画像など)があれば表示中フォルダへアップロードし、
	 * なければアプリ内クリップボードを貼り付ける
	 * @param event - クリップボードイベント
	 */
	handlePaste(event: PasteInputLike) {
		if (shouldIgnore(context, event.target)) {
			return;
		}

		event.preventDefault();
		pasteFrom(context, event.clipboardData);
	},
});
