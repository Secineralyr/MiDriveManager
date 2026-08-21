<script module lang="ts">
	import TextField from '$components/atoms/TextField.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'atoms/TextField',
		component: TextField,
	});
</script>

<Story
	name="標準"
	args={{ label: 'サーバーのホスト名', value: 'misskey.io', placeholder: 'misskey.io' }}
/>

<Story
	name="プレースホルダー"
	args={{ label: 'サーバーのホスト名', value: '', placeholder: 'misskey.io' }}
/>

<Story
	name="エラー表示"
	args={{ label: 'サーバーのホスト名', value: '', error: 'ホスト名を入力してください' }}
/>
