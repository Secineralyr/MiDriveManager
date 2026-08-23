<script lang="ts">
	import { acceptDragOver, dispatchDrop } from '../../lib/utils/drop-target';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import type { SelectModifiers } from '../../lib/stores/selection.svelte';

	type Props = {
		/** フォルダカードかどうか */
		folder?: boolean;
		/** 表示名 */
		name: string;
		/** MIMEタイプ(フォルダはnull) */
		mimeType?: string | null;
		/** サムネイル画像URL(ないものはアイコン表示) */
		thumbnailUrl?: string | null;
		/** 選択中かどうか */
		selected?: boolean;
		/** クリックで選択された時の処理 */
		onselect?: (modifiers: SelectModifiers) => void;
		/** ダブルクリックで開く操作 */
		onopen?: () => void;
		/** ドラッグ開始時の処理 */
		ondragstartitem?: () => void;
		/** ドラッグ終了時の処理 */
		ondragenditem?: () => void;
		/** このカード(フォルダ)への項目ドロップ時の処理 */
		ondropitems?: () => void;
		/** このカード(フォルダ)へのOSファイルドロップ時の処理 */
		ondropfiles?: (transfer: DataTransfer) => void;
		/** 右クリックでコンテキストメニューを開く操作(表示位置を渡す) */
		onopenmenu?: (position: { x: number; y: number }) => void;
	};

	let {
		folder = false,
		name,
		mimeType = null,
		thumbnailUrl = null,
		selected = false,
		onselect,
		onopen,
		ondragstartitem,
		ondragenditem,
		ondropitems,
		ondropfiles,
		onopenmenu,
	}: Props = $props();

	let dropover = $state(false);

	/**
	 * クリックを選択操作として通知する
	 * @param event - マウスイベント
	 */
	const handleClick = (event: MouseEvent) => {
		event.stopPropagation();
		onselect?.({ toggle: event.ctrlKey || event.metaKey, range: event.shiftKey });
	};

	/** ダブルクリックを外部ハンドラへ伝える */
	const handleDblClick = () => {
		onopen?.();
	};

	/**
	 * チェックボックスで選択を切り替える(他の選択は保ったまま)
	 * @param event - イベント
	 */
	const handleCheckbox = (event: Event) => {
		event.stopPropagation();
		onselect?.({ toggle: true, range: false });
	};

	/**
	 * 右クリックでブラウザのメニューの代わりにコンテキストメニューを開く
	 * @param event - マウスイベント
	 */
	const handleContextMenu = (event: MouseEvent) => {
		if (onopenmenu === undefined) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		onopenmenu({ x: event.clientX, y: event.clientY });
	};

	/**
	 * ドラッグ開始を通知する
	 * @param event - ドラッグイベント
	 */
	const handleDragStart = (event: DragEvent) => {
		if (event.dataTransfer !== null) {
			event.dataTransfer.setData('text/plain', name);
			event.dataTransfer.effectAllowed = 'move';
		}
		ondragstartitem?.();
	};

	/** ドラッグ終了を通知する */
	const handleDragEnd = () => {
		ondragenditem?.();
	};

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
	 * ドロップされた項目またはOSファイルを受け取る
	 * @param event - ドラッグイベント
	 */
	const handleDrop = (event: DragEvent) => {
		dropover = false;
		dispatchDrop(event, { onitems: ondropitems, onfiles: ondropfiles });
	};
</script>

<div>
	<button
		type="button"
		draggable="true"
		onclick={handleClick}
		ondblclick={handleDblClick}
		oncontextmenu={handleContextMenu}
		ondragstart={handleDragStart}
		ondragend={handleDragEnd}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		title={name}
		data-selected={selected}
		data-dropover={dropover}
		aria-pressed={selected}
	>
		<span>
			{#if thumbnailUrl !== null}
				<img src={thumbnailUrl} alt="" loading="lazy" />
			{:else}
				<FileTypeIcon {folder} {mimeType} size={30} />
			{/if}
		</span>
		<span>{name}</span>
	</button>
	<input
		type="checkbox"
		aria-label="{name}を選択"
		checked={selected}
		onclick={handleCheckbox}
		ondblclick={(event) => {
			event.stopPropagation();
		}}
	/>
</div>

<style>
	button {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 0;
		background-color: var(--color-surface);
		font-family: inherit;
		cursor: pointer;
		inline-size: 100%;
		user-select: none;
		transition:
			background-color 250ms ease,
			border-color 250ms ease;
	}

	button:hover {
		border-color: var(--color-outline);
		background-color: var(--color-surface-hover);
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	button[data-selected='true'] {
		border-color: var(--color-accent);
		background-color: var(--color-surface-active);
	}

	button[data-dropover='true'] {
		border-color: var(--color-accent);
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}

	span:first-child {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 10px 10px 0 0;
		background-color: var(--color-surface-active);
		aspect-ratio: 4 / 3;
		inline-size: 100%;
		color: var(--color-text-muted);
	}

	img {
		aspect-ratio: 4 / 3;
		object-fit: cover;
		inline-size: 100%;
	}

	span:last-child {
		overflow: hidden;
		padding: 8px 10px;
		font-size: 0.85rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
		max-width: 100%;
	}

	div {
		display: flex;
		flex: 1;
		position: relative;
	}

	div > input {
		display: block;
		position: absolute;
		top: 8px;
		left: 8px;
		z-index: 1;
		margin: 0;
		accent-color: var(--color-accent);
		inline-size: 16px;
		block-size: 16px;
		opacity: 0;
		cursor: pointer;
		transition: opacity 250ms ease;
	}

	div:hover > input,
	div > input:checked,
	div > input:focus-visible {
		opacity: 1;
	}
</style>
