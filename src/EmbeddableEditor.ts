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
	App, Component, Scope, TFile, WorkspaceLeaf, View
} from "obsidian";

import {EditorSelection, Extension} from "@codemirror/state";
import {EditorView, placeholder, ViewUpdate} from "@codemirror/view";

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
	load?(): void;
}

interface InternalMarkdownEditor {
	owner: InternalMarkdownView;
	editor: {
		cm: EditorView;
	};
	activeCM: EditorView & { hasFocus: boolean };
	_loaded: boolean;
	editorEl: HTMLElement;
	set(value: string): void;
	buildLocalExtensions(): Extension[];
	onUpdate(update: ViewUpdate, changed: boolean): void;
	onload(): void;
	onunload(): void;
}

interface InternalMarkdownView extends View {
	editMode: InternalMarkdownEditor;
	editor: InternalMarkdownEditor['editor'];
}

type EditorConstructor = new (app: App, containerEl: HTMLElement, options: unknown) => InternalMarkdownEditor;

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
				md: (options: unknown, file: TFile | null, content: string) => WidgetEditorView;
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

let cachedPrototype: EditorConstructor | null = null;

async function getEditorPrototype(app: App): Promise<EditorConstructor> {
	if (cachedPrototype) return cachedPrototype;

	// 1. Try "Smart Discovery"
	const activeLeaf = app.workspace.getLeavesOfType("markdown")[0];
	if (activeLeaf) {
		const view = activeLeaf.view as InternalMarkdownView;
		if (view.editMode) {
			const MarkdownEditor = Object.getPrototypeOf(Object.getPrototypeOf(view.editMode)) as { constructor: EditorConstructor };
			if (MarkdownEditor && MarkdownEditor.constructor) {
				cachedPrototype = MarkdownEditor.constructor;
				return cachedPrototype;
			}
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

	const MarkdownEditor = Object.getPrototypeOf(Object.getPrototypeOf(widgetEditorView.editMode.editMode)) as { constructor: EditorConstructor };
	widgetEditorView.unload();

	cachedPrototype = MarkdownEditor.constructor;
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
 */
export class EmbeddableMarkdownEditor extends Component {
	private instance: InternalMarkdownEditor; // The internal Obsidian editor instance
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

		this.scope = new Scope(this.app.scope);
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

		// Patch internal methods
		this.register(
			around(this.instance, {
				buildLocalExtensions: (oldMethod) => () => {
					const extensions = (oldMethod.call(this.instance) as Extension[]);
					if (this.options.placeholder) {
						extensions.push(placeholder(this.options.placeholder));
					}

					extensions.push(EditorView.domEventHandlers({
						paste: (event) => {
							if (this.options.onPaste) this.options.onPaste(event, this);
							return false;
						}
					}));

					return extensions;
				},
				onUpdate: (oldMethod) => (update: ViewUpdate, changed: boolean) => {
					(oldMethod.call(this.instance, update, changed) as void);
					if (this.options.onChange) this.options.onChange(update);
				}
			})
		);

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
