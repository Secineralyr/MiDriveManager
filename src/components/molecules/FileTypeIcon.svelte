<script lang="ts">
	import IconFile from '@tabler/icons-svelte/icons/file';
	import IconFolder from '@tabler/icons-svelte/icons/folder';
	import IconMovie from '@tabler/icons-svelte/icons/movie';
	import IconMusic from '@tabler/icons-svelte/icons/music';
	import IconPhoto from '@tabler/icons-svelte/icons/photo';
	import { fileKind } from '../../lib/utils/file-kind';

	type Props = {
		/** フォルダかどうか */
		folder?: boolean;
		/** MIMEタイプ(フォルダの場合はnull) */
		mimeType?: string | null;
		/** アイコンの大きさ(px) */
		size?: number;
	};

	let { folder = false, mimeType = null, size = 18 }: Props = $props();

	const kind = $derived(mimeType === null ? 'other' : fileKind(mimeType));
</script>

{#if folder}
	<IconFolder {size} />
{:else if kind === 'image'}
	<IconPhoto {size} />
{:else if kind === 'video'}
	<IconMovie {size} />
{:else if kind === 'audio'}
	<IconMusic {size} />
{:else}
	<IconFile {size} />
{/if}
