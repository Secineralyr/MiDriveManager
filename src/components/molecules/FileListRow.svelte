<script lang="ts">
	import { formatDateTime, formatFileSize } from '../../lib/utils/format';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import type { SelectModifiers } from '../../lib/stores/selection.svelte';

	type Props = {
		/** フォルダ行かどうか */
		folder?: boolean;
		/** 表示名 */
		name: string;
		/** 追加日時(ISO 8601文字列) */
		createdAt: string;
		/** ファイルサイズ(フォルダはnull) */
		size: number | null;
		/** MIMEタイプ(フォルダはnull) */
		mimeType?: string | null;
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
		/** この行(フォルダ)への項目ドロップ時の処理 */
		ondropitems?: () => void;
	};

	let {
		folder = false,
		name,
		createdAt,
		size,
		mimeType = null,
		selected = false,
		onselect,
		onopen,
		ondragstartitem,
		ondragenditem,
		ondropitems,
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
	 * ドロップの受け入れを表明して強調する
	 * @param event - ドラッグイベント
	 */
	const handleDragOver = (event: DragEvent) => {
		if (ondropitems === undefined) {
			return;
		}
		event.preventDefault();

		if (event.dataTransfer !== null) {
			event.dataTransfer.dropEffect = 'move';
		}

		dropover = true;
	};

	/** ドロップ対象の強調を解除する */
	const handleDragLeave = () => {
		dropover = false;
	};

	/**
	 * ドロップされた項目を受け取る
	 * @param event - ドラッグイベント
	 */
	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		dropover = false;
		ondropitems?.();
	};
</script>

<tr
	draggable="true"
	onclick={handleClick}
	ondblclick={handleDblClick}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	data-openable={onopen !== undefined}
	data-selected={selected}
	data-dropover={dropover}
	aria-selected={selected}
>
	<td>
		<FileTypeIcon {folder} {mimeType} />
		<span>{name}</span>
	</td>
	<td>{formatDateTime(createdAt)}</td>
	<td>{size === null ? '' : formatFileSize(size)}</td>
</tr>

<style>
	tr {
		border-bottom: 1px solid var(--color-outline-weak);
		cursor: default;
		user-select: none;
		transition: background-color 250ms ease;
	}

	tr:hover {
		background-color: var(--color-surface-hover);
	}

	tr[data-openable='true'] {
		cursor: pointer;
	}

	tr[data-selected='true'] {
		background-color: var(--color-surface-active);
	}

	tr[data-dropover='true'] {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
		background-color: var(--color-surface-active);
	}

	td {
		overflow: hidden;
		padding: 10px;
		font-size: 1rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
	}

	td:first-child {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	td:first-child > span {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	td:nth-child(2),
	td:nth-child(3) {
		color: var(--color-text-muted);
	}
</style>
