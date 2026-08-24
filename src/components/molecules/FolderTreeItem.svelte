<script lang="ts">
	import { acceptDragOver, dispatchDrop } from '../../lib/utils/drop-target';
	import type { FolderRecord } from '../../lib/db/schema';
	// oxlint-disable-next-line import/no-self-import -- 再帰コンポーネントの表現には自己importが必要(svelte:selfは非推奨)
	import FolderTreeItem from '$components/molecules/FolderTreeItem.svelte';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import { slide } from 'svelte/transition';

	type Props = {
		/** 表示するフォルダ */
		folder: FolderRecord;
		/** 親キーごとの子フォルダ一覧 */
		childrenMap: Record<string, FolderRecord[]>;
		/** フォルダIDごとの展開状態 */
		expanded: Record<string, boolean>;
		/** 表示中のフォルダID(ルートはnull) */
		currentFolderId: string | null;
		/** 展開切替時の処理 */
		ontoggle: (folderId: string) => void;
		/** フォルダ選択時の処理 */
		onselect: (folderId: string) => void;
		/** このフォルダへの項目ドロップ時の処理 */
		ondropitems?: (folderId: string) => void;
		/** このフォルダへのOSファイルドロップ時の処理 */
		ondropfiles?: (folderId: string, transfer: DataTransfer) => void;
		/** 階層の深さ(ルート直下が1) */
		depth?: number;
		/** これより深い階層はインデントを増やさない(タブレット・スマートフォンで幅が尽きないように) */
		maxIndentDepth?: number;
	};

	let {
		folder,
		childrenMap,
		expanded,
		currentFolderId,
		ontoggle,
		onselect,
		ondropitems,
		ondropfiles,
		depth = 1,
		maxIndentDepth = 6,
	}: Props = $props();

	let dropover = $state(false);

	/**
	 * 受け入れられる種類のドロップなら受け入れを表明して強調する
	 * @param event - ドラッグイベント
	 */
	const handleDragOver = (event: DragEvent) => {
		dropover = acceptDragOver(event, {
			items: ondropitems !== undefined,
			files: ondropfiles !== undefined,
		});
	};

	/** ドロップ対象の強調を解除する */
	const handleDragLeave = () => {
		dropover = false;
	};

	/**
	 * ドロップされた項目またはOSファイルをこのフォルダ宛てとして受け取る
	 * @param event - ドラッグイベント
	 */
	const handleDrop = (event: DragEvent) => {
		dropover = false;
		dispatchDrop(event, {
			onitems: ondropitems === undefined ? undefined : () => ondropitems(folder.id),
			onfiles:
				ondropfiles === undefined ? undefined : (transfer) => ondropfiles(folder.id, transfer),
		});
	};

	const children = $derived(childrenMap[folder.id] ?? []);
	const isExpanded = $derived(expanded[folder.id] === true);
</script>

<li>
	<div
		role="group"
		data-current={currentFolderId === folder.id}
		data-dropover={dropover}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		{#if children.length > 0}
			<button
				type="button"
				aria-label={isExpanded ? '折りたたむ' : '展開する'}
				aria-expanded={isExpanded}
				data-expanded={isExpanded}
				onclick={() => {
					ontoggle(folder.id);
				}}
			>
				<IconChevronRight size={16} />
			</button>
		{:else}
			<span aria-hidden="true"></span>
		{/if}
		<button
			type="button"
			onclick={() => {
				onselect(folder.id);
			}}
		>
			{folder.name}
		</button>
	</div>
	{#if isExpanded && children.length > 0}
		<ul transition:slide={{ duration: 250 }} data-deep={depth >= maxIndentDepth}>
			{#each children as child (child.id)}
				<FolderTreeItem
					folder={child}
					{childrenMap}
					{expanded}
					{currentFolderId}
					{ontoggle}
					{onselect}
					{ondropitems}
					{ondropfiles}
					depth={depth + 1}
					{maxIndentDepth}
				/>
			{/each}
		</ul>
	{/if}
</li>

<style>
	li {
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

	div[data-dropover='true'] {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
		background-color: var(--color-surface-active);
	}

	div > button:first-child,
	div > span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 0;
		background-color: transparent;
		min-width: 16px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: rotate 250ms ease;
	}

	div > button[data-expanded='true'] {
		rotate: 90deg;
	}

	div > span {
		cursor: default;
	}

	div > button:last-child {
		flex: 1;
		overflow: hidden;
		padding: 0;
		border: 0;
		background-color: transparent;
		font-family: inherit;
		font-size: 1rem;
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
		cursor: pointer;
	}

	div > button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	/* 階層の目安になる縦線を左に出す */
	ul {
		margin: 0;
		margin-left: 12px;
		padding: 0;
		padding-left: 8px;
		border-left: 1px solid var(--color-outline-weak);
		list-style: none;
	}

	/* タッチ端末と狭い画面: インデントを浅くし、一定の深さより下はインデントを増やさない(幅が尽きて見切れないように) */
	@media (pointer: coarse), (max-width: 640px) {
		ul {
			margin-left: 6px;
			padding-left: 6px;
		}

		ul[data-deep='true'] {
			margin-left: 0;
			padding-left: 0;
			border-left: 0;
		}
	}

	/* タッチ操作の端末: 行と展開ボタンを大きくして指で操作しやすくする */
	@media (pointer: coarse) {
		div {
			padding: 6px 10px;
			gap: 8px;
		}

		div > button:first-child,
		div > span {
			min-width: 28px;
			min-height: 28px;
		}

		div > button:last-child {
			font-size: 1.05rem;
		}
	}
</style>
