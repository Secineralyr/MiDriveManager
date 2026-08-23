/** クリップボードのデータのうちファイル取り出しに必要な部分 */
type ClipboardDataLike = {
	/** 含まれるファイルの一覧 */
	readonly files: Iterable<File>;
};

/**
 * クリップボードイベントのデータからファイルを取り出す(OSでコピーしたファイルや画像)
 * @param data - クリップボードのデータ(なければnull)
 * @returns ファイルの一覧
 */
export const clipboardFiles = (data: ClipboardDataLike | null) =>
	data === null ? [] : [...data.files];

/**
 * OSクリップボードへテキストを書き込む
 * アプリ内コピーを直近のコピーにするために使う(OS側に残っていたファイルで貼り付けが上書きされないようにする)
 * 書き込めない環境では何もしない
 * @param text - 書き込むテキスト
 */
export const writeClipboardText = async (text: string) => {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		// クリップボードへ書き込めない環境では無視する
	}
};
