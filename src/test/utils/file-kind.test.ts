import { describe, expect, it } from 'vitest';
import { fileKind } from '../../lib/utils/file-kind';

describe('ファイル種別の判定', () => {
	it('画像のMIMEタイプはimageになる', () => {
		expect(fileKind('image/png')).toBe('image');
		expect(fileKind('image/jpeg')).toBe('image');
	});

	it('動画のMIMEタイプはvideoになる', () => {
		expect(fileKind('video/mp4')).toBe('video');
	});

	it('音声のMIMEタイプはaudioになる', () => {
		expect(fileKind('audio/mpeg')).toBe('audio');
	});

	it('それ以外のMIMEタイプはotherになる', () => {
		expect(fileKind('application/zip')).toBe('other');
		expect(fileKind('text/plain')).toBe('other');
	});
});
