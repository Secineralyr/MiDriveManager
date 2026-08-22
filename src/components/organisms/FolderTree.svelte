<script lang="ts">
	import type { FolderRecord } from '../../lib/db/schema';
	import FolderTreeItem from '$components/molecules/FolderTreeItem.svelte';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';

	type Props = {
		/** 親キーごとの子フォルダ一覧 */
		childrenMap: Record<string, FolderRecord[]>;
		/** 表示中のフォルダID(ルートはnull) */
		currentFolderId: string | null;
		/** フォルダ選択時の処理 */
		onnavigate: (folderId: string | null) => void;
	};

	let { childrenMap, currentFolderId, onnavigate }: Props = $props();

	let expanded = $state<Record<string, boolean>>({});

	const rootChildren = $derived(childrenMap[''] ?? []);

	/**
	 * フォルダの展開状態を切り替える
	 * @param folderId - 対象のフォルダID
	 */
	const handleToggle = (folderId: string) => {
		const current = expanded[folderId] ?? false;
		expanded[folderId] = !current;
	};
</script>

<nav aria-label="フォルダツリー">
	<ul>
		<li>
			<div data-current={currentFolderId === null}>
				<span aria-hidden="true">
					<IconChevronDown size={16} />
				</span>
				<button
					type="button"
					onclick={() => {
						onnavigate(null);
					}}
				>
					ルート
				</button>
			</div>
			{#if rootChildren.length > 0}
				<ul>
					{#each rootChildren as folder (folder.id)}
						<FolderTreeItem
							{folder}
							{childrenMap}
							{expanded}
							{currentFolderId}
							ontoggle={handleToggle}
							onselect={onnavigate}
						/>
					{/each}
				</ul>
			{/if}
		</li>
	</ul>
</nav>

<style>
	nav {
		overflow-y: auto;
		padding: 10px;
	}

	nav > ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	nav > ul > li {
		display: flex;
		flex-direction: column;
	}

	div {
		display: flex;
		align-items: center;
		border-radius: 9999px;
		padding: 4px 8px;
		gap: 5px;
		transition: background-color 250ms ease;
	}

	div:hover {
		background-color: var(--color-surface-hover);
	}

	div[data-current='true'] {
		background-color: var(--color-surface-active);
	}

	span {
		display: inline-flex;
		align-items: center;
		color: var(--color-text-muted);
	}

	div > button {
		flex: 1;
		padding: 0;
		border: 0;
		background-color: transparent;
		font-family: inherit;
		font-size: 1rem;
		text-align: left;
		color: var(--color-text);
		cursor: pointer;
	}

	div > button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	nav > ul > li > ul {
		margin: 0;
		padding: 0;
		padding-left: 20px;
		list-style: none;
	}
</style>
