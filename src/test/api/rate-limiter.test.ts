import { RateLimitError, createRateLimiter } from '../../lib/api/rate-limiter';
import { describe, expect, it, vi } from 'vitest';

/**
 * 時刻を進めながらsleepを記録するテスト用の時計を作る
 * @returns now、sleep、sleep呼び出しの記録
 */
const makeClock = () => {
	let time = 0;
	const sleeps: number[] = [];
	return {
		now: () => time,
		sleep: (ms: number) => {
			sleeps.push(ms);
			time += ms;
			return Promise.resolve();
		},
		sleeps,
	};
};

describe('既定の設定', () => {
	it('間隔の指定を省略すると既定の500msが空けられる', async () => {
		const clock = makeClock();
		const limiter = createRateLimiter({ sleep: clock.sleep, now: clock.now });
		await limiter.schedule(() => Promise.resolve());
		await limiter.schedule(() => Promise.resolve());
		expect(clock.sleeps).toStrictEqual([500]);
	});
});

describe('タスクの直列実行', () => {
	it('複数のタスクは積んだ順に直列実行される', async () => {
		const clock = makeClock();
		const limiter = createRateLimiter({ minIntervalMs: 0, sleep: clock.sleep, now: clock.now });
		const order: string[] = [];
		const firstGate = Promise.withResolvers<void>();
		const first = limiter.schedule(async () => {
			await firstGate.promise;
			order.push('first');
		});
		const second = limiter.schedule(() => {
			order.push('second');
			return Promise.resolve();
		});
		expect(order).toStrictEqual([]);
		firstGate.resolve();
		await Promise.all([first, second]);
		expect(order).toStrictEqual(['first', 'second']);
	});

	it('前のタスクが失敗しても後続のタスクは実行される', async () => {
		const clock = makeClock();
		const limiter = createRateLimiter({ minIntervalMs: 0, sleep: clock.sleep, now: clock.now });
		const failing = limiter.schedule(() => Promise.reject(new Error('失敗')));
		await expect(failing).rejects.toThrow('失敗');
		await expect(limiter.schedule(() => Promise.resolve('ok'))).resolves.toBe('ok');
	});

	it('リクエスト開始の間に最小間隔が空けられる', async () => {
		const clock = makeClock();
		const limiter = createRateLimiter({
			minIntervalMs: 300,
			sleep: clock.sleep,
			now: clock.now,
		});
		const starts: number[] = [];
		/**
		 * 開始時刻を記録するタスク
		 * @returns 完了のPromise
		 */
		const recordStart = () => {
			starts.push(clock.now());
			return Promise.resolve();
		};
		await limiter.schedule(recordStart);
		await limiter.schedule(recordStart);
		expect(starts).toStrictEqual([0, 300]);
		expect(clock.sleeps).toStrictEqual([300]);
	});
});

describe('レートリミット時の再試行', () => {
	it('Retry-Afterが指定されていればその時間だけ待って再試行する', async () => {
		const clock = makeClock();
		const limiter = createRateLimiter({
			minIntervalMs: 0,
			baseBackoffMs: 1000,
			sleep: clock.sleep,
			now: clock.now,
		});
		const task = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new RateLimitError(5000))
			.mockResolvedValue('ok');
		await expect(limiter.schedule(task)).resolves.toBe('ok');
		expect(task).toHaveBeenCalledTimes(2);
		expect(clock.sleeps).toStrictEqual([5000]);
	});

	it('Retry-Afterがない場合は指数バックオフで再試行する', async () => {
		const clock = makeClock();
		const limiter = createRateLimiter({
			minIntervalMs: 0,
			baseBackoffMs: 1000,
			sleep: clock.sleep,
			now: clock.now,
		});
		const task = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new RateLimitError(null))
			.mockRejectedValueOnce(new RateLimitError(null))
			.mockResolvedValue('ok');
		await expect(limiter.schedule(task)).resolves.toBe('ok');
		expect(clock.sleeps).toStrictEqual([1000, 2000]);
	});
});

describe('再試行の打ち切り', () => {
	it('再試行の上限を超えると失敗する', async () => {
		const clock = makeClock();
		const limiter = createRateLimiter({
			minIntervalMs: 0,
			maxRetries: 2,
			sleep: clock.sleep,
			now: clock.now,
		});
		const task = vi.fn<() => Promise<string>>().mockRejectedValue(new RateLimitError(null));
		await expect(limiter.schedule(task)).rejects.toThrow('レートリミットを超過しました');
		expect(task).toHaveBeenCalledTimes(3);
	});

	it('レートリミット以外のエラーは再試行しない', async () => {
		const clock = makeClock();
		const limiter = createRateLimiter({ minIntervalMs: 0, sleep: clock.sleep, now: clock.now });
		let calls = 0;
		const failing = limiter.schedule(() => {
			calls += 1;
			return Promise.reject(new Error('接続失敗'));
		});
		await expect(failing).rejects.toThrow('接続失敗');
		expect(calls).toBe(1);
		expect(clock.sleeps).toStrictEqual([]);
	});
});
