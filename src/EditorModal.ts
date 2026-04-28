import { App, TFile } from "obsidian";
import { Rule } from "./Settings";
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
		const heading = this.rule.heading.trim();
		
		// Escape the heading for use in regex and ensure it starts at the beginning of a line
		const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const headingPattern = new RegExp(`(^${escapedHeading}\\s*$)`, "im");

		const updatedContent = headingPattern.test(fileContent)
			? fileContent.replace(headingPattern, `$1\n${content}`)
			: `${fileContent}\n\n${heading}\n${content}`;

		await this.app.vault.modify(this.file, updatedContent);
	}
}
