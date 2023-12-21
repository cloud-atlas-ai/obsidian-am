import {
	Notice,
	Plugin,
	normalizePath,
	request,
	requestUrl,
} from "obsidian";


import {
	Category,
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
	categoriesEndpoint: `/api/categories`,
	childrenEndpoint: `/api/children`,
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
			name: 'Import Categories and Tasks',
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
			{ localServerHost: 'localhost', localServerPort: 12082 },
			await this.loadData()
		);
	}

	saveSettings() {
		this.saveData(this.settings);
	}

	async fetchMarvinData(endpoint: string) {
		const opt = this.settings;
		let response;
		let errorMessage = '';

		const url = `http://${opt.localServerHost}:${opt.localServerPort}${endpoint}`;
		console.debug('Fetching from local server:', url); // Log URL for debugging

		try {
			response = await requestUrl({url: url,
				headers: { 'X-API-Token': opt.apiKey }
			});

			if (response.status === 200) {
				return response.json;
			}

			errorMessage = `[${response.status}] ${await response.text}`;
		} catch (err) {
			errorMessage = err.message;
			console.error('Error fetching data from local server:', err);
		}

		if (!opt.useLocalServer || errorMessage) {
			try {
				response = await fetch(`https://serv.amazingmarvin.com${endpoint}`, {
					headers: { 'X-API-Token': opt.apiKey }
				});

				if (response.ok) {
					return response.json();
				}

				errorMessage = `[${response.status}] ${await response.text()}`;
			} catch (err) {
				errorMessage = err.message;
			}
		}

		throw new Error(`Error fetching data: ${errorMessage}`);
	}


	async sync() {
		try {
			this.app.vault.adapter.rmdir(CONSTANTS.baseDir, true);
			this.categories = await this.fetchTasksAndCategories(CONSTANTS.categoriesEndpoint);

			this.processCategories();
			this.processInbox();
		} catch (error) {
			console.error('Error syncing Amazing Marvin data:', error);
		}
	}

	async fetchTasksAndCategories(url: string): Promise<(Task | Category)[]> {
		try {
			const items = await this.fetchMarvinData(url) as (Task | Category)[];
			return items.map(item => this.decorateWithDeepLink(item));
		} catch (error) {
			console.error('Error fetching data from:', url, error);
			return [];
		}
	}

	decorateWithDeepLink(item: Task | Category): Task | Category {
		const isTask = !item.type || item.type === 'task';
		return {
			...item,
			deepLink: `https://app.amazingmarvin.com/#${isTask ? 't' : 'p'}=${item._id}`,
			type: isTask ? 'task' : item.type
		};
	}

	async processInbox() {
		const inboxItems = await this.fetchTasksAndCategories(`${CONSTANTS.childrenEndpoint}?parentId=unassigned`);
		const content = this.formatItems(inboxItems);

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

	formatItems(items: (Task | Category)[], level = 0, isSubtask = false) {
		let taskContent = '';
		let categoryContent = '';

		for (const item of items) {
			const indentation = ' '.repeat(level * 2);
			const isCategoryOrProject = item.type === 'category' || item.type === 'project';

			if (isCategoryOrProject) {
				// Handle category or project formatting
				const path = this.getPathForCategory(item);
				categoryContent += `${indentation}- [[${path}|${item.title}]] [⚓](${item.deepLink})\n`;
			} else {
				// Handle task formatting
				taskContent += `${indentation}- [${item.done ? 'x' : ' '}] ${item.title}`;
				if (!isSubtask) { // Only add deep links to top-level tasks
					taskContent += ` [⚓](${item.deepLink})`;
				}
				taskContent += '\n';

				// Recursively format sub-tasks if any
				if ('subtasks' in item && item.subtasks && Object.keys(item.subtasks).length > 0) {
					const subtasks = Object.values(item.subtasks);
					taskContent += this.formatItems(subtasks, level + 1, true); // Pass true for isSubtask
				}
			}
		}

		// Combine categories/projects and tasks into one content string
		let content = '';
		if (categoryContent) {
			content += `\n## Categories and Projects\n${categoryContent}`;
		}
		if (taskContent && !isSubtask) { // Only add "Tasks" header for top-level tasks
			content += `\n## Tasks\n${taskContent}`;
		} else if (isSubtask) {
			content += taskContent;
		}
		return content;
	}

	formatTaskDetails(task: Task | Category, indentation: string) {
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

		let content = `# [⚓](${category.deepLink}) ${category.title}\n\n`;

		// Link to parent category, if it exists
		if (category.parentId && category.parentId !== "root") {
			const parentCategory = this.categories.find(cat => cat._id === category.parentId);
			if (parentCategory) {
				content += `Back to [[${parentCategory.title}]]\n\n`;
			}
		}
		// Fetch and format tasks
		const children = await this.fetchTasksAndCategories(`${CONSTANTS.childrenEndpoint}?parentId=${category._id}`);
		content += this.formatItems(children);

		return yamlFrontmatter + content;
	}

}


