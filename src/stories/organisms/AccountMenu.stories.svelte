<script module lang="ts">
	import AccountMenu from '$components/organisms/AccountMenu.svelte';
	import type { AccountRecord } from '../../lib/db/schema';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const primaryAccount: AccountRecord = {
		id: 'misskey.example:u1',
		host: 'misskey.example',
		token: 'token-1',
		userId: 'u1',
		username: 'alice',
		name: 'アリス',
		avatarUrl: '/pwa-192x192.png',
		createdAt: '2026-08-21T00:00:00.000Z',
		lastSyncedAt: null,
	};

	const accounts: AccountRecord[] = [
		primaryAccount,
		{
			id: 'misskey.example:u2',
			host: 'misskey.example',
			token: 'token-2',
			userId: 'u2',
			username: 'bob',
			name: 'ボブ',
			avatarUrl: null,
			createdAt: '2026-08-21T00:00:00.000Z',
			lastSyncedAt: null,
		},
	];

	const { Story } = defineMeta({
		title: 'organisms/AccountMenu',
		component: AccountMenu,
	});
</script>

<Story
	name="複数アカウント"
	args={{
		accounts,
		active: primaryAccount,
		onswitch: () => {},
		onadd: () => {},
		onremove: () => {},
	}}
/>
