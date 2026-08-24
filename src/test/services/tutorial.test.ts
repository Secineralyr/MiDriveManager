import { TUTORIAL_DRIVE, TUTORIAL_SELECTED_FILE, tutorialSteps } from '../../lib/services/tutorial';
import { describe, expect, it } from 'vitest';

describe('チュートリアルの定義', () => {
	it('デスクトップの歩は設計の順(ツリー、一覧、ツールバー、検索、詳細、キュー)に並んでいる', () => {
		expect(tutorialSteps('desktop').map((step) => step.target)).toStrictEqual([
			'tree',
			'list',
			'toolbar',
			'search',
			'details',
			'queue',
		]);
	});

	it('タブレットは同じ並びで、一覧の説明がタップと長押しの操作になっている', () => {
		const steps = tutorialSteps('tablet');
		expect(steps.map((step) => step.target)).toStrictEqual([
			'tree',
			'list',
			'toolbar',
			'search',
			'details',
			'queue',
		]);
		expect(steps.at(1)?.description).toContain('長押し');
	});

	it('スマートフォンはツリー開閉・一覧・ツールバー・検索・進行状況(アカウントアイコン)の5歩になっている', () => {
		const steps = tutorialSteps('phone');
		expect(steps.map((step) => step.target)).toStrictEqual([
			'tree-toggle',
			'list',
			'toolbar',
			'search',
			'account',
		]);
		expect(steps.at(-1)?.description).toContain('アカウントアイコンの長押し');
	});

	it('デモのドライブに選択済みファイルが含まれている', () => {
		expect(TUTORIAL_DRIVE.files).toContain(TUTORIAL_SELECTED_FILE);
		expect(TUTORIAL_DRIVE.folders.length).toBeGreaterThan(0);
	});
});
