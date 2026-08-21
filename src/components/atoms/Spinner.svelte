<script lang="ts">
	type Props = {
		/** 直径(px) */
		size?: number;
	};

	let { size = 20 }: Props = $props();
</script>

<span role="status" aria-label="読み込み中" style:width="{size}px" style:height="{size}px"></span>

<style>
	/* 無限回転はtransitionでは表現できないためanimationを使用する */
	span {
		display: inline-block;
		border: 2px solid var(--color-outline-weak);
		border-radius: 9999px;
		border-top-color: var(--color-text);
		animation: spin 750ms linear infinite;
	}

	@keyframes spin {
		to {
			rotate: 360deg;
		}
	}
</style>
