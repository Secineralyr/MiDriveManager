<script lang="ts">
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconX from '@tabler/icons-svelte/icons/x';
	import type { ToastKind } from '../../lib/stores/toast.svelte';

	type Props = {
		/** 表示するメッセージ */
		message: string;
		/** トーストの種類 */
		kind: ToastKind;
		/** 自動的に消えるまでの時間(ミリ秒)。残り時間インジケーターの進行に使う */
		durationMs: number;
		/** トーストを閉じる操作 */
		ondismiss: () => void;
	};

	let { message, kind, durationMs, ondismiss }: Props = $props();
</script>

<p role={kind === 'error' ? 'alert' : 'status'} data-kind={kind}>
	<span>{message}</span>
	<IconButton label="通知を閉じる" onclick={ondismiss}>
		<IconX size={16} />
	</IconButton>
	<span aria-hidden="true" style:transition-duration="{durationMs}ms"></span>
</p>

<style>
	p {
		display: flex;
		position: relative;
		overflow: hidden;
		align-items: center;
		margin: 0;
		padding: 10px 15px;
		border: 1px solid var(--color-outline);
		border-radius: 5px;
		gap: 10px;
		background-color: var(--color-surface);
		min-width: 240px;
		max-width: 360px;
	}

	p > span:first-child {
		flex: 1;
		font-size: 0.85rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
		color: var(--color-text);
	}

	p > span:last-child {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		min-height: 2px;
		background-color: var(--color-text-faint);
		transform: scaleX(0);
		transform-origin: left;
		transition-property: transform;
		transition-timing-function: linear;
	}

	@starting-style {
		p > span:last-child {
			transform: scaleX(1);
		}
	}

	p[data-kind='error'] > span:last-child {
		background-color: var(--color-danger);
	}
</style>
