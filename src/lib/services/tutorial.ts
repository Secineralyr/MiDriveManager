import type { FileRecord, FolderRecord } from '../db/schema';

/** ツアーの1歩 */
type TutorialStepShape = {
	/** 歩の識別子(ハイライト対象のdata-tour属性値) */
	target: string;
	/** 見出し */
	title: string;
	/** 説明文 */
	description: string;
};

/** チュートリアルのデモに表示するドライブの内容 */
type TutorialDriveShape = {
	/** 全フォルダ */
	folders: FolderRecord[];
	/** ルート直下のファイル */
	files: FileRecord[];
};

/**
 * デモ用のフォルダを作る
 * @param id - フォルダID
 * @param name - フォルダ名
 * @param parentId - 親フォルダID
 * @returns フォルダキャッシュレコード
 */
const makeFolder = (id: string, name: string, parentId: string | null): FolderRecord => ({
	accountId: 'tutorial',
	parentKey: parentId ?? '',
	id,
	createdAt: '2026-08-20T10:00:00.000Z',
	name,
	parentId,
});

/**
 * デモ用のファイルを作る
 * @param id - ファイルID
 * @param name - ファイル名
 * @param mimeType - MIMEタイプ
 * @returns ファイルキャッシュレコード
 */
const makeFile = (id: string, name: string, mimeType: string): FileRecord => ({
	accountId: 'tutorial',
	folderKey: '',
	id,
	createdAt: '2026-08-21T12:30:00.000Z',
	name,
	type: mimeType,
	md5: 'd41d8cd98f00b204e9800998ecf8427e',
	size: 1_536_000,
	isSensitive: false,
	blurhash: null,
	properties: {},
	url: `https://misskey.example/files/${id}`,
	thumbnailUrl: null,
	comment: null,
	folderId: null,
	userId: null,
});

/** ツアーの1歩 */
export type TutorialStep = TutorialStepShape;

/** チュートリアルのデモに表示するドライブの内容 */
export type TutorialDrive = TutorialDriveShape;

/** ツアーの歩の並び(設計書の「ツリー、一覧、検索、詳細、キュー」+ツールバー) */
export const TUTORIAL_STEPS: TutorialStep[] = [
	{
		target: 'tree',
		title: 'フォルダツリー',
		description:
			'ドライブのフォルダ階層です。クリックでそのフォルダを開き、ファイルやフォルダをドラッグして移動先としても使えます。',
	},
	{
		target: 'list',
		title: 'ファイル一覧',
		description:
			'表示中フォルダの中身です。クリックで選択、ダブルクリックでプレビュー、右クリックでメニュー、ドラッグ&ドロップで移動できます。ファイルやフォルダをドロップするとアップロードします。',
	},
	{
		target: 'toolbar',
		title: 'ツールバー',
		description:
			'現在の場所を確認できます。右側のボタンでアップロード、新しいフォルダの作成、リスト/グリッド表示の切り替えができます。',
	},
	{
		target: 'search',
		title: '検索',
		description: 'ドライブ全体をファイル名・フォルダ名・コメントで検索します。',
	},
	{
		target: 'details',
		title: '詳細パネル',
		description:
			'選択した項目の情報を表示します。名前の変更や、コメント(代替テキスト)・センシティブフラグの編集もここから行えます。',
	},
	{
		target: 'queue',
		title: '操作の進行カード',
		description:
			'アップロードやダウンロード、削除などの操作はここに積まれて順に実行されます。進捗の確認や、失敗した操作の再試行ができます。',
	},
];

/** デモで選択済みにして詳細パネルへ表示するファイル */
export const TUTORIAL_SELECTED_FILE: FileRecord = makeFile('f1', 'がぞー.jpg', 'image/jpeg');

/** デモに表示するドライブの内容(実際のアカウントやキャッシュとは無関係の固定データ) */
export const TUTORIAL_DRIVE: TutorialDrive = {
	folders: [
		makeFolder('d1', '写真', null),
		makeFolder('d2', 'スクリーンショット', null),
		makeFolder('d3', '飯テロ', 'd1'),
	],
	files: [
		TUTORIAL_SELECTED_FILE,
		makeFile('f2', 'どうが.mp4', 'video/mp4'),
		makeFile('f3', 'めも.txt', 'text/plain'),
	],
};
