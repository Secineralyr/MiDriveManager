<script lang="ts" generics="T extends string">
	import type { Component, ComponentType, SvelteComponent } from 'svelte';
	import BottomSheet from '$components/molecules/BottomSheet.svelte';
	import Button from '$components/atoms/Button.svelte';
	import IconCheck from '@tabler/icons-svelte/icons/check';

	/** アイコンに渡すプロパティ */
	type IconLikeProps = {
		/** アイコンの大きさ */
		size?: number | string;
	};

	/** 項目に表示できるアイコン(関数型・クラス型の両方のコンポーネントを受ける) */
	type SheetIcon = Component<IconLikeProps> | ComponentType<SvelteComponent<IconLikeProps>>;

	type SheetItem = {
		/** 操作の識別子 */
		id: T;
		/** 表示名 */
		label: string;
		/** 破壊的な操作かどうか(危険色で表示する) */
		danger?: boolean;
		/** 選べない状態かどうか */
		disabled?: boolean;
		/** 選択中の印(チェック)を付けるかどうか */
		checked?: boolean;
		/** 先頭に表示するアイコン */
		icon?: SheetIcon;
	};

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** シートの見出し */
		title: string;
		/** 表示する項目 */
		items: SheetItem[];
		/** 項目が選ばれた時の処理 */
		onselect: (id: T) => void;
		/** シートを閉じる操作 */
		onclose: () => void;
	};

	let { open, title, items, onselect, onclose }: Props = $props();

	/**
	 * 項目を選んで閉じる
	 * @param id - 選ばれた操作の識別子
	 */
	const handleSelect = (id: T) => {
		onselect(id);
		onclose();
	};
</script>

<BottomSheet {open} {title} {onclose}>
	<menu>
		{#each items as item (item.id)}
			<li>
				<button
					type="button"
					disabled={item.disabled === true}
					data-danger={item.danger === true}
					onclick={() => {
						handleSelect(item.id);
					}}
				>
					{#if item.icon !== undefined}
						<span aria-hidden="true">
							<item.icon size={18} />
						</span>
					{/if}
					<span>{item.label}</span>
					{#if item.checked === true}
						<IconCheck size={16} />
					{/if}
				</button>
			</li>
		{/each}
	</menu>
	<div>
		<Button variant="tonal" onclick={onclose}>キャンセル</Button>
	</div>
</BottomSheet>

<style>
	menu {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		border-bottom: 1px solid var(--color-outline-weak);
	}

	li:last-child {
		border-bottom: 0;
	}

	button {
		display: flex;
		flex: 1;
		align-items: center;
		margin: 0;
		padding: 12px 5px;
		border: 0;
		gap: 10px;
		background-color: transparent;
		font-family: inherit;
		font-size: 1rem;
		text-align: left;
		color: var(--color-text);
		cursor: pointer;
		transition: background-color 250ms ease;
	}

	button:hover,
	button:focus-visible {
		outline: none;
		background-color: var(--color-surface-hover);
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	button[data-danger='true'] {
		color: var(--color-danger);
	}

	button > span[aria-hidden='true'] {
		display: inline-flex;
	}

	/* 表示名はチェック印を右端へ押し出すために広げる */
	button > span:not([aria-hidden]) {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* キャンセルボタンを全幅で伸ばす */
	div {
		display: flex;
		flex-direction: column;
	}
</style>
