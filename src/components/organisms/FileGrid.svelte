<script lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import FileGridCard from '$components/molecules/FileGridCard.svelte';
	import type { SelectModifiers } from '../../lib/stores/selection.svelte';
	import { makeSelectionKey } from '../../lib/stores/selection.svelte';

	type Props = {
		/** 表示するフォルダ一覧(並び替え済み) */
		folders: FolderRecord[];
		/** 表示するファイル一覧(並び替え済み) */
		files: FileRecord[];
		/** 選択中の選択キー一覧 */
		selectedKeys: string[];
		/** 項目が選択された時の処理 */
		onselectitem: (kind: 'file' | 'folder', id: string, modifiers: SelectModifiers) => void;
		/** フォルダを開く操作 */
		onopenfolder: (folderId: string) => void;
		/** ファイルのプレビューを開く操作 */
		onpreviewfile: (file: FileRecord) => void;
	};

	let { folders, files, selectedKeys, onselectitem, onopenfolder, onpreviewfile }: Props =
		$props();
</script>

{#if folders.length === 0 && files.length === 0}
	<p>このフォルダは空です</p>
{:else}
	<ul>
		{#each folders as folder (folder.id)}
			<li>
				<FileGridCard
					folder
					name={folder.name}
					selected={selectedKeys.includes(makeSelectionKey('folder', folder.id))}
					onselect={(modifiers) => {
						onselectitem('folder', folder.id, modifiers);
					}}
					onopen={() => {
						onopenfolder(folder.id);
					}}
				/>
			</li>
		{/each}
		{#each files as file (file.id)}
			<li>
				<FileGridCard
					name={file.name}
					mimeType={file.type}
					thumbnailUrl={file.thumbnailUrl}
					selected={selectedKeys.includes(makeSelectionKey('file', file.id))}
					onselect={(modifiers) => {
						onselectitem('file', file.id, modifiers);
					}}
					onopen={() => {
						onpreviewfile(file);
					}}
				/>
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		display: grid;
		margin: 0;
		padding: 0;
		gap: 15px;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		list-style: none;
	}

	li {
		display: flex;
	}

	p {
		margin: 20px 0;
		text-align: center;
		color: var(--color-text-faint);
	}
</style>
