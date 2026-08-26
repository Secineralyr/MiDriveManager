<script lang="ts">
	import { acceptDragOver, dispatchDrop } from '../../lib/utils/drop-target';
	import { formatDateTime, formatFileSize } from '../../lib/utils/format';
	import CheckboxControl from '$components/atoms/CheckboxControl.svelte';
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import type { SelectModifiers } from '../../lib/stores/selection.svelte';
	import { longPress } from '../../lib/utils/long-press';
	import { revealInline } from '../../lib/utils/transitions';

	type Props = {
		/** フォルダ行かどうか */
		folder?: boolean;
		/** 表示名 */
		name: string;
		/** 追加日時(ISO 8601文字列) */
		createdAt: string;
		/** ファイルサイズ(フォルダはnull) */
		size: number | null;
		/** MIMEタイプ(フォルダはnull) */
		mimeType?: string | null;
		/** 選択中かどうか */
		selected?: boolean;
		/** タッチ操作かどうか(タブレット。タップで開き、長押しでメニューを出す) */
		touch?: boolean;
		/** 選択モード中かどうか(タッチ操作用。タップで選択を切り替え、チェックボックスを表示する) */
		selectMode?: boolean;
		/** クリックで選択された時の処理 */
		onselect?: (modifiers: SelectModifiers) => void;
		/** ダブルクリックで開く操作 */
		onopen?: () => void;
		/** ドラッグ開始時の処理 */
		ondragstartitem?: () => void;
		/** ドラッグ終了時の処理 */
		ondragenditem?: () => void;
		/** この行(フォルダ)への項目ドロップ時の処理 */
		ondropitems?: () => void;
		/** この行(フォルダ)へのOSファイルドロップ時の処理 */
		ondropfiles?: (transfer: DataTransfer) => void;
		/** 右クリックでコンテキストメニューを開く操作(表示位置を渡す) */
		onopenmenu?: (position: { x: number; y: number }) => void;
	};

	let {
		folder = false,
		name,
		createdAt,
		size,
		mimeType = null,
		selected = false,
		touch = false,
		selectMode = false,
		onselect,
		onopen,
		ondragstartitem,
		ondragenditem,
		ondropitems,
		ondropfiles,
		onopenmenu,
	}: Props = $props();

	let dropover = $state(false);

	const showSelected = $derived(selected && (!touch || selectMode));

	const showCheckbox = $derived(!touch || selectMode);

	/**
	 * クリックを通知する
	 * タッチ操作では通常時は開く操作、選択モード中は選択の切り替えにする
	 * @param event - マウスイベント
	 */
	const handleClick = (event: MouseEvent) => {
		event.stopPropagation();
		if (!touch) {
			onselect?.({ toggle: event.ctrlKey || event.metaKey, range: event.shiftKey });
			return;
		}

		if (selectMode) {
			onselect?.({ toggle: true, range: false });
		} else {
			onopen?.();
		}
	};

	/** ダブルクリックを外部ハンドラへ伝える(タッチ操作ではタップで開くので使わない) */
	const handleDblClick = () => {
		if (!touch) {
			onopen?.();
		}
	};

	/**
	 * 長押しでメニューを開く(タッチ操作用)
	 * @param position - 押し始めの座標
	 */
	const handleLongPress = (position: { x: number; y: number }) => {
		onopenmenu?.(position);
	};

	/** チェックボックスで選択を切り替える(他の選択は保ったまま) */
	const handleCheckbox = () => {
		onselect?.({ toggle: true, range: false });
	};

	/**
	 * 右クリックでブラウザのメニューの代わりにコンテキストメニューを開く
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

	/**
	 * ドラッグ開始を通知する
	 * @param event - ドラッグイベント
	 */
	const handleDragStart = (event: DragEvent) => {
		if (event.dataTransfer !== null) {
			event.dataTransfer.setData('text/plain', name);
			event.dataTransfer.effectAllowed = 'move';
		}
		ondragstartitem?.();
	};

	/** ドラッグ終了を通知する */
	const handleDragEnd = () => {
		ondragenditem?.();
	};

	/**
	 * 受け入れられる種類のドロップなら受け入れを表明して強調する
	 * @param event - ドラッグイベント
	 */
	const handleDragOver = (event: DragEvent) => {
		dropover = acceptDragOver(event, {
			items: ondropitems !== undefined,
			files: ondropfiles !== undefined,
		});
	};

	/** ドロップ対象の強調を解除する */
	const handleDragLeave = () => {
		dropover = false;
	};

	/**
	 * ドロップされた項目またはOSファイルを受け取る
	 * @param event - ドラッグイベント
	 */
	const handleDrop = (event: DragEvent) => {
		dropover = false;
		dispatchDrop(event, { onitems: ondropitems, onfiles: ondropfiles });
	};
</script>

<tr
	draggable="true"
	onclick={handleClick}
	ondblclick={handleDblClick}
	oncontextmenu={handleContextMenu}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	use:longPress={touch ? handleLongPress : undefined}
	data-openable={onopen !== undefined}
	data-selected={showSelected}
	data-dropover={dropover}
	aria-selected={showSelected}
>
	<td>
		{#if showCheckbox}
			<span transition:revealInline={{ gap: 10 }}>
				<CheckboxControl
					checked={selected}
					label="{name}を選択"
					size={15}
					ontoggle={handleCheckbox}
				/>
			</span>
		{/if}
	</td>
	<td>
		<FileTypeIcon {folder} {mimeType} />
		<span>{name}</span>
	</td>
	<td>{formatDateTime(createdAt)}</td>
	<td>{size === null ? '' : formatFileSize(size)}</td>
</tr>

<style>
	tr {
		border-bottom: 1px solid var(--color-outline-weak);
		cursor: default;
		user-select: none;
		transition: background-color 250ms ease;
	}

	tr:hover {
		background-color: var(--color-surface-hover);
	}

	tr[data-openable='true'] {
		cursor: pointer;
	}

	tr[data-selected='true'] {
		background-color: var(--color-surface-active);
	}

	tr[data-dropover='true'] {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
		background-color: var(--color-surface-active);
	}

	td {
		overflow: hidden;
		padding: 10px;
		font-size: 1rem;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
	}

	td:first-child {
		padding: 10px 0;
	}
	
	td:first-child > span {
		display: inline-flex;
		/* 左余白はspan側で持ち、トランジションのgapで打ち消す */
		margin-left: 10px;
		vertical-align: middle;
	}

	td:nth-child(2) {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	td:nth-child(2) > span {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	td:nth-child(3),
	td:nth-child(4) {
		color: var(--color-text-muted);
	}

</style>
