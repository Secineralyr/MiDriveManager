<script lang="ts">
	import IconCheck from '@tabler/icons-svelte/icons/check';

	type Props = {
		/** チェック状態 */
		checked: boolean;
		/** 説明(読み上げに使う) */
		label: string;
		/** 大きさ(px) */
		size?: number;
		/** 切り替え操作(クリックの伝播は内部で止める) */
		ontoggle?: () => void;
	};

	let { checked, label, size = 16, ontoggle }: Props = $props();

	/**
	 * クリックで切り替えを通知する
	 * 表示はcheckedプロパティだけに従わせ(ネイティブの切り替えは抑止)、
	 * 行の選択やカードを開く操作へ伝播させない
	 * @param event - マウスイベント
	 */
	const handleClick = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		ontoggle?.();
	};

	/**
	 * ダブルクリックを親要素へ伝播させない(行のダブルクリックで開く操作と競合しないように)
	 * @param event - マウスイベント
	 */
	const handleDblClick = (event: MouseEvent) => {
		event.stopPropagation();
	};
</script>

<span data-checked={checked} style:inline-size="{size}px" style:block-size="{size}px">
	<span class="mark" aria-hidden="true">
		<IconCheck size={size - 4} stroke={3} />
	</span>
	<input
		type="checkbox"
		aria-label={label}
		{checked}
		onclick={handleClick}
		ondblclick={handleDblClick}
	/>
</span>

<style>
	span[data-checked] {
		display: flex;
		position: relative;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-outline);
		border-radius: 4px;
		background-color: var(--color-surface);
		color: var(--color-on-accent);
		transition:
			background-color 200ms ease,
			border-color 200ms ease;
	}

	span[data-checked='true'] {
		border-color: var(--color-accent);
		background-color: var(--color-accent);
	}

	.mark {
		display: inline-flex;
		opacity: 0;
		transform: scale(0.5);
		transition:
			opacity 200ms ease,
			transform 200ms ease;
	}

	span[data-checked='true'] > .mark {
		opacity: 1;
		transform: scale(1);
	}

	input {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		appearance: none;
		-webkit-appearance: none;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	span:has(> input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
