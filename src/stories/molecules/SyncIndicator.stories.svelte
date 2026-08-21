<script module lang="ts">
	import SyncIndicator from '$components/molecules/SyncIndicator.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/SyncIndicator',
		component: SyncIndicator,
	});
</script>

<Story name="同期中" args={{ status: 'syncing', count: 1250, onretry: () => {} }} />

<Story name="エラー" args={{ status: 'error', count: 0, onretry: () => {} }} />

<Story name="非表示(idle)" args={{ status: 'idle', count: 0, onretry: () => {} }} />
