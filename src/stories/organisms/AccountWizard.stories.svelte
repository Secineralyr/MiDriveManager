<script module lang="ts">
	import AccountWizard from '$components/organisms/AccountWizard.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'organisms/AccountWizard',
		component: AccountWizard,
		args: {
			noticeAccepted: true,
			onacceptnotice: () => {},
			cancellable: false,
			busy: false,
			error: null,
			onstart: () => {},
			oncancel: () => {},
		},
	});
</script>

<Story name="諸注意(初回利用)" args={{ noticeAccepted: false }} />

<Story name="ホスト名入力" />

<Story name="キャンセル可能" args={{ cancellable: true }} />

<Story name="確認中" args={{ busy: true }} />

<Story name="エラー表示" args={{ error: '認証の確認に失敗しました(HTTP 500)' }} />
