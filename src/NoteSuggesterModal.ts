import { App, FuzzySuggestModal, TFile } from "obsidian";
import { AddItemsToNotesFromCommandPalette } from "./Plugin";
import { Rule } from "./Settings";
import { EditorModal } from "./EditorModal";

interface NoteMatch {
	file: TFile;
	rule: Rule;
}

export class NoteSuggesterModal extends FuzzySuggestModal<NoteMatch> {
	constructor(app: App, private plugin: AddItemsToNotesFromCommandPalette) {
		super(app);
		this.setPlaceholder("Search for a note to add an item to...");
	}

	getItems(): NoteMatch[] {
		const files = this.app.vault.getMarkdownFiles();
		const matches: NoteMatch[] = [];

		this.plugin.settings.rules.forEach((rule) => {
			if (!rule.tags || rule.tags.length === 0) return;

			files
				.filter((file) => this.plugin.isFileMatch(file, rule))
				.forEach((file) => {
					matches.push({ file, rule });
				});
		});

		return matches;
	}

	getItemText(match: NoteMatch): string {
		return `${match.file.basename} (${match.rule.heading})`;
	}

	onChooseItem(match: NoteMatch, evt: MouseEvent | KeyboardEvent): void {
		new EditorModal(this.app, match.file, match.rule).open();
	}
}
