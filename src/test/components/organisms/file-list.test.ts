import type { FileRecord, FolderRecord } from '../../../lib/db/schema';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import FileList from '$components/organisms/FileList.svelte';

/**
 * テスト用のフォルダを作る
 * @param id - フォルダID
 * @param name - フォルダ名
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (id: string, name: string): FolderRecord => ({
	accountId: 'a1',
	parentKey: '',
	id,
	createdAt: '2026-08-20T10:00:00.000Z',
	name,
	parentId: null,
});

/**
 * テスト用のファイルを作る
 * @param id - ファイルID
 * @param name - ファイル名
 * @param size - ファイルサイズ
 * @returns ファイルキャッシュレコード
 */
const makeFile = (id: string, name: string, size: number): FileRecord => ({
	accountId: 'a1',
	folderKey: '',
	id,
	createdAt: '2026-08-21T00:00:00.000Z',
	name,
	type: 'image/png',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size,
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
 * 省略された項目を既定値で補って一覧を描画する
 * @param props - 上書きするプロパティ
 * @returns 描画結果とコールバックのモック
 */
const renderList = (props: Partial<ComponentProps<typeof FileList>> = {}) => {
	const onsort = vi.fn<(key: 'name' | 'createdAt' | 'size') => void>();
	const onopenfolder = vi.fn<(folderId: string) => void>();
	const onselectitem =
		vi.fn<
			(
				kind: 'file' | 'folder',
				id: string,
				modifiers: { toggle: boolean; range: boolean },
			) => void
		>();
	const onpreviewfile = vi.fn<(file: FileRecord) => void>();
	const result = render(FileList, {
		folders: [makeFolder('d1', 'いろいろふぉるだ')],
		files: [makeFile('f1', 'がぞー.png', 1536)],
		sortKey: 'name',
		sortOrder: 'asc',
		selectedKeys: [],
		onsort,
		onselectitem,
		onopenfolder,
		onpreviewfile,
		...props,
	});
	return { ...result, onsort, onselectitem, onopenfolder, onpreviewfile };
};

/**
 * 行内の表示名から行要素(tr)を取得する
 * @param name - 行内の表示名
 * @returns 行要素
 */
const getRow = (name: string) => {
	const row = screen.getByText(name).closest('tr');
	if (row === null) {
		throw new Error('行要素が見つかりません');
	}
	return row;
};

describe('ファイル一覧(リスト表示)', () => {
	it('フォルダとファイルの行が表示され、サイズが整形される', () => {
		renderList();
		expect(screen.queryByText('いろいろふぉるだ')).not.toBeNull();
		expect(screen.queryByText('がぞー.png')).not.toBeNull();
		expect(screen.queryByText('1.5 KB')).not.toBeNull();
	});

	it('列見出しを押すとその列の基準でonsortが呼ばれる', async () => {
		const { onsort } = renderList();
		await fireEvent.click(screen.getByRole('button', { name: '追加日' }));
		expect(onsort).toHaveBeenCalledWith('createdAt');
	});

	it('フォルダ行をダブルクリックするとonopenfolderが呼ばれる', async () => {
		const { onopenfolder } = renderList();
		await fireEvent.dblClick(getRow('いろいろふぉるだ'));
		expect(onopenfolder).toHaveBeenCalledWith('d1');
	});

	it('ファイル行をダブルクリックするとonpreviewfileが呼ばれる', async () => {
		const { onopenfolder, onpreviewfile } = renderList();
		await fireEvent.dblClick(getRow('がぞー.png'));
		expect(onopenfolder).not.toHaveBeenCalled();
		expect(onpreviewfile).toHaveBeenCalledWith(makeFile('f1', 'がぞー.png', 1536));
	});

	it('行をクリックすると選択として通知される', async () => {
		const { onselectitem } = renderList();
		await fireEvent.click(getRow('いろいろふぉるだ'));
		expect(onselectitem).toHaveBeenCalledWith('folder', 'd1', { toggle: false, range: false });
	});

	it('Ctrlを押しながらクリックするとトグル選択として通知される', async () => {
		const { onselectitem } = renderList();
		await fireEvent.click(getRow('がぞー.png'), { ctrlKey: true });
		expect(onselectitem).toHaveBeenCalledWith('file', 'f1', { toggle: true, range: false });
	});

	it('選択中の行には選択状態が付く', () => {
		renderList({ selectedKeys: ['file:f1'] });
		expect(getRow('がぞー.png').getAttribute('aria-selected')).toBe('true');
		expect(getRow('いろいろふぉるだ').getAttribute('aria-selected')).toBe('false');
	});

	it('空の場合は空表示になる', () => {
		renderList({ folders: [], files: [] });
		expect(screen.queryByText('このフォルダは空です')).not.toBeNull();
	});
});
