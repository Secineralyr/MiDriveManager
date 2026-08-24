<script lang="ts">
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconFolderSymlink from '@tabler/icons-svelte/icons/folder-symlink';
	import IconTrash from '@tabler/icons-svelte/icons/trash';
	import { sheetUp } from '../../lib/utils/transitions';

	type Props = {
		/** 選択中の件数 */
		count: number;
		/** 移動(移動先の選択)要求時の処理 */
		onmove: () => void;
		/** ダウンロード要求時の処理 */
		ondownload: () => void;
		/** 削除要求時の処理 */
		ondelete: () => void;
	};

	let { count, onmove, ondownload, ondelete }: Props = $props();
</script>

<footer transition:sheetUp|global>
	<span role="status">{count === 0 ? '項目を選択' : `${count}件選択`}</span>
	<span>
		<IconButton label="選択した項目を移動" disabled={count === 0} onclick={onmove}>
			<IconFolderSymlink size={20} />
		</IconButton>
		<IconButton label="選択した項目をダウンロード" disabled={count === 0} onclick={ondownload}>
			<IconDownload size={20} />
		</IconButton>
		<IconButton label="選択した項目を削除" disabled={count === 0} onclick={ondelete}>
			<IconTrash size={20} />
		</IconButton>
	</span>
</footer>

<style>
	footer {
		display: flex;
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 30;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--color-outline-weak);
		padding: 8px 20px;
		padding-bottom: calc(8px + env(safe-area-inset-bottom));
		gap: 10px;
		background-color: var(--color-bg);
	}

	footer > span:first-child {
		font-size: 0.85rem;
		color: var(--color-text);
	}

	footer > span:last-child {
		display: flex;
		align-items: center;
		gap: 15px;
	}
</style>
