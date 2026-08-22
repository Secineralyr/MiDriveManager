<script lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import type { SortKey, SortOrder } from '../../lib/utils/drive-sort';
	import FileListRow from '$components/molecules/FileListRow.svelte';
	import IconArrowDown from '@tabler/icons-svelte/icons/arrow-down';
	import IconArrowUp from '@tabler/icons-svelte/icons/arrow-up';
	import type { SelectModifiers } from '../../lib/stores/selection.svelte';
	import { makeSelectionKey } from '../../lib/stores/selection.svelte';

	type Props = {
		/** 表示するフォルダ一覧(並び替え済み) */
		folders: FolderRecord[];
		/** 表示するファイル一覧(並び替え済み) */
		files: FileRecord[];
		/** 並び替えの基準 */
		sortKey: SortKey;
		/** 並び替えの方向 */
		sortOrder: SortOrder;
		/** 選択中の選択キー一覧 */
		selectedKeys: string[];
		/** 並び替え変更時の処理 */
		onsort: (key: SortKey) => void;
		/** 項目が選択された時の処理 */
		onselectitem: (kind: 'file' | 'folder', id: string, modifiers: SelectModifiers) => void;
		/** フォルダを開く操作 */
		onopenfolder: (folderId: string) => void;
		/** ファイルのプレビューを開く操作 */
		onpreviewfile: (file: FileRecord) => void;
	};

	let {
		folders,
		files,
		sortKey,
		sortOrder,
		selectedKeys,
		onsort,
		onselectitem,
		onopenfolder,
		onpreviewfile,
	}: Props = $props();

	const COLUMNS: { key: SortKey; label: string }[] = [
		{ key: 'name', label: '名前' },
		{ key: 'createdAt', label: '追加日' },
		{ key: 'size', label: 'ファイルサイズ' },
	];
</script>

<table>
	<thead>
		<tr>
			{#each COLUMNS as column (column.key)}
				<th scope="col">
					<button
						type="button"
						onclick={() => {
							onsort(column.key);
						}}
					>
						{column.label}
						{#if column.key === sortKey}
							{#if sortOrder === 'asc'}
								<IconArrowUp size={16} />
							{:else}
								<IconArrowDown size={16} />
							{/if}
						{/if}
					</button>
				</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each folders as folder (folder.id)}
			<FileListRow
				folder
				name={folder.name}
				createdAt={folder.createdAt}
				size={null}
				selected={selectedKeys.includes(makeSelectionKey('folder', folder.id))}
				onselect={(modifiers) => {
					onselectitem('folder', folder.id, modifiers);
				}}
				onopen={() => {
					onopenfolder(folder.id);
				}}
			/>
		{/each}
		{#each files as file (file.id)}
			<FileListRow
				name={file.name}
				createdAt={file.createdAt}
				size={file.size}
				mimeType={file.type}
				selected={selectedKeys.includes(makeSelectionKey('file', file.id))}
				onselect={(modifiers) => {
					onselectitem('file', file.id, modifiers);
				}}
				onopen={() => {
					onpreviewfile(file);
				}}
			/>
		{/each}
		{#if folders.length === 0 && files.length === 0}
			<tr>
				<td colspan="3">このフォルダは空です</td>
			</tr>
		{/if}
	</tbody>
</table>

<style>
	table {
		border-collapse: collapse;
		inline-size: 100%;
		table-layout: fixed;
	}

	th {
		border-bottom: 1px solid var(--color-outline);
		padding: 5px 10px;
		text-align: left;
	}

	th:nth-child(2) {
		inline-size: 180px;
	}

	th:nth-child(3) {
		inline-size: 140px;
	}

	th > button {
		display: inline-flex;
		align-items: center;
		padding: 5px 0;
		border: 0;
		gap: 5px;
		background-color: transparent;
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: color 250ms ease;
	}

	th > button:hover {
		color: var(--color-text);
	}

	th > button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	td {
		padding: 20px 10px;
		text-align: center;
		color: var(--color-text-faint);
	}
</style>
