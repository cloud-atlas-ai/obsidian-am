export interface Category {
	id: string;
	title: string;
	categoryType: CategoryType;
	updatedAt: number;
	parentId: string;
	startDate: string;
	endDate: string;
	note: string;
	isRecurring: boolean;
	isMostImportantProject: boolean;
	priority: string;
}

export interface Task {
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
	isDone: boolean;
}


export enum CategoryType {
	Project = "Project",
	Category = "Category",
	// List of supported types: https://github.com/amazingmarvin/MarvinAPI/wiki/Marvin-Data-Types#categories-and-projects
}
