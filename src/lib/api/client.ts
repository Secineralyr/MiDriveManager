import { RateLimitError, createRateLimiter } from './rate-limiter';
import type { RateLimiterOptions } from './rate-limiter';
import { api } from 'misskey-js';
import type { entities } from 'misskey-js';

/** クライアント内部で共有する依存 */
type ClientContext = {
	/** レートリミッター */
	limiter: ReturnType<typeof createRateLimiter>;
	/** misskey-jsのAPIクライアント */
	client: InstanceType<typeof api.APIClient>;
};

/**
 * Retry-Afterヘッダーの値(秒)をミリ秒へ変換する
 * @param value - ヘッダーの値
 * @returns 待機時間(ミリ秒)。解釈できない場合はnull
 */
const parseRetryAfterMs = (value: string | null) => {
	if (value === null) {
		return null;
	}
	const seconds = Number(value);
	return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
};

/**
 * 429応答をRateLimitErrorへ変換するfetch
 * misskey-jsのAPIClientはレスポンスヘッダーへアクセスできないため、この層でRetry-Afterを拾う
 * @param input - リクエストURL
 * @param init - リクエスト設定
 * @returns レスポンス
 * @throws {RateLimitError} 429応答を受け取った場合
 */
const rateLimitAwareFetch: api.FetchLike = async (input, init) => {
	const res = await fetch(input, init);
	if (res.status === 429) {
		throw new RateLimitError(parseRetryAfterMs(res.headers.get('Retry-After')));
	}
	return res;
};

/**
 * フォルダ関連のAPIメソッド群を作る
 * @param context - クライアント内部で共有する依存
 * @returns フォルダ関連のAPIメソッド群
 */
const buildFolderMethods = (context: ClientContext) => ({
	/**
	 * 指定した親フォルダ直下のフォルダ一覧を取得する
	 * @param params - リクエストパラメータ
	 * @returns フォルダの配列
	 */
	driveFolders: (params: entities.DriveFoldersRequest) =>
		context.limiter.schedule(() => context.client.request('drive/folders', params)),
	/**
	 * フォルダを作成する
	 * @param params - リクエストパラメータ
	 * @returns 作成されたフォルダ
	 */
	driveFoldersCreate: (params: entities.DriveFoldersCreateRequest) =>
		context.limiter.schedule(() => context.client.request('drive/folders/create', params)),
	/**
	 * フォルダの名前や親フォルダを更新する
	 * @param params - リクエストパラメータ
	 * @returns 更新後のフォルダ
	 */
	driveFoldersUpdate: (params: entities.DriveFoldersUpdateRequest) =>
		context.limiter.schedule(() => context.client.request('drive/folders/update', params)),
	/**
	 * フォルダを削除する(空のフォルダのみ削除できる)
	 * @param params - リクエストパラメータ
	 * @returns なし
	 */
	driveFoldersDelete: (params: entities.DriveFoldersDeleteRequest) =>
		context.limiter.schedule(() => context.client.request('drive/folders/delete', params)),
});

/**
 * ファイル関連のAPIメソッド群を作る
 * @param context - クライアント内部で共有する依存
 * @returns ファイル関連のAPIメソッド群
 */
const buildFileMethods = (context: ClientContext) => ({
	/**
	 * フォルダを問わず全ファイルをID降順で取得する
	 * @param params - リクエストパラメータ
	 * @returns ファイルの配列
	 */
	driveStream: (params: entities.DriveStreamRequest) =>
		context.limiter.schedule(() => context.client.request('drive/stream', params)),
	/**
	 * ファイルの名前やメタデータを更新する
	 * @param params - リクエストパラメータ
	 * @returns 更新後のファイル
	 */
	driveFilesUpdate: (params: entities.DriveFilesUpdateRequest) =>
		context.limiter.schedule(() => context.client.request('drive/files/update', params)),
	/**
	 * ファイルを削除する
	 * @param params - リクエストパラメータ
	 * @returns なし
	 */
	driveFilesDelete: (params: entities.DriveFilesDeleteRequest) =>
		context.limiter.schedule(() => context.client.request('drive/files/delete', params)),
});

/**
 * レート制御付きのMisskey APIクライアントを作る
 * すべてのAPI呼び出しは直列化され、レートリミット時は自動で再試行される
 * @param host - サーバーのホスト名
 * @param token - APIアクセストークン
 * @param options - レート制御の設定
 * @returns ドライブ操作用のAPIクライアント
 */
export const createDriveClient = (
	host: string,
	token: string,
	options: RateLimiterOptions = {},
) => {
	const context: ClientContext = {
		limiter: createRateLimiter(options),
		client: new api.APIClient({
			origin: `https://${host}`,
			credential: token,
			fetch: rateLimitAwareFetch,
		}),
	};

	return {
		...buildFolderMethods(context),
		...buildFileMethods(context),
	};
};

/** createDriveClientが返すAPIクライアント */
export type DriveClient = ReturnType<typeof createDriveClient>;
