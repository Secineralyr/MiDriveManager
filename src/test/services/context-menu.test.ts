import { describe, expect, it } from 'vitest';
import { buildSelectionMenu } from '../../lib/services/context-menu';

describe('コンテキストメニューの項目', () => {
	it('ファイル1件ならダウンロード・複製・移動・名前の変更・削除が並ぶ', () => {
		const items = buildSelectionMenu([{ kind: 'file', id: 'f1' }]);
		expect(items.map((item) => item.id)).toStrictEqual([
			'download',
			'duplicate',
			'move',
			'rename',
			'delete',
		]);
		expect(items.find((item) => item.id === 'rename')?.disabled).toBe(false);
		expect(items.find((item) => item.id === 'delete')?.danger).toBe(true);
	});

	it('フォルダを含む場合は複製を出さず、複数選択では名前の変更を選べない', () => {
		const items = buildSelectionMenu([
			{ kind: 'folder', id: 'd1' },
			{ kind: 'file', id: 'f1' },
		]);
		expect(items.map((item) => item.id)).toStrictEqual([
			'download',
			'move',
			'rename',
			'delete',
		]);
		expect(items.find((item) => item.id === 'rename')?.disabled).toBe(true);
	});

	it('detailsオプションで先頭に詳細が入り、複数選択では選べない', () => {
		const single = buildSelectionMenu([{ kind: 'file', id: 'f1' }], { details: true });
		expect(single[0]?.id).toBe('details');
		expect(single[0]?.disabled).toBe(false);

		const multiple = buildSelectionMenu(
			[
				{ kind: 'file', id: 'f1' },
				{ kind: 'file', id: 'f2' },
			],
			{ details: true },
		);
		expect(multiple.find((item) => item.id === 'details')?.disabled).toBe(true);
	});
});
