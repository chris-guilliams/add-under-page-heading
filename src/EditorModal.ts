import { App, TFile } from "obsidian";
import { Rule } from "./MyPluginSettings";
import { BaseItemModal } from "./BaseItemModal";

/**
 * EditorModal: Adds content to a specific heading in a single note.
 */
export class EditorModal extends BaseItemModal {
	constructor(app: App, private file: TFile, private rule: Rule) {
		super(app, `Add item to ${file.basename}`);
	}

	async onSubmit(content: string): Promise<void> {
		const fileContent = await this.app.vault.read(this.file);
		const headingPattern = new RegExp(`(${this.rule.heading})`, "i");

		const updatedContent = headingPattern.test(fileContent)
			? fileContent.replace(headingPattern, `$1\n${content}`)
			: `${fileContent}\n\n${this.rule.heading}\n${content}`;

		await this.app.vault.modify(this.file, updatedContent);
	}
}
