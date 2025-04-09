import { Plugin } from 'obsidian';
import { BulkAddItemModal } from 'src/bulkAddItemModal';
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
			console.log("Metadata fully loaded. Registering commands...");
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

		this.addRibbonIcon('between-horizontal-start', 'Add Under Page Heading', () => {
			const setting = (this.app as any).setting;
			setting.open();
			setting.openTabById(this.manifest.id);
		});

		this.addStatusBarItem().setText('Status Bar Text');

		this.addSettingTab(new SettingTab(this.app, this));

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
				const commandId = `add-under-page-heading-${file.path.replace(/[^a-zA-Z0-9_-]/g, "_")}-${rule.tag}`;
	
				console.log(`Registering command: ${commandId}`);
	
				const command = this.addCommand({
					id: commandId,
					name: `${fileName} (${rule.heading})`,
					callback: () => {
						new EditorModal(this.app, file, rule).open();
					},
				});
	
				// Register with lifecycle so Obsidian will clean it up when plugin reloads or reindex runs again
				this.register(command);
			});
		});
	}
	
}
