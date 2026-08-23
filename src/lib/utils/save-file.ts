/** ダウンロードを開始した後、オブジェクトURLを解放するまでの猶予(ミリ秒) */
const REVOKE_DELAY_MS = 1000;

/**
 * Blobをブラウザのダウンロードとして保存する
 * @param blob - 保存する内容
 * @param name - 保存するファイル名
 */
export const saveBlob = (blob: Blob, name: string) => {
	const url = URL.createObjectURL(blob);

	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = name;

	document.body.append(anchor);

	anchor.click();
	anchor.remove();

	setTimeout(() => {
		URL.revokeObjectURL(url);
	}, REVOKE_DELAY_MS);
};
