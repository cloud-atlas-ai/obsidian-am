import {
	Notice,
	Plugin,
	normalizePath,
	requestUrl,
} from "obsidian";

import {
	Category,
	Task
} from "./interfaces";

import {
	AmazingMarvinSettingsTab,
	AmazingMarvinPluginSettings,
	DEFAULT_SETTINGS,
} from "./settings";

import {
	getDateFromFile
} from "obsidian-daily-notes-interface";
import { amTaskWatcher } from "./amTaskWatcher";
import { AddTaskModal } from "./addTaskModal";
import { time } from "console";

function getAMTimezoneOffset() {
	return new Date().getTimezoneOffset() * -1;
}

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
	setTimeout(() => animateNotice(notice), 500);
};

const CONSTANTS = {
	baseDir: "AmazingMarvin",
	categoriesEndpoint: '/api/categories',
	childrenEndpoint: '/api/children',
	scheduledOnDayEndpoint: '/api/todayItems',
	dueOnDayEndpoint: '/api/dueItems',
	addTaskEndpoint: '/api/addTask',
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
		if (this.settings.attemptToMarkTasksAsDone) {
			this.registerEditorExtension(amTaskWatcher(this.app, this));
		}

		this.addCommand({
			id: "create-marvin-task",
			name: "Create Marvin Task",
			editorCallback: async (editor, view) => {
				// Fetch categories first and make sure they are loaded
				try {

					//if a region of text is selected, at least 3 characters long, use that to add a new task and skip the modal
					if (editor.somethingSelected() && editor.getSelection().length > 2) {
						this.addMarvinTask('', editor.getSelection(), view.file?.path, this.app.vault.getName()).then(task => {
							editor.replaceSelection(`- [${task.done ? 'x' : ' '}] [⚓](${task.deepLink}) ${this.formatTaskDetails(task as Task, '')} ${task.title}`);
						}).catch(error => {
							new Notice('Could not create Marvin task: ' + error.message);
						});
						return;
					}

					const categories = await this.fetchTasksAndCategories(CONSTANTS.categoriesEndpoint);
					// Ensure categories are fetched before initializing the modal
					if (categories.length > 0) {
						new AddTaskModal(this.app, categories, async (taskDetails: { catId: string, task: string }) => {
							this.addMarvinTask(taskDetails.catId, taskDetails.task, view.file?.path, this.app.vault.getName())
								.then(task => {
									editor.replaceRange(`- [${task.done ? 'x' : ' '}] [⚓](${task.deepLink}) ${this.formatTaskDetails(task as Task, '')} ${task.title}`, editor.getCursor());
								})
								.catch(error => {
									new Notice('Could not create Marvin task: ' + error.message);
								});
						}).open();
					} else {
						// Handle the case where categories could not be loaded
						new Notice('Failed to load categories from Amazing Marvin.');
					}
				} catch (error) {
					console.error('Error fetching categories:', error);
					new Notice('Failed to load categories from Amazing Marvin.');
				}
			}
		});

		this.addCommand({
			id: 'am-import',
			name: 'Import Categories and Tasks',
			callback: () => {
				animateNotice(new Notice('Importing from Amazing Marvin...'));
				this.sync().then(() => {
					new Notice('Amazing Marvin data imported successfully.');
				}).catch((error) => {
					console.error('Sync error:', error);
					new Notice('Error syncing with Amazing Marvin.');
				});
			}
		});
		this.addCommand({
			id: "am-import-today",
			name: "Import Today's Tasks",
			editorCallback: async (editor, view) => {
				try {
					const today = new Date().toISOString().split('T')[0];
					const fileDate = view.file ? getDateFromFile(view.file, "day")?.format("YYYY-MM-DD") : today;

					const date = fileDate ? fileDate : today;
					let tasks = [];
					if (this.settings.todayTasksToShow === 'due' || this.settings.todayTasksToShow === 'both') {
						const dueTasks = await this.getDueTasks(date);
						tasks.push(...dueTasks);
					}
					if (this.settings.todayTasksToShow === 'scheduled' || this.settings.todayTasksToShow === 'both') {
						const scheduledTasks = await this.getScheduledTasks(date);
						tasks.push(...scheduledTasks);
					}

					editor.replaceRange(this.formatItems(tasks, 1, false), editor.getCursor());
				} catch (error) {
					new Notice(`Error importing scheduled tasks: ${error}`);
					console.error(`Error importing scheduled tasks: ${error}`);
				}
			}
		});

	}
	async addMarvinTask(catId: string, taskTitle: string, notePath: string = '', vaultName: string = ''): Promise<Task> {
		const opt = this.settings;

		let requestBody: any = {
			title: taskTitle,
			timeZoneOffset: getAMTimezoneOffset(),
		};

		if (catId && catId !== '' && catId !== 'root' && catId !== '__inbox-faux__') {
			requestBody.parentId = catId;
		}

		if (notePath && notePath !== '') {
			requestBody.note = `[🏷️](obsidian://advanced-uri?filePath=${notePath}${vaultName !== '' ? `&vault=${vaultName}` : ''})`;
		}

		try {
			const remoteResponse = await requestUrl({
				url: `https://serv.amazingmarvin.com/api/addTask`,
				method: 'POST',
				headers: {
					'X-API-Token': opt.apiKey,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (remoteResponse.status === 200) {
				new Notice("Task added in Amazing Marvin.");
				return this.decorateWithDeepLink(remoteResponse.json) as Task;
			}
		} catch (error) {
			const errorNote = document.createDocumentFragment();
			errorNote.appendText('Error creating task in Amazing Marvin. Try again or do it ');
			const a = document.createElement('a');
			a.href = 'https://app.amazingmarvin.com/';
			a.text = 'manually';
			a.target = '_blank';
			errorNote.appendChild(a);
			errorNote.appendText('.');

			new Notice(errorNote, 0);
			console.error('Error creating task:', error);
		}
		return Promise.reject(new Error('Error creating task'));
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	saveSettings() {
		this.saveData(this.settings);
	}

	async markDone(taskId: string) {
		const opt = this.settings;
		const requestBody = {
			itemId: taskId,
			timeZoneOffset: getAMTimezoneOffset()
		};

		try {
			const remoteResponse = await requestUrl({
				url: `https://serv.amazingmarvin.com/api/markDone`,
				method: 'POST',
				headers: {
					'X-API-Token': opt.apiKey,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (remoteResponse.status === 200) {
				new Notice("Task marked as done in Amazing Marvin.");
				return remoteResponse.json;
			}
		} catch (error) {
			const errorNote = document.createDocumentFragment();
			errorNote.appendText('Error marking task as done in Amazing Marvin. You should do it ');
			const a = document.createElement('a');
			a.href = 'https://app.amazingmarvin.com/#t=' + taskId;
			a.text = 'manually';
			a.target = '_blank';
			errorNote.appendChild(a);

			new Notice(errorNote, 0);
			console.error('Error marking task as done:', error);
		}
	}


	async fetchMarvinData(endpoint: string) {
		const opt = this.settings;
		let response;
		let errorMessage = '';

		const url = `http://${opt.localServerHost}:${opt.localServerPort}${endpoint}`;
		try {
			response = await requestUrl({
				url: url,
				headers: { 'X-API-Token': opt.apiKey }
			});

			if (response.status === 200) {
				return response.json;
			}

			errorMessage = `[${response.status}] ${await response.text}`;
		} catch (err) {
			errorMessage = err.message;
			console.debug('Failed while fetching from local server, will try the public server next:', err);
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

	getScheduledTasks(date: string): Promise<(Task | Category)[]> {
		let errorMessages = [];

		try {
			return this.fetchTasksAndCategories(`${CONSTANTS.scheduledOnDayEndpoint}?date=${date}`);
		} catch (error) {
			console.error(`Error fetching scheduled tasks: ${error}`);
			errorMessages.push(`Error fetching scheduled tasks`);
		}

		if (errorMessages.length > 0) {
			const message = `Encountered errors while fetching tasks:\n\n${errorMessages.join('\n')}\nSee console for details.`;
			new Notice(message);
		}
		return Promise.resolve([]);
	}

	getDueTasks(date: string): Promise<(Task | Category)[]> {
		let errorMessages = [];

		try {
			return this.fetchTasksAndCategories(`${CONSTANTS.dueOnDayEndpoint}?date=${date}`);
		} catch (error) {
			console.error(`Error fetching scheduled tasks: ${error}`);
			errorMessages.push(`Error fetching scheduled tasks`);
		}

		if (errorMessages.length > 0) {
			const message = `Encountered errors while fetching tasks:\n\n${errorMessages.join('\n')}\nSee console for details.`;
			new Notice(message);
		}
		return Promise.resolve([]);
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
				if (!isSubtask) { // Only add deep links to top-level tasks
					taskContent += `${indentation}- [${item.done ? 'x' : ' '}] [⚓](${item.deepLink}) ${this.formatTaskDetails(item as Task, indentation)}`;
				} else {
					taskContent += `${indentation}- [${item.done ? 'x' : ' '}] `;
				}

				taskContent += `${item.title}\n`;

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

	formatTaskDetails(task: Task, indentation: string) {
		let details = '';
		const settings = this.settings;

		if (settings.showDueDate && task.dueDate) {
			details += `Due Date:: [[${task.dueDate}]] `;
		}
		if (settings.showStartDate && task.startDate) {
			details += `Start Date:: [[${task.startDate}]] `;
		}
		if (settings.showScheduledDate && task.day && task.day !== 'unassigned') {
			details += `Scheduled Date:: [[${task.day}]] `;
		}

		return details;
	}

	toYamlValue(value: any): string {
		if (typeof value === 'string') {
			return `"${value.replace(/"/g, '\\"')}"`;
		} else if (Array.isArray(value)) {
			// YAML array format
			return `[${value.map(this.toYamlValue).join(', ')}]`;
		} else if (typeof value === 'object' && value !== null) {
			// YAML map format
			const yamlMap = Object.entries(value).map(([k, v]) => `  ${k}: ${this.toYamlValue(v)}`);
			return `\n${yamlMap.join('\n')}`;
		} else {
			return String(value);
		}
	}

	async createContentForCategory(category: Category): Promise<string> {
		let yamlFrontmatter = "---\n";


		// Iterate over category properties and add non-null values to YAML frontmatter
		for (const [key, value] of Object.entries(category)) {
			if (value !== null && value !== undefined) {
				yamlFrontmatter += `${key}: ${this.toYamlValue(value)}\n`;
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
