<script module lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';

	/** 詳細パネルの表示対象 */
	export type DetailTarget =
		| {
				/** 対象の種別 */
				kind: 'file';
				/** 対象のファイル */
				file: FileRecord;
		  }
		| {
				/** 対象の種別 */
				kind: 'folder';
				/** 対象のフォルダ */
				folder: FolderRecord;
		  };
</script>

<script lang="ts">
	import { formatDateTime, formatFileSize } from '../../lib/utils/format';
	import Button from '$components/atoms/Button.svelte';
	import Checkbox from '$components/atoms/Checkbox.svelte';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconPencil from '@tabler/icons-svelte/icons/pencil';
	import IconX from '@tabler/icons-svelte/icons/x';
	import TextArea from '$components/atoms/TextArea.svelte';

	type Props = {
		/** 表示対象(選択なしならnull) */
		target: DetailTarget | null;
		/** 選択中の件数 */
		selectionCount: number;
		/** 選択中ファイルの合計サイズ */
		selectionSize: number;
		/** 操作の実行中かどうか */
		actionBusy?: boolean;
		/** パネルを閉じる操作 */
		onclose: () => void;
		/** ファイルのプレビューを開く操作 */
		onpreview: (file: FileRecord) => void;
		/** 名前の変更を開始する操作 */
		onrename: () => void;
		/** メタデータ保存時の処理 */
		onsavemetadata: (metadata: {
			/** コメント(代替テキスト)。空欄はnull */
			comment: string | null;
			/** センシティブフラグ */
			isSensitive: boolean;
		}) => void;
	};

	let {
		target,
		selectionCount,
		selectionSize,
		actionBusy = false,
		onclose,
		onpreview,
		onrename,
		onsavemetadata,
	}: Props = $props();

	let commentDraft = $state('');
	let sensitiveDraft = $state(false);

	$effect(() => {
		if (target?.kind === 'file') {
			commentDraft = target.file.comment ?? '';
			sensitiveDraft = target.file.isSensitive;
		}
	});

	const normalizedComment = $derived.by(() => {
		const trimmed = commentDraft.trim();
		return trimmed === '' ? null : trimmed;
	});

	const metadataDirty = $derived.by(() => {
		if (target?.kind !== 'file') {
			return false;
		}

		return (
			normalizedComment !== target.file.comment ||
			sensitiveDraft !== target.file.isSensitive
		);
	});

	/** 編集中のメタデータを保存する */
	const handleSave = () => {
		onsavemetadata({ comment: normalizedComment, isSensitive: sensitiveDraft });
	};
</script>

<section aria-label="詳細">
	<header>
		<h2>詳細</h2>
		<IconButton label="詳細を閉じる" onclick={onclose}>
			<IconX size={18} />
		</IconButton>
	</header>
	{#if selectionCount > 1}
		<p>{selectionCount}件選択中</p>
		<dl>
			<dt>合計サイズ(ファイルのみ)</dt>
			<dd>{formatFileSize(selectionSize)}</dd>
		</dl>
	{:else if target?.kind === 'file'}
		{#if target.file.thumbnailUrl !== null}
			<button
				type="button"
				aria-label="プレビューを開く"
				onclick={() => {
					if (target?.kind === 'file') {
						onpreview(target.file);
					}
				}}
			>
				<img src={target.file.thumbnailUrl} alt={target.file.name} />
			</button>
		{:else}
			<span>
				<FileTypeIcon mimeType={target.file.type} size={40} />
			</span>
		{/if}
		<div>
			<h3>{target.file.name}</h3>
			<IconButton label="名前を変更" onclick={onrename}>
				<IconPencil size={16} />
			</IconButton>
		</div>
		<dl>
			<dt>種類</dt>
			<dd>{target.file.type}</dd>
			<dt>サイズ</dt>
			<dd>{formatFileSize(target.file.size)}</dd>
			<dt>追加日</dt>
			<dd>{formatDateTime(target.file.createdAt)}</dd>
			<dt>URL</dt>
			<dd><a href={target.file.url} target="_blank" rel="noopener noreferrer">開く</a></dd>
		</dl>
		<TextArea label="コメント(代替テキスト)" bind:value={commentDraft} />
		<Checkbox label="センシティブ" bind:checked={sensitiveDraft} />
		<Button variant="tonal" disabled={actionBusy || !metadataDirty} onclick={handleSave}>
			メタデータを保存
		</Button>
	{:else if target?.kind === 'folder'}
		<span>
			<FileTypeIcon folder size={40} />
		</span>
		<div>
			<h3>{target.folder.name}</h3>
			<IconButton label="名前を変更" onclick={onrename}>
				<IconPencil size={16} />
			</IconButton>
		</div>
		<dl>
			<dt>種類</dt>
			<dd>フォルダ</dd>
			<dt>追加日</dt>
			<dd>{formatDateTime(target.folder.createdAt)}</dd>
		</dl>
	{:else}
		<p>項目を選択すると詳細が表示されます</p>
	{/if}
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--color-outline-weak);
		padding: 15px;
		gap: 10px;
		min-width: 280px;
		max-width: 280px;
		overflow-y: auto;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 5px;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		overflow-wrap: anywhere;
	}

	button {
		padding: 0;
		border: 0;
		border-radius: 10px;
		overflow: hidden;
		background-color: transparent;
		cursor: zoom-in;
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	img {
		display: block;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		inline-size: 100%;
	}

	span {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		padding: 30px;
		background-color: var(--color-surface);
		color: var(--color-text-muted);
	}

	p {
		margin: 0;
		color: var(--color-text-muted);
	}

	dl {
		display: grid;
		margin: 0;
		gap: 5px;
		grid-template-columns: auto 1fr;
	}

	dt {
		font-size: 0.85rem;
		color: var(--color-text-faint);
	}

	dd {
		margin: 0;
		font-size: 0.85rem;
		overflow-wrap: anywhere;
		color: var(--color-text);
	}

	a {
		color: var(--color-text);
	}
</style>
