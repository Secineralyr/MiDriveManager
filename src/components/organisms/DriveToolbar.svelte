<script lang="ts">
	import Breadcrumbs from '$components/molecules/Breadcrumbs.svelte';
	import type { FolderRecord } from '../../lib/db/schema';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconFolderPlus from '@tabler/icons-svelte/icons/folder-plus';
	import IconLayoutGrid from '@tabler/icons-svelte/icons/layout-grid';
	import IconList from '@tabler/icons-svelte/icons/list';
	import IconUpload from '@tabler/icons-svelte/icons/upload';
	import IconX from '@tabler/icons-svelte/icons/x';
	import type { ViewMode } from '../../lib/db/settings';

	type Props = {
		/** ルートから表示中フォルダまでの経路 */
		breadcrumb: FolderRecord[];
		/** 表示モード */
		viewMode: ViewMode;
		/** フォルダ移動時の処理 */
		onnavigate: (folderId: string | null) => void;
		/** 表示モード変更時の処理 */
		onviewmode: (mode: ViewMode) => void;
		/** フォルダ作成開始時の処理 */
		oncreatefolder: () => void;
		/** ファイル選択ダイアログでファイルが選ばれた時の処理 */
		onuploadfiles: (files: File[]) => void;
		/** 検索中の検索語(検索していない時はnull。検索中はパンくずの代わりに結果の見出しを出す) */
		searchQuery?: string | null;
		/** 検索結果の件数 */
		resultCount?: number;
		/** 検索解除時の処理 */
		onclearsearch?: () => void;
	};

	let {
		breadcrumb,
		viewMode,
		onnavigate,
		onviewmode,
		oncreatefolder,
		onuploadfiles,
		searchQuery = null,
		resultCount = 0,
		onclearsearch,
	}: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);

	/** ファイル選択ダイアログを開く */
	const openFilePicker = () => {
		fileInput?.click();
	};

	/** 選ばれたファイルを通知し、同じファイルを再度選べるよう入力を空に戻す */
	const handleFilesChosen = () => {
		if (fileInput === null || fileInput.files === null) {
			return;
		}

		const files = [...fileInput.files];
		fileInput.value = '';
		if (files.length > 0) {
			onuploadfiles(files);
		}
	};

	const breadcrumbItems = $derived([
		{ id: null, name: 'ルート' },
		...breadcrumb.map((folder) => ({ id: folder.id, name: folder.name })),
	]);
</script>

<div data-tour="toolbar">
	{#if searchQuery === null}
		<Breadcrumbs items={breadcrumbItems} {onnavigate} />
	{:else}
		<p>
			<span>「{searchQuery}」の検索結果: {resultCount}件</span>
			<IconButton label="検索を解除" onclick={onclearsearch}>
				<IconX size={16} />
			</IconButton>
		</p>
	{/if}
	<div>
		<input type="file" multiple hidden bind:this={fileInput} onchange={handleFilesChosen} />
		{#if searchQuery === null}
			<IconButton label="アップロード" onclick={openFilePicker}>
				<IconUpload size={18} />
			</IconButton>
			<IconButton label="新しいフォルダ" onclick={oncreatefolder}>
				<IconFolderPlus size={18} />
			</IconButton>
		{/if}
		<IconButton
			label="リスト表示"
			active={viewMode === 'list'}
			onclick={() => {
				onviewmode('list');
			}}
		>
			<IconList size={18} />
		</IconButton>
		<IconButton
			label="グリッド表示"
			active={viewMode === 'grid'}
			onclick={() => {
				onviewmode('grid');
			}}
		>
			<IconLayoutGrid size={18} />
		</IconButton>
	</div>
</div>

<style>
	div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	div > div {
		display: flex;
		gap: 5px;
	}

	p {
		display: flex;
		align-items: center;
		margin: 0;
		gap: 5px;
		font-size: 1.15rem;
		font-weight: 700;
		min-width: 0;
	}

	p > span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
