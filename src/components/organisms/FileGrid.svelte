<script lang="ts">
	import type { FileRecord, FolderRecord } from '../../lib/db/schema';
	import FileGridCard from '$components/molecules/FileGridCard.svelte';

	type Props = {
		/** 表示するフォルダ一覧(並び替え済み) */
		folders: FolderRecord[];
		/** 表示するファイル一覧(並び替え済み) */
		files: FileRecord[];
		/** フォルダを開く操作 */
		onopenfolder: (folderId: string) => void;
	};

	let { folders, files, onopenfolder }: Props = $props();
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
					onopen={() => {
						onopenfolder(folder.id);
					}}
				/>
			</li>
		{/each}
		{#each files as file (file.id)}
			<li>
				<FileGridCard name={file.name} mimeType={file.type} thumbnailUrl={file.thumbnailUrl} />
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
