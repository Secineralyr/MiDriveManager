/** ファイルサイズ表記の単位(1024進) */
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** 日時表記のフォーマッター */
const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
	dateStyle: 'medium',
	timeStyle: 'short',
});

/**
 * バイト数を人が読みやすい表記へ変換する
 * @param bytes - バイト数
 * @returns 例: 1.5 MB
 */
export const formatFileSize = (bytes: number) => {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(1)} ${SIZE_UNITS[unitIndex]}`;
};

/**
 * ISO 8601の日時文字列を日本語表記へ変換する
 * @param isoText - ISO 8601の日時文字列
 * @returns 例: 2026/08/22 14:30。解釈できない場合は空文字列
 */
export const formatDateTime = (isoText: string) => {
	const date = new Date(isoText);
	return Number.isNaN(date.getTime()) ? '' : dateTimeFormatter.format(date);
};
