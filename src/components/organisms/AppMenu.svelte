<script lang="ts">
	import AboutDialog from '$components/molecules/AboutDialog.svelte';
	import ActionSheet from '$components/molecules/ActionSheet.svelte';
	import ConfirmDialog from '$components/molecules/ConfirmDialog.svelte';
	import ContextMenu from '$components/molecules/ContextMenu.svelte';
	import IconDeviceDesktop from '@tabler/icons-svelte/icons/device-desktop';
	import IconHelp from '@tabler/icons-svelte/icons/help';
	import IconInfoCircle from '@tabler/icons-svelte/icons/info-circle';
	import IconMoon from '@tabler/icons-svelte/icons/moon';
	import IconRefresh from '@tabler/icons-svelte/icons/refresh';
	import IconSun from '@tabler/icons-svelte/icons/sun';
	import type { ThemeMode } from '../../lib/db/settings';
	import { themeStore } from '../../lib/stores/theme.svelte';

	type Props = {
		/** メニューの表示位置(閉じている時はnull) */
		position: {
			/** 表示位置のx座標(ビューポート基準) */
			x: number;
			/** 表示位置のy座標(ビューポート基準) */
			y: number;
		} | null;
		/** メニューを開くきっかけの要素(ポップアップのトグル判定に使う) */
		anchor?: HTMLElement | null;
		/** スマートフォン表示かどうか(メニューを下から出るシートにする) */
		phone?: boolean;
		/** メニューを閉じる操作 */
		onclose: () => void;
		/** チュートリアル(使い方)の表示要求時の処理 */
		onshowtutorial: () => void;
		/** 再同期の確定時の処理 */
		onresync: () => void;
	};

	let { position, anchor = null, phone = false, onclose, onshowtutorial, onresync }: Props = $props();

	let aboutOpen = $state(false);

	let resyncConfirmOpen = $state(false);

	const THEME_ITEMS: { id: `theme-${ThemeMode}`; mode: ThemeMode; label: string; icon: typeof IconSun }[] = [
		{ id: 'theme-system', mode: 'system', label: 'テーマ: システム', icon: IconDeviceDesktop },
		{ id: 'theme-dark', mode: 'dark', label: 'テーマ: ダーク', icon: IconMoon },
		{ id: 'theme-light', mode: 'light', label: 'テーマ: ライト', icon: IconSun },
	];

	const menuItems = $derived([
		{ id: 'resync', label: '今すぐ再同期', icon: IconRefresh },
		{ id: 'tutorial', label: '使い方を見る', icon: IconHelp },
		...THEME_ITEMS.map((item) => ({
			id: item.id,
			label: item.label,
			icon: item.icon,
			checked: themeStore.mode === item.mode,
		})),
		{ id: 'about', label: 'このアプリについて', icon: IconInfoCircle },
	]);

	const MENU_ACTIONS: Record<string, () => void> = {
		resync: () => {
			resyncConfirmOpen = true;
		},
		tutorial: () => {
			onshowtutorial();
		},
		about: () => {
			aboutOpen = true;
		},
	};

	/**
	 * メニューの項目を実行する
	 * @param id - 選ばれた項目の識別子
	 */
	const handleSelect = (id: string) => {
		const action = MENU_ACTIONS[id];
		if (action !== undefined) {
			action();
			return;
		}

		const theme = THEME_ITEMS.find((item) => item.id === id);
		if (theme !== undefined) {
			const _ = themeStore.set(theme.mode);
		}
	};
</script>

{#if phone}
	<ActionSheet
		open={position !== null}
		title="メニュー"
		items={menuItems}
		onselect={handleSelect}
		{onclose}
	/>
{:else}
	<ContextMenu
		open={position !== null}
		x={position?.x ?? 0}
		y={position?.y ?? 0}
		items={menuItems}
		{anchor}
		onselect={handleSelect}
		{onclose}
	/>
{/if}

<AboutDialog
	open={aboutOpen}
	onclose={() => {
		aboutOpen = false;
	}}
/>

<ConfirmDialog
	open={resyncConfirmOpen}
	title="今すぐ再同期"
	message="今すぐ再同期しますか?ドライブ上にあるすべての項目を再同期するため、時間がかかる場合があります。"
	confirmLabel="再同期"
	onconfirm={() => {
		resyncConfirmOpen = false;
		onresync();
	}}
	oncancel={() => {
		resyncConfirmOpen = false;
	}}
/>
