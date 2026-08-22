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
	}: Props = $props();

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
</script>

<tr
	onclick={handleClick}
	ondblclick={handleDblClick}
	data-openable={onopen !== undefined}
	data-selected={selected}
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
