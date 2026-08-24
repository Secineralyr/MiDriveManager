<script lang="ts">
	import Toast from '$components/molecules/Toast.svelte';
	import type { TransitionConfig } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { toastStore } from '../../lib/stores/toast.svelte';

	// トースト間の間隔(px)。CSSのli側margin-topと一致させる
	const TOAST_GAP_PX = 10;

	/**
	 * トーストの出入りのトランジション
	 * 透明度と上下移動に加えて、占有する高さ(間隔のmargin込み)も一緒に変化させることで、
	 * 追加・削除時に既存のトーストが滑らかに押し上げ・押し下げされるようにする
	 * @param node - 対象のli要素
	 * @returns トランジションの設定
	 */
	const toastSlide = (node: Element): TransitionConfig => {
		const { height } = node.getBoundingClientRect();
		return {
			duration: 250,
			easing: cubicOut,
			css: (t, u) =>
				`overflow: hidden; height: ${t * height}px; margin-top: ${t * TOAST_GAP_PX}px; opacity: ${t}; transform: translateY(${u * 15}px);`,
		};
	};
</script>

{#if toastStore.toasts.length > 0}
	<ol>
		{#each toastStore.toasts as toast (toast.id)}
			<!-- 1件目の追加と最後の1件の削除は外側の{#if}の生成・破棄になるため、globalで再生する -->
			<li transition:toastSlide|global>
				<Toast
					message={toast.message}
					kind={toast.kind}
					durationMs={toast.durationMs}
					ondismiss={() => {
						toastStore.dismiss(toast.id);
					}}
				/>
			</li>
		{/each}
	</ol>
{/if}

<style>
	ol {
		display: flex;
		position: fixed;
		bottom: calc(20px + env(safe-area-inset-bottom));
		left: 20px;
		z-index: 1000;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* 間隔はgapではなくmargin-topで作る。gapはトランジションで高さが0になっても残り、
	   出入りの瞬間に間隔ぶんの飛びが生じるため。最上段のmargin-topは下端基準のスタックでは見えない */
	li {
		margin-top: 10px;
	}
</style>
