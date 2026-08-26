<script lang="ts">
	import { acceptDragOver, dispatchDrop } from '../../lib/utils/drop-target';
	import { tick, untrack } from 'svelte';
	import ActionSheet from '$components/molecules/ActionSheet.svelte';
	import ContextMenu from '$components/molecules/ContextMenu.svelte';
	import type { FolderRecord } from '../../lib/db/schema';
	import FolderTreeItem from '$components/molecules/FolderTreeItem.svelte';
	import IconChevronDown from '@tabler/icons-svelte/icons/chevron-down';
	import IconFolderPlus from '@tabler/icons-svelte/icons/folder-plus';
	import { ancestorIds } from '../../lib/services/folder-tree';
	import { longPress } from '../../lib/utils/long-press';

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
		/** フォルダの右クリック(長押し)メニューからの新規フォルダ作成(指定した場合だけメニューを出す) */
		oncreatefolderat?: (parentId: string | null) => void;
		/** スマートフォン表示かどうか(メニューを下から出るシートにする) */
		phone?: boolean;
	};

	let {
		childrenMap,
		currentFolderId,
		onnavigate,
		ondropitems,
		ondropfiles,
		expandOnSelect = false,
		maxIndentDepth = 6,
		oncreatefolderat,
		phone = false,
	}: Props = $props();

	let menuTarget = $state<{
		/** 対象のフォルダID(ルートはnull) */
		folderId: string | null;
		/** ビューポート基準のx座標 */
		x: number;
		/** ビューポート基準のy座標 */
		y: number;
	} | null>(null);

	/**
	 * フォルダのメニューを開く
	 * @param folderId - 対象のフォルダID(ルートはnull)
	 * @param position - 表示位置
	 */
	const handleOpenMenu = (
		folderId: string | null,
		position: {
			/** ビューポート基準のx座標 */
			x: number;
			/** ビューポート基準のy座標 */
			y: number;
		},
	) => {
		menuTarget = { folderId, ...position };
	};

	const menuTitle = $derived.by(() => {
		if (menuTarget === null || menuTarget.folderId === null) {
			return 'ルート';
		}

		const targetId = menuTarget.folderId;
		for (const bucket of Object.values(childrenMap)) {
			const hit = bucket.find((folder) => folder.id === targetId);
			if (hit !== undefined) {
				return hit.name;
			}
		}

		return 'フォルダ';
	});

	const MENU_ITEMS = [{ id: 'create', label: '新しいフォルダ', icon: IconFolderPlus }];

	/** メニューで選ばれた操作を実行する(現状は新規フォルダ作成のみ) */
	const handleMenuSelect = () => {
		if (menuTarget !== null) {
			oncreatefolderat?.(menuTarget.folderId);
		}
	};

	let expanded = $state<Record<string, boolean>>({});
	let rootDropover = $state(false);
	let nav = $state<HTMLElement | null>(null);

	let lastScrolledId: string | null = null;

	/** 展開の描画後に、現在の行が見える位置へスクロールする */
	const scrollCurrentIntoView = async () => {
		await tick();
		nav?.querySelector('[data-current="true"]')?.scrollIntoView({
			block: 'nearest',
			behavior: 'smooth',
		});
	};

	let autoExpandedIds: string[] = [];

	/**
	 * 経路に合わせて自動展開を更新する
	 * 前回自動展開したうち経路から外れたものは折りたたみ、まだ開かれていない祖先を
	 * 自動展開として開く(手動で開いていたものは自動扱いにしない)
	 * @param path - 現在のフォルダの祖先ID
	 */
	const applyAutoExpansion = (path: string[]) => {
		for (const id of autoExpandedIds) {
			if (!path.includes(id)) {
				expanded[id] = false;
			}
		}

		const kept = autoExpandedIds.filter((id) => path.includes(id));
		const added = path.filter((id) => expanded[id] !== true);
		for (const id of added) {
			expanded[id] = true;
		}

		autoExpandedIds = [...kept, ...added];
	};

	$effect(() => {
		const path = ancestorIds(childrenMap, currentFolderId);
		
		untrack(() => {
			applyAutoExpansion(path);

			if (lastScrolledId !== currentFolderId) {
				lastScrolledId = currentFolderId;
				const _ = scrollCurrentIntoView();
			}
		});
	});

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
		autoExpandedIds = autoExpandedIds.filter((id) => id !== folderId);
	};

	/**
	 * フォルダを選ぶ(指定があれば下の階層も展開する)
	 * @param folderId - 選ばれたフォルダID
	 */
	const handleSelect = (folderId: string) => {
		if (expandOnSelect) {
			expanded[folderId] = true;
			autoExpandedIds = autoExpandedIds.filter((id) => id !== folderId);
		}
		onnavigate(folderId);
	};
</script>

<nav aria-label="フォルダツリー" bind:this={nav}>
	<ul>
		<li>
			<div
				role="group"
				data-current={currentFolderId === null}
				data-dropover={rootDropover}
				ondragover={handleRootDragOver}
				ondragleave={handleRootDragLeave}
				ondrop={handleRootDrop}
				oncontextmenu={(event) => {
					if (oncreatefolderat !== undefined) {
						event.preventDefault();
						handleOpenMenu(null, { x: event.clientX, y: event.clientY });
					}
				}}
				use:longPress={oncreatefolderat === undefined
					? undefined
					: (position) => {
							handleOpenMenu(null, position);
						}}
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
							onopenmenu={oncreatefolderat === undefined ? undefined : handleOpenMenu}
						/>
					{/each}
				</ul>
			{/if}
		</li>
	</ul>
</nav>

{#if oncreatefolderat !== undefined}
	{#if phone}
		<ActionSheet
			open={menuTarget !== null}
			title={menuTitle}
			items={MENU_ITEMS}
			onselect={handleMenuSelect}
			onclose={() => {
				menuTarget = null;
			}}
		/>
	{:else}
		<ContextMenu
			open={menuTarget !== null}
			x={menuTarget?.x ?? 0}
			y={menuTarget?.y ?? 0}
			items={MENU_ITEMS}
			onselect={handleMenuSelect}
			onclose={() => {
				menuTarget = null;
			}}
		/>
	{/if}
{/if}

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
