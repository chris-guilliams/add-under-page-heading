import { parseFrontMatterTags, Plugin, TFile } from "obsidian";
import { BulkAddItemModal } from "src/BulkAddItemModal";
import { NoteSuggesterModal } from "./NoteSuggesterModal";
import {
  AddUnderPageHeadingSettings,
  DEFAULT_ADD_UNDER_PAGE_HEADING_SETTINGS,
  Rule,
} from "src/Settings";
import { SettingTab } from "src/SettingTab";

export class AddItemsToNotesFromCommandPalette extends Plugin {
  settings: AddUnderPageHeadingSettings;

  async onload() {
    await this.loadSettings();
    this.registerCommands();
    this.addSettingTab(new SettingTab(this.app, this));
  }

  private registerCommands() {
    this.addCommand({
      id: "add-item-to-note-suggester",
      name: "Add item under page heading...",
      callback: () => {
        new NoteSuggesterModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "add-item-to-all-matching-notes",
      name: "Add item to all notes matching a rule",
      callback: () => {
        new BulkAddItemModal(this.app, this).open();
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

  public isFileMatch(file: TFile, rule: Rule): boolean {
    const metadata = this.app.metadataCache.getFileCache(file);
    const fileTags = parseFrontMatterTags(metadata?.frontmatter) || [];

    // Normalize note tags
    const normalizedNoteTags = fileTags.map((tag) =>
      tag.replace(/^#/, "").toLowerCase(),
    );

    // Rule must match ALL tags in the rule.tags array
    return rule.tags.every((targetTag) => {
      const normalizedTarget = targetTag.replace(/^#/, "").toLowerCase();
      return normalizedNoteTags.includes(normalizedTarget);
    });
  }
}
