<script lang="ts">
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconDownload from '@tabler/icons-svelte/icons/download';
	import IconFolderSymlink from '@tabler/icons-svelte/icons/folder-symlink';
	import IconInfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import IconTrash from '@tabler/icons-svelte/icons/trash';
	import IconX from '@tabler/icons-svelte/icons/x';

	type Props = {
		/** 選択中の件数 */
		count: number;
		/** ダウンロード要求時の処理 */
		ondownload: () => void;
		/** 削除要求時の処理 */
		ondelete: () => void;
		/** 選択解除時の処理 */
		onclear: () => void;
		/** 移動(移動先の選択)要求時の処理(指定した場合だけボタンを表示する。タブレット用) */
		onmove?: () => void;
		/** 解除ボタンの説明(タブレットの選択モードでは選択の終了にする) */
		clearLabel?: string;
		/** 詳細パネルを開いているか(デスクトップのトグルボタンの状態表示用) */
		detailsOpen?: boolean;
		/** 詳細パネルの開閉(指定した場合だけボタンを表示。デスクトップでのみ表示する) */
		ontoggledetails?: () => void;
	};

	let {
		count,
		ondownload,
		ondelete,
		onclear,
		onmove,
		clearLabel = '選択を解除',
		detailsOpen = false,
		ontoggledetails,
	}: Props = $props();
</script>

<p role="status">
	<span>{count}件選択</span>
	<span>
		{#if onmove !== undefined}
			<IconButton label="選択した項目を移動" onclick={onmove}>
				<IconFolderSymlink size={16} />
			</IconButton>
		{/if}
		<IconButton label="選択した項目をダウンロード" onclick={ondownload}>
			<IconDownload size={16} />
		</IconButton>
		<IconButton label="選択した項目を削除" onclick={ondelete}>
			<IconTrash size={16} />
		</IconButton>
		{#if ontoggledetails !== undefined}
			<span data-details-toggle>
				<IconButton
					label={detailsOpen ? '詳細パネルを閉じる' : '詳細パネルを開く'}
					active={detailsOpen}
					onclick={ontoggledetails}
				>
					<IconInfoCircle size={16} />
				</IconButton>
			</span>
		{/if}
		<IconButton label={clearLabel} onclick={onclear}>
			<IconX size={16} />
		</IconButton>
	</span>
</p>

<style>
	p {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 5px;
		margin: 0;
		padding: 4px 12px;
		gap: 10px;
		background-color: var(--color-surface-active);
	}

	p > span:first-child {
		font-size: 0.85rem;
		color: var(--color-text);
	}

	p > span:last-child {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	span[data-details-toggle] {
		display: inline-flex;
	}

	/* 詳細パネルのトグルはデスクトップ(マウス操作の広い画面)でのみ表示する */
	@media (pointer: coarse), (max-width: 640px) {
		span[data-details-toggle] {
			display: none;
		}
	}

	/* タッチ操作の端末: 指で押しやすいように少し大きくする(スマートフォンでは選択バー自体を出さない) */
	@media (pointer: coarse) {
		p {
			padding: 8px 15px;
		}

		p > span:first-child {
			font-size: 1rem;
		}

		p > span:last-child {
			gap: 10px;
		}
	}
</style>
