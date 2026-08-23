import { describe, expect, it } from 'vitest';
import { buildSelectionMenu } from '../../lib/services/context-menu';

describe('コンテキストメニューの項目', () => {
	it('ファイル1件ならダウンロード・コピー・切り取り・名前の変更・削除が並ぶ', () => {
		const items = buildSelectionMenu([{ kind: 'file', id: 'f1' }]);
		expect(items.map((item) => item.id)).toStrictEqual([
			'download',
			'copy',
			'cut',
			'rename',
			'delete',
		]);
		expect(items.find((item) => item.id === 'rename')?.disabled).toBe(false);
		expect(items.find((item) => item.id === 'delete')?.danger).toBe(true);
	});

	it('フォルダを含む場合はコピーを出さず、複数選択では名前の変更を選べない', () => {
		const items = buildSelectionMenu([
			{ kind: 'folder', id: 'd1' },
			{ kind: 'file', id: 'f1' },
		]);
		expect(items.map((item) => item.id)).toStrictEqual(['download', 'cut', 'rename', 'delete']);
		expect(items.find((item) => item.id === 'rename')?.disabled).toBe(true);
	});
});
