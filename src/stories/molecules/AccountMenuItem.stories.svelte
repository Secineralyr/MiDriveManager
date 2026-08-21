<script module lang="ts">
	import AccountMenuItem from '$components/molecules/AccountMenuItem.svelte';
	import type { AccountRecord } from '../../lib/db/schema';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const account: AccountRecord = {
		id: 'misskey.example:u1',
		host: 'misskey.example',
		token: 'token',
		userId: 'u1',
		username: 'alice',
		name: 'アリス',
		avatarUrl: '/pwa-192x192.png',
		createdAt: '2026-08-21T00:00:00.000Z',
		lastSyncedAt: null,
	};

	const { Story } = defineMeta({
		title: 'molecules/AccountMenuItem',
		component: AccountMenuItem,
	});
</script>

<Story name="アクティブ" args={{ account, active: true, onselect: () => {} }} />

<Story name="非アクティブ" args={{ account, active: false, onselect: () => {} }} />
