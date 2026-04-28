import { App, AbstractInputSuggest } from "obsidian";

/**
 * A native-style tag suggester for text inputs.
 * It reads all tags from the vault's metadata cache and provides autocomplete.
 */
export class TagSuggester extends AbstractInputSuggest<string> {
	private textInputEl: HTMLInputElement;
	private app: App;

	constructor(app: App, textInputEl: HTMLInputElement) {
		super(app, textInputEl);
		this.textInputEl = textInputEl;
		this.app = app;
	}

	getSuggestions(inputStr: string): string[] {
		// 1. Get the current word being typed (handling comma-separated lists)
		const cursorPosition = this.textInputEl.selectionStart || 0;
		const textBeforeCursor = inputStr.substring(0, cursorPosition);
		const words = textBeforeCursor.split(",");
		const currentWord = words[words.length - 1].trim().toLowerCase();

		if (currentWord.length === 0) {
			return [];
		}

		// 2. Fetch all unique tags from the vault
		const allTags = new Set<string>();
		const files = this.app.vault.getMarkdownFiles();
		
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache && cache.tags) {
				cache.tags.forEach(t => allTags.add(t.tag.toLowerCase()));
			}
			if (cache && cache.frontmatter && cache.frontmatter.tags) {
				const fmTags = Array.isArray(cache.frontmatter.tags) 
					? cache.frontmatter.tags 
					: [cache.frontmatter.tags];
				fmTags.forEach((t: string) => allTags.add(`#${t.replace(/^#/, '').toLowerCase()}`));
			}
		}

		// 3. Filter tags based on the current word
		const suggestions = Array.from(allTags).filter(tag => 
			tag.includes(currentWord) || tag.includes(`#${currentWord}`)
		);

		// 4. Return top 10 matches
		return suggestions.slice(0, 10);
	}

	renderSuggestion(tag: string, el: HTMLElement): void {
		el.setText(tag);
	}

	selectSuggestion(tag: string, evt: MouseEvent | KeyboardEvent): void {
		const currentText = this.textInputEl.value;
		const cursorPosition = this.textInputEl.selectionStart || 0;
		
		// Find the boundaries of the current word being typed
		const textBeforeCursor = currentText.substring(0, cursorPosition);
		const lastCommaIndex = textBeforeCursor.lastIndexOf(",");
		const prefix = lastCommaIndex !== -1 ? currentText.substring(0, lastCommaIndex + 1) + " " : "";
		const suffix = currentText.substring(cursorPosition);

		// Insert the tag and remove the '#' if the user doesn't want it (our plugin normalizes it anyway)
		const cleanTag = tag.replace(/^#/, '');
		
		this.textInputEl.value = `${prefix}${cleanTag}${suffix}`;
		
		// Trigger the input event so the Settings Tab saves the new value
		this.textInputEl.dispatchEvent(new Event("input"));
		this.close();
	}
}
