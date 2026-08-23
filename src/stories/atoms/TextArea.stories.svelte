<script module lang="ts">
	import TextArea from '$components/atoms/TextArea.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'atoms/TextArea',
		component: TextArea,
	});
</script>

<Story
	name="標準"
	args={{ label: 'コメント(代替テキスト)', value: '旅行で撮った写真', placeholder: '' }}
/>

<Story
	name="プレースホルダー"
	args={{ label: 'コメント(代替テキスト)', value: '', placeholder: '画像の説明を入力' }}
/>

<Story name="行数指定" args={{ label: 'メモ', value: '1行目\n2行目\n3行目\n4行目', rows: 6 }} />
