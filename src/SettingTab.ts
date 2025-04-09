import { AddItemsToNotesFromCommandPalette } from 'src/Plugin';
import { PluginSettingTab, App, Setting, Notice } from 'obsidian';

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
			const ruleSetting = new Setting(containerEl)
				.setName(`Rule ${index + 1}`);

			ruleSetting.controlEl.style.display = 'flex';
			ruleSetting.controlEl.style.gap = '0.5rem';
			ruleSetting.controlEl.style.flexWrap = 'wrap';

			ruleSetting
				.addText(text =>
					text
						.setPlaceholder("Tag")
						.setValue(rule.tag)
						.onChange(async (value) => {
							rule.tag = value;
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
						.setTooltip("Delete Rule")
						.onClick(async () => {
							this.plugin.settings.rules.splice(index, 1);
							await this.plugin.saveSettings();
							this.display(); // Re-render UI
						})
				);
		});

		// Add new rule button
		new Setting(containerEl)
			.addButton((btn) =>
				btn
					.setButtonText("Add New Rule")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.rules.push({ tag: "", heading: "" });
						await this.plugin.saveSettings();
						this.display(); // Re-render UI
					})
			);

		new Setting(containerEl)
			.addButton(btn =>
				btn
					.setButtonText("Reindex rules and notes")
					.setTooltip("Refresh all command palette entries based on current rules and note metadata.")
					.onClick(() => {
						this.plugin.registerCommandsBasedOnTags();
						new Notice("Command palette updated with latest rules and notes.");
					})
			);

	}
}
