import type { DriveItem } from '../services/drive-actions';
import { parseSelectionKey } from './selection.svelte';

// ドラッグでメニューを閉じるまでの移動量(px)
const DRAG_MENU_CLOSE_PX = 30;

/** ドラッグ位置のうち判定に必要な部分 */
type DragPointLike = {
	/** ビューポート基準のx座標 */
	readonly clientX: number;
	/** ビューポート基準のy座標 */
	readonly clientY: number;
};

/** ドラッグの内部状態 */
type DragState = {
	/** ドラッグ中の選択キー(ドラッグしていなければ空) */
	keys: string[];
	/** ドラッグの開始位置(記録していなければnull) */
	origin: DragPointLike | null;
};

/** ドラッグ処理がページから受け取る文脈 */
type DriveDragContext = {
	/** 未選択の項目をその項目だけの選択にする */
	selectItem: (kind: 'file' | 'folder', id: string) => void;
	/** 現在の選択キー */
	selectedKeys: () => string[];
	/** コンテキストメニューが開いているかどうか */
	isMenuOpen: () => boolean;
	/** コンテキストメニューを閉じる */
	closeMenu: () => void;
	/** 項目の移動を操作キューへ積む */
	moveItems: (items: DriveItem[], targetFolderId: string | null) => void;
	/** 選択を解除する */
	clearSelection: () => void;
};

/**
 * ドラッグ中の位置から、開始位置より大きく動いていたらメニューを閉じる
 * @param state - 内部状態
 * @param context - ページから受け取る文脈
 * @param event - ドラッグ位置
 */
const trackDrag = (state: DragState, context: DriveDragContext, event: DragPointLike) => {
	if (state.origin === null || !context.isMenuOpen()) {
		return;
	}

	const moved =
		Math.abs(event.clientX - state.origin.clientX) > DRAG_MENU_CLOSE_PX ||
		Math.abs(event.clientY - state.origin.clientY) > DRAG_MENU_CLOSE_PX;
	if (moved) {
		context.closeMenu();
	}
};

/**
 * ドロップされたドラッグ中の項目の移動を積み、選択を解除する
 * @param state - 内部状態
 * @param context - ページから受け取る文脈
 * @param targetFolderId - 移動先のフォルダID(ルートはnull)
 */
const dropDrag = (state: DragState, context: DriveDragContext, targetFolderId: string | null) => {
	const items = state.keys.map((key) => parseSelectionKey(key));
	state.keys = [];
	if (items.length === 0) {
		return;
	}

	context.moveItems(items, targetFolderId);
	context.clearSelection();
};

/**
 * 項目のドラッグでの移動処理を作る
 * 長押しで開いたメニューは、ドラッグが開始位置から大きく動いた時だけ閉じる(小さな動きでは開いたまま)
 * @param context - ページから受け取る文脈
 * @returns ドラッグの各イベント処理
 */
export const createDriveDrag = (context: DriveDragContext) => {
	const state: DragState = { keys: [], origin: null };

	return {
		/**
		 * 項目のドラッグ開始(未選択の項目はその項目だけを選択してから開始する)
		 * @param kind - 項目の種別
		 * @param id - 項目のID
		 */
		startItem(kind: 'file' | 'folder', id: string) {
			context.selectItem(kind, id);
			state.keys = [...context.selectedKeys()];
		},

		/** ドラッグの終了(ドロップされなかった場合の後始末) */
		end() {
			state.keys = [];
			state.origin = null;
		},

		/**
		 * ドラッグの開始位置を記録する(windowのdragstartで呼ぶ)
		 * @param event - ドラッグ位置
		 */
		beginTrack(event: DragPointLike) {
			state.origin =
				state.keys.length === 0 ? null : { clientX: event.clientX, clientY: event.clientY };
		},

		/**
		 * ドラッグ中の位置を監視する(windowのdrag/dragoverで呼ぶ)
		 * @param event - ドラッグ位置
		 */
		track(event: DragPointLike) {
			trackDrag(state, context, event);
		},

		/**
		 * フォルダへのドロップで移動を積む
		 * @param targetFolderId - 移動先のフォルダID(ルートはnull)
		 */
		drop(targetFolderId: string | null) {
			dropDrag(state, context, targetFolderId);
		},
	};
};
