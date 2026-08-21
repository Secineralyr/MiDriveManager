/** 認証開始時に保留情報を保存するlocalStorageのキー */
const PENDING_KEY = 'mdm:pending-miauth';

/** 認証開始からコールバックまでの間に保持するセッション情報 */
type PendingMiauthShape = {
	/** MiAuthのセッションID(UUID) */
	session: string;
	/** 認証先サーバーのホスト名 */
	host: string;
};

/** MiAuthで取得するユーザー情報 */
type MiauthUserShape = {
	/** ユーザーID */
	id: string;
	/** ユーザー名(@なし) */
	username: string;
	/** 表示名(未設定ならnull) */
	name: string | null;
	/** アバター画像URL */
	avatarUrl: string | null;
};

/** miauth/{session}/checkエンドポイントの正常レスポンス */
type MiauthCheckResult = {
	/** アクセストークン */
	token: string;
	/** 認証したユーザーの情報 */
	user: MiauthUserShape;
};

/**
 * 値が保留中セッション情報の形状かどうかを判定する
 * @param value - 判定する値
 * @returns PendingMiauthならtrue
 */
const isPendingMiauth = (value: unknown): value is PendingMiauthShape =>
	typeof value === 'object' &&
	value !== null &&
	'session' in value &&
	typeof value.session === 'string' &&
	'host' in value &&
	typeof value.host === 'string';

/**
 * 値がMiAuthのユーザー情報の形状かどうかを判定する
 * @param value - 判定する値
 * @returns ユーザー情報ならtrue
 */
const isMiauthUser = (value: unknown): value is MiauthUserShape =>
	typeof value === 'object' &&
	value !== null &&
	'id' in value &&
	typeof value.id === 'string' &&
	'username' in value &&
	typeof value.username === 'string' &&
	'name' in value &&
	(typeof value.name === 'string' || value.name === null) &&
	'avatarUrl' in value &&
	(typeof value.avatarUrl === 'string' || value.avatarUrl === null);

/**
 * checkエンドポイントのレスポンスから認証結果を取り出す
 * @param value - レスポンスのJSON
 * @returns 認証結果。未完了や形状不正の場合はnull
 */
const parseCheckResponse = (value: unknown): MiauthCheckResult | null => {
	if (typeof value !== 'object' || value === null) {
		return null;
	}
	const okValue = 'ok' in value ? value.ok : false;
	const tokenValue = 'token' in value ? value.token : null;
	const userValue = 'user' in value ? value.user : null;
	if (okValue !== true || typeof tokenValue !== 'string' || !isMiauthUser(userValue)) {
		return null;
	}
	return { token: tokenValue, user: userValue };
};

/**
 * localStorageの保留情報を読み取って破棄する
 * @returns 保留情報。存在しないか形状不正の場合はnull
 */
const readAndClearPending = (): PendingMiauthShape | null => {
	const raw = localStorage.getItem(PENDING_KEY);
	if (raw === null) {
		return null;
	}
	localStorage.removeItem(PENDING_KEY);
	// unknownを使う理由: JSON.parseの戻り値はany型のため、unknownで受けて形状を検証する
	let parsed: unknown = null;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	return isPendingMiauth(parsed) ? parsed : null;
};

/** 認証開始からコールバックまでの間に保持するセッション情報 */
export type PendingMiauth = PendingMiauthShape;

/** MiAuthで取得するユーザー情報 */
export type MiauthUser = MiauthUserShape;

/** MiAuthで要求する権限スコープ */
export const MIAUTH_PERMISSIONS = ['read:account', 'read:drive', 'write:drive'] as const;

/**
 * 入力されたホスト名を正規化する(前後の空白・プロトコル・パスを除去して小文字化)
 * @param input - ユーザーが入力したホスト名
 * @returns 正規化されたホスト名
 * @throws {Error} 空文字やホスト名として不正な場合
 */
export const normalizeHost = (input: string) => {
	const withoutProtocol = input
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//u, '');
	const [host] = withoutProtocol.split('/');
	if (host === undefined || host === '') {
		throw new Error('ホスト名を入力してください');
	}
	if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d+)?$/u.test(host)) {
		throw new Error('ホスト名の形式が正しくありません');
	}
	return host;
};

/**
 * MiAuthの認証画面URLを組み立てる
 * @param host - 認証先サーバーのホスト名
 * @param session - セッションID(UUID)
 * @param callbackUrl - 許可後に戻ってくるアプリのURL
 * @returns 認証画面のURL
 */
export const buildMiauthUrl = (host: string, session: string, callbackUrl: string) => {
	const url = new URL(`https://${host}/miauth/${session}`);
	url.searchParams.set('name', 'misskeyDriveManager');
	url.searchParams.set('permission', MIAUTH_PERMISSIONS.join(','));
	url.searchParams.set('callback', callbackUrl);
	return url.toString();
};

/**
 * MiAuthのセッションを開始する
 * セッションIDを生成して保留情報をlocalStorageに保存し、遷移すべき認証画面URLを返す
 * @param hostInput - ユーザーが入力したホスト名
 * @param callbackUrl - 許可後に戻ってくるアプリのURL
 * @returns 認証画面のURL
 * @throws {Error} ホスト名が不正な場合
 */
export const startMiauthSession = (hostInput: string, callbackUrl: string) => {
	const host = normalizeHost(hostInput);
	const session = crypto.randomUUID();
	const pending: PendingMiauth = { session, host };
	localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
	return buildMiauthUrl(host, session, callbackUrl);
};

/**
 * コールバックで受け取ったセッションIDに対応する保留情報を取り出す
 * 取り出しの成否にかかわらず保留情報は破棄する(セッションIDの再利用を防ぐ)
 * @param session - コールバックURLのセッションID
 * @returns 保留情報。存在しないかセッションIDが一致しない場合はnull
 */
export const takePendingMiauth = (session: string) => {
	const pending = readAndClearPending();
	if (pending === null || pending.session !== session) {
		return null;
	}
	return pending;
};

/**
 * checkエンドポイントを呼び出してアクセストークンとユーザー情報を取得する
 * @param pending - 保留中のセッション情報
 * @returns トークンとユーザー情報
 * @throws {Error} 認証が完了していない場合や通信に失敗した場合
 */
export const completeMiauth = async (pending: PendingMiauth) => {
	const res = await fetch(`https://${pending.host}/api/miauth/${pending.session}/check`, {
		method: 'POST',
	});
	if (!res.ok) {
		throw new Error(`認証の確認に失敗しました(HTTP ${res.status})`);
	}
	// unknownを使う理由: res.json()の戻り値はany型のため、unknownで受けて形状を検証する
	const body: unknown = await res.json();
	const result = parseCheckResponse(body);
	if (result === null) {
		throw new Error('認証が完了していません。もう一度お試しください');
	}
	return result;
};
