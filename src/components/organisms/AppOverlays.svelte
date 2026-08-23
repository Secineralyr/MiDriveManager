<script lang="ts">
	import QueuePanel from '$components/organisms/QueuePanel.svelte';
	import ToastStack from '$components/organisms/ToastStack.svelte';
</script>

<!-- 画面の隅に常駐するオーバーレイ。左下にトースト、右下に操作キューの進行カードを置く -->
<ToastStack />
<QueuePanel />
