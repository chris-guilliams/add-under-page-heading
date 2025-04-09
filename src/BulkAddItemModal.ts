import { MyPluginSettings, Rule } from 'src/MyPluginSettings';
import { Modal, App, Notice, TFile } from "obsidian";
import { EmbeddableMarkdownEditor } from './EmbeddableEditor';

export class BulkAddItemModal extends Modal {
    settings: MyPluginSettings;
    editor: EmbeddableMarkdownEditor;
  
    constructor(app: App, settings: MyPluginSettings) {
      super(app);
      this.settings = settings;
    }
  
    onOpen() {
      const { contentEl } = this;
  
      contentEl.createEl('h2', { text: 'Add Item to All Matching Notes' });
  
      // Dropdown for selecting a rule
      const select = contentEl.createEl('select');
      select.style.marginBottom = "1rem";
      this.settings.rules.forEach((rule, index) => {
        const option = select.createEl('option', { text: `Rule ${index + 1}: ${rule.tag}` });
        option.value = index.toString();
      });
  
      // Input for the item to add
      const editorContainer = contentEl.createDiv();
      editorContainer.style.border = "1px solid var(--background-modifier-border)";
      editorContainer.style.padding = "8px";
      editorContainer.style.marginBottom = "1rem";

      this.editor = new EmbeddableMarkdownEditor(this.app, editorContainer, {
          value: "",
          onEnter: (editor, mod) => {
              if (mod) {
                const ruleIndex = parseInt(select.value, 10);
                const rule = this.settings.rules[ruleIndex];
                this.addToAllMatchingNotes(rule, editor.value);
                  return true;
              }
              return false;
          },
          onEscape: () => {
              this.close();
          },
          onSubmit: (editor) => {
            const ruleIndex = parseInt(select.value, 10);
            const rule = this.settings.rules[ruleIndex];
            this.addToAllMatchingNotes(rule, editor.value);
          }
      });

      // Button to add the item
      const submitBtn = contentEl.createEl('button', { text: 'Add Item to All' });
      
      submitBtn.onclick = async () => {
        const ruleIndex = parseInt(select.value, 10);
        const rule = this.settings.rules[ruleIndex];
        const itemContent = this.editor.value.trim();
  
        if (itemContent && rule) {
          await this.addToAllMatchingNotes(rule, itemContent);
          new Notice('Item added to all matching notes!');
          this.close();
        }
      };
    }
  
    async addToAllMatchingNotes(rule: Rule, content: string) {
      const files = this.app.vault.getMarkdownFiles();
  
      const matchingFiles = files.filter((file) => {
        const metadata = this.app.metadataCache.getFileCache(file);
        const fileTags = metadata?.frontmatter?.tags;
  
        if (typeof fileTags === 'string') {
          return fileTags === rule.tag;
        } else if (Array.isArray(fileTags)) {
          return fileTags.includes(rule.tag);
        }
  
        return false;
      });
  
      for (const file of matchingFiles) {
        const fileContent = await this.app.vault.read(file);
        const headingPattern = new RegExp(`(${rule.heading})`, "i");
  
        const updatedContent = headingPattern.test(fileContent)
          ? fileContent.replace(headingPattern, `$1\n- ${content}`)
          : `${fileContent}\n\n${rule.heading}\n- ${content}`;
  
        await this.app.vault.modify(file, updatedContent);
      }
    }
  
    onClose() {
      this.contentEl.empty();
    }
  }
  