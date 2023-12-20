import { App, PluginSettingTab, Setting } from "obsidian";
import AmazingMarvinPlugin from "./main";

export interface AmazingMarvinPluginSettings {
	apiKey: string;
}

export class AmazingMarvinSettingsTab extends PluginSettingTab {
	plugin: AmazingMarvinPlugin;

	constructor(app: App, plugin: AmazingMarvinPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("API Key")
			.setDesc("Amazing Marvin API key.")
			.addText((text) =>
				text
					.setPlaceholder("Get your key at https://app.amazingmarvin.com/pre?api")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
