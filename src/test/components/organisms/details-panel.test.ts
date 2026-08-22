import type { FileRecord, FolderRecord } from '../../../lib/db/schema';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import DetailsPanel from '$components/organisms/DetailsPanel.svelte';

const sampleFile: FileRecord = {
	accountId: 'a1',
	folderKey: '',
	id: 'f1',
	createdAt: '2026-08-21T12:30:00.000Z',
	name: 'がぞー.jpg',
	type: 'image/jpeg',
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: 1_536_000,
	isSensitive: false,
	blurhash: null,
	properties: {},
	url: 'https://misskey.example/files/f1',
	thumbnailUrl: null,
	comment: '旅行で撮った写真',
	folderId: null,
	userId: null,
};

const sampleFolder: FolderRecord = {
	accountId: 'a1',
	parentKey: '',
	id: 'd1',
	createdAt: '2026-08-20T10:00:00.000Z',
	name: 'いろいろふぉるだ',
	parentId: null,
};

/**
 * 省略された項目を既定値で補って詳細パネルを描画する
 * @param props - 上書きするプロパティ
 * @returns 描画結果とコールバックのモック
 */
const renderPanel = (props: Partial<ComponentProps<typeof DetailsPanel>> = {}) => {
	const onclose = vi.fn<() => void>();
	const onpreview = vi.fn<(file: FileRecord) => void>();
	const result = render(DetailsPanel, {
		// targetプロパティがSvelteのマウントオプションと同名のため、propsキー配下で渡す
		props: {
			target: null,
			selectionCount: 0,
			selectionSize: 0,
			onclose,
			onpreview,
			...props,
		},
	});
	return { ...result, onclose, onpreview };
};

describe('詳細パネル', () => {
	it('ファイル選択時はメタデータが表示される', () => {
		renderPanel({ target: { kind: 'file', file: sampleFile }, selectionCount: 1 });
		expect(screen.queryByText('がぞー.jpg')).not.toBeNull();
		expect(screen.queryByText('image/jpeg')).not.toBeNull();
		expect(screen.queryByText('1.5 MB')).not.toBeNull();
		expect(screen.queryByText('旅行で撮った写真')).not.toBeNull();
		expect(screen.queryByText('いいえ')).not.toBeNull();
	});

	it('フォルダ選択時は種類がフォルダと表示される', () => {
		renderPanel({ target: { kind: 'folder', folder: sampleFolder }, selectionCount: 1 });
		expect(screen.queryByText('いろいろふぉるだ')).not.toBeNull();
		expect(screen.queryByText('フォルダ')).not.toBeNull();
	});

	it('複数選択時は件数と合計サイズが表示される', () => {
		renderPanel({
			target: { kind: 'file', file: sampleFile },
			selectionCount: 5,
			selectionSize: 12_500_000,
		});
		expect(screen.queryByText('5件選択中')).not.toBeNull();
		expect(screen.queryByText('11.9 MB')).not.toBeNull();
		expect(screen.queryByText('がぞー.jpg')).toBeNull();
	});

	it('未選択時は案内文が表示される', () => {
		renderPanel();
		expect(screen.queryByText('項目を選択すると詳細が表示されます')).not.toBeNull();
	});

	it('閉じるボタンでoncloseが呼ばれる', async () => {
		const { onclose } = renderPanel();
		await fireEvent.click(screen.getByRole('button', { name: '詳細を閉じる' }));
		expect(onclose).toHaveBeenCalledWith();
	});
});
