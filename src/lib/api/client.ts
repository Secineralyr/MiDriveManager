import { RateLimitError, createRateLimiter } from './rate-limiter';
import type { RateLimiterOptions } from './rate-limiter';
import { api } from 'misskey-js';
import type { entities } from 'misskey-js';

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
	const limiter = createRateLimiter(options);
	const client = new api.APIClient({
		origin: `https://${host}`,
		credential: token,
		fetch: rateLimitAwareFetch,
	});

	return {
		/**
		 * 指定した親フォルダ直下のフォルダ一覧を取得する
		 * @param params - リクエストパラメータ
		 * @returns フォルダの配列
		 */
		driveFolders: (params: entities.DriveFoldersRequest) =>
			limiter.schedule(() => client.request('drive/folders', params)),
		/**
		 * フォルダを問わず全ファイルをID降順で取得する
		 * @param params - リクエストパラメータ
		 * @returns ファイルの配列
		 */
		driveStream: (params: entities.DriveStreamRequest) =>
			limiter.schedule(() => client.request('drive/stream', params)),
	};
};

/** createDriveClientが返すAPIクライアント */
export type DriveClient = ReturnType<typeof createDriveClient>;
