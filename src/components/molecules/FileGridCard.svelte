<script lang="ts">
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';

	type Props = {
		/** フォルダカードかどうか */
		folder?: boolean;
		/** 表示名 */
		name: string;
		/** MIMEタイプ(フォルダはnull) */
		mimeType?: string | null;
		/** サムネイル画像URL(ないものはアイコン表示) */
		thumbnailUrl?: string | null;
		/** ダブルクリックで開く操作 */
		onopen?: () => void;
	};

	let { folder = false, name, mimeType = null, thumbnailUrl = null, onopen }: Props = $props();

	/** ダブルクリックを外部ハンドラへ伝える */
	const handleDblClick = () => {
		onopen?.();
	};
</script>

<button type="button" ondblclick={handleDblClick} title={name}>
	<span>
		{#if thumbnailUrl !== null}
			<img src={thumbnailUrl} alt="" loading="lazy" />
		{:else}
			<FileTypeIcon {folder} {mimeType} size={30} />
		{/if}
	</span>
	<span>{name}</span>
</button>

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
</style>
