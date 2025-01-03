import { AddItemsToNotesFromCommandPalette } from 'src/Plugin';
import { PluginSettingTab, App, Setting } from 'obsidian';

export class SettingTab extends PluginSettingTab {
	plugin: AddItemsToNotesFromCommandPalette;

	constructor(app: App, plugin: AddItemsToNotesFromCommandPalette) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Rules Configuration" });

		this.plugin.settings.rules.forEach((rule, index) => {
			new Setting(containerEl)
				.setName(`Rule ${index + 1}`)
				.setDesc(`Tag: ${rule.tag}, Heading: ${rule.heading}`)
				.addText((text) => text.setValue(rule.tag).onChange(async (value) => {
					rule.tag = value;
					await this.plugin.saveSettings();
				})
				)
				.addText((text) => text.setValue(rule.heading).onChange(async (value) => {
					rule.heading = value;
					await this.plugin.saveSettings();
				})
				);
		});
	}
}
