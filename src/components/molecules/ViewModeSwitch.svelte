<script lang="ts">
	import IconLayoutGrid from '@tabler/icons-svelte/icons/layout-grid';
	import IconList from '@tabler/icons-svelte/icons/list';
	import type { ViewMode } from '../../lib/db/settings';

	type Props = {
		/** 表示モード */
		viewMode: ViewMode;
		/** 表示モード変更時の処理 */
		onchange: (mode: ViewMode) => void;
	};

	let { viewMode, onchange }: Props = $props();
</script>

<div role="group" aria-label="表示の切り替え" data-mode={viewMode}>
	<span aria-hidden="true"></span>
	<button
		type="button"
		aria-label="リスト表示"
		aria-pressed={viewMode === 'list'}
		onclick={() => {
			onchange('list');
		}}
	>
		<IconList size={16} />
	</button>
	<button
		type="button"
		aria-label="グリッド表示"
		aria-pressed={viewMode === 'grid'}
		onclick={() => {
			onchange('grid');
		}}
	>
		<IconLayoutGrid size={16} />
	</button>
</div>

<style>
	div {
		display: inline-flex;
		position: relative;
		padding: 4px;
		border: 1px solid var(--color-outline-weak);
		border-radius: 9999px;
		background-color: var(--color-surface);
	}

	/* 選択中の側へ滑るつまみ */
	span {
		position: absolute;
		top: 4px;
		bottom: 4px;
		left: 4px;
		border-radius: 9999px;
		background-color: var(--color-surface-active);
		inline-size: calc(50% - 4px);
		transition: translate 250ms ease;
	}

	div[data-mode='grid'] > span {
		translate: 100% 0;
	}

	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		position: relative;
		padding: 5px 10px;
		border: 0;
		border-radius: 9999px;
		background-color: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color 250ms ease;
	}

	button[aria-pressed='true'] {
		color: var(--color-text);
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
