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

		new Setting(containerEl)
			.setName("Global required tag")
			.setDesc("If set, all matching notes must also contain this tag. Leave empty to ignore.")
			.addText(text =>
				text
					.setPlaceholder("Tag")
					.setValue(this.plugin.settings.globalRequiredTag)
					.onChange(async (value) => {
						this.plugin.settings.globalRequiredTag = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Dynamic command palette entries")
			.setDesc("If enabled, individual commands will be added to the palette for every matching note. Note: This uses internal Obsidian APIs and may require a reindex to update correctly.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.enableDynamicCommands)
					.onChange(async (value) => {
						this.plugin.settings.enableDynamicCommands = value;
						await this.plugin.saveSettings();
						this.plugin.registerDynamicCommands();
					})
			);

		new Setting(containerEl).setName("Rules configuration")
			.setHeading()
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc("Specify a tag (e.g. 'daily-note') that files must contain and the heading (e.g. '## Notes') items should be inserted underneath. After updating rules you can manually index to update the command palette options.");


		this.plugin.settings.rules.forEach((rule, index) => {
			const ruleSetting = new Setting(containerEl)
				.setName(`Rule ${index + 1}`)

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
						.setTooltip("Delete rule")
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
					.setButtonText("Add new rule")
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
						this.plugin.registerDynamicCommands();
						new Notice("Command palette updated with latest rules and notes.");
					})
			);

	}
}
