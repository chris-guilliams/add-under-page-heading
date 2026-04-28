import { App, Modal, Notice } from "obsidian";
import { EmbeddableMarkdownEditor } from "./EmbeddableEditor";

/**
 * BaseItemModal: A shared base for all modals that use the rich markdown editor.
 * Handles UI setup, editor initialization, and styling.
 */
export abstract class BaseItemModal extends Modal {
    protected editor: EmbeddableMarkdownEditor;
    protected title: string;

    constructor(app: App, title: string) {
        super(app);
        this.title = title;
    }

    /**
     * Optional hook for subclasses to add extra UI elements above the editor.
     */
    renderHeader(contentEl: HTMLElement): void {
        // Default: no-op
    }

    /**
     * The actual action to perform when the user submits their input.
     * Must be implemented by subclasses.
     */
    abstract onSubmit(content: string): Promise<void>;

    onOpen() {
        void (async () => {
            const { contentEl } = this;
            this.modalEl.addClass('add-under-page-heading-modal');

            contentEl.createEl("h2", { text: this.title });

            // Hook for subclasses to add extra UI elements (e.g. dropdowns)
            this.renderHeader(contentEl);

            const editorContainer = contentEl.createDiv({ 
                cls: 'add-under-page-heading-editor-container' 
            });

            this.editor = await EmbeddableMarkdownEditor.create(this.app, editorContainer, {
                value: "",
                onEscape: () => this.close(),
                onSubmit: () => {
                    void this.handleSubmission(this.editor.value);
                }
            });

            this.editor.focus();

            const submitBtn = contentEl.createEl("button", { text: "Add", cls: "mod-cta" });
            submitBtn.onclick = () => void this.handleSubmission(this.editor.value);
        })();
    }

    private async handleSubmission(content: string) {
        const trimmed = content.trim();
        if (!trimmed) return;

        try {
            await this.onSubmit(trimmed);
            new Notice("Item added");
            this.close();
        } catch (err) {
            new Notice(`Error adding item: ${err}`);
        }
    }

    onClose() {
        if (this.editor) {
            this.editor.onunload();
        }
        this.contentEl.empty();
    }
}
