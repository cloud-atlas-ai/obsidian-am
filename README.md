# Obsidian Amazing Marvin Plugin

This plugin for [Obsidian](https://obsidian.md) enables synchronization with Amazing Marvin, a comprehensive task management and planning system. It is developed and maintained by your productivity friends at [Cloud Atlas](https://www.cloud-atlas.ai/) to facilitate a seamless integration for users who utilize both platforms.

## Amazing Marvin Plugin Overview

The Amazing Marvin Plugin provides a way to bring your tasks and project structures from Amazing Marvin directly into your Obsidian vault. It respects the Amazing Marvin hierarchy of categories and projects, creating a matching folder and note structure within Obsidian.

### Key Features

- **Sync Categories and Projects**: Converts Amazing Marvin categories and projects into Obsidian folders and notes, maintaining the original hierarchy.
- **Task Integration**: Transforms tasks into markdown checklist items, with nested subtasks properly indented.
- **Parent Links**: For easy navigation, notes for subcategories and subprojects include backlinks to their parent category or project.
- **Wiki Links**: Sub-Categories and projects Amazing Marvin are added as wiki links.
- **Categories and Projects are folder notes**: Categories and projects are created as folder notes, compatible with [Obsidian folder notes](https://github.com/LostPaul/obsidian-folder-notes).
- **Task Creation**: Users can create Amazing Marvin tasks directly within Obsidian, with support for standard Marvin shorthand notations like `+` for dates or `@` for labels.
- **Deep Linking**: Each task and category is equipped with a deep link, providing quick navigation back to Amazing Marvin.

## Usage Instructions

### Sync Direction

The Obsidian Amazing Marvin Plugin currently supports unidirectional synchronization. It imports and updates data from Amazing Marvin into your Obsidian vault, but it does not export or sync changes made in Obsidian back to Amazing Marvin.

### Sync Behavior

Each sync operation performs a fresh import:

- The plugin first removes the existing category/project notes and folders that were previously synchronized.
- It then creates new notes and folders based on the latest data from Amazing Marvin.

### Running a Sync

To initiate a sync:

1. Open Obsidian's Command Palette with `Ctrl/Cmd + P`.
2. Search for and select the command `Sync Amazing Marvin categories and projects`.
3. The plugin will then proceed to update your Obsidian vault with the current structure and content from Amazing Marvin.

Once synced, your Obsidian vault will contain a new `AmazingMarvin` folder. Inside, you'll find the structured notes corresponding to your categories and projects from Amazing Marvin.

### Creating a Marvin Task

The task creation dialog is designed to mirror the task input experience in Amazing Marvin closely. It includes the following features:

- Autocomplete for Categories and Projects using `#` syntax or a search sub-dialog.
- Recognizes shorthand notations for properties like start date (`~`), due date (`@`), and labels (`+`).
- Places a link to the Marvin task as a deep link in Obsidian at the cursor location upon task creation.
- The created Marvin task contains an Advanced URI-friendly link back to the Obsidian note that instigated the task.

To create a task:

1. Open Obsidian's Command Palette with `Ctrl/Cmd + P`.
2. Search for and select the command `Create Marvin Task`.
3. Input the task details and select the appropriate category from the dropdown, which shows suggestions as you type.
4. Upon task creation, a markdown checklist item with a link to the Marvin task is inserted at your cursor location in Obsidian.

### Auto-Mark as Done Feature

One of the highlights in this version is the ability to auto-mark tasks as done in Amazing Marvin when they are checked off in Obsidian. When this feature is enabled in the plugin settings, checking a task off in your Obsidian note will automatically update the task status in Amazing Marvin.

Here's how to enable this feature:

1. Go to `Settings > Obsidian Amazing Marvin Plugin`.
2. Check the option `Attempt to mark tasks as done in Amazing Marvin when checked off in Obsidian`.
3. Save your settings.

Now, when you check off a task with an Amazing Marvin Link in an Obsidian note, a request will be sent to Amazing Marvin to mark the task as done there as well.

### Important Considerations

- **Data Loss**: Be cautious when editing Amazing Marvin-generated notes in Obsidian, as these changes will be overwritten by the next sync.
- **Backup Recommended**: It's advisable to back up your Obsidian vault before running the sync, especially if you've made local modifications to the synchronized notes.

By following these guidelines, you can ensure your Amazing Marvin data is accurately reflected in Obsidian while being mindful of the plugin's current limitations.


## Installing

### Using BRAT

1. Install the BRAT plugin
    1. Open `Settings` -> `Community Plugins`
    2. Disable safe mode, if enabled
    3. *Browse*, and search for "BRAT"
    4. Install the latest version of **Obsidian42 - BRAT**
2. Open BRAT settings (`Settings` -> `BRAT`)
    1. Scroll to the `Beta Plugin List` section
    2. `Add Beta Plugin`
    3. Specify this repository: `cloud-atlas-ai/obsidian-am`
3. Enable the `Amazing Marvin` plugin (`Settings` -> `Community Plugins`)

### Manually

1. If you haven't enabled community plugins in Obsidian, follow these [instructions](https://help.obsidian.md/Extending+Obsidian/Community+plugins#Install+a+community+plugin) to do so.
2. Download `cloudatlas-obsidian-am.zip` from the [releases](https://github.com/cloud-atlas-ai/obsidian-am/releases).
3. Unzip the release and copy the directory into your vault's plugins folder: `<vault>/.obsidian/plugins/cloudatlas-o-am`.
4. Restart Obsidian to recognize the new plugin.
5. In Obsidian's settings under "Community Plugins," find and enable the Obsidian Amazing Marvin Plugin.
6. Add your key token to the plugin settings. You can find your key token in the [Amazing Marvin API page](https://app.amazingmarvin.com/pre?api).

## Development

1. Ensure NodeJS and npm are installed on your system.
2. Clone this repository.
3. Run `npm install` to install the dependencies.
4. Make your desired changes.
5. Use `npm run dev` to watch for changes and compile the plugin to `dist/main.js`.

For more detailed development instructions, refer to the [sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin) provided by Obsidian.

### Testing

While you're testing, you're going to send a lot of requests to the Amazing Marvin API. To avoid hitting the rate limit, you can use the Desktop local API server. See [Desktop Local API Server](https://help.amazingmarvin.com/en/articles/5165191-desktop-local-api-server) for more information. Once setup, you can specify the local API server in the plugin settings.

Note that the `/api/children` endpoint is not available in the local API server, always returning 404. I've followed up with the Amazing Marvin team to see if this can be added.
