import { App, PluginSettingTab, Setting } from "obsidian";
import AmazingMarvinPlugin from "./main";

export interface AmazingMarvinPluginSettings {
	useLocalServer: boolean;
	localServerHost: string;
	localServerPort: any;
	apiKey: string;
}

export class AmazingMarvinSettingsTab extends PluginSettingTab {
	plugin: AmazingMarvinPlugin;

	constructor(app: App, plugin: AmazingMarvinPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private getAPILink(): HTMLAnchorElement {
		const a = document.createElement('a');
		a.href = 'https://app.amazingmarvin.com/pre?api';
		a.text = 'API page';
		a.target = '_blank';
		return a;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const descEl = document.createDocumentFragment();
		descEl.appendText('Get your Token at the ');
		descEl.appendChild(this.getAPILink());

		new Setting(containerEl)
			.setName("API Token")
			.setDesc(descEl)
			.addText((text) =>
				text
					.setPlaceholder("API token")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Use Local Server")
			.setDesc("Attempt to use the local Amazing Marvin server first")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useLocalServer)
				.onChange(async (value) => {
					this.plugin.settings.useLocalServer = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Local Server Host")
			.addText(text => text
				.setPlaceholder("localhost")
				.setValue(this.plugin.settings.localServerHost || "localhost")
				.onChange(async (value) => {
					this.plugin.settings.localServerHost = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Local Server Port")
			.addText(text => text
				.setPlaceholder("12082")
				.setValue(this.plugin.settings.localServerPort?.toString() || "12082")
				.onChange(async (value) => {
					this.plugin.settings.localServerPort = parseInt(value, 10);
					await this.plugin.saveSettings();
				})
			);
	}
}
