import type { FileRecord, FolderRecord } from '../../../lib/db/schema';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import DetailsPanel from '$components/organisms/DetailsPanel.svelte';
import { stubElementAnimate } from '../../animation-test-util';

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
	stubElementAnimate();
	const onclose = vi.fn<() => void>();
	const onpreview = vi.fn<(file: FileRecord) => void>();
	const onrename = vi.fn<() => void>();
	const onsavemetadata =
		vi.fn<(metadata: { comment: string | null; isSensitive: boolean }) => void>();
	const result = render(DetailsPanel, {
		// targetプロパティがSvelteのマウントオプションと同名のため、propsキー配下で渡す
		props: {
			target: null,
			selectionCount: 0,
			selectionSize: 0,
			onclose,
			onpreview,
			onrename,
			onsavemetadata,
			...props,
		},
	});
	return { ...result, onclose, onpreview, onrename, onsavemetadata };
};

/**
 * ファイルを1件選択した状態でパネルを描画する
 * @returns 描画結果とコールバックのモック
 */
const renderFilePanel = () =>
	renderPanel({ target: { kind: 'file', file: sampleFile }, selectionCount: 1 });

describe('詳細パネルの表示', () => {
	it('ファイル選択時はメタデータが表示される', () => {
		renderPanel({ target: { kind: 'file', file: sampleFile }, selectionCount: 1 });
		expect(screen.queryByText('がぞー.jpg')).not.toBeNull();
		expect(screen.queryByText('image/jpeg')).not.toBeNull();
		expect(screen.queryByText('1.5 MB')).not.toBeNull();
		expect(screen.getByLabelText<HTMLTextAreaElement>('説明').value).toBe(
			'旅行で撮った写真',
		);
		expect(screen.getByLabelText<HTMLInputElement>('センシティブ').checked).toBe(false);
	});
});

describe('詳細パネルの操作', () => {
	it('閉じるボタンでoncloseが呼ばれる', async () => {
		const { onclose } = renderPanel();
		await fireEvent.click(screen.getByRole('button', { name: '詳細を閉じる' }));
		expect(onclose).toHaveBeenCalledWith();
	});

	it('名前変更ボタンでonrenameが呼ばれる', async () => {
		const { onrename } = renderFilePanel();
		await fireEvent.click(screen.getByRole('button', { name: '名前を変更' }));
		expect(onrename).toHaveBeenCalledWith();
	});
});

describe('メタデータの編集', () => {
	it('変更がない場合は保存ボタンが非活性になる', () => {
		renderFilePanel();
		const button = screen.getByRole('button', { name: 'メタデータを保存' });
		expect(button.hasAttribute('disabled')).toBe(true);
	});

	it('編集すると保存ボタンが活性になる', async () => {
		renderFilePanel();
		await fireEvent.input(screen.getByLabelText('説明'), {
			target: { value: '別の説明' },
		});
		const button = screen.getByRole('button', { name: 'メタデータを保存' });
		expect(button.hasAttribute('disabled')).toBe(false);
	});
});

describe('メタデータの保存', () => {
	it('編集したメタデータが保存時に渡される', async () => {
		const { onsavemetadata } = renderFilePanel();
		await fireEvent.input(screen.getByLabelText('説明'), {
			target: { value: '新しい説明' },
		});
		await fireEvent.click(screen.getByLabelText('センシティブ'));
		await fireEvent.click(screen.getByRole('button', { name: 'メタデータを保存' }));
		expect(onsavemetadata).toHaveBeenCalledWith({
			comment: '新しい説明',
			isSensitive: true,
		});
	});

	it('説明を空にして保存するとnullで渡される', async () => {
		const { onsavemetadata } = renderFilePanel();
		await fireEvent.input(screen.getByLabelText('説明'), {
			target: { value: '   ' },
		});
		await fireEvent.click(screen.getByRole('button', { name: 'メタデータを保存' }));
		expect(onsavemetadata).toHaveBeenCalledWith({ comment: null, isSensitive: false });
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
});
