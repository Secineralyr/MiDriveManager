<script lang="ts" generics="T extends string">
	import { fade } from 'svelte/transition';

	type MenuItem = {
		/** 操作の識別子 */
		id: T;
		/** 表示名 */
		label: string;
		/** 破壊的な操作かどうか(危険色で表示する) */
		danger?: boolean;
		/** 選べない状態かどうか */
		disabled?: boolean;
	};

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** 表示位置のx座標(ビューポート基準) */
		x: number;
		/** 表示位置のy座標(ビューポート基準) */
		y: number;
		/** 表示する項目 */
		items: MenuItem[];
		/** 項目が選ばれた時の処理 */
		onselect: (id: T) => void;
		/** メニューを閉じる操作(項目選択後、外側クリック、Escで呼ばれる) */
		onclose: () => void;
	};

	let { open, x, y, items, onselect, onclose }: Props = $props();

	let menu = $state<HTMLElement | null>(null);
	let width = $state(0);
	let height = $state(0);

	/** ビューポートからはみ出さないように位置を補正する */
	const left = $derived(Math.max(0, Math.min(x, window.innerWidth - width)));
	const top = $derived(Math.max(0, Math.min(y, window.innerHeight - height)));

	/**
	 * 選べる項目のボタンを表示順に返す
	 * @returns ボタンの配列
	 */
	const enabledButtons = () =>
		menu === null ? [] : [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];

	/**
	 * フォーカスを前後の項目へ移す(端では反対側へ回る)
	 * @param offset - 移動量(1で次、-1で前)
	 */
	const moveFocus = (offset: number) => {
		const buttons = enabledButtons();
		if (buttons.length === 0) {
			return;
		}

		const active = document.activeElement;
		const current = active instanceof HTMLButtonElement ? buttons.indexOf(active) : -1;
		const next = (current + offset + buttons.length) % buttons.length;
		buttons[next]?.focus();
	};

	/**
	 * 項目を選んで閉じる
	 * @param id - 選ばれた操作の識別子
	 */
	const handleSelect = (id: T) => {
		onselect(id);
		onclose();
	};

	/**
	 * メニューの外側を押したら閉じる
	 * @param event - ポインターイベント
	 */
	const handleWindowPointerDown = (event: PointerEvent) => {
		if (!open || menu === null) {
			return;
		}

		if (!(event.target instanceof Node) || !menu.contains(event.target)) {
			onclose();
		}
	};

	/**
	 * Escで閉じ、上下キーで項目を移動する
	 * @param event - キーボードイベント
	 */
	const handleWindowKeydown = (event: KeyboardEvent) => {
		if (!open) {
			return;
		}

		if (event.key === 'Escape') {
			onclose();
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			moveFocus(event.key === 'ArrowDown' ? 1 : -1);
		}
	};

	$effect(() => {
		if (menu !== null) {
			enabledButtons()[0]?.focus();
		}
	});
</script>

<svelte:window onpointerdown={handleWindowPointerDown} onkeydown={handleWindowKeydown} />

{#if open}
	<menu
		role="menu"
		bind:this={menu}
		bind:clientWidth={width}
		bind:clientHeight={height}
		style:left="{left}px"
		style:top="{top}px"
		transition:fade={{ duration: 250 }}
	>
		{#each items as item (item.id)}
			<li role="none">
				<button
					type="button"
					role="menuitem"
					disabled={item.disabled === true}
					data-danger={item.danger === true}
					onclick={() => {
						handleSelect(item.id);
					}}
				>
					{item.label}
				</button>
			</li>
		{/each}
	</menu>
{/if}

<style>
	menu {
		position: fixed;
		z-index: 100;
		margin: 0;
		padding: 5px 0;
		border: 1px solid var(--color-outline);
		border-radius: 5px;
		background-color: var(--color-surface);
		list-style: none;
		min-width: 180px;
	}

	li {
		display: flex;
	}

	button {
		flex: 1;
		margin: 0;
		padding: 8px 15px;
		border: 0;
		background-color: transparent;
		font-family: inherit;
		font-size: 0.85rem;
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
</style>
