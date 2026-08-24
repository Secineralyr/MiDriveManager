import type { FileRecord, FolderRecord } from '../db/schema';

/** 検索結果 */
type SearchResultShape = {
	/** 一致したフォルダ */
	folders: FolderRecord[];
	/** 一致したファイル */
	files: FileRecord[];
};

/** カタカナ(ァ〜ヶ)の先頭コードポイント(U+30A1) */
const KATAKANA_START = 12_449;

/** カタカナ(ァ〜ヶ)の末尾コードポイント(U+30F6) */
const KATAKANA_END = 12_534;

/** カタカナからひらがなへのコードポイントの差(U+30A1-U+3041) */
const KANA_OFFSET = 96;

/**
 * カタカナをひらがなに揃える(ァ〜ヶの範囲)
 * @param text - 対象の文字列
 * @returns かなを統一した文字列
 */
const unifyKana = (text: string) =>
	text.replaceAll(/[ァ-ヶ]/gu, (char) => {
		const code = char.codePointAt(0) ?? 0;
		return code >= KATAKANA_START && code <= KATAKANA_END
			? String.fromCodePoint(code - KANA_OFFSET)
			: char;
	});

/**
 * 検索比較用に文字列を正規化する(NFKCで全角半角を揃え、小文字化し、カタカナをひらがなにする)
 * @param text - 対象の文字列
 * @returns 正規化した文字列
 */
const normalizeForSearchInternal = (text: string) =>
	unifyKana(text.normalize('NFKC').toLowerCase());

/**
 * 検索語を空白で区切った語の一覧にする(正規化済み)
 * @param query - 検索語
 * @returns 語の一覧(空の検索語なら空)
 */
const tokenize = (query: string) =>
	normalizeForSearchInternal(query)
		.split(/\s+/u)
		.filter((token) => token !== '');

/**
 * すべての語を含むかどうか
 * @param text - 正規化済みの比較対象
 * @param tokens - 正規化済みの語の一覧
 * @returns すべて含めばtrue
 */
const matchesAll = (text: string, tokens: string[]) =>
	tokens.every((token) => text.includes(token));

/** 検索結果 */
export type SearchResult = SearchResultShape;

/** 検索比較用に文字列を正規化する */
export const normalizeForSearch = normalizeForSearchInternal;

/**
 * キャッシュ上のフォルダ・ファイルを検索語で絞り込む
 * フォルダは名前、ファイルは名前と説明を対象に、空白区切りの語をすべて含むものを返す
 * @param input - 検索語と検索対象
 * @returns 検索結果(検索語が空なら空の結果)
 */
export const searchDrive = (input: {
	/** 検索語 */
	query: string;
	/** 検索対象のフォルダ */
	folders: FolderRecord[];
	/** 検索対象のファイル */
	files: FileRecord[];
}): SearchResult => {
	const tokens = tokenize(input.query);
	if (tokens.length === 0) {
		return { folders: [], files: [] };
	}

	return {
		folders: input.folders.filter((folder) =>
			matchesAll(normalizeForSearchInternal(folder.name), tokens),
		),
		files: input.files.filter((file) =>
			matchesAll(normalizeForSearchInternal(`${file.name}\n${file.comment ?? ''}`), tokens),
		),
	};
};
