<script lang="ts">
	type Props = {
		/** アバター画像URL(nullで頭文字を表示) */
		src: string | null;
		/** 代替テキスト(表示名) */
		alt: string;
		/** 一辺のサイズ(px) */
		size?: number;
	};

	let { src, alt, size = 30 }: Props = $props();

	const initial = $derived([...alt][0] ?? '?');
</script>

{#if src !== null}
	<img {src} {alt} style:width="{size}px" style:height="{size}px" />
{:else}
	<span aria-label={alt} style:width="{size}px" style:height="{size}px">{initial}</span>
{/if}

<style>
	img {
		display: block;
		border-radius: 9999px;
		aspect-ratio: 1;
		object-fit: cover;
	}

	span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background-color: var(--color-surface-active);
		font-size: 0.85rem;
		color: var(--color-text);
	}
</style>
