<script lang="ts">
	import { popIn, sheetUp } from '../../lib/utils/transitions';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconX from '@tabler/icons-svelte/icons/x';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** シートの見出し */
		title: string;
		/** シートを閉じる操作(スクリム、閉じるボタン、Escで呼ばれる) */
		onclose: () => void;
		/** 表示の形(sheetは画面下から、dialogは画面中央に出す。タブレットではdialogを使う) */
		variant?: 'sheet' | 'dialog';
		/** シートの中身 */
		children: Snippet;
	};

	let { open, title, onclose, variant = 'sheet', children }: Props = $props();

	/**
	 * 表示の形に応じた出入りのトランジション
	 * @param node - 対象の要素
	 * @returns トランジションの設定
	 */
	const enter = (node: Element) => (variant === 'dialog' ? popIn(node) : sheetUp(node));

	/**
	 * Escキーでシートを閉じる
	 * @param event - キーボードイベント
	 */
	const handleKeydown = (event: KeyboardEvent) => {
		if (open && event.key === 'Escape') {
			onclose();
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -- シートの背景。閉じる操作はボタンとEscキーでも行える -->
	<div
		class="scrim"
		transition:fade={{ duration: 250 }}
		onclick={onclose}
	></div>
	<div
		class="sheet"
		role="dialog"
		aria-modal="true"
		aria-label={title}
		data-variant={variant}
		transition:enter
	>
		<span aria-hidden="true"></span>
		<header>
			<h2>{title}</h2>
			<IconButton label="閉じる" onclick={onclose}>
				<IconX size={18} />
			</IconButton>
		</header>
		<div>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 200;
		background-color: var(--color-scrim);
	}

	.sheet {
		display: flex;
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 201;
		flex-direction: column;
		border-top: 1px solid var(--color-outline-weak);
		border-radius: 10px 10px 0 0;
		background-color: var(--color-bg);
		max-height: 70dvh;
	}

	/* つまみ(装飾)。シートであることを示す */
	.sheet > span {
		border-radius: 9999px;
		margin: 8px auto 0;
		background-color: var(--color-outline);
		min-width: 40px;
		min-height: 4px;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 20px;
	}

	h2 {
		overflow: hidden;
		margin: 0;
		font-size: 1.15rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sheet > div {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 0 20px;
		padding-bottom: calc(20px + env(safe-area-inset-bottom));
		gap: 10px;
	}

	/* 画面中央のダイアログ表示(上下左右0+margin: autoで中央に置く。トランジションのtransformと干渉しない) */
	.sheet[data-variant='dialog'] {
		top: 0;
		transform-origin: center;
		margin: auto;
		border: 1px solid var(--color-outline);
		border-radius: 10px;
		inline-size: min(480px, 90vw);
		block-size: fit-content;
		max-height: 80dvh;
	}

	.sheet[data-variant='dialog'] > span {
		display: none;
	}

	.sheet[data-variant='dialog'] > div {
		padding-bottom: 20px;
	}
</style>
