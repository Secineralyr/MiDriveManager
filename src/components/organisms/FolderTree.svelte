<script lang="ts">
	import { acceptDragOver, dispatchDrop } from '../../lib/utils/drop-target';
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
		/** フォルダへの項目ドロップ時の処理 */
		ondropitems?: (folderId: string | null) => void;
		/** フォルダへのOSファイルドロップ時の処理 */
		ondropfiles?: (folderId: string | null, transfer: DataTransfer) => void;
		/** フォルダを選んだ時に、折りたたまれていれば下の階層も展開するかどうか */
		expandOnSelect?: boolean;
		/** これより深い階層はインデントを増やさない(タブレット・スマートフォンでの見切れ対策。既定は6) */
		maxIndentDepth?: number;
	};

	let {
		childrenMap,
		currentFolderId,
		onnavigate,
		ondropitems,
		ondropfiles,
		expandOnSelect = false,
		maxIndentDepth = 6,
	}: Props = $props();

	let expanded = $state<Record<string, boolean>>({});
	let rootDropover = $state(false);

	/**
	 * 受け入れられる種類ならルートへのドロップ受け入れを表明して強調する
	 * @param event - ドラッグイベント
	 */
	const handleRootDragOver = (event: DragEvent) => {
		rootDropover = acceptDragOver(event, {
			items: ondropitems !== undefined,
			files: ondropfiles !== undefined,
		});
	};

	/** ルートのドロップ強調を解除する */
	const handleRootDragLeave = () => {
		rootDropover = false;
	};

	/**
	 * ルートへドロップされた項目またはOSファイルを受け取る
	 * @param event - ドラッグイベント
	 */
	const handleRootDrop = (event: DragEvent) => {
		rootDropover = false;
		dispatchDrop(event, {
			onitems: ondropitems === undefined ? undefined : () => ondropitems(null),
			onfiles: ondropfiles === undefined ? undefined : (transfer) => ondropfiles(null, transfer),
		});
	};

	const rootChildren = $derived(childrenMap[''] ?? []);

	/**
	 * フォルダの展開状態を切り替える
	 * @param folderId - 対象のフォルダID
	 */
	const handleToggle = (folderId: string) => {
		const current = expanded[folderId] ?? false;
		expanded[folderId] = !current;
	};

	/**
	 * フォルダを選ぶ(指定があれば下の階層も展開する)
	 * @param folderId - 選ばれたフォルダID
	 */
	const handleSelect = (folderId: string) => {
		if (expandOnSelect) {
			expanded[folderId] = true;
		}
		onnavigate(folderId);
	};
</script>

<nav aria-label="フォルダツリー">
	<ul>
		<li>
			<div
				role="group"
				data-current={currentFolderId === null}
				data-dropover={rootDropover}
				ondragover={handleRootDragOver}
				ondragleave={handleRootDragLeave}
				ondrop={handleRootDrop}
			>
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
							onselect={handleSelect}
							{ondropitems}
							{ondropfiles}
							{maxIndentDepth}
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

	/* ルート直下の一覧にも階層の縦線を出す(深い階層はFolderTreeItem側で同じ見た目にする) */
	nav > ul > li > ul {
		margin: 0;
		margin-left: 12px;
		padding: 0;
		padding-left: 8px;
		border-left: 1px solid var(--color-outline-weak);
		list-style: none;
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

	/* タッチ端末と狭い画面: ルート直下のインデントを浅くする(幅が尽きて見切れないように) */
	@media (pointer: coarse), (max-width: 640px) {
		nav > ul > li > ul {
			margin-left: 6px;
			padding-left: 6px;
		}
	}

	/* タッチ操作の端末: 行を大きくして指で操作しやすくする */
	@media (pointer: coarse) {
		div {
			padding: 6px 10px;
			gap: 8px;
		}

		span {
			justify-content: center;
			min-width: 28px;
			min-height: 28px;
		}

		div > button {
			font-size: 1.05rem;
		}
	}
</style>
