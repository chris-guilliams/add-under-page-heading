import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

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
		
		// Wait for metadata to be fully loaded
		this.app.metadataCache.on('resolved', () => {
			console.log("Metadata fully loaded. Registering commands...");
			this.registerCommandsBasedOnTags();
		});

		this.addRibbonIcon('dice', 'Sample Plugin', () => {
			const setting = (this.app as any).setting;
			setting.open();
			setting.openTabById(this.manifest.id);	
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

	registerCommandsBasedOnTags() {
		const files = this.app.vault.getMarkdownFiles();
		console.log("All Markdown files:", files);
	  
		this.settings.rules.forEach((rule) => {
		  console.log(`Looking for files with tag: #${rule.tag}`);
	  
		  const taggedFiles = files.filter((file) => {
			const metadata = this.app.metadataCache.getFileCache(file);
			const fileTags = metadata?.frontmatter?.tags;
	  
			// console.log(`File: ${file.name}`, fileTags);
	  
			if (Array.isArray(fileTags)) {
			  return fileTags.includes(rule.tag) && fileTags.includes("active");
			} else if (typeof fileTags === 'string') {
			  return fileTags === rule.tag;
			}
	  
			return false;
		  });
	  
		  console.log(`Files found for tag #${rule.tag}:`, taggedFiles);
	  
		  taggedFiles.forEach((file) => {
			const fileName = file.basename;
			const commandName = `Add item to ${fileName} (${rule.tag})`;
	  
			console.log(`Registering command: ${commandName}`);
	  
			this.addCommand({
			  id: `add-item-to-${fileName}-${rule.tag}`,
			  name: commandName,
			  callback: () => {
				new AddItemModal(this.app, this.settings, file, rule).open();
			  },
			});
		  });
		});
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
	file: TFile;
	rule: Rule;
	settings: MyPluginSettings;
  
	constructor(app: App, settings: MyPluginSettings, file: TFile, rule: Rule) {
	  super(app);
	  this.settings = settings;
	  this.file = file;
	  this.rule = rule;
	}
  
	onOpen() {
	  const { contentEl } = this;
	  contentEl.createEl("h2", { text: `Add item to ${this.file.basename}` });
  
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
	  const fileContent = await this.app.vault.read(this.file);
	  const headingPattern = new RegExp(`(${this.rule.heading})`, "i");
  
	  if (headingPattern.test(fileContent)) {
		const updatedContent = fileContent.replace(
		  headingPattern,
		  `$1\n- ${content}`
		);
  
		await this.app.vault.modify(this.file, updatedContent);
	  } else {
		new Notice(`Heading "${this.rule.heading}" not found in ${this.file.basename}`);
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

