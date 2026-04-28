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

		this.plugin.settings.rules.forEach((rule, index) => {
			if (!rule) return;
			if (!rule.tags) {
				rule.tags = [];
			}

			const ruleSetting = new Setting(containerEl)
				.setName(`Rule ${index + 1}`);

			ruleSetting
				.addText(text =>
					text
						.setPlaceholder("Tags")
						.setValue(Array.isArray(rule.tags) ? rule.tags.join(", ") : "")
						.onChange(async (value) => {
							rule.tags = value.split(",").map(t => t.trim()).filter(t => t !== "");
							await this.plugin.saveSettings();
						})
				)
				.addText(text =>
					text
						.setPlaceholder("Heading")
						.setValue(rule.heading)
						.onChange(async (value) => {
							rule.heading = value;
							await this.plugin.saveSettings();
						})
				)
				.addExtraButton((btn) =>
					btn
						.setIcon("trash")
						.setTooltip("Delete rule")
						.onClick(async () => {
							this.plugin.settings.rules.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						})
				);
		});

		new Setting(containerEl)
			.addButton((btn) =>
				btn
					.setButtonText("Add new rule")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.rules.push({ tags: [], heading: "" });
						await this.plugin.saveSettings();
						this.display(); 
					})
			);

	}
}
