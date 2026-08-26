<script lang="ts">
	import Breadcrumbs from '$components/molecules/Breadcrumbs.svelte';
	import Button from '$components/atoms/Button.svelte';
	import type { FolderRecord } from '../../lib/db/schema';
	import IconArrowsSort from '@tabler/icons-svelte/icons/arrows-sort';
	import IconButton from '$components/atoms/IconButton.svelte';
	import IconFolderPlus from '@tabler/icons-svelte/icons/folder-plus';
	import IconInfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import IconLayoutSidebar from '@tabler/icons-svelte/icons/layout-sidebar';
	import IconUpload from '@tabler/icons-svelte/icons/upload';
	import IconX from '@tabler/icons-svelte/icons/x';
	import type { ViewMode } from '../../lib/db/settings';
	import ViewModeSwitch from '$components/molecules/ViewModeSwitch.svelte';

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
		/** パンくずのフォルダへの項目ドロップ時の処理 */
		ondropitems?: (folderId: string | null) => void;
		/** パンくずのフォルダへのOSファイルドロップ時の処理 */
		ondropfiles?: (folderId: string | null, transfer: DataTransfer) => void;
		/** フォルダツリーの開閉(狭い画面のドロワー用。ボタンは狭い画面でのみ表示) */
		ontoggletree?: () => void;
		/** 選択モード中かどうか(スマートフォン用) */
		selectMode?: boolean;
		/** 選択モードの開始・終了(スマートフォン用。ボタンはスマートフォンでのみ表示) */
		ontoggleselect?: () => void;
		/** 並び替えシートを開く操作(スマートフォン用。ボタンはスマートフォンでのみ表示) */
		onopensort?: () => void;
		/** スマートフォン表示かどうか(パンくずの省略メニューをシートにする) */
		phone?: boolean;
		/** 詳細パネルを開いているか(デスクトップのトグルボタンの状態表示用) */
		detailsOpen?: boolean;
		/** 詳細パネルの開閉(デスクトップ用。ボタンはデスクトップでのみ表示) */
		ontoggledetails?: () => void;
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
		ondropitems,
		ondropfiles,
		ontoggletree,
		selectMode = false,
		ontoggleselect,
		onopensort,
		phone = false,
		detailsOpen = false,
		ontoggledetails,
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
	<!-- パンくず(または検索見出し)の段。スマートフォンでは選択モードの切り替えも並べ、操作ボタンの段の下に置く -->
	<div>
		{#if searchQuery === null}
			<Breadcrumbs items={breadcrumbItems} {onnavigate} {ondropitems} {ondropfiles} {phone} />
		{:else}
			<p>
				<span>「{searchQuery}」の検索結果: {resultCount}件</span>
				<IconButton label="検索を解除" onclick={onclearsearch}>
					<IconX size={16} />
				</IconButton>
			</p>
		{/if}
		<span data-select-toggle>
			<Button variant="text" onclick={ontoggleselect}>{selectMode ? '完了' : '選択'}</Button>
		</span>
	</div>
	<!-- 操作ボタンの段(デスクトップではパンくずの右隣、スマートフォンでは上段) -->
	<div>
		<span data-tree-toggle data-tour="tree-toggle">
			<IconButton label="フォルダツリーを開く" onclick={ontoggletree}>
				<IconLayoutSidebar size={18} />
			</IconButton>
		</span>
		<span>
			<input type="file" multiple hidden bind:this={fileInput} onchange={handleFilesChosen} />
			{#if searchQuery === null}
				<IconButton label="アップロード" onclick={openFilePicker}>
					<IconUpload size={18} />
				</IconButton>
				<IconButton label="新しいフォルダ" onclick={oncreatefolder}>
					<IconFolderPlus size={18} />
				</IconButton>
			{/if}
			<span data-phone-only>
				<IconButton label="並び替え" onclick={onopensort}>
					<IconArrowsSort size={18} />
				</IconButton>
			</span>
			<span data-details-toggle>
				<IconButton
					label={detailsOpen ? '詳細パネルを閉じる' : '詳細パネルを開く'}
					active={detailsOpen}
					onclick={ontoggledetails}
				>
					<IconInfoCircle size={18} />
				</IconButton>
			</span>
			<ViewModeSwitch {viewMode} onchange={onviewmode} />
		</span>
	</div>
</div>

<style>
	div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	/* パンくずの段は残り幅を使う */
	div > div:first-child {
		flex: 1;
		min-width: 0;
	}

	/* 操作ボタンの並び。ツリー開閉ボタンがない時も右寄せになるようにする */
	div > div:last-child > span:last-child {
		display: flex;
		align-items: center;
		margin-left: auto;
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

	/* ツリー開閉ボタンは狭い画面(ドロワー化した時)だけ表示する */
	span[data-tree-toggle] {
		display: none;
	}

	/* 並び替えのボタンはスマートフォンだけ、選択モードのボタンはタブレット以下で表示する */
	span[data-phone-only],
	span[data-select-toggle] {
		display: none;
	}

	/* 選択モードはタッチ端末と、スマートフォンレイアウトになる狭い画面で使う */
	@media (pointer: coarse), (max-width: 640px) {
		span[data-select-toggle] {
			display: inline-flex;
		}
	}

	/* 詳細パネルのトグルはデスクトップ(マウス操作の広い画面)でのみ表示する */
	@media (pointer: coarse), (max-width: 640px) {
		span[data-details-toggle] {
			display: none;
		}
	}

	/* スマートフォン: 上段に操作ボタン、下段にパンくず+選択の2層にする */
	@media (max-width: 640px) {
		div {
			flex-direction: column;
			align-items: stretch;
			gap: 5px;
		}

		div > div {
			flex-direction: row;
			align-items: center;
		}

		div > div:first-child {
			order: 2;
		}

		span[data-tree-toggle] {
			display: inline-flex;
		}

		span[data-phone-only] {
			display: inline-flex;
		}
	}
</style>
