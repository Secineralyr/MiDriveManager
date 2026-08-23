import type { DriveItem } from '../services/drive-actions';
import { driveStore } from './drive.svelte';
import { searchStore } from './search.svelte';

/**
 * 項目の表示名を、表示中のドライブまたは検索結果から探す
 * @param item - 対象の項目
 * @returns 表示名。どちらにもなければundefined
 */
export const itemName = (item: DriveItem) => driveStore.nameOf(item) ?? searchStore.nameOf(item);
