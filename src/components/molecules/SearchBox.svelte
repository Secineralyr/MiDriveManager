<script lang="ts">
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconSearch from '@tabler/icons-svelte/icons/search';
	import IconX from '@tabler/icons-svelte/icons/x';

	type Props = {
		/** 検索語 */
		value: string;
		/** 入力のたびに呼ばれる処理(入力値を渡す) */
		oninput: (value: string) => void;
		/** 検索を解除する操作(クリアボタンとEscキー) */
		onclear: () => void;
	};

	let { value, oninput, onclear }: Props = $props();

	/**
	 * 入力値を通知する
	 * @param event - 入力イベント
	 */
	const handleInput = (event: Event) => {
		if (event.currentTarget instanceof HTMLInputElement) {
			oninput(event.currentTarget.value);
		}
	};

	/**
	 * Escキーで検索を解除する
	 * @param event - キーボードイベント
	 */
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && value !== '') {
			event.preventDefault();
			onclear();
		}
	};

	/**
	 * Enterでのフォーム送信を抑止する(検索はインクリメンタルに行う)
	 * @param event - フォーム送信イベント
	 */
	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
	};
</script>

<form role="search" onsubmit={handleSubmit}>
	<span aria-hidden="true">
		<IconSearch size={18} />
	</span>
	<input
		type="search"
		aria-label="ドライブを検索"
		placeholder="ドライブを検索"
		{value}
		oninput={handleInput}
		onkeydown={handleKeydown}
	/>
	{#if value !== ''}
		<IconButton label="検索を解除" onclick={onclear}>
			<IconX size={16} />
		</IconButton>
	{/if}
</form>

<style>
	form {
		display: flex;
		flex: 1;
		align-items: center;
		padding: 0 5px;
		padding-left: 12px;
		border: 1px solid var(--color-outline);
		border-radius: 9999px;
		gap: 5px;
		background-color: var(--color-surface);
		color: var(--color-text-muted);
		transition: border-color 250ms ease;
	}

	form:focus-within {
		border-color: var(--color-focus);
	}

	span {
		display: inline-flex;
	}

	input {
		flex: 1;
		padding: 8px 5px;
		border: 0;
		background-color: transparent;
		font-family: inherit;
		font-size: 0.95rem;
		color: var(--color-text);
		min-width: 0;
	}

	input:focus {
		outline: none;
	}

	input::-webkit-search-cancel-button {
		display: none;
	}
</style>
