<script lang="ts">
	import Button from '$components/atoms/Button.svelte';
	import { createDialogCloser } from '../../lib/utils/dialog-close.svelte';

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** ダイアログを閉じる操作 */
		onclose: () => void;
	};

	let { open, onclose }: Props = $props();

	const GITHUB_URL = 'https://github.com/slofp';

	const DEVELOPER_URL = 'https://misskey.io/@secineralyr';

	const ABOUT_IMAGE_URL = '/sl-logo.png';
	const ABOUT_URL = 'https://secinet.jp';

	let dialog = $state<HTMLDialogElement | null>(null);

	const closer = createDialogCloser();

	$effect(() => {
		closer.sync(open, dialog);
	});

	/** ダイアログが閉じられた時に閉じる処理へ伝える */
	const handleClose = () => {
		if (open) {
			onclose();
		}
	};

	/**
	 * Escキーでの即時クローズを止め、アニメーション付きの閉じる処理へ流す
	 * @param event - cancelイベント
	 */
	const handleCancelEvent = (event: Event) => {
		event.preventDefault();
		onclose();
	};
</script>

<dialog
	bind:this={dialog}
	data-closing={closer.closing}
	onclose={handleClose}
	oncancel={handleCancelEvent}
>
	<img src="/favicon.svg" alt="App Icon" />
	<h2>MiDriveManager</h2>
	<p>バージョン {APP_VERSION}</p>
	<nav>
		<a
			href={GITHUB_URL}
			target="_blank"
			rel="noopener noreferrer"
		>
			GitHub
		</a>
		<a
			href={DEVELOPER_URL}
			target="_blank"
			rel="noopener noreferrer"
		>
			Misskeyアカウント
		</a>
	</nav>
	<figure>
		<a
			href={ABOUT_URL}
			target="_blank"
			rel="noopener noreferrer"
		>
			<img src={ABOUT_IMAGE_URL} alt="Secineralyr" />
		</a>
	</figure>
	<div>
		<Button variant="tonal" onclick={onclose}>閉じる</Button>
	</div>
</dialog>

<style>
	dialog {
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 20px;
		max-width: 320px;
		background-color: var(--color-surface);
		text-align: center;
		color: var(--color-text);
	}

	/* サブメニューと同様に、縮小+ブラーから拡大しつつフェードして出入りする */
	/* 閉じる時はJS側でclose()を遅らせ、data-closingの退出スタイルへ遷移させる */
	dialog[open] {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		opacity: 1;
		transform: scale(1);
		filter: blur(0);
		transition:
			opacity 250ms ease,
			transform 250ms ease,
			filter 250ms ease;
	}

	@starting-style {
		dialog[open] {
			opacity: 0;
			transform: scale(0.9);
			filter: blur(4px);
		}
	}

	dialog[open][data-closing='true'] {
		opacity: 0;
		transform: scale(0.9);
		filter: blur(4px);
	}

	dialog::backdrop {
		background-color: var(--color-scrim);
	}

	dialog[open]::backdrop {
		opacity: 1;
		transition: opacity 250ms ease;
	}

	@starting-style {
		dialog[open]::backdrop {
			opacity: 0;
		}
	}

	dialog[open][data-closing='true']::backdrop {
		opacity: 0;
	}

	dialog > img {
		inline-size: 60px;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	nav {
		display: flex;
		justify-content: center;
		gap: 15px;
	}

	a {
		color: var(--color-text);
	}

	a:not([href]) {
		opacity: 0.5;
	}

	figure {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 20px 40px 10px;
		inline-size: 100%;
		overflow: hidden;
	}

	figure > a > img {
		inline-size: 100%;
		block-size: auto;
		object-fit: cover;
	}

	div {
		display: flex;
		flex-direction: column;
		align-self: stretch;
	}
</style>
