<script lang="ts">
	import { popIn, stepIn, stepOut } from '../../lib/utils/transitions';
	import Button from '$components/atoms/Button.svelte';
	import Spinner from '$components/atoms/Spinner.svelte';
	import TextField from '$components/atoms/TextField.svelte';
	import { fade } from 'svelte/transition';

	/** 初回利用時に同意を求める諸注意(段落ごと) */
	const NOTICE_PARAGRAPHS = [
		'このツールは、Misskeyサーバー上のドライブ上にアップロードされている画像等のアイテムを整理しやすくするために作成されたツールです。',
		'そのため、一般的なドライブツールのUIと操作を提供するためにアップロード等が行えるようになっていますが、このツールはドライブ機能を一般的なクラウド目的で使用するためではないことをご理解のうえ、ご利用ください。',
		'また、アップロードされたファイルは各ご利用のMisskeyサーバー上のルールに従うものとし、このツールを使用したことで予期しない事態や損害が発生した場合、その一切の責任を負いかねますので、ご了承ください。',
	];

	type Props = {
		/** メイン画面の上に重ねて表示するかどうか(2回目以降のアカウント追加時) */
		overlay?: boolean;
		/** 諸注意に同意済みかどうか(未同意ならホスト名入力の前に諸注意を表示する) */
		noticeAccepted: boolean;
		/** 諸注意に同意した時の処理 */
		onacceptnotice: () => void;
		/** キャンセルできるかどうか(既存アカウントがある場合のみ) */
		cancellable: boolean;
		/** 認証結果の確認中かどうか */
		busy: boolean;
		/** 表示するエラーメッセージ(nullなら非表示) */
		error: string | null;
		/** 認証開始時の処理(入力されたホスト名を渡す) */
		onstart: (host: string) => void;
		/** キャンセル時の処理 */
		oncancel: () => void;
	};

	let {
		overlay = false,
		noticeAccepted,
		onacceptnotice,
		cancellable,
		busy,
		error,
		onstart,
		oncancel,
	}: Props = $props();

	let host = $state('misskey.io');
	let inputError = $state<string | null>(null);

	/**
	 * フォーム送信時にホスト名を検証して認証を開始する
	 * @param event - フォーム送信イベント
	 */
	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		const trimmed = host.trim();
		if (trimmed === '') {
			inputError = 'ホスト名を入力してください';
			return;
		}
		inputError = null;
		onstart(trimmed);
	};

	/**
	 * カードの入場トランジション(オーバーレイ時は従来のポップ、通常時は右からのスライド)
	 * @param node - 対象の要素
	 * @returns トランジションの設定
	 */
	const cardIn = (node: Element) => (overlay ? popIn(node) : stepIn(node));

	/**
	 * カードの退場トランジション(オーバーレイ時は従来のポップ、通常時は左へのスライド)
	 * @param node - 対象の要素
	 * @returns トランジションの設定
	 */
	const cardOut = (node: Element) => (overlay ? popIn(node) : stepOut(node));
</script>

<section data-overlay={overlay} transition:fade|global={{ duration: overlay ? 250 : 0 }}>
	{#key noticeAccepted}
		<div in:cardIn|global out:cardOut|global>
		<h1>MiDriveManager</h1>
		{#if !noticeAccepted}
			<h2>ご利用にあたっての注意</h2>
			{#each NOTICE_PARAGRAPHS as paragraph, index (index)}
				<p>{paragraph}</p>
			{/each}
			<div>
				<Button onclick={onacceptnotice}>わかった</Button>
			</div>
		{:else}
			<p>
				Misskeyドライブを整理するためのツールです。
				利用するサーバーのホスト名を入力して、アカウントを認証してください。
			</p>
			<form onsubmit={handleSubmit}>
			<TextField
				label="サーバーのホスト名"
				bind:value={host}
				placeholder="misskey.io"
				error={inputError}
			/>
			{#if error !== null}
				<p role="alert">{error}</p>
			{/if}
			<div>
				{#if busy}
					<Spinner />
					<span>認証結果を確認しています</span>
				{:else}
					<Button type="submit">認証してアカウントを追加</Button>
					{#if cancellable}
						<Button variant="text" onclick={oncancel}>キャンセル</Button>
					{/if}
				{/if}
			</div>
		</form>
		{/if}
		</div>
	{/key}
</section>

<style>
	section {
		display: grid;
		flex: 1;
		grid-template-columns: 100%;
		place-items: center;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 20px;
	}

	/* 2回目以降のアカウント追加はメイン画面の上に半透明+ブラーの背景で重ねる */
	section[data-overlay='true'] {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 100;
		background-color: var(--color-scrim);
		-webkit-backdrop-filter: blur(4px);
		backdrop-filter: blur(4px);
	}

	/* ステップ切替中は新旧のカードを同じ場所に重ねる */
	section > div {
		grid-area: 1 / 1;
		border: 1px solid var(--color-outline-weak);
		border-radius: 10px;
		padding: 30px;
		max-width: 420px;
		inline-size: 100%;
		background-color: var(--color-surface);
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	h2 {
		margin: 20px 0;
		margin-bottom: 10px;
		font-size: 1rem;
	}

	section > div > p {
		margin: 15px 0;
		margin-bottom: 25px;
		color: var(--color-text-muted);
	}

	section > div > h2 ~ p {
		margin: 0;
		margin-bottom: 15px;
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--color-text);
	}

	section > div > div {
		display: flex;
		justify-content: flex-end;
		margin-top: 25px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	form > p[role='alert'] {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-danger);
	}

	form > div {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	/* スマートフォン: カードの余白を詰め、ボタンは縦に並べて全幅にする(横並びだとカードからはみ出すため) */
	@media (max-width: 640px) {
		section > div {
			padding: 20px;
		}

		form > div {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
