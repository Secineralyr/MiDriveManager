<script module lang="ts">
	import Breadcrumbs from '$components/molecules/Breadcrumbs.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const longItems = [
		{ id: null, name: 'ルート' },
		{ id: 'f1', name: 'いろいろふぉるだ' },
		{ id: 'f2', name: '2024年の写真' },
		{ id: 'f3', name: '旅行' },
		{ id: 'f4', name: '北海道' },
		{ id: 'f5', name: '2日目の朝ごはん' },
	];

	const { Story } = defineMeta({
		title: 'molecules/Breadcrumbs',
		component: Breadcrumbs,
	});
</script>

<Story
	name="階層あり"
	args={{
		items: [
			{ id: null, name: 'ルート' },
			{ id: 'f1', name: 'いろいろふぉるだ' },
			{ id: 'f2', name: '写真' },
		],
		onnavigate: () => {},
	}}
/>

<Story name="ルートのみ" args={{ items: [{ id: null, name: 'ルート' }], onnavigate: () => {} }} />

<Story name="長いパス(省略あり)" args={{ items: longItems, onnavigate: () => {} }}>
	{#snippet template(args)}
		<div style="max-width: 320px;">
			<Breadcrumbs items={args.items} onnavigate={args.onnavigate} />
		</div>
	{/snippet}
</Story>
