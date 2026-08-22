<script module lang="ts">
	import FileTypeIcon from '$components/molecules/FileTypeIcon.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'molecules/FileTypeIcon',
		component: FileTypeIcon,
	});
</script>

<Story name="フォルダ" args={{ folder: true }} />

<Story name="画像" args={{ mimeType: 'image/png' }} />

<Story name="動画" args={{ mimeType: 'video/mp4' }} />

<Story name="音声" args={{ mimeType: 'audio/mpeg' }} />

<Story name="その他" args={{ mimeType: 'application/zip' }} />
