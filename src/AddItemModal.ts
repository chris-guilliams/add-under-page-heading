import { Modal, TFile, App, Notice } from 'obsidian';
import { Rule, MyPluginSettings } from 'src/MyPluginSettings';

export class AddItemModal extends Modal {
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
		const title = contentEl.createEl("h2", { text: `Add item to ${this.file.basename}` });
		title.style.marginBottom = "1rem";

		const textarea = contentEl.createEl("textarea");
		textarea.style.display = "block";
		textarea.style.marginBottom = "1rem";
		textarea.style.width = "100%";
		textarea.style.height = "8rem"; // adjust height as needed
		textarea.placeholder = "Enter your note here...";

		const submitBtn = contentEl.createEl("button", { text: "Add" });
		submitBtn.style.display = "block";
		submitBtn.onclick = async () => {
			const noteContent = textarea.value;
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
