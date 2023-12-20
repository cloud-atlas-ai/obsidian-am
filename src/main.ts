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
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			await this.loadData()
		);
	}

	saveSettings() {
		this.saveData(this.settings);
	}
}
