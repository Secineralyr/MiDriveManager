import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildMiauthUrl,
	completeMiauth,
	normalizeHost,
	startMiauthSession,
	takePendingMiauth,
} from '../../lib/auth/miauth';

/** fetchモックの型 */
type FetchMock = (
	input: string,
	init?: { method?: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * 認証URLからセッションID部分を取り出す
 * @param urlText - 認証URL
 * @returns セッションID
 */
const sessionFromUrl = (urlText: string) => new URL(urlText).pathname.split('/')[2] ?? '';

describe('ホスト名の正規化', () => {
	it('前後の空白とプロトコルを除去して小文字化する', () => {
		expect(normalizeHost(' https://Misskey.IO/ ')).toBe('misskey.io');
	});

	it('パス部分を除去する', () => {
		expect(normalizeHost('misskey.io/about')).toBe('misskey.io');
	});

	it('ポート番号付きのホスト名を受け付ける', () => {
		expect(normalizeHost('localhost:3000')).toBe('localhost:3000');
	});

	it('空文字の場合はエラーになる', () => {
		expect(() => normalizeHost('   ')).toThrow('ホスト名を入力してください');
	});

	it('ホスト名として不正な文字を含む場合はエラーになる', () => {
		expect(() => normalizeHost('mi ss.key')).toThrow('ホスト名の形式が正しくありません');
	});
});

describe('認証URLの組み立て', () => {
	it('セッションIDと必要なクエリを含む認証URLを生成する', () => {
		const url = new URL(buildMiauthUrl('misskey.io', 'session-id', 'https://app.example/'));
		expect(url.origin).toBe('https://misskey.io');
		expect(url.pathname).toBe('/miauth/session-id');
		expect(url.searchParams.get('name')).toBe('MiDriveManager');
		expect(url.searchParams.get('permission')).toBe('read:account,read:drive,write:drive');
		expect(url.searchParams.get('callback')).toBe('https://app.example/');
	});
});

describe('セッションの開始と保留情報の取り出し', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('開始時に保留情報が保存され、同じセッションIDで取り出せる', () => {
		const urlText = startMiauthSession('https://misskey.io/', 'https://app.example/');
		const session = sessionFromUrl(urlText);
		expect(session).not.toBe('');
		expect(takePendingMiauth(session)).toStrictEqual({ session, host: 'misskey.io' });
	});

	it('取り出し後は保留情報が破棄される', () => {
		const session = sessionFromUrl(startMiauthSession('misskey.io', 'https://app.example/'));
		takePendingMiauth(session);
		expect(takePendingMiauth(session)).toBeNull();
	});

	it('セッションIDが一致しない場合はnullを返し、保留情報も破棄される', () => {
		startMiauthSession('misskey.io', 'https://app.example/');
		expect(takePendingMiauth('unknown-session')).toBeNull();
		expect(localStorage.getItem('mdm:pending-miauth')).toBeNull();
	});

	it('保留情報が壊れている場合はnullを返す', () => {
		localStorage.setItem('mdm:pending-miauth', 'これはJSONではない');
		expect(takePendingMiauth('session')).toBeNull();
	});
});

describe('認証の完了確認', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('checkエンドポイントからトークンとユーザーを取得する', async () => {
		const user = { id: 'user1', username: 'alice', name: 'アリス', avatarUrl: null };
		const fetchMock = vi.fn<FetchMock>().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ ok: true, token: 'token-value', user }),
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await completeMiauth({ session: 'session-id', host: 'misskey.io' });

		expect(fetchMock).toHaveBeenCalledWith('https://misskey.io/api/miauth/session-id/check', {
			method: 'POST',
		});
		expect(result).toStrictEqual({ token: 'token-value', user });
	});

	it('認証が完了していない(ok: false)場合はエラーになる', async () => {
		const fetchMock = vi.fn<FetchMock>().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ ok: false }),
		});
		vi.stubGlobal('fetch', fetchMock);

		await expect(completeMiauth({ session: 's', host: 'misskey.io' })).rejects.toThrow(
			'認証が完了していません',
		);
	});

	it('HTTPエラーの場合はエラーになる', async () => {
		const fetchMock = vi.fn<FetchMock>().mockResolvedValue({
			ok: false,
			status: 500,
			json: () => Promise.resolve({}),
		});
		vi.stubGlobal('fetch', fetchMock);

		await expect(completeMiauth({ session: 's', host: 'misskey.io' })).rejects.toThrow(
			'認証の確認に失敗しました',
		);
	});
});
