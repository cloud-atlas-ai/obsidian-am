import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	TFile,
	normalizePath,
} from "obsidian";

import { ViewUpdate, EditorView, ViewPlugin } from "@codemirror/view";

import {
	Category,
	CategoryType,
	Task
} from "./interfaces";

import {
	AmazingMarvinSettingsTab,
	AmazingMarvinPluginSettings,
} from "./settings";

let noticeTimeout: NodeJS.Timeout;

const animateNotice = (notice: Notice) => {
	let message = notice.noticeEl.innerText;
	const dots = [...message].filter((c) => c === ".").length;
	if (dots == 0) {
		message = message.replace("    ", " .  ");
	} else if (dots == 1) {
		message = message.replace(" .  ", " .. ");
	} else if (dots == 2) {
		message = message.replace(" .. ", " ...");
	} else if (dots == 3) {
		message = message.replace(" ...", "    ");
	}
	notice.setMessage(message);
	noticeTimeout = setTimeout(() => animateNotice(notice), 500);
};

const CONSTANTS = {
	baseDir: "AmazingMarvin",
}

export default class AmazingMarvinPlugin extends Plugin {
	settings: AmazingMarvinPluginSettings;
	categories: Category[] = [];

	createFolder = async (path: string) => {
		try {
			await this.app.vault.createFolder(path);
		} catch (e) {
			console.debug(e);
		}
	};

	create = async (path: string, content: string) => {
		try {
			await this.app.vault.create(path, content);
		} catch (e) {
			console.debug(e);
		}
	};

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new AmazingMarvinSettingsTab(this.app, this));

		this.addCommand({
			id: 'ca-am-sync',
			name: 'Import Amazing Marvin',
			callback: () => {
				this.sync().then(() => {
					new Notice('Amazing Marvin data imported successfully.');
				}).catch((error) => {
					console.error('Sync error:', error);
					new Notice('Error syncing with Amazing Marvin.');
				});
			}
		});
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			await this.loadData()
		);
	}

	saveSettings() {
		this.saveData(this.settings);
	}

	async fetchMarvinData(url: string) {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				['X-API-Token']: this.settings.apiKey,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}

		return response.json();
	}


	async sync() {
		const baseUrl = 'https://serv.amazingmarvin.com/api';

		try {
			this.app.vault.adapter.rmdir(CONSTANTS.baseDir, true);
			// Fetch Categories and Projects
			this.categories = await this.fetchMarvinData(`${baseUrl}/categories`);

			this.processCategories();
			this.processInbox();
		} catch (error) {
			console.error('Error syncing Amazing Marvin data:', error);
		}
	}

	async fetchInboxItems() {
		const baseUrl = 'https://serv.amazingmarvin.com/api/children';
		const inboxUrl = `${baseUrl}?parentId=unassigned`;

		try {
			return await this.fetchMarvinData(inboxUrl) as Task[];
		} catch (error) {
			console.error('Error fetching Amazing Marvin Inbox items:', error);
			return [];
		}
	}

	async processInbox() {
		const inboxItems = await this.fetchInboxItems();
		const content = this.formatTasks(inboxItems);

		// Define the path for the Inbox file
		const inboxFilePath = normalizePath("AmazingMarvin/Inbox.md");

		await this.createOrUpdate(inboxFilePath, content);
	}

	async createOrUpdate(path: string, content: string) {
		const normalizedPath = normalizePath(path);
		let dirPath = normalizedPath.replace(/^(.+)\/[^\/]*?$/, '$1');

		// Ensure the directory exists
		if (!await this.app.vault.adapter.exists(dirPath)) {
			await this.app.vault.createFolder(dirPath);
		}

		// Overwrite existing file
		if (await this.app.vault.adapter.exists(normalizedPath)) {
			const existingContent = await this.app.vault.adapter.remove(normalizedPath);
		}

		await this.app.vault.create(normalizedPath, content);
	}

	getPathForCategory(category: Category) {
		let pathSegments: string[] = [];

		// Function to recursively build the path segments array
		const buildPathSegments = (cat: Category) => {
			const safeTitle = cat.title.replace(/[^a-zA-Z0-9 -]/g, "");
			pathSegments.unshift(safeTitle); // Add at the beginning

			if (cat.parentId && cat.parentId !== "root") {
				const parentCat = this.categories.find(c => c._id === cat.parentId);
				if (parentCat) {
					buildPathSegments(parentCat);
				}
			}
		};

		buildPathSegments(category);

		// Determine the filename and if the category should be a folder based on its children
		const hasChildCategoriesOrProjects = this.categories.some(cat =>
			cat.parentId === category._id && (cat.type === 'project' || cat.type === 'category')
		);

		// If the category has children that are categories or projects, make it a folder
		const isFolder = hasChildCategoriesOrProjects;

		// Construct the path
		let path = `${CONSTANTS.baseDir}/${pathSegments.join('/')}`;
		path = isFolder ? `${path}/${category.title}.md` : `${path}.md`;

		return normalizePath(path);
	}

	async processCategories() {
		for (const category of this.categories) {
			const path = this.getPathForCategory(category);
			const content = this.createContentForCategory(category);

			try {
				await this.createOrUpdate(path, await content);
			} catch (e) {
				console.error(`Error creating file for ${path}:`, e);
			}
		}
	}

	async fetchTasks(categoryId: string): Promise<Task[]> {
		const baseUrl = 'https://serv.amazingmarvin.com/api/children';
		const url = `${baseUrl}?parentId=${categoryId}`;

		try {
			return await this.fetchMarvinData(url) as Task[];
		} catch (error) {
			console.error('Error fetching children for categoryId ID:', categoryId, error);
			return [];
		}
	}

	formatTasks(tasks: any[], level = 0) {

		let content = '';

		// Add a section for tasks (if you plan to include tasks within the same note)
		content += `\n## Tasks\n`;

		for (const task of tasks) {
			// Indentation for nested tasks
			const indentation = ' '.repeat(level * 2);

			// Checkbox for task completion
			content += `${indentation}- [${task.done ? 'x' : ' '}] `;

			content += ` [⚓](https://app.amazingmarvin.com/#t=${task._id}) `;

			// task details
			content += this.formatTaskDetails(task, indentation);

			if (task.type === 'project' || task.type === 'category') {
				const path = this.getPathForCategory(task); // Assuming similar structure for projects
				content += `[[${path}|${task.title}]]`;
			} else {
				// Regular task formatting
				content += this.formatTaskDetails(task, indentation) + task.title;
			}
			content += '\n';

			// Recursively format sub-tasks
			if (task.subtasks && Object.keys(task.subtasks).length > 0) {
				const subtasks = Object.values(task.subtasks);
				content += this.formatTasks(subtasks, level + 1);
			}
		}

		return content;
	}

	formatTaskDetails(task: Task, indentation: string) {
		let details = '';

		// Example of adding some task details - expand as needed
		if (task.dueDate) {
			details += `Due Date:: [[${task.dueDate}]] `;
		}
		if (task.startDate) {
			details += `Start Date:: [[${task.startDate}]] `;
		}
		// Add other relevant properties here...

		return details;
	}

	async createContentForCategory(category: Category): Promise<string> {
		let yamlFrontmatter = "---\n";

		// Iterate over category properties and add non-null values to YAML frontmatter
		for (const [key, value] of Object.entries(category)) {
				if (value !== null && value !== undefined) {
						const safeValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
						yamlFrontmatter += `${key}: ${safeValue}\n`;
				}
		}

		// Close YAML frontmatter block
		yamlFrontmatter += "---\n";

		let content = `# [⚓](https://app.amazingmarvin.com/#p=${category._id}) ${category.title}\n\n`;

		// Link to parent category, if it exists
		if (category.parentId && category.parentId !== "root") {
			const parentCategory = this.categories.find(cat => cat._id === category.parentId);
			if (parentCategory) {
				content += `Back to [[${parentCategory.title}]]\n\n`;
			}
		}

		// Add metadata if available
		if (category.note) {
			content += `**Note:** ${category.note}\n\n`;
		}

		if (category.startDate) {
			content += `**Start Date::** ${category.startDate}\n`;
		}

		if (category.endDate) {
			content += `**End Date::** ${category.endDate}\n`;
		}

		if (category.isRecurring) {
			content += `**Recurring::** Yes\n`;
		}

		if (category.priority) {
			content += `**Priority::** ${category.priority}\n`;
		}

		// Fetch and format tasks
		const tasks = await this.fetchTasks(category._id);
		content += this.formatTasks(tasks);

		return yamlFrontmatter + content;
	}

}


