import { afterEach, describe, expect, it, vi } from 'vitest';
import { RateLimitError } from '../../lib/api/rate-limiter';
import { createDriveClient } from '../../lib/api/client';

/** fetchレスポンスモックの型 */
type FetchResponseMock = {
	/** HTTPステータスコード */
	status: number;
	/** レスポンスヘッダー */
	headers: Headers;
	/** JSONボディの取得 */
	json: () => Promise<unknown>;
};

/** fetchモックの型 */
type FetchMock = (
	input: string,
	init?: { method?: string; body?: string },
) => Promise<FetchResponseMock>;

/**
 * 待機せずに記録だけ行うsleepを作る
 * @param sleeps - 記録先の配列
 * @returns sleep関数
 */
const makeInstantSleep = (sleeps: number[]) => (ms: number) => {
	sleeps.push(ms);
	return Promise.resolve();
};

/**
 * fetchモックの最初の呼び出しからURLとパース済みボディを取り出す
 * @param calls - fetchモックの呼び出し記録
 * @returns URLとボディ
 */
const firstRequest = (calls: Parameters<FetchMock>[]) => {
	const [call] = calls;
	if (call === undefined) {
		throw new Error('fetchが呼び出されていません');
	}
	const [url, init] = call;
	// unknownを使う理由: JSON.parseの戻り値はany型のため、unknownで受けて比較する
	const body: unknown = JSON.parse(init?.body ?? '{}');
	return { url, body };
};

describe('APIクライアント', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('トークンを付けて正しいエンドポイントへPOSTする', async () => {
		const fetchMock = vi.fn<FetchMock>().mockResolvedValue({
			status: 200,
			headers: new Headers(),
			json: () => Promise.resolve([]),
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = createDriveClient('misskey.example', 'token-1', { minIntervalMs: 0 });

		await expect(client.driveFolders({ folderId: null, limit: 100 })).resolves.toStrictEqual(
			[],
		);

		const { url, body } = firstRequest(fetchMock.mock.calls);
		expect(url).toBe('https://misskey.example/api/drive/folders');
		expect(body).toStrictEqual({ i: 'token-1', folderId: null, limit: 100 });
	});
});

describe('429応答の再試行', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('429応答はRetry-Afterの秒数だけ待って再試行する', async () => {
		const fetchMock = vi
			.fn<FetchMock>()
			.mockResolvedValueOnce({
				status: 429,
				headers: new Headers({ 'Retry-After': '2' }),
				json: () => Promise.resolve({}),
			})
			.mockResolvedValue({
				status: 200,
				headers: new Headers(),
				json: () => Promise.resolve([]),
			});
		vi.stubGlobal('fetch', fetchMock);
		const sleeps: number[] = [];
		const client = createDriveClient('misskey.example', 'token-1', {
			minIntervalMs: 0,
			sleep: makeInstantSleep(sleeps),
		});

		await expect(client.driveStream({ limit: 100 })).resolves.toStrictEqual([]);

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(sleeps).toStrictEqual([2000]);
	});

	it('再試行しても429が続く場合はRateLimitErrorで失敗する', async () => {
		const fetchMock = vi.fn<FetchMock>().mockResolvedValue({
			status: 429,
			headers: new Headers(),
			json: () => Promise.resolve({}),
		});
		vi.stubGlobal('fetch', fetchMock);
		const sleeps: number[] = [];
		const client = createDriveClient('misskey.example', 'token-1', {
			minIntervalMs: 0,
			maxRetries: 1,
			sleep: makeInstantSleep(sleeps),
		});

		await expect(client.driveStream({ limit: 100 })).rejects.toBeInstanceOf(RateLimitError);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
