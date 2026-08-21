import * as Mk from 'misskey-js';
import type { UserData } from './types';
import { Folder } from './Folder';

export class MisskeyApi {
	private client: Mk.api.APIClient;

	public constructor(userData: UserData) {
		this.client = new Mk.api.APIClient({
			origin: userData.serverUrl,
			credential: userData.token
		});
	}

	public async getFolder(id: string | null = null) {
		const result: { id: string; createAt: string; name: string; parentId: string; }[] = [];
		let data: any[] = await this.client.request("drive/folders", {
			limit: 100,
			folderId: id,
		});

		if (data.length === 0) {
			return result;
		}
		let untilId = data[data.length - 1].id;
		result.push(...data);

		while (data.length > 98) {
			data = await this.client.request("drive/folders", {
				limit: 100,
				folderId: id,
				untilId
			});
			if (data.length === 0) {
				return result;
			}
			untilId = data[data.length - 1].id;
			result.push(...data);
		}

		return result;
	}

	public async getAllfolders(): Promise<Folder> {
		const root = new Folder(this, [], '', '', '');
		await root.getSubDir();

		for (const f of root.subFolders) {
			f
		}
	}
}
