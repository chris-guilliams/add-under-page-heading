# Add Under Page Heading

Enables inserting note contents into other notes, or groups of notes, based on configured rules using an embedded editor.

Rules require a specified tag and heading. Once configured, files matching a rule's specified tag criteria will appear in the search list when using the command `Add Under Page Heading: Add item under page heading`.

Uses [Fevol](https://gist.github.com/Fevol)'s [Embeddable CM Markdown Editor solution](https://gist.github.com/Fevol/caa478ce303e69eabede7b12b2323838)

![Add Item Modal](./assets/command-palette-demo.gif)

## Commands

### `Add Under Page Heading: Add item under page heading`

Search through the files that match the currently configured rules. Selecting a file will open the embedded editor and allow the user to enter the content they wish to have inserted into the note under the specified heading.

### `Add Under Page Heading: Add item to all notes matching a rule`

Opens an embedded editor that includes dropdown that allows a user to select a specific rule from a list of configured rules. The content entered by the user will be inserted into every note matching the selected rule.

---

## Features

- Use the command palette to insert content into a specific note (or all notes) matching a configured rule under a specified heading
- Rules can be configured in the plugin settings to surface notes in the command palette
- Embedded Obsidian editor allows use of command palette options when entering content to insert

---

## How It Works

1. **Tag your notes** (in frontmatter) with things like `career`, `1-1`, `active`, etc.
2. **Define rules** in the plugin settings:
   - A `tag` to match against your notes’ frontmatter.
   - A `heading` under which new content should be inserted.
3. **Use the command palette** to choose a matching file or bulk insert into all files matching a specified rule.
4. A modal appears with a rich markdown editor.
5. Submit your entry—your content is inserted under the configured heading in the target file.

---

## Example Use Case

### Inserting Under a Heading of a Particular Note
You're a manager with a note like:

```markdown
---
tags: [direct-report, career, active]
---

## Career Discussion

- Deliver feedback regarding recent performance
```

If you've configured a rule with:

    tag: career
    heading: ## Career Discussion

You can run the command `Add Under Page Heading: Add item under page heading`, search for the specific note, then enter the content you would like to have inserted directly under the specified heading of that particular note.

![Add Item Modal](./assets/add-item-modal.png)

### Inserting Under a Heading of All Notes for a Given Rule

If there are multiple files within the Vault that match a configured rule and you would like to insert into all of them the command `Add Under Page Heading: Add item to all notes matching a rule`.


![Add Item Modal](./assets/add-to-all-matching-notes.png)

---

## Settings

It is planned for the setting `Global required tag` to be removed once rules are updated to support a list of tags.

![Settings](./assets//settings.png)

---

---

## Roadmap 

- Support for rules with multiple tags to match against, i.e. #projects and #active
    - Remove global tag setting
- Support default editor contents for rules
- Support inserting at top of note if no header is provided in rule configuration
- Automatically remove empty rules when Settings are closed
- Fix modal submit buttons dissappearing at shorter screen heights
- Support reordering of rules (allows priority for list in add item to all command)
- Support generating a command for a specific file and a list of files
- Support ribbon icon
- Support matching heading level in rule configuration

---

