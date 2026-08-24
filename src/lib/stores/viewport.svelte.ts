// スマートフォンとして扱う幅(フォルダツリーのドロワー化と同じ)
const PHONE_QUERY = '(max-width: 640px)';

// ポインターが粗い(タッチ)かどうか
const COARSE_QUERY = '(pointer: coarse)';

/**
 * タッチ端末のUAかどうか
 * iPadOSのSafariはMacintoshを名乗るため、タッチ点数もあわせて見る
 * @returns タッチ端末ならtrue
 */
const isTouchUserAgent = () =>
	/iPad|iPhone|iPod|Android/iu.test(navigator.userAgent) ||
	(navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

/**
 * メディアクエリの一致状態を追従する状態を作る
 * @param query - メディアクエリ
 * @returns 一致状態
 */
const watchMedia = (query: string) => {
	const media = matchMedia(query);
	let matches = $state(media.matches);

	media.addEventListener('change', (event) => {
		const { matches: next } = event;
		matches = next;
	});

	return {
		/**
		 * 現在一致しているかどうか
		 * @returns 一致していればtrue
		 */
		get matches() {
			return matches;
		},
	};
};

/**
 * ビューポートの状態を監視するストアを作る
 * @returns ビューポートストア
 */
const createViewportStore = () => {
	const phone = watchMedia(PHONE_QUERY);
	const coarse = watchMedia(COARSE_QUERY);
	const touchUa = isTouchUserAgent();

	return {
		/**
		 * スマートフォン幅(640px以下)かどうか
		 * @returns スマートフォン幅ならtrue
		 */
		get phone() {
			return phone.matches;
		},

		/**
		 * タッチ操作の端末かどうか(ポインターの粗さまたはUAで判定。解像度は見ない)
		 * @returns タッチ端末ならtrue
		 */
		get touchDevice() {
			return coarse.matches || touchUa;
		},

		/**
		 * タブレット相当(タッチ端末で、スマートフォン幅より広い)かどうか
		 * @returns タブレット相当ならtrue
		 */
		get tablet() {
			return (coarse.matches || touchUa) && !phone.matches;
		},
	};
};

export const viewportStore = createViewportStore();
