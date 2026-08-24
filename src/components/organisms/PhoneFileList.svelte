<script lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import PhoneFileItem from '$components/molecules/PhoneFileItem.svelte';
	import { makeSelectionKey } from '../../lib/stores/selection.svelte';

	type Props = {
		/** 表示するフォルダ一覧(並び替え済み) */
		folders: FolderRecord[];
		/** 表示するファイル一覧(並び替え済み) */
		files: FileRecord[];
		/** 選択中の選択キー一覧 */
		selectedKeys: string[];
		/** 選択モード中かどうか */
		selectMode: boolean;
		/** 選択モード中のタップで選択を切り替える操作 */
		onselecttoggle: (kind: 'file' | 'folder', id: string) => void;
		/** フォルダを開く操作 */
		onopenfolder: (folderId: string) => void;
		/** ファイルのプレビューを開く操作 */
		onpreviewfile: (file: FileRecord) => void;
		/** 長押しでアクションシートを開く操作 */
		onopenmenu?: (kind: 'file' | 'folder', id: string, position: { x: number; y: number }) => void;
		/** 項目がない時の文言 */
		emptyMessage?: string;
	};

	let {
		folders,
		files,
		selectedKeys,
		selectMode,
		onselecttoggle,
		onopenfolder,
		onpreviewfile,
		onopenmenu,
		emptyMessage = 'このフォルダは空です',
	}: Props = $props();
</script>

{#if folders.length === 0 && files.length === 0}
	<p>{emptyMessage}</p>
{:else}
	<ul>
		{#each folders as folder (folder.id)}
			<PhoneFileItem
				folder
				name={folder.name}
				createdAt={folder.createdAt}
				size={null}
				selected={selectedKeys.includes(makeSelectionKey('folder', folder.id))}
				{selectMode}
				onopen={() => {
					onopenfolder(folder.id);
				}}
				onselecttoggle={() => {
					onselecttoggle('folder', folder.id);
				}}
				onopenmenu={(position) => {
					onopenmenu?.('folder', folder.id, position);
				}}
			/>
		{/each}
		{#each files as file (file.id)}
			<PhoneFileItem
				name={file.name}
				createdAt={file.createdAt}
				size={file.size}
				mimeType={file.type}
				thumbnailUrl={file.thumbnailUrl}
				selected={selectedKeys.includes(makeSelectionKey('file', file.id))}
				{selectMode}
				onopen={() => {
					onpreviewfile(file);
				}}
				onselecttoggle={() => {
					onselecttoggle('file', file.id);
				}}
				onopenmenu={(position) => {
					onopenmenu?.('file', file.id, position);
				}}
			/>
		{/each}
	</ul>
{/if}

<style>
	ul {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	p {
		margin: 20px 0;
		text-align: center;
		color: var(--color-text-faint);
	}
</style>
