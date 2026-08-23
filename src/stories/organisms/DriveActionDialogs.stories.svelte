<script module lang="ts">
	import type { AccountRecord } from '../../lib/db/schema';
	import DriveActionDialogs from '$components/organisms/DriveActionDialogs.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	/** ストーリー用のアカウント */
	const account: AccountRecord = {
		id: 'misskey.example:u1',
		host: 'misskey.example',
		token: 'token-1',
		userId: 'u1',
		username: 'alice',
		name: 'アリス',
		avatarUrl: null,
		createdAt: '2026-08-21T00:00:00.000Z',
		lastSyncedAt: null,
	};

	const { Story } = defineMeta({
		title: 'organisms/DriveActionDialogs',
		component: DriveActionDialogs,
	});
</script>

<Story
	name="フォルダ作成"
	args={{
		account,
		createOpen: true,
		renameOpen: false,
		deleteOpen: false,
		renameItem: null,
		renameInitial: '',
		deleteTargets: [],
	}}
/>

<Story
	name="名前の変更"
	args={{
		account,
		createOpen: false,
		renameOpen: true,
		deleteOpen: false,
		renameItem: { kind: 'file', id: 'f1' },
		renameInitial: 'がぞー.jpg',
		deleteTargets: [],
	}}
/>

<Story
	name="削除確認"
	args={{
		account,
		createOpen: false,
		renameOpen: false,
		deleteOpen: true,
		renameItem: null,
		renameInitial: '',
		deleteTargets: [
			{ kind: 'file', id: 'f1' },
			{ kind: 'file', id: 'f2' },
			{ kind: 'folder', id: 'd1' },
		],
	}}
/>
