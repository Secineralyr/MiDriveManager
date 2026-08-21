<script module lang="ts">
	import AccountWizard from '$components/organisms/AccountWizard.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'organisms/AccountWizard',
		component: AccountWizard,
		args: {
			cancellable: false,
			busy: false,
			error: null,
			onstart: () => {},
			oncancel: () => {},
		},
	});
</script>

<Story name="初回起動" />

<Story name="キャンセル可能" args={{ cancellable: true }} />

<Story name="確認中" args={{ busy: true }} />

<Story name="エラー表示" args={{ error: '認証の確認に失敗しました(HTTP 500)' }} />
