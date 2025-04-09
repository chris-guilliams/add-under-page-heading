import { App, Modal, TFile, MarkdownView, Notice } from "obsidian";
import { Rule } from "./MyPluginSettings";
import { EmbeddableMarkdownEditor } from "./EmbeddableEditor";

export class EditorModal extends Modal {
    file: TFile;
    rule: Rule;
    editorEl: HTMLDivElement;
    editor: EmbeddableMarkdownEditor;

    constructor(app: App, file: TFile, rule: Rule) {
        super(app);
        this.file = file;
        this.rule = rule;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: `Add item to ${this.file.basename}` });

        const editorContainer = contentEl.createDiv();
        editorContainer.style.border = "1px solid var(--background-modifier-border)";
        editorContainer.style.padding = "8px";
        editorContainer.style.marginBottom = "1rem";

        this.editor = new EmbeddableMarkdownEditor(this.app, editorContainer, {
            value: "",
            onEnter: (editor, mod) => {
                if (mod) {
                    this.submit(editor.value);
                    return true;
                }
                return false;
            },
            onEscape: () => {
                this.close();
            },
            onSubmit: (editor) => {
                this.submit(editor.value);
            }
        });

        const submitBtn = contentEl.createEl("button", { text: "Add" });
        submitBtn.style.marginTop = "1rem";

        submitBtn.onclick = async () => {
            const noteContent = this.editor.value.trim();
            if (!noteContent) return;

            const original = await this.app.vault.read(this.file);
            const headingPattern = new RegExp(`(${this.rule.heading})`, "i");

            const updatedContent = headingPattern.test(original)
                ? original.replace(headingPattern, `$1\n- ${noteContent}`)
                : `${original}\n\n${this.rule.heading}\n- ${noteContent}`;

            await this.app.vault.modify(this.file, updatedContent);
            new Notice("Item added!");
            this.close();
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

    async submit(content: string) {
        if (!content.trim()) return;

        const fileContent = await this.app.vault.read(this.file);
        const headingPattern = new RegExp(`(${this.rule.heading})`, "i");

        const updatedContent = headingPattern.test(fileContent)
            ? fileContent.replace(headingPattern, `$1\n${content}`)
            : `${fileContent}\n\n${this.rule.heading}\n${content}`;

        await this.app.vault.modify(this.file, updatedContent);
        new Notice("Item added!");
        this.close();
    }

    onClose() {
        this.contentEl.empty();
    }
}
