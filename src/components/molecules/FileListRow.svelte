<script lang="ts">
	import { formatDateTime, formatFileSize } from '../../lib/utils/format';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';

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
		/** ダブルクリックで開く操作 */
		onopen?: () => void;
	};

	let { folder = false, name, createdAt, size, mimeType = null, onopen }: Props = $props();

	/** ダブルクリックを外部ハンドラへ伝える */
	const handleDblClick = () => {
		onopen?.();
	};
</script>

<tr ondblclick={handleDblClick} data-openable={onopen !== undefined}>
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
		transition: background-color 250ms ease;
	}

	tr:hover {
		background-color: var(--color-surface-hover);
	}

	tr[data-openable='true'] {
		cursor: pointer;
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
