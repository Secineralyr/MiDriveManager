import { afterEach, describe, expect, it, vi } from 'vitest';
import { clipboardFiles, writeClipboardText } from '../../lib/utils/os-clipboard';

describe('OSクリップボードのファイル取り出し', () => {
	it('データがなければ空になる', () => {
		expect(clipboardFiles(null)).toStrictEqual([]);
	});

	it('含まれるファイルを配列で返す', () => {
		const file = new File(['abc'], 'image.png', { type: 'image/png' });
		expect(clipboardFiles({ files: [file] })).toStrictEqual([file]);
	});
});

describe('OSクリップボードへの書き込み', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('navigator.clipboardへテキストを書き込む', async () => {
		const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		await writeClipboardText('a.png\nb.png');
		expect(writeText).toHaveBeenCalledWith('a.png\nb.png');
	});

	it('書き込めない環境でもエラーにしない', async () => {
		vi.stubGlobal('navigator', {});
		await expect(writeClipboardText('a.png')).resolves.toBeUndefined();
	});
});
