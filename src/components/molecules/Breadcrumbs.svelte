<script lang="ts">
	import { acceptDragOver, dispatchDrop } from '../../lib/utils/drop-target';
	import { computeBreadcrumbLayout } from '../../lib/utils/breadcrumb-layout';
	import { popIn } from '../../lib/utils/transitions';

	type Crumb = {
		/** フォルダID(ルートはnull) */
		id: string | null;
		/** 表示名 */
		name: string;
	};

	type Props = {
		/** ルートから現在位置までの経路 */
		items: Crumb[];
		/** 経路のフォルダ選択時の処理 */
		onnavigate: (folderId: string | null) => void;
		/** 経路のフォルダへの項目ドロップ時の処理 */
		ondropitems?: (folderId: string | null) => void;
		/** 経路のフォルダへのOSファイルドロップ時の処理 */
		ondropfiles?: (folderId: string | null, transfer: DataTransfer) => void;
	};

	let { items, onnavigate, ondropitems, ondropfiles }: Props = $props();

	/** ドロップ強調中の項目のキー(ルートは'root'、なければnull) */
	let dropoverKey = $state<string | null>(null);

	/**
	 * 項目の強調用キーを返す
	 * @param item - 経路の項目
	 * @returns 強調用キー
	 */
	const keyOf = (item: Crumb) => item.id ?? 'root';

	/**
	 * 受け入れられる種類のドロップなら受け入れを表明して項目を強調する
	 * @param item - 対象の項目
	 * @param event - ドラッグイベント
	 */
	const handleCrumbDragOver = (item: Crumb, event: DragEvent) => {
		const accepted = acceptDragOver(event, {
			items: ondropitems !== undefined,
			files: ondropfiles !== undefined,
		});
		dropoverKey = accepted ? keyOf(item) : dropoverKey;
	};

	/** ドロップ対象の強調を解除する */
	const handleCrumbDragLeave = () => {
		dropoverKey = null;
	};

	/**
	 * ドロップされた項目またはOSファイルを経路のフォルダ宛てとして受け取る
	 * @param item - 対象の項目
	 * @param event - ドラッグイベント
	 */
	const handleCrumbDrop = (item: Crumb, event: DragEvent) => {
		dropoverKey = null;
		dispatchDrop(event, {
			onitems: ondropitems === undefined ? undefined : () => ondropitems(item.id),
			onfiles:
				ondropfiles === undefined ? undefined : (transfer) => ondropfiles(item.id, transfer),
		});
	};

	/** 項目間の余白(CSSのgapと一致させる) */
	const GAP = 5;

	let containerWidth = $state(0);
	let measuredWidths = $state<number[]>([]);
	let ellipsisWidth = $state(0);
	let menuOpen = $state(false);
	let menuContainer = $state<HTMLElement | null>(null);

	const layout = $derived(
		computeBreadcrumbLayout({
			widths: measuredWidths.slice(0, items.length),
			containerWidth,
			ellipsisWidth,
			gap: GAP,
		}),
	);
	const first = $derived(items[0]);
	const hiddenItems = $derived(layout.collapsed ? items.slice(1, layout.tailStart) : []);
	const tailItems = $derived(layout.collapsed ? items.slice(layout.tailStart) : items.slice(1));

	/**
	 * 経路の項目を選択して移動する
	 * @param item - 選択された項目
	 */
	const handleSelect = (item: Crumb) => {
		menuOpen = false;
		onnavigate(item.id);
	};

	/**
	 * メニューの外側をポインタで押した時にメニューを閉じる
	 * @param event - ポインタイベント
	 */
	const handleOutsidePointer = (event: PointerEvent) => {
		if (!menuOpen || menuContainer === null) {
			return;
		}
		if (event.target instanceof Node && !menuContainer.contains(event.target)) {
			menuOpen = false;
		}
	};
</script>

<svelte:window onpointerdown={handleOutsidePointer} />

<nav aria-label="現在のフォルダ位置" bind:clientWidth={containerWidth}>
	<ol aria-hidden="true" data-measure>
		{#each items as item, index (item.id ?? 'root')}
			<li bind:offsetWidth={measuredWidths[index]}>
				<span>{item.name}</span>
				<span>/</span>
			</li>
		{/each}
		<li bind:offsetWidth={ellipsisWidth}>
			<span>…</span>
			<span>/</span>
		</li>
	</ol>
	<ol>
		{#if first !== undefined}
			<li>
				{#if items.length > 1}
					<button
						type="button"
						data-dropover={dropoverKey === keyOf(first)}
						ondragover={(event) => {
							handleCrumbDragOver(first, event);
						}}
						ondragleave={handleCrumbDragLeave}
						ondrop={(event) => {
							handleCrumbDrop(first, event);
						}}
						onclick={() => {
							handleSelect(first);
						}}
					>
						{first.name}
					</button>
					<span aria-hidden="true">/</span>
				{:else}
					<strong
						role="group"
						data-dropover={dropoverKey === keyOf(first)}
						ondragover={(event) => {
							handleCrumbDragOver(first, event);
						}}
						ondragleave={handleCrumbDragLeave}
						ondrop={(event) => {
							handleCrumbDrop(first, event);
						}}>{first.name}</strong
					>
				{/if}
			</li>
		{/if}
		{#if hiddenItems.length > 0}
			<li bind:this={menuContainer} data-ellipsis>
				<button
					type="button"
					aria-label="省略されたフォルダを表示"
					aria-expanded={menuOpen}
					onclick={() => {
						menuOpen = !menuOpen;
					}}
				>
					…
				</button>
				<span aria-hidden="true">/</span>
				{#if menuOpen}
					<menu transition:popIn>
						{#each hiddenItems as item (item.id ?? 'root')}
							<li>
								<button
									type="button"
									onclick={() => {
										handleSelect(item);
									}}
								>
									{item.name}
								</button>
							</li>
						{/each}
					</menu>
				{/if}
			</li>
		{/if}
		{#each tailItems as item, index (item.id ?? 'root')}
			<li>
				{#if index < tailItems.length - 1}
					<button
						type="button"
						data-dropover={dropoverKey === keyOf(item)}
						ondragover={(event) => {
							handleCrumbDragOver(item, event);
						}}
						ondragleave={handleCrumbDragLeave}
						ondrop={(event) => {
							handleCrumbDrop(item, event);
						}}
						onclick={() => {
							handleSelect(item);
						}}
					>
						{item.name}
					</button>
					<span aria-hidden="true">/</span>
				{:else}
					<strong
						role="group"
						data-dropover={dropoverKey === keyOf(item)}
						ondragover={(event) => {
							handleCrumbDragOver(item, event);
						}}
						ondragleave={handleCrumbDragLeave}
						ondrop={(event) => {
							handleCrumbDrop(item, event);
						}}>{item.name}</strong
					>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	nav {
		position: relative;
		flex: 1;
		min-width: 0;
	}

	ol {
		display: flex;
		align-items: center;
		margin: 0;
		padding: 0;
		gap: 5px;
		list-style: none;
	}

	ol[data-measure] {
		position: absolute;
		top: 0;
		left: 0;
		visibility: hidden;
		pointer-events: none;
		white-space: nowrap;
	}

	ol[data-measure] li > span:first-child {
		font-size: 1.15rem;
		font-weight: 700;
		white-space: nowrap;
	}

	li {
		display: flex;
		align-items: center;
		gap: 5px;
		min-width: 0;
	}

	li[data-ellipsis] {
		position: relative;
	}

	button {
		overflow: hidden;
		padding: 0;
		border: 0;
		background-color: transparent;
		font-family: inherit;
		font-size: 1.15rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color 250ms ease;
	}

	button:hover {
		color: var(--color-text);
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	span {
		color: var(--color-text-faint);
	}

	strong {
		overflow: hidden;
		font-size: 1.15rem;
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
	}

	menu {
		display: flex;
		position: absolute;
		top: 100%;
		left: 0;
		transform-origin: top left;
		z-index: 100;
		flex-direction: column;
		margin: 5px 0;
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 5px;
		min-width: 180px;
		max-height: 240px;
		overflow-y: auto;
		background-color: var(--color-surface);
		list-style: none;
	}

	menu > li {
		display: flex;
	}

	menu button {
		flex: 1;
		border-radius: 5px;
		padding: 8px 10px;
		font-size: 1rem;
		text-align: left;
		color: var(--color-text);
		transition: background-color 250ms ease;
	}

	menu button:hover {
		background-color: var(--color-surface-hover);
		color: var(--color-text);
	}

	button[data-dropover='true'],
	strong[data-dropover='true'] {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
		background-color: var(--color-surface-active);
	}
</style>
