/** パンくず省略計算の入力 */
type LayoutInput = {
	/** 各項目の表示幅(先頭からの順) */
	widths: number[];
	/** コンテナの幅 */
	containerWidth: number;
	/** 省略記号項目の幅 */
	ellipsisWidth: number;
	/** 項目間の余白 */
	gap: number;
};

/**
 * 項目幅の合計に項目間の余白を加える
 * @param widths - 各項目の幅
 * @param gap - 項目間の余白
 * @returns 合計幅
 */
const sumWithGaps = (widths: number[], gap: number) =>
	widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(widths.length - 1, 0);

/**
 * 末尾から順に収まる項目を数え、省略後に表示する開始インデックスを求める
 * 末尾の項目は収まらなくても必ず表示する
 * @param input - パンくず省略計算の入力
 * @param usedBase - 先頭項目と省略記号で消費済みの幅
 * @returns 表示開始インデックス
 */
const findTailStart = (input: LayoutInput, usedBase: number) => {
	const count = input.widths.length;
	let used = usedBase + input.gap + (input.widths[count - 1] ?? 0);
	let tailStart = count - 1;
	for (let index = count - 2; index >= 1; index -= 1) {
		const width = (input.widths[index] ?? 0) + input.gap;
		if (used + width > input.containerWidth) {
			return tailStart;
		}

		used += width;
		tailStart = index;
	}

	return tailStart;
};

/** パンくず省略計算の入力 */
export type BreadcrumbLayoutInput = LayoutInput;

/** パンくず省略計算の結果 */
export type BreadcrumbLayout = {
	/** 省略が必要かどうか */
	collapsed: boolean;
	/** 省略後に表示する末尾項目の開始インデックス(省略しない場合は1) */
	tailStart: number;
};

/**
 * コンテナ幅に収まらないパンくずの省略方法を計算する
 * 先頭(ルート)と末尾(現在位置)は常に表示し、間の項目を末尾側から収まる分だけ表示する
 * @param input - パンくず省略計算の入力
 * @returns 省略の要否と表示開始インデックス
 */
export const computeBreadcrumbLayout = (input: LayoutInput): BreadcrumbLayout => {
	const count = input.widths.length;
	if (count <= 2 || input.containerWidth <= 0) {
		return { collapsed: false, tailStart: 1 };
	}

	if (sumWithGaps(input.widths, input.gap) <= input.containerWidth) {
		return { collapsed: false, tailStart: 1 };
	}

	const usedBase = (input.widths[0] ?? 0) + input.ellipsisWidth;
	return { collapsed: true, tailStart: findTailStart(input, usedBase) };
};
