/** ファイルの表示上の種別 */
export type FileKind = 'image' | 'video' | 'audio' | 'other';

/**
 * MIMEタイプから表示上のファイル種別を判定する
 * @param mimeType - MIMEタイプ
 * @returns ファイル種別
 */
export const fileKind = (mimeType: string): FileKind => {
	if (mimeType.startsWith('image/')) {
		return 'image';
	}
	if (mimeType.startsWith('video/')) {
		return 'video';
	}
	if (mimeType.startsWith('audio/')) {
		return 'audio';
	}
	return 'other';
};
