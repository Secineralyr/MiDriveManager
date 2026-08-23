import { describe, expect, it } from 'vitest';
import { resolveShortcut } from '../../lib/utils/shortcuts';

describe('ショートカットの解決', () => {
	it('Ctrl併用のキーが対応する操作になる', () => {
		expect(resolveShortcut({ key: 'a', ctrl: true })).toBe('selectAll');
		expect(resolveShortcut({ key: 'c', ctrl: true })).toBe('copy');
		expect(resolveShortcut({ key: 'x', ctrl: true })).toBe('cut');
	});

	it('Ctrl+Vはpasteイベントに委ねるため操作にならない', () => {
		expect(resolveShortcut({ key: 'v', ctrl: true })).toBeNull();
	});

	it('大文字のキーでも同じ操作になる', () => {
		expect(resolveShortcut({ key: 'A', ctrl: true })).toBe('selectAll');
	});

	it('単独キーが対応する操作になる', () => {
		expect(resolveShortcut({ key: 'Delete', ctrl: false })).toBe('delete');
		expect(resolveShortcut({ key: 'F2', ctrl: false })).toBe('rename');
		expect(resolveShortcut({ key: 'Escape', ctrl: false })).toBe('clearSelection');
	});

	it('割り当てのないキーはnullになる', () => {
		expect(resolveShortcut({ key: 'z', ctrl: true })).toBeNull();
		expect(resolveShortcut({ key: 'a', ctrl: false })).toBeNull();
		expect(resolveShortcut({ key: 'Enter', ctrl: false })).toBeNull();
	});
});
