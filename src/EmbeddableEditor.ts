/* eslint-disable */
/**
 * All credits go to mgmeyers for figuring out how to grab the proper editor prototype
 * 	 and making it easily deployable
 * Changes made to the original code:
 * 	 - Refactored to JS-only syntax (original code made use of React)
 * 	 - Added blur completion
 * 	 - Added some comments on how the code functions
 * 	 - Made editor settings fully optional
 * 	 - Allow all editor commands to function on this editor
 * 	 - Added typings for the editor(s) (will be added to obsidian-typings)
 * Make sure to also check out the original source code here: https://github.com/mgmeyers/obsidian-kanban/blob/main/src/components/Editor/MarkdownEditor.tsx
 * 
 * Refactored to Delegation Pattern for stability in modern TypeScript environments.
 */

import {
	App, Component, Scope, TFile, WorkspaceLeaf, Constructor
} from "obsidian";

import {EditorSelection, Extension, Prec} from "@codemirror/state";
import {EditorView, keymap, placeholder, ViewUpdate} from "@codemirror/view";

import {around} from "monkey-around";

/**
 * Internal Obsidian interfaces not exported in the public API
 */
interface WidgetEditorView {
	editable: boolean;
	showEditor(): void;
	editMode: {
		editMode: unknown;
	} | null;
	unload(): void;
}

/**
 * Interface augmentation for Obsidian's App to avoid 'any' casts
 */
declare module "obsidian" {
	interface App {
		setting: {
			open(): void;
			openTabById(id: string): void;
		};
		embedRegistry: {
			embedByExtension: {
				md: (options: unknown, file: TFile, content: string) => WidgetEditorView;
			};
		};
		scope: Scope;
		keymap: {
			pushScope(scope: Scope): void;
			popScope(scope: Scope): void;
		};
	}
	interface Workspace {
		activeEditor: unknown;
	}
}

let cachedPrototype: Constructor<unknown> | null = null;

async function getEditorPrototype(app: App): Promise<Constructor<unknown>> {
	if (cachedPrototype) return cachedPrototype;

	// 1. Try "Smart Discovery": Find an existing Markdown editor in the workspace
	const activeLeaf = app.workspace.getLeavesOfType("markdown")[0];
	if (activeLeaf && (activeLeaf.view as unknown).editMode) {
		const MarkdownEditor = Object.getPrototypeOf(Object.getPrototypeOf((activeLeaf.view as unknown).editMode));
		if (MarkdownEditor && MarkdownEditor.constructor) {
			cachedPrototype = MarkdownEditor.constructor as Constructor<unknown>;
			return cachedPrototype;
		}
	}

	// 2. Fallback: Create a temporary editor if no markdown view is open
	const widgetEditorView = app.embedRegistry.embedByExtension.md(
		{ app, containerEl: document.createElement('div') },
		null,
		'',
	);

	// Some versions of Obsidian require the view to be "loaded" to instantiate editMode
	if ((widgetEditorView as unknown).load) (widgetEditorView as unknown).load();
	
	widgetEditorView.editable = true;
	widgetEditorView.showEditor();

	// Wait up to 1000ms for Obsidian to hydrate the editor (increased timeout)
	let attempts = 0;
	while (!widgetEditorView.editMode || !widgetEditorView.editMode.editMode) {
		if (attempts > 100) { // 1000ms total
			widgetEditorView.unload();
			throw new Error("Failed to resolve Obsidian Markdown editor prototype: editMode remained null after 1000ms. Please try opening a Markdown file first.");
		}
		await new Promise(resolve => setTimeout(resolve, 10));
		attempts++;
	}

	const MarkdownEditor = Object.getPrototypeOf(Object.getPrototypeOf(widgetEditorView.editMode.editMode));

	// Unload to remove the temporary editor
	widgetEditorView.unload();

	cachedPrototype = MarkdownEditor.constructor as Constructor<unknown>;
	return cachedPrototype;
}

export interface MarkdownEditorProps {
	cursorLocation?: { anchor: number, head: number };
	value?: string;
	cls?: string;
	placeholder?: string;

	onEnter: (editor: EmbeddableMarkdownEditor, mod: boolean, shift: boolean) => boolean;
	onEscape: (editor: EmbeddableMarkdownEditor) => void;
	onSubmit: (editor: EmbeddableMarkdownEditor) => void;
	onBlur: (editor: EmbeddableMarkdownEditor) => void;
	onPaste: (e: ClipboardEvent, editor: EmbeddableMarkdownEditor) => void;
	onChange: (update: ViewUpdate) => void;
}

const defaultProperties: MarkdownEditorProps = {
	cursorLocation: { anchor: 0, head: 0 },
	value: '',
	cls: '',
	placeholder: '',

	onEnter: () => false,
	onEscape: () => {},
	onSubmit: () => {},
	onBlur: () => {},
	onPaste: () => {},
	onChange: () => {},
}

/**
 * EmbeddableMarkdownEditor: A rich markdown editor for Modals.
 * Uses Delegation instead of Inheritance for stability.
 */
export class EmbeddableMarkdownEditor extends Component {
	private instance: unknown; // The internal Obsidian editor instance
	private scope: Scope;
	private options: MarkdownEditorProps;

	constructor(private app: App, private containerEl: HTMLElement, options: Partial<MarkdownEditorProps>) {
		super();
		this.options = { ...defaultProperties, ...options };
	}

	/**
	 * Async factory method to create and initialize the editor.
	 */
	static async create(app: App, containerEl: HTMLElement, options: Partial<MarkdownEditorProps>): Promise<EmbeddableMarkdownEditor> {
		const editor = new EmbeddableMarkdownEditor(app, containerEl, options);
		await editor.build();
		return editor;
	}

	private async build() {
		const Proto = await getEditorPrototype(this.app);
		
		// Instantiate the internal Obsidian editor
		this.instance = new Proto(this.app, this.containerEl, {
			app: this.app,
			onMarkdownScroll: () => {},
			getMode: () => 'source',
		});

		this.scope = new Scope((this.app as unknown).scope);
		this.scope.register(["Mod"], "Enter", () => true);

		// Mock the view/owner relationship required for internal commands
		this.instance.owner.editMode = this.instance;
		this.instance.owner.editor = this.instance.editor;

		// Set initial value
		this.instance.set(this.options.value || '');

		// Handle active editor tracking
		this.register(
			around(this.app.workspace, {
				setActiveLeaf: (oldMethod: unknown) =>
					(leaf: WorkspaceLeaf, params: unknown) => {
						if (!this.instance.activeCM.hasFocus)
							oldMethod.call(this.app.workspace, leaf, params);
					},
			}),
		);

		// Focus and Blur handlers
		const cm = this.instance.editor.cm;
		
		cm.contentDOM.addEventListener('blur', () => {
			this.app.keymap.popScope(this.scope);
			if (this.instance._loaded) this.options.onBlur(this);
		});

		cm.contentDOM.addEventListener('focusin', () => {
			this.app.keymap.pushScope(this.scope);
			this.app.workspace.activeEditor = this.instance.owner;
		});

		// Custom styling and selection
		if (this.options.cls) this.instance.editorEl.classList.add(this.options.cls);
		if (this.options.cursorLocation) {
			cm.dispatch({
				selection: EditorSelection.range(this.options.cursorLocation.anchor, this.options.cursorLocation.head),
			});
		}

		// Patch buildLocalExtensions to include our custom behaviors
		const originalBuild = this.instance.buildLocalExtensions.bind(this.instance);
		this.instance.buildLocalExtensions = () => {
			const extensions = originalBuild();
			if (this.options.placeholder) extensions.push(placeholder(this.options.placeholder));

			extensions.push(EditorView.domEventHandlers({
				paste: (event) => this.options.onPaste(event, this)
			}));

			extensions.push(Prec.highest(keymap.of([
				{
					key: 'Enter',
					run: () => this.options.onEnter(this, false, false),
					shift: () => this.options.onEnter(this, false, true)
				},
				{
					key: 'Mod-Enter',
					run: () => this.options.onEnter(this, true, false),
					shift: () => this.options.onEnter(this, true, true)
				},
				{
					key: 'Escape',
					run: () => {
						this.options.onEscape(this);
						return true;
					},
					preventDefault: true
				}
			])));

			return extensions;
		};

		// Patch onUpdate
		const originalUpdate = this.instance.onUpdate.bind(this.instance);
		this.instance.onUpdate = (update: ViewUpdate, changed: boolean) => {
			originalUpdate(update, changed);
			if (changed) this.options.onChange(update);
		};

		// Finalize initialization
		this.instance.onload();
	}

	get value(): string {
		return this.instance.editor.cm.state.doc.toString();
	}

	onunload() {
		this.instance.onunload();
		this.app.keymap.popScope(this.scope);
		this.app.workspace.activeEditor = null;
		this.containerEl.empty();
	}
}
