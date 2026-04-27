import { parseFrontMatterTags, Plugin, TFile } from "obsidian";
import { BulkAddItemModal } from "src/BulkAddItemModal";
import {
  AddUnderPageHeadingSettings,
  DEFAULT_ADD_UNDER_PAGE_HEADING_SETTINGS,
  Rule,
} from "src/MyPluginSettings";
import { SettingTab } from "src/SettingTab";
import { EditorModal } from "./EditorModal";

export class AddItemsToNotesFromCommandPalette extends Plugin {
  settings: AddUnderPageHeadingSettings;

  async onload() {
    await this.loadSettings();
    this.registerCommands();
    this.registerEvents();
    this.addSettingTab(new SettingTab(this.app, this));
  }

  private registerEvents() {
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => {
        this.registerDynamicCommands();
      }),
    );
  }

  private registerCommands() {
    this.registerDynamicCommands();
    this.registerStaticCommands();
  }

  private registerStaticCommands() {
    this.addCommand({
      id: "add-item-to-all-matching-notes",
      name: "Add item to all notes matching a rule",
      callback: () => {
        new BulkAddItemModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "reindex-rules-and-notes",
      name: "Reindex rules and notes",
      callback: () => {
        this.registerDynamicCommands();
      },
    });
  }

  async loadSettings() {
    this.settings = {
      ...DEFAULT_ADD_UNDER_PAGE_HEADING_SETTINGS,
      ...((await this.loadData()) as Partial<AddUnderPageHeadingSettings>),
    };
  }

  async saveSettings() {
  	await this.saveData(this.settings);
  }

  registerDynamicCommands() {
  	const files = this.app.vault.getMarkdownFiles();

  	this.settings.rules.forEach((rule) => {
  		if (!rule.tag) return;

  		files
  			.filter((file) => this.isFileMatch(file, rule))
  			.forEach((file) => this.registerCommandForFile(file, rule));
  	});
  }

  public isFileMatch(file: TFile, rule: Rule): boolean {
  	const metadata = this.app.metadataCache.getFileCache(file);
  	const fileTags = parseFrontMatterTags(metadata?.frontmatter) || [];

  	// Normalize tags (remove '#' and convert to lowercase)
  	const normalizedTags = fileTags.map((tag) =>
  		tag.replace(/^#/, "").toLowerCase(),
  	);
  	const targetTag = rule.tag.replace(/^#/, "").toLowerCase();
  	const requiredTag = this.settings.globalRequiredTag
  		?.replace(/^#/, "")
  		.toLowerCase();

  	const matchesRuleTag = normalizedTags.includes(targetTag);
  	const matchesGlobalTag =
  		!requiredTag || normalizedTags.includes(requiredTag);

  	return matchesRuleTag && matchesGlobalTag;
  }
  private registerCommandForFile(file: TFile, rule: Rule) {
    const fileName = file.basename;
    const commandId = `add-under-page-heading-${file.path.replace(/[^a-zA-Z0-9_-]/g, "_")}-${rule.tag}`;

    this.addCommand({
      id: commandId,
      name: `${fileName} (${rule.heading})`,
      callback: () => {
        new EditorModal(this.app, file, rule).open();
      },
    });
  }
}
