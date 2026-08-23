/** ドロップされるデータの種類(アプリ内の項目か、OSのファイルか) */
type DropKindShape = 'items' | 'files';

/** ドロップ判定に必要なDataTransferの部分 */
type DropTransferLike = {
	/** ドラッグ中のデータ種別の一覧 */
	readonly types: readonly string[];
	/** ドロップ時の効果 */
	dropEffect: DataTransfer['dropEffect'];
};

/** ドロップ判定に必要なドラッグイベントの部分 */
type DropEventLike<T extends DropTransferLike> = {
	/** ドラッグ中のデータ(なければnull) */
	readonly dataTransfer: T | null;
	/** 既定の動作を抑止する */
	preventDefault: () => void;
	/** 親要素への伝播を止める */
	stopPropagation: () => void;
};

/**
 * ドラッグ中のデータがOSのファイルかアプリ内の項目かを判定する
 * @param transfer - ドラッグ中のデータ(なければnull)
 * @returns files(OSのファイル)またはitems(アプリ内の項目)
 */
const dropKindOfInternal = (transfer: DropTransferLike | null): DropKindShape =>
	transfer !== null && transfer.types.includes('Files') ? 'files' : 'items';

/**
 * ドロップされたデータに対応する処理を選ぶ
 * @param transfer - ドロップされたデータ(なければnull)
 * @param handlers - 種類ごとの処理
 * @returns 引数なしで呼べる処理。対応する処理がなければnull
 */
const selectDropHandler = <T extends DropTransferLike>(
	transfer: T | null,
	handlers: {
		/** アプリ内の項目がドロップされた時の処理 */
		onitems?: () => void;
		/** OSのファイルがドロップされた時の処理 */
		onfiles?: (transfer: T) => void;
	},
) => {
	if (dropKindOfInternal(transfer) !== 'files') {
		return handlers.onitems ?? null;
	}

	const { onfiles } = handlers;
	if (transfer === null || onfiles === undefined) {
		return null;
	}

	return () => {
		onfiles(transfer);
	};
};

/** ドロップされるデータの種類 */
export type DropKind = DropKindShape;

/** ドラッグ中のデータがOSのファイルかアプリ内の項目かを判定する */
export const dropKindOf = dropKindOfInternal;

/**
 * dragoverでドロップの受け入れを表明する
 * 受け入れる種類の場合は既定動作を抑止し、親のドロップ先へ伝播しないようにする
 * @param event - ドラッグイベント
 * @param accepts - 種類ごとに受け入れるかどうか
 * @returns 受け入れたならtrue(強調表示の判定に使う)
 */
export const acceptDragOver = <T extends DropTransferLike>(
	event: DropEventLike<T>,
	accepts: Record<DropKindShape, boolean>,
) => {
	const kind = dropKindOfInternal(event.dataTransfer);
	if (!accepts[kind]) {
		return false;
	}

	event.preventDefault();
	event.stopPropagation();
	if (event.dataTransfer !== null) {
		event.dataTransfer.dropEffect = kind === 'files' ? 'copy' : 'move';
	}

	return true;
};

/**
 * dropイベントをデータの種類ごとの処理へ振り分ける
 * 対応する処理がない種類は何もせず、親のドロップ先へ委ねる
 * @param event - ドラッグイベント
 * @param handlers - 種類ごとの処理
 * @returns 処理したならtrue
 */
export const dispatchDrop = <T extends DropTransferLike>(
	event: DropEventLike<T>,
	handlers: {
		/** アプリ内の項目がドロップされた時の処理 */
		onitems?: () => void;
		/** OSのファイルがドロップされた時の処理 */
		onfiles?: (transfer: T) => void;
	},
) => {
	const handler = selectDropHandler(event.dataTransfer, handlers);
	if (handler === null) {
		return false;
	}

	event.preventDefault();
	event.stopPropagation();
	handler();

	return true;
};
