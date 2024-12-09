import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface Rule {
	tag: string;
	heading: string;
}

interface MyPluginSettings {
	rules: Rule[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	rules: [
		{ tag: "career", heading: "## Career Discussion" },
		{ tag: "1-1", heading: "## One-on-One Topics" },
	],
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		const directReports = ["Chase", "Mo", "Alex"]; // Example list of direct reports
		const noteTypes = ["1-1", "career"];
	  
		directReports.forEach((report) => {
		  noteTypes.forEach((type) => {
			this.addCommand({
			  id: `add-item-to-${report}-${type}`,
			  name: `Add item to ${report} ${type}`,
			  callback: () => {
				new AddItemModal(this.app, this.settings, report, type).open();
			  },
			});
		  });
		});

		this.addRibbonIcon('dice', 'Sample Plugin', () => {
			new Notice('This is a notice!');
		});

		this.addStatusBarItem().setText('Status Bar Text');

		this.addCommand({
			id: 'open-sample-modal',
			name: 'Open Sample Modal',
			callback: () => {
				console.log('Simple Callback');
			},
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new SampleModal(this.app).open();
					}
					return true;
				}
				return false;
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm);
		});

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

class AddItemModal extends Modal {
	settings: MyPluginSettings;
	report: string;
	type: string;

	constructor(app: App, settings: MyPluginSettings, report: string, type: string) {
		super(app);
		this.settings = settings;
		this.report = report;
		this.type = type;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: `Add item to ${this.report} ${this.type}` });

		const input = contentEl.createEl("input", { type: "text"});

		const submitBtn = contentEl.createEl("button", { text: "Add" });
		submitBtn.onclick = async () => {
			const noteContent = input.value;
			if (noteContent) {
				await this.insertIntoNote(noteContent);
				new Notice("Item added!");
				this.close();
			}
		};
	}

	async insertIntoNote(content: string) {
		const files = this.app.vault.getMarkdownFiles();
		const targetTag = this.type;
		const rule = this.settings.rules.find((r) => r.tag === targetTag);

		if (!rule) {
			new Notice("No rule found for this note type.");
			return;
		}

		for (const file of files) {
			const metadata = this.app.metadataCache.getFileCache(file);
			if (metadata?.tags?.some((t) => t.tag === `#${targetTag}`)) {
				const fileContent = await this.app.vault.read(file);
				const updatedContent = fileContent.replace(
					rule.heading,
					`${rule.heading}\n- ${content}`
				);

				await this.app.vault.modify(file, updatedContent);
				break;
			}
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;
  
	constructor(app: App, plugin: MyPlugin) {
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
		  .addText((text) =>
			text.setValue(rule.tag).onChange(async (value) => {
			  rule.tag = value;
			  await this.plugin.saveSettings();
			})
		  )
		  .addText((text) =>
			text.setValue(rule.heading).onChange(async (value) => {
			  rule.heading = value;
			  await this.plugin.saveSettings();
			})
		  );
	  });
	}
}

