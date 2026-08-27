import { beforeEach, describe, expect, it } from 'vitest';
import {
	makeSelectionKey,
	needsClearConfirm,
	parseSelectionKey,
	selectionStore,
} from '../../lib/stores/selection.svelte';

/** 表示順のキー列(フォルダ2つ+ファイル3つ) */
const ordered = ['folder:d1', 'folder:d2', 'file:f1', 'file:f2', 'file:f3'];

/** 修飾キーなしのクリック */
const plain = { toggle: false, range: false };

/** Ctrl/Cmd付きのクリック */
const toggle = { toggle: true, range: false };

/** Shift付きのクリック */
const range = { toggle: false, range: true };

describe('単独選択とトグル選択', () => {
	beforeEach(() => {
		selectionStore.clear();
	});

	it('選択キーは種別とIDから作られ、分解して元に戻せる', () => {
		expect(makeSelectionKey('folder', 'd1')).toBe('folder:d1');
		expect(makeSelectionKey('file', 'f1')).toBe('file:f1');
		expect(parseSelectionKey('folder:d1')).toStrictEqual({ kind: 'folder', id: 'd1' });
		expect(parseSelectionKey('file:f1')).toStrictEqual({ kind: 'file', id: 'f1' });
	});

	it('クリックで1件だけ選択される', () => {
		selectionStore.click('file:f1', plain, ordered);
		expect(selectionStore.keys).toStrictEqual(['file:f1']);
		expect(selectionStore.isSelected('file:f1')).toBe(true);
		expect(selectionStore.last).toBe('file:f1');
	});

	it('別の項目をクリックすると選択が置き換わる', () => {
		selectionStore.click('file:f1', plain, ordered);
		selectionStore.click('folder:d1', plain, ordered);
		expect(selectionStore.keys).toStrictEqual(['folder:d1']);
	});

	it('トグルで選択に追加・解除できる', () => {
		selectionStore.click('file:f1', plain, ordered);
		selectionStore.click('file:f3', toggle, ordered);
		expect(selectionStore.keys).toStrictEqual(['file:f1', 'file:f3']);
		selectionStore.click('file:f1', toggle, ordered);
		expect(selectionStore.keys).toStrictEqual(['file:f3']);
	});
});

describe('範囲選択と全選択', () => {
	beforeEach(() => {
		selectionStore.clear();
	});

	it('起点から対象までの範囲が選択される', () => {
		selectionStore.click('folder:d1', plain, ordered);
		selectionStore.click('file:f2', range, ordered);
		expect(selectionStore.keys).toStrictEqual(['folder:d1', 'folder:d2', 'file:f1', 'file:f2']);
	});

	it('逆方向の範囲も選択される', () => {
		selectionStore.click('file:f2', plain, ordered);
		selectionStore.click('folder:d2', range, ordered);
		expect(selectionStore.keys).toStrictEqual(['folder:d2', 'file:f1', 'file:f2']);
	});

	it('起点がない場合は対象のみが選択される', () => {
		selectionStore.click('file:f2', range, ordered);
		expect(selectionStore.keys).toStrictEqual(['file:f2']);
	});

	it('全選択と解除ができる', () => {
		selectionStore.selectAll(ordered);
		expect(selectionStore.count).toBe(5);
		selectionStore.clear();
		expect(selectionStore.count).toBe(0);
		expect(selectionStore.last).toBeNull();
	});
});

describe('選択解除の確認判定', () => {
	it('PCで10件以上の選択なら確認を挟む', () => {
		expect(needsClearConfirm({ count: 10, touch: false })).toBe(true);
		expect(needsClearConfirm({ count: 25, touch: false })).toBe(true);
	});

	it('PCでも9件以下なら確認しない', () => {
		expect(needsClearConfirm({ count: 9, touch: false })).toBe(false);
		expect(needsClearConfirm({ count: 0, touch: false })).toBe(false);
	});

	it('タッチ操作端末では件数に関わらず確認しない', () => {
		expect(needsClearConfirm({ count: 10, touch: true })).toBe(false);
	});
});
