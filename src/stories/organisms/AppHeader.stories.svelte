<script module lang="ts">
	import type { AccountRecord } from '../../lib/db/schema';
	import AppHeader from '$components/organisms/AppHeader.svelte';
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

	const { Story } = defineMeta({
		title: 'organisms/AppHeader',
		component: AppHeader,
	});
</script>

<Story
	name="標準"
	args={{
		accounts: [primaryAccount],
		active: primaryAccount,
		onswitch: () => {},
		onadd: () => {},
		onremove: () => {},
	}}
/>
