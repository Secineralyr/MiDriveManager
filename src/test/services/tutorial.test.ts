import {
	TUTORIAL_DRIVE,
	TUTORIAL_SELECTED_FILE,
	TUTORIAL_STEPS,
} from '../../lib/services/tutorial';
import { describe, expect, it } from 'vitest';

describe('チュートリアルの定義', () => {
	it('歩は設計の順(ツリー、一覧、ツールバー、検索、詳細、キュー)に並んでいる', () => {
		expect(TUTORIAL_STEPS.map((step) => step.target)).toStrictEqual([
			'tree',
			'list',
			'toolbar',
			'search',
			'details',
			'queue',
		]);
	});

	it('デモのドライブに選択済みファイルが含まれている', () => {
		expect(TUTORIAL_DRIVE.files).toContain(TUTORIAL_SELECTED_FILE);
		expect(TUTORIAL_DRIVE.folders.length).toBeGreaterThan(0);
	});
});
