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
		/** タッチ操作かどうか(スマートフォン・タブレット。タップで開き、長押しでメニューを出す) */
		touch?: boolean;
		/** 選択モード中かどうか(タッチ操作用) */
		selectMode?: boolean;
		/** ドラッグでの移動を受け付けるかどうか(スマートフォンでは無効にする) */
		dragEnabled?: boolean;
		/** 項目が選択された時の処理 */
		onselectitem: (kind: 'file' | 'folder', id: string, modifiers: SelectModifiers) => void;
		/** フォルダを開く操作 */
		onopenfolder: (folderId: string) => void;
		/** ファイルのプレビューを開く操作 */
		onpreviewfile: (file: FileRecord) => void;
		/** 項目のドラッグ開始時の処理 */
		ondragstartitem?: (kind: 'file' | 'folder', id: string) => void;
		/** 項目のドラッグ終了時の処理 */
		ondragenditem?: () => void;
		/** フォルダへの項目ドロップ時の処理 */
		ondropinfolder?: (folderId: string) => void;
		/** フォルダへのOSファイルドロップ時の処理 */
		ondropfilesinfolder?: (folderId: string, transfer: DataTransfer) => void;
		/** 項目の右クリックでコンテキストメニューを開く操作 */
		onopenmenu?: (kind: 'file' | 'folder', id: string, position: { x: number; y: number }) => void;
		/** 項目がない時の文言 */
		emptyMessage?: string;
		/** 余白(項目以外)のクリック時の処理 */
		onbackgroundclick?: () => void;
	};

	let {
		folders,
		files,
		selectedKeys,
		touch = false,
		selectMode = false,
		dragEnabled = true,
		onselectitem,
		onopenfolder,
		onpreviewfile,
		ondragstartitem,
		ondragenditem,
		ondropinfolder,
		ondropfilesinfolder,
		onopenmenu,
		emptyMessage = 'このフォルダは空です',
		onbackgroundclick,
	}: Props = $props();

	/**
	 * カードの隙間のクリックで余白クリックとして通知する
	 * @param event - マウスイベント
	 */
	const handleBackgroundClick = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			onbackgroundclick?.();
		}
	};

	/**
	 * フォルダカードへのドロップ処理を作る
	 * @param folderId - 対象のフォルダID
	 * @returns ドロップ処理。受け付けない場合はundefined
	 */
	const dropHandlerFor = (folderId: string) => {
		const handler = ondropinfolder;
		if (handler === undefined) {
			return handler;
		}

		return () => {
			handler(folderId);
		};
	};

	/**
	 * フォルダカードへのOSファイルドロップ処理を作る
	 * @param folderId - 対象のフォルダID
	 * @returns ドロップ処理。受け付けない場合はundefined
	 */
	const dropFilesHandlerFor = (folderId: string) => {
		const handler = ondropfilesinfolder;
		if (handler === undefined) {
			return handler;
		}

		return (transfer: DataTransfer) => {
			handler(folderId, transfer);
		};
	};
</script>

{#if folders.length === 0 && files.length === 0}
	<p>{emptyMessage}</p>
{:else}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -- 余白クリックでの選択解除は補助操作(Escキーでも解除できる) -->
	<ul onclick={handleBackgroundClick}>
		{#each folders as folder (folder.id)}
			<li>
				<FileGridCard
					folder
					name={folder.name}
					selected={selectedKeys.includes(makeSelectionKey('folder', folder.id))}
					{touch}
					{selectMode}
					{dragEnabled}
					onselect={(modifiers) => {
						onselectitem('folder', folder.id, modifiers);
					}}
					onopen={() => {
						onopenfolder(folder.id);
					}}
					ondragstartitem={() => {
						ondragstartitem?.('folder', folder.id);
					}}
					{ondragenditem}
					ondropitems={dropHandlerFor(folder.id)}
					ondropfiles={dropFilesHandlerFor(folder.id)}
					onopenmenu={(position) => {
						onopenmenu?.('folder', folder.id, position);
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
					{touch}
					{selectMode}
					{dragEnabled}
					onselect={(modifiers) => {
						onselectitem('file', file.id, modifiers);
					}}
					onopen={() => {
						onpreviewfile(file);
					}}
					ondragstartitem={() => {
						ondragstartitem?.('file', file.id);
					}}
					{ondragenditem}
					onopenmenu={(position) => {
						onopenmenu?.('file', file.id, position);
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
		/* カードは固定幅にする(可変幅だと詳細パネルの開閉やそのアニメーション中に全カードがリサイズされてしまう) */
		grid-template-columns: repeat(auto-fill, 160px);
		list-style: none;
	}

	li {
		display: flex;
		/* 長い名前のカードが固定幅の列からはみ出さないようにする */
		min-width: 0;
	}

	p {
		margin: 20px 0;
		text-align: center;
		color: var(--color-text-faint);
	}
</style>
