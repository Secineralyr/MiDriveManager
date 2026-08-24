import { describe, expect, it } from 'vitest';
import type { FolderRecord } from '../../lib/db/schema';
import { isMoveTargetAllowed } from '../../lib/services/move-target';

/**
 * テスト用のフォルダを作る
 * @param id - フォルダID
 * @param parentId - 親フォルダID(ルートはnull)
 * @returns フォルダ
 */
const folder = (id: string, parentId: string | null): FolderRecord => ({
	accountId: 'a1',
	parentKey: parentId ?? '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name: id,
	parentId,
});

/** ルート直下にA・B、Aの下にA1、A1の下にA11がある構成 */
const childrenMap: Record<string, FolderRecord[]> = {
	'': [folder('A', null), folder('B', null)],
	A: [folder('A1', 'A')],
	A1: [folder('A11', 'A1')],
};

describe('移動先の判定', () => {
	it('別のフォルダやルートは選べるが、表示中のフォルダは選べない', () => {
		const items = [{ kind: 'file', id: 'f1' }] as const;
		const base = { childrenMap, items: [...items], currentFolderId: 'A' };
		expect(isMoveTargetAllowed({ ...base, targetFolderId: 'B' })).toBe(true);
		expect(isMoveTargetAllowed({ ...base, targetFolderId: null })).toBe(true);
		expect(isMoveTargetAllowed({ ...base, targetFolderId: 'A' })).toBe(false);
	});

	it('移動対象のフォルダ自身とその子孫は選べない', () => {
		const base = {
			childrenMap,
			items: [{ kind: 'folder' as const, id: 'A' }],
			currentFolderId: null,
		};
		expect(isMoveTargetAllowed({ ...base, targetFolderId: 'A' })).toBe(false);
		expect(isMoveTargetAllowed({ ...base, targetFolderId: 'A11' })).toBe(false);
		expect(isMoveTargetAllowed({ ...base, targetFolderId: 'B' })).toBe(true);
	});
});
