import { acceptDragOver, dispatchDrop, dropKindOf } from '../../lib/utils/drop-target';
import { describe, expect, it, vi } from 'vitest';

/** テスト用のDataTransfer相当 */
type FakeTransfer = {
	/** データ種別 */
	types: string[];
	/** ドロップ効果 */
	dropEffect: DataTransfer['dropEffect'];
};

/**
 * テスト用のドラッグイベント相当を作る
 * @param types - ドラッグ中のデータ種別(nullならdataTransferなし)
 * @returns イベント相当とモック
 */
const makeEvent = (types: string[] | null) => {
	const preventDefault = vi.fn<() => void>();
	const stopPropagation = vi.fn<() => void>();
	const dataTransfer: FakeTransfer | null = types === null ? null : { types, dropEffect: 'none' };
	return {
		event: { dataTransfer, preventDefault, stopPropagation },
		preventDefault,
		stopPropagation,
	};
};

describe('ドロップ種別の判定', () => {
	it('Filesを含む場合はOSのファイル、それ以外はアプリ内の項目になる', () => {
		expect(dropKindOf({ types: ['Files'], dropEffect: 'none' })).toBe('files');
		expect(dropKindOf({ types: ['text/plain'], dropEffect: 'none' })).toBe('items');
		expect(dropKindOf(null)).toBe('items');
	});
});

describe('dragoverの受け入れ', () => {
	it('受け入れる種類なら既定動作と伝播を止め、ドロップ効果を設定する', () => {
		const { event, preventDefault, stopPropagation } = makeEvent(['Files']);
		expect(acceptDragOver(event, { items: false, files: true })).toBe(true);
		expect(preventDefault).toHaveBeenCalledWith();
		expect(stopPropagation).toHaveBeenCalledWith();
		expect(event.dataTransfer?.dropEffect).toBe('copy');
	});

	it('受け入れない種類なら何もしない', () => {
		const { event, preventDefault } = makeEvent(['text/plain']);
		expect(acceptDragOver(event, { items: false, files: true })).toBe(false);
		expect(preventDefault).not.toHaveBeenCalled();
	});
});

describe('dropの振り分け', () => {
	it('OSのファイルはonfilesへDataTransferごと渡す', () => {
		const { event } = makeEvent(['Files']);
		const onfiles = vi.fn<(transfer: FakeTransfer) => void>();
		expect(dispatchDrop(event, { onfiles })).toBe(true);
		expect(onfiles).toHaveBeenCalledWith(event.dataTransfer);
	});

	it('アプリ内の項目はonitemsへ渡す', () => {
		const { event, stopPropagation } = makeEvent(['text/plain']);
		const onitems = vi.fn<() => void>();
		expect(dispatchDrop(event, { onitems })).toBe(true);
		expect(onitems).toHaveBeenCalledWith();
		expect(stopPropagation).toHaveBeenCalledWith();
	});

	it('対応する処理がない種類は親へ委ねるため既定動作を止めない', () => {
		const { event, preventDefault } = makeEvent(['Files']);
		expect(dispatchDrop(event, { onitems: () => {} })).toBe(false);
		expect(preventDefault).not.toHaveBeenCalled();
	});
});
