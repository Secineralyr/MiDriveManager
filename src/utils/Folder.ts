import type { MisskeyApi } from "./MisskeyApi";
import { DriveFile } from './DriveFile';

export class Folder {

	public subFolders: Folder[] = [];

	public constructor(
		private api: MisskeyApi,
		public path: Folder[],
		public id: string,
		public createDate: string,
		public name: string,
	) {
		path.push(this);
	}

	public async findFolderById(id: string): Promise<Folder | null> {
		if (this.id === id) {
			return this;
		}

		for (const folder of this.subFolders) {
			const r = await folder.findFolderById(id);
			if (r !== null) {
				return r;
			}
		}

		return null;
	}

	public async getFolderFile(): Promise<DriveFile> {

	}

	public async getSubDir() {
		const subfolder = await this.api.getFolder(this.id.length === 0 ? null : this.id);
		this.subFolders.push(...subfolder.map(v => new Folder(this.api, this.path, v.id, v.createAt, v.name)));
	}
};
