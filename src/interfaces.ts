export interface Category {
	_id: string;
	title: string;
	type: string;
	updatedAt: number;
	parentId: string;
	startDate: string;
	endDate: string;
	note: string;
	isRecurring: boolean;
	priority: string;
	deepLink: string;
	dueDate: string;
	done: boolean;
}

export interface Task {
	done: boolean;
	subtasks: Task[];
	_id: string;
	title: string;
	updatedAt: number;
	parentId: string;
	startDate: string;
	dueDate: string;
	endDate: string;
	note: string;
	isRecurring: boolean;
	priority: string;
	type: string;
	deepLink: string;
}
