import { Plugin } from 'obsidian';
import { BulkAddItemModal } from 'src/BulkAddItemModal';
import { MyPluginSettings, DEFAULT_SETTINGS } from 'src/MyPluginSettings';
import { SettingTab } from 'src/SettingTab';
import { EditorModal } from './EditorModal';


export class AddItemsToNotesFromCommandPalette extends Plugin {
	settings: MyPluginSettings;
	private registeredCommandIds = new Set<string>();

	async onload() {
		await this.loadSettings();

		// Wait for metadata to be fully loaded
		this.app.metadataCache.on('resolved', () => {
			this.registerCommandsBasedOnTags();

			this.addCommand({
				id: 'add-item-to-all-matching-notes',
				name: 'Add item to all notes matching a rule',
				callback: () => {
					new BulkAddItemModal(this.app, this.settings).open();
				},
			});

			this.addCommand({
				id: 'reindex-rules-and-notes',
				name: 'Reindex rules and notes',
				callback: () => {
					this.registerCommandsBasedOnTags()
				},
			});
		});

		this.addRibbonIcon('between-horizontal-start', 'Add under page heading', () => {
			const setting = (this.app as any).setting;
			setting.open();
			setting.openTabById(this.manifest.id);
		});

		this.addStatusBarItem().setText('Status bar text');

		this.addSettingTab(new SettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	registerCommandsBasedOnTags() {
		const files = this.app.vault.getMarkdownFiles();
	
		this.settings.rules.forEach((rule) => {
			const taggedFiles = files.filter((file) => {
				const metadata = this.app.metadataCache.getFileCache(file);
				const fileTags = metadata?.frontmatter?.tags;
	
				if (Array.isArray(fileTags)) {
					return fileTags.includes(rule.tag) && fileTags.includes("active");
				} else if (typeof fileTags === 'string') {
					return fileTags === rule.tag;
				}
	
				return false;
			});
	
			taggedFiles.forEach((file) => {
				const fileName = file.basename;
				const commandId = `add-under-page-heading-${file.path.replace(/[^a-zA-Z0-9_-]/g, "_")}-${rule.tag}`;
	
				this.addCommand({
					id: commandId,
					name: `${fileName} (${rule.heading})`,
					callback: () => {
						new EditorModal(this.app, file, rule).open();
					},
				});
			});
		});
	}
	
}
