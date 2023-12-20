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
	}
}
