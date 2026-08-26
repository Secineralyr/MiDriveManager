<script lang="ts">
	import { formatDateTime, formatFileSize } from '../../lib/utils/format';
	import CheckboxControl from '$components/atoms/CheckboxControl.svelte';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import IconChevronRight from '@tabler/icons-svelte/icons/chevron-right';
	import { longPress } from '../../lib/utils/long-press';
	import { revealInline } from '../../lib/utils/transitions';

	type Props = {
		/** フォルダの項目かどうか */
		folder?: boolean;
		/** 表示名 */
		name: string;
		/** 追加日時(ISO 8601文字列) */
		createdAt: string;
		/** ファイルサイズ(フォルダはnull) */
		size: number | null;
		/** MIMEタイプ(フォルダはnull) */
		mimeType?: string | null;
		/** サムネイル画像URL(ないものはアイコン表示) */
		thumbnailUrl?: string | null;
		/** 選択中かどうか(選択モードのチェックボックスに反映する) */
		selected?: boolean;
		/** 選択モード中かどうか */
		selectMode?: boolean;
		/** タップで開く操作(フォルダは移動、ファイルはプレビュー) */
		onopen?: () => void;
		/** 選択モード中のタップで選択を切り替える操作 */
		onselecttoggle?: () => void;
		/** 長押しでアクションシートを開く操作(表示位置を渡す) */
		onopenmenu?: (position: { x: number; y: number }) => void;
	};

	let {
		folder = false,
		name,
		createdAt,
		size,
		mimeType = null,
		thumbnailUrl = null,
		selected = false,
		selectMode = false,
		onopen,
		onselecttoggle,
		onopenmenu,
	}: Props = $props();

	/** タップは選択モード中なら選択の切り替え、通常時は開く操作にする */
	const handleClick = () => {
		if (selectMode) {
			onselecttoggle?.();
		} else {
			onopen?.();
		}
	};

	/** チェックボックスで選択を切り替える */
	const handleCheckbox = () => {
		onselecttoggle?.();
	};

	/**
	 * 長押しでアクションシートを開く
	 * @param position - 押し始めの座標
	 */
	const handleLongPress = (position: { x: number; y: number }) => {
		onopenmenu?.(position);
	};

	/**
	 * 右クリック(Androidの長押しを含む)でブラウザのメニューの代わりにアクションシートを開く
	 * @param event - マウスイベント
	 */
	const handleContextMenu = (event: MouseEvent) => {
		if (onopenmenu === undefined) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		onopenmenu({ x: event.clientX, y: event.clientY });
	};
</script>

<li>
	{#if selectMode}
		<!-- 選択モードの切り替え時はフェードしながら幅を広げ、右側の内容を横へ滑らせる -->
		<span transition:revealInline={{ gap: 5 }}>
			<CheckboxControl checked={selected} label="{name}を選択" size={18} ontoggle={handleCheckbox} />
		</span>
	{/if}
	<button
		type="button"
		onclick={handleClick}
		oncontextmenu={handleContextMenu}
		use:longPress={handleLongPress}
	>
		<span>
			{#if thumbnailUrl !== null}
				<img src={thumbnailUrl} alt="" loading="lazy" />
			{:else}
				<FileTypeIcon {folder} {mimeType} size={24} />
			{/if}
		</span>
		<span>
			<span>{name}</span>
			<span>{formatDateTime(createdAt)}{size === null ? '' : ` - ${formatFileSize(size)}`}</span>
		</span>
		{#if folder}
			<IconChevronRight size={18} />
		{/if}
	</button>
</li>

<style>
	li {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--color-outline-weak);
		gap: 5px;
	}

	li > span {
		display: flex;
		overflow: hidden;
	}


	button {
		display: flex;
		flex: 1;
		align-items: center;
		padding: 8px 0;
		border: 0;
		gap: 10px;
		background-color: transparent;
		font-family: inherit;
		text-align: left;
		color: var(--color-text);
		cursor: pointer;
		min-width: 0;
		user-select: none;
		-webkit-user-select: none;
		transition: background-color 250ms ease;
	}

	button:active {
		background-color: var(--color-surface-hover);
	}

	button:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}

	/* サムネイル(またはアイコン)の枠 */
	button > span:first-child {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 5px;
		background-color: var(--color-surface);
		inline-size: 40px;
		block-size: 40px;
		color: var(--color-text-muted);
	}

	img {
		aspect-ratio: 1 / 1;
		object-fit: cover;
		inline-size: 100%;
	}

	/* 名前とサブ情報の2行 */
	button > span:nth-child(2) {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	button > span:nth-child(2) > span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	button > span:nth-child(2) > span:first-child {
		font-size: 1rem;
	}

	button > span:nth-child(2) > span:last-child {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}
</style>
