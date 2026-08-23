<script lang="ts">
	import Breadcrumbs from '$components/molecules/Breadcrumbs.svelte';
	import type { FolderRecord } from '../../lib/db/schema';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconFolderPlus from '@tabler/icons-svelte/icons/folder-plus';
	import IconLayoutGrid from '@tabler/icons-svelte/icons/layout-grid';
	import IconList from '@tabler/icons-svelte/icons/list';
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
	};

	let { breadcrumb, viewMode, onnavigate, onviewmode, oncreatefolder }: Props = $props();

	const breadcrumbItems = $derived([
		{ id: null, name: 'ルート' },
		...breadcrumb.map((folder) => ({ id: folder.id, name: folder.name })),
	]);
</script>

<div>
	<Breadcrumbs items={breadcrumbItems} {onnavigate} />
	<div>
		<IconButton label="新しいフォルダ" onclick={oncreatefolder}>
			<IconFolderPlus size={18} />
		</IconButton>
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
</style>
