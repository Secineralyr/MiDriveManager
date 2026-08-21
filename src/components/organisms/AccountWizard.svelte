<script lang="ts">
	import Button from '$components/atoms/Button.svelte';
	import Spinner from '$components/atoms/Spinner.svelte';
	import TextField from '$components/atoms/TextField.svelte';

	type Props = {
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

	let { cancellable, busy, error, onstart, oncancel }: Props = $props();

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
</script>

<section>
	<div>
		<h1>misskeyDriveManager</h1>
		<p>
			Misskeyのドライブを整理整頓するためのツールです。
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
	</div>
</section>

<style>
	section {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 20px;
	}

	section > div {
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

	section > div > p {
		margin: 15px 0;
		margin-bottom: 25px;
		color: var(--color-text-muted);
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
		gap: 10px;
	}
</style>
