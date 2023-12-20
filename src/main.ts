import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	TFile,
	normalizePath,
} from "obsidian";

import { ViewUpdate, EditorView, ViewPlugin } from "@codemirror/view";

import {
	Category,
	CategoryType,
	Task
} from "./interfaces";

import {
	AmazingMarvinSettingsTab,
	AmazingMarvinPluginSettings,
} from "./settings";

let noticeTimeout: NodeJS.Timeout;

const animateNotice = (notice: Notice) => {
	let message = notice.noticeEl.innerText;
	const dots = [...message].filter((c) => c === ".").length;
	if (dots == 0) {
		message = message.replace("    ", " .  ");
	} else if (dots == 1) {
		message = message.replace(" .  ", " .. ");
	} else if (dots == 2) {
		message = message.replace(" .. ", " ...");
	} else if (dots == 3) {
		message = message.replace(" ...", "    ");
	}
	notice.setMessage(message);
	noticeTimeout = setTimeout(() => animateNotice(notice), 500);
};

export default class AmazingMarvinPlugin extends Plugin {
	settings: AmazingMarvinPluginSettings;


	createFolder = async (path: string) => {
		try {
			await this.app.vault.createFolder(path);
		} catch (e) {
			console.debug(e);
		}
	};

	create = async (path: string, content: string) => {
		try {
			await this.app.vault.create(path, content);
		} catch (e) {
			console.debug(e);
		}
	};

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new AmazingMarvinSettingsTab(this.app, this));

		this.addCommand({
			id: 'ca-am-sync',
			name: 'Sync Amazing Marvin categories and projects',
			callback: () => {
				this.sync().then(() => {
					new Notice('Amazing Marvin data synced successfully.');
				}).catch((error) => {
					console.error('Sync error:', error);
					new Notice('Error syncing with Amazing Marvin.');
				});
			}
		});
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			await this.loadData()
		);
	}

	saveSettings() {
		this.saveData(this.settings);
	}

	async fetchMarvinData(url: string) {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				['X-API-Token']: this.settings.apiKey,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}

		return response.json();
	}


	async sync() {
		const baseUrl = 'https://serv.amazingmarvin.com/api'; // Replace with actual base URL

		try {
			// Fetch Categories and Projects
			const categories = await this.fetchMarvinData(`${baseUrl}/categories`);

			console.log(categories);
		} catch (error) {
			console.error('Error syncing Amazing Marvin data:', error);
		}
	}

}

