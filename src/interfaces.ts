export interface Category {
	_id: string;
	title: string;
	type: CategoryType;
	updatedAt: number;
	parentId: string;
	startDate: string;
	endDate: string;
	note: string;
	isRecurring: boolean;
	priority: string;
}

export interface Task {
	done: boolean;
	subtasks: Task [];
	id: string;
	title: string;
	updatedAt: number;
	parentId: string;
	startDate: string;
	dueDate: string;
	endDate: string;
	note: string;
	isRecurring: boolean;
	priority: string;
}


export enum CategoryType {
	Project = "project",
	Category = "category",
	// List of supported types: https://github.com/amazingmarvin/MarvinAPI/wiki/Marvin-Data-Types#categories-and-projects
}
