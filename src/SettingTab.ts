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

		new Setting(containerEl).setName("Rules configuration")
			.setHeading()
			.setDesc("Specify tags and headings for your rules. Matching notes will appear in the suggester.");


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
							this.display();
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
						this.display();
					})
			);

	}
}
