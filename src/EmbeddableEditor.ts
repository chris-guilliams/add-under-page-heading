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

	// 1. Try "Smart Discovery"
	const activeLeaf = app.workspace.getLeavesOfType("markdown")[0];
	if (activeLeaf && (activeLeaf.view as any).editMode) {
		const MarkdownEditor = Object.getPrototypeOf(Object.getPrototypeOf((activeLeaf.view as any).editMode));
		if (MarkdownEditor && MarkdownEditor.constructor) {
			cachedPrototype = MarkdownEditor.constructor as Constructor<unknown>;
			return cachedPrototype;
		}
	}

	// 2. Fallback
	const widgetEditorView = app.embedRegistry.embedByExtension.md(
		{ app, containerEl: document.createElement('div') },
		null,
		'',
	);

	if (widgetEditorView.load) widgetEditorView.load();
	widgetEditorView.editable = true;
	widgetEditorView.showEditor();

	let attempts = 0;
	while (!widgetEditorView.editMode || !widgetEditorView.editMode.editMode) {
		if (attempts > 100) {
			widgetEditorView.unload();
			throw new Error("Failed to resolve Obsidian Markdown editor prototype.");
		}
		await new Promise(resolve => setTimeout(resolve, 10));
		attempts++;
	}

	const MarkdownEditor = Object.getPrototypeOf(Object.getPrototypeOf(widgetEditorView.editMode.editMode));
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
	private instance: any; // The internal Obsidian editor instance
	private scope: Scope;
	private options: MarkdownEditorProps;
	private isScopePushed = false;

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

		this.scope = new Scope((this.app as any).scope);
		this.scope.register(["Mod"], "Enter", () => {
			this.options.onSubmit(this);
			return true;
		});
		this.scope.register([], "Escape", () => {
			this.options.onEscape(this);
			return true;
		});

		// Mock the view/owner relationship required for internal commands
		this.instance.owner.editMode = this.instance;
		this.instance.owner.editor = this.instance.editor;

		// Set initial value
		this.instance.set(this.options.value || '');

		// Handle active editor tracking
		this.register(
			around(this.app.workspace, {
				setActiveLeaf: (oldMethod: (leaf: WorkspaceLeaf, pushHistory?: boolean, focus?: boolean) => void) =>
					(leaf: WorkspaceLeaf, pushHistory?: boolean, focus?: boolean) => {
						if (!this.instance.activeCM.hasFocus)
							oldMethod.call(this.app.workspace, leaf, pushHistory, focus);
					},
			}),
		);

		// Focus and Blur handlers
		const cm = this.instance.editor.cm;
		
		cm.contentDOM.addEventListener('blur', () => {
			if (this.isScopePushed) {
				this.app.keymap.popScope(this.scope);
				this.isScopePushed = false;
			}
			if (this.instance._loaded && this.options.onBlur) this.options.onBlur(this);
		});

		cm.contentDOM.addEventListener('focusin', () => {
			if (!this.isScopePushed) {
				this.app.keymap.pushScope(this.scope);
				this.isScopePushed = true;
			}
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
		const originalBuild = this.instance.buildLocalExtensions.bind(this.instance) as () => Extension[];
		this.instance.buildLocalExtensions = () => {
			const extensions = originalBuild();
			if (this.options.placeholder) extensions.push(placeholder(this.options.placeholder));

			extensions.push(EditorView.domEventHandlers({
				paste: (event) => {
					if (this.options.onPaste) this.options.onPaste(event, this);
				}
			}));

			return extensions;
		};

		// Patch onUpdate
		const originalUpdate = this.instance.onUpdate.bind(this.instance);
		this.instance.onUpdate = (update: ViewUpdate, changed: boolean) => {
			originalUpdate(update, changed);
			if (this.options.onChange) this.options.onChange(update);
		};

		// Finalize initialization
		this.instance.onload();
	}

	get value(): string {
		return this.instance.editor.cm.state.doc.toString();
	}

	focus() {
		this.instance.editor.cm.focus();
	}

	onunload() {
		this.instance.onunload();
		if (this.isScopePushed) {
			this.app.keymap.popScope(this.scope);
			this.isScopePushed = false;
		}
		this.app.workspace.activeEditor = null;
		this.containerEl.empty();
	}
}
