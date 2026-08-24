<script module lang="ts">
	import TutorialTour from '$components/organisms/TutorialTour.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'organisms/TutorialTour',
		component: TutorialTour,
	});
</script>

<Story name="ツアー" args={{ open: true, onclose: () => {} }} />

<Story name="タブレットのツアー" args={{ open: true, tablet: true, onclose: () => {} }} />

<Story name="スマートフォンのツアー" args={{ open: true, phone: true, onclose: () => {} }} />
