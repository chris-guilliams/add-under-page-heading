import { AddUnderPageHeadingSettings, Rule } from 'src/MyPluginSettings';
import { Modal, App, Notice, parseFrontMatterTags } from "obsidian";
import { EmbeddableMarkdownEditor } from './EmbeddableEditor';

export class BulkAddItemModal extends Modal {
    settings: AddUnderPageHeadingSettings;
    editor: EmbeddableMarkdownEditor;
  
    constructor(app: App, settings: AddUnderPageHeadingSettings) {
      super(app);
      this.settings = settings;
    }
  
    onOpen() {
      // Use an IIFE to handle the async initialization since onOpen must be void
      void (async () => {
        const { contentEl } = this;
        this.modalEl.addClass('add-under-page-heading-modal');
    
        contentEl.createEl('h2', { text: 'Add item to all matching notes' });
    
        // Dropdown for selecting a rule
        const select = contentEl.createEl('select');
        select.addClass('add-under-page-heading-margin-bottom');
        this.settings.rules.forEach((rule, index) => {
          const option = select.createEl('option', { text: `Rule ${index + 1}: ${rule.tag}` });
          option.value = index.toString();
        });
    
        // Input for the item to add
        const editorContainer = contentEl.createDiv({ cls: 'add-under-page-heading-editor-container' });

        this.editor = await EmbeddableMarkdownEditor.create(this.app, editorContainer, {
            value: "",
            onEnter: (editor, mod) => {
                if (mod) {
                  const ruleIndex = parseInt(select.value, 10);
                  const rule = this.settings.rules[ruleIndex];
                  this.addToAllMatchingNotes(rule, editor.value).catch(err => {
                      new Notice(`Error adding item: ${err}`);
                  });
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
              this.addToAllMatchingNotes(rule, editor.value).catch(err => {
                  new Notice(`Error adding item: ${err}`);
              });
            }
        });

        // Button to add the item
        const submitBtn = contentEl.createEl('button', { text: 'Add item to all' });
        
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
      })();
    }
  
    async addToAllMatchingNotes(rule: Rule, content: string) {
      const files = this.app.vault.getMarkdownFiles();
  
      const matchingFiles = files.filter((file) => {
        const metadata = this.app.metadataCache.getFileCache(file);
        const fileTags = parseFrontMatterTags(metadata?.frontmatter) || [];
  
        return fileTags.includes(rule.tag);
      });
  
      for (const file of matchingFiles) {
        const fileContent = await this.app.vault.read(file);
        const headingPattern = new RegExp(`(${rule.heading})`, "i");
  
        const updatedContent = headingPattern.test(fileContent)
          ? fileContent.replace(headingPattern, `$1\n${content}`)
          : `${fileContent}\n\n${rule.heading}\n${content}`;
  
        await this.app.vault.modify(file, updatedContent);
      }
    }
  
    onClose() {
      this.contentEl.empty();
    }
  }
