import { App } from "obsidian";
import { BaseItemModal } from './BaseItemModal';
import { AddItemsToNotesFromCommandPalette } from './Plugin';

/**
 * BulkAddItemModal: Adds content to all notes matching a selected rule.
 */
export class BulkAddItemModal extends BaseItemModal {
    private selectEl: HTMLSelectElement;
  
    constructor(app: App, private plugin: AddItemsToNotesFromCommandPalette) {
      super(app, 'Add item to all notes that match a rule');
    }

    renderHeader(contentEl: HTMLElement): void {
        this.selectEl = contentEl.createEl('select', { 
            cls: 'add-under-page-heading-margin-bottom' 
        });

        this.plugin.settings.rules.forEach((rule, index) => {
            const option = this.selectEl.createEl('option', { text: `Rule ${index + 1}: ${rule.tags.join(", ")}` });
            option.value = index.toString();
        });
    }
  
    async onSubmit(content: string): Promise<void> {
        const ruleIndex = parseInt(this.selectEl.value, 10);
        const rule = this.plugin.settings.rules[ruleIndex];
        if (!rule) return;

        const files = this.app.vault.getMarkdownFiles();
        const matchingFiles = files.filter((file) => {
            return this.plugin.isFileMatch(file, rule);
        });
    
        for (const file of matchingFiles) {
            const fileContent = await this.app.vault.read(file);
            const heading = rule.heading.trim();
            const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const headingPattern = new RegExp(`(^${escapedHeading}\\s*$)`, "im");
    
            const updatedContent = headingPattern.test(fileContent)
                ? fileContent.replace(headingPattern, `$1\n${content}`)
                : `${fileContent}\n\n${heading}\n${content}`;
    
            await this.app.vault.modify(file, updatedContent);
        }
    }
}
