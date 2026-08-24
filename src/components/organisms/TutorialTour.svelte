<script lang="ts">
	import {
		TUTORIAL_DRIVE,
		TUTORIAL_SELECTED_FILE,
		tutorialSteps,
	} from '../../lib/services/tutorial';
	import type { AccountRecord } from '../../lib/db/schema';
	import AppHeader from '$components/organisms/AppHeader.svelte';
	import Button from '$components/atoms/Button.svelte';
	import DriveExplorer from '$components/organisms/DriveExplorer.svelte';
	import QueueCard from '$components/organisms/QueueCard.svelte';
	import type { QueueCardTask } from '$components/organisms/QueueCard.svelte';
	import { buildChildrenMap } from '../../lib/services/folder-tree';
	import { fade } from 'svelte/transition';

	type Props = {
		/** 表示するかどうか */
		open: boolean;
		/** スマートフォン表示かどうか(歩の内容とデモをスマートフォンのUIにする) */
		phone?: boolean;
		/** タブレット表示かどうか(歩の説明をタッチ操作にする) */
		tablet?: boolean;
		/** 閉じる操作(スキップまたは完了) */
		onclose: () => void;
	};

	let { open, phone = false, tablet = false, onclose }: Props = $props();

	const SPOTLIGHT_PADDING = 5;

	const TOOLTIP_GAP = 15;
	const TOOLTIP_WIDTH = 360;

	const demoAccount: AccountRecord = {
		id: 'tutorial',
		host: 'misskey.example',
		token: 'tutorial',
		userId: 'tutorial',
		username: 'alice',
		name: 'アリス',
		avatarUrl: null,
		createdAt: '2026-08-21T00:00:00.000Z',
		lastSyncedAt: null,
	};

	const demoTasks: QueueCardTask[] = [
		{
			id: 1,
			label: '5件のアップロード',
			status: 'running',
			progress: { done: 2, total: 5 },
			error: null,
		},
		{ id: 2, label: '2件の移動', status: 'done', progress: { done: 2, total: 2 }, error: null },
	];

	const demoChildrenMap = buildChildrenMap(TUTORIAL_DRIVE.folders);
	const demoRootFolders = TUTORIAL_DRIVE.folders.filter((folder) => folder.parentId === null);

	let container = $state<HTMLElement | null>(null);
	let index = $state(0);
	let targetRect = $state<DOMRect | null>(null);
	let tooltipHeight = $state(0);

	const steps = $derived.by(() => {
		if (phone) {
			return tutorialSteps('phone');
		}

		return tutorialSteps(tablet ? 'tablet' : 'desktop');
	});

	const step = $derived(steps.at(index));
	const isLast = $derived(index === steps.length - 1);

	/**
	 * 吹き出しの幅を返す(狭い画面では画面内に収める)
	 * @returns 幅(px)
	 */
	const tooltipWidth = () => Math.min(TOOLTIP_WIDTH, innerWidth - TOOLTIP_GAP * 2);

	/** 現在の歩のハイライト対象を測り直す */
	const measure = () => {
		if (container === null || step === undefined) {
			targetRect = null;
			return;
		}

		const element = container.querySelector(`[data-tour="${step.target}"]`);
		targetRect = element === null ? null : element.getBoundingClientRect();
	};

	// NOTE: 画面端の対象では負の位置になり、暗幕の幅が無効な値(負のwidth)として無視されて前の値が残ってしまうため、0未満にはしない
	const spot = $derived.by(() => {
		if (targetRect === null) {
			return { top: innerHeight / 2, left: innerWidth / 2, width: 0, height: 0 };
		}

		const top = Math.max(0, targetRect.top - SPOTLIGHT_PADDING);
		const left = Math.max(0, targetRect.left - SPOTLIGHT_PADDING);
		return {
			top,
			left,
			width: Math.max(0, targetRect.right + SPOTLIGHT_PADDING - left),
			height: Math.max(0, targetRect.bottom + SPOTLIGHT_PADDING - top),
		};
	});

	/**
	 * 縦長の対象の横に吹き出しを置く(右に入らなければ左)
	 * @param area - ハイライトの範囲
	 * @returns 表示位置
	 */
	const placeBeside = (area: { top: number; left: number; width: number; height: number }) => {
		const rightX = area.left + area.width + TOOLTIP_GAP;
		const fitsRight = rightX + tooltipWidth() + TOOLTIP_GAP <= innerWidth;
		return {
			top: Math.max(TOOLTIP_GAP, area.top + TOOLTIP_GAP),
			left: fitsRight ? rightX : Math.max(TOOLTIP_GAP, area.left - tooltipWidth() - TOOLTIP_GAP),
		};
	};

	/**
	 * 対象の下(入らなければ上)に吹き出しを置く
	 * @param area - ハイライトの範囲
	 * @returns 表示位置
	 */
	const placeVertical = (area: { top: number; left: number; width: number; height: number }) => {
		const below = area.top + area.height + TOOLTIP_GAP;
		const fitsBelow = below + tooltipHeight + TOOLTIP_GAP <= innerHeight;
		return {
			top: fitsBelow ? below : Math.max(TOOLTIP_GAP, area.top - tooltipHeight - TOOLTIP_GAP),
			left: Math.min(
				Math.max(TOOLTIP_GAP, area.left),
				Math.max(TOOLTIP_GAP, innerWidth - tooltipWidth() - TOOLTIP_GAP),
			),
		};
	};

	const tooltipPosition = $derived.by(() =>
		// 縦長の対象は横に、それ以外は上下に。対象へ重ねない
		spot.height > innerHeight / 2 ? placeBeside(spot) : placeVertical(spot),
	);

	/** 次の歩へ進む(最後の歩なら完了して閉じる) */
	const handleNext = () => {
		if (isLast) {
			onclose();
			return;
		}

		index += 1;
	};

	/** 前の歩へ戻る */
	const handleBack = () => {
		index = Math.max(0, index - 1);
	};

	$effect(() => {
		if (open) {
			index = 0;
		}
	});

	$effect(() => {
		// UIのモードが変わって歩の並びが差し替わったら、最初の歩からやり直す
		void steps;
		
		index = 0;
	});

	$effect(() => {
		// 歩が変わったら、描画とカードの出入りのトランジションが落ち着いてから測り直す
		void index;

		measure();
		const timer = setTimeout(measure, 300);
		return () => {
			clearTimeout(timer);
		};
	});
</script>

<svelte:window onresize={measure} />

{#if open && step !== undefined}
	<div class="tour" role="dialog" aria-label="使い方の説明" transition:fade={{ duration: 250 }}>
		<div class="demo" inert bind:this={container}>
			<AppHeader
				accounts={[demoAccount]}
				active={demoAccount}
				syncStatus="idle"
				syncCount={0}
				onswitch={() => {}}
				onadd={() => {}}
				onremove={() => {}}
				onresync={() => {}}
				searchQuery=""
				onsearch={() => {}}
				onclearsearch={() => {}}
				onshowtutorial={() => {}}
				{phone}
				queueStatus={phone ? 'running' : 'idle'}
			/>
			<DriveExplorer
				childrenMap={demoChildrenMap}
				currentFolderId={null}
				breadcrumb={[]}
				folders={demoRootFolders}
				files={TUTORIAL_DRIVE.files}
				viewMode="list"
				sortKey="name"
				sortOrder="asc"
				selectedKeys={[]}
				detailTarget={{ kind: 'file', file: TUTORIAL_SELECTED_FILE }}
				detailsOpen={!phone}
				{phone}
				{tablet}
				selectionSize={0}
				onnavigate={() => {}}
				onsort={() => {}}
				onviewmode={() => {}}
				onselectitem={() => {}}
				onclearselection={() => {}}
				onclosedetails={() => {}}
				onpreviewfile={() => {}}
				oncreatefolder={() => {}}
				onrename={() => {}}
				onsavemetadata={() => {}}
				ondeleteselection={() => {}}
				actionBusy={false}
				ondragstartitem={() => {}}
				ondragenditem={() => {}}
				ondropitems={() => {}}
				ondropfiles={() => {}}
				onuploadfiles={() => {}}
				ondownloadselection={() => {}}
				onopenmenu={() => {}}
				searchQuery={null}
				onclearsearch={() => {}}
			/>
			{#if !phone}
				<QueueCard
					tasks={demoTasks}
					onretry={() => {}}
					ondismiss={() => {}}
					onclearfinished={() => {}}
				/>
			{/if}
		</div>
		<!-- ハイライト部分だけを空けた4枚の暗幕 -->
		<div class="scrim" style:top="0" style:left="0" style:right="0" style:height="{spot.top}px"></div>
		<div
			class="scrim"
			style:top="{spot.top + spot.height}px"
			style:left="0"
			style:right="0"
			style:bottom="0"
		></div>
		<div class="scrim" style:top="{spot.top}px" style:left="0" style:width="{spot.left}px" style:height="{spot.height}px"></div>
		<div
			class="scrim"
			style:top="{spot.top}px"
			style:left="{spot.left + spot.width}px"
			style:right="0"
			style:height="{spot.height}px"
		></div>
		<div
			class="ring"
			style:top="{spot.top}px"
			style:left="{spot.left}px"
			style:width="{spot.width}px"
			style:height="{spot.height}px"
		></div>
		<section
			bind:clientHeight={tooltipHeight}
			style:top="{tooltipPosition.top}px"
			style:left="{tooltipPosition.left}px"
		>
			<h2>{step.title}</h2>
			<p>{step.description}</p>
			<footer>
				<span>{index + 1} / {steps.length}</span>
				<span>
					{#if !isLast}
						<Button variant="text" onclick={onclose}>スキップ</Button>
					{/if}
					{#if index > 0}
						<Button variant="tonal" onclick={handleBack}>戻る</Button>
					{/if}
					<Button onclick={handleNext}>{isLast ? '完了' : '次へ'}</Button>
				</span>
			</footer>
		</section>
	</div>
{/if}

<style>
	.tour {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 1100;
		background-color: var(--color-bg);
	}

	/* デモは独自のスタッキングコンテキストに閉じ込め、fixedな進行カード(z-index 1000)が暗幕より上に出ないようにする */
	.demo {
		display: flex;
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 1;
		flex-direction: column;
	}

	.scrim {
		position: absolute;
		z-index: 2;
		background-color: hsl(0 0% 5% / 0.6);
	}

	.ring {
		position: absolute;
		z-index: 2;
		border: 2px solid var(--color-accent);
		border-radius: 5px;
	}

	section {
		position: absolute;
		z-index: 3;
		padding: 20px;
		border: 1px solid var(--color-outline);
		border-radius: 10px;
		background-color: var(--color-surface);
		/* 狭い画面では吹き出しを画面内に収める */
		min-width: min(360px, calc(100vw - 30px));
		max-width: min(360px, calc(100vw - 30px));
		transition:
			top 250ms ease,
			left 250ms ease;
	}

	h2 {
		margin: 0;
		margin-bottom: 10px;
		font-size: 1.15rem;
	}

	p {
		margin: 0;
		margin-bottom: 15px;
		font-size: 0.9rem;
		line-height: 1.7;
		color: var(--color-text-muted);
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
	}

	footer > span:first-child {
		margin-right: auto;
		font-size: 0.85rem;
		white-space: nowrap;
		color: var(--color-text-faint);
	}

	footer > span:last-child {
		display: flex;
		align-items: center;
		gap: 5px;
	}
</style>
