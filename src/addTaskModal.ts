import { App, Modal, Setting, DropdownComponent, TextAreaComponent, FuzzySuggestModal, FuzzyMatch } from "obsidian";
import { Category } from "./interfaces";

function getTitleWithParent(category: Category, categories: Category[]): string {
  let parent = category.parentId;

  let parentTitle = [];
  while (parent && parent !== "root") {
    const parentCategory = categories.find(category => category._id === parent);
    if (parentCategory) {
      parentTitle.push(parentCategory.title);
      parent = parentCategory.parentId;
    } else {
      break;
    }
  }
  if (parentTitle.length > 0) {
    return category.title + ` in ${parentTitle.reverse().join("/")}`;
  }
  return category.title;
}

// Suggester Modal Class for Category Selection
class CategorySuggesterModal extends FuzzySuggestModal<Category> {
  getItems(): Category[] {
    // Prepend a faux 'Inbox' category for matching purposes
    const inboxCategory: Category = {
      _id: "__inbox-faux__", // Arbitrary unique ID for the Inbox faux category
      title: "Inbox",
      type: "faux",
      updatedAt: 0,
      parentId: "root",
      startDate: "",
      endDate: "",
      note: "",
      isRecurring: false,
      priority: "",
      deepLink: "",
      dueDate: "",
      done: false,
    };

    // Include the Inbox at the beginning of the categories list
    return [inboxCategory, ...this.categories];
  }
  getItemText(category: Category): string {
    if (category.type === "faux") {
      return "Inbox";
    }
    return getTitleWithParent(category, this.categories);
  }
  categories: Category[];
  onChooseItem: (item: Category, _evt: MouseEvent | KeyboardEvent) => void;

  constructor(app: App, categories: Category[], onChooseItem: (item: Category, _evt: MouseEvent | KeyboardEvent) => void) {
    super(app);
    this.categories = categories;
    this.onChooseItem = onChooseItem;
    this.setPlaceholder("Type to search for a Category");
  }

  onChooseSuggestion(item: FuzzyMatch<Category>, _evt: MouseEvent | KeyboardEvent): void {
    this.onChooseItem(item.item, _evt);
  }
}

export class AddTaskModal extends Modal {
  result: { catId: string, task: string };
  onSubmit: (result: { catId: string, task: string }) => void;
  categories: Category[];

  constructor(app: App, categories: Category[], onSubmit: (result: { catId: string; task: string; }) => void) {
    super(app);
    this.onSubmit = onSubmit;
    this.categories = categories.sort((a, b) => {
      return this.getFullPathToCategoryTitle(a, categories).localeCompare(this.getFullPathToCategoryTitle(b, categories));
    });
    this.result = { catId: '', task: '' }; // initialize result
  }

  onOpen() {
    const { contentEl } = this;
    let categoryInput: HTMLInputElement;

    contentEl.createEl("h1", { text: "New Amazing Marvin Task" });

    new Setting(contentEl)
      .setName("Category")
      .addText(text => {
        categoryInput = text.inputEl;
        text.onChange(value => {
          // Simulate a dropdown by creating a suggester modal
          const suggester = new CategorySuggesterModal(this.app, this.categories, (item: Category) => {
            categoryInput.value = item.title;
            this.result.catId = item._id;
            suggester.close();
          });
          suggester.open();
        });
      });

    new Setting(contentEl)
      .setHeading().setName("Task");

    new Setting(contentEl)
      .addTextArea((textArea: TextAreaComponent) => {
        textArea.inputEl.style.minHeight = "5em"; // Increase the size of the text area
        textArea.onChange((value: string) => {
          this.result.task = value;
        });
      }).settingEl.addClass("am-task-textarea-setting");


    // Submit Button
    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Submit")
          .setCta()
          .onClick(() => {
            this.close();
            if (this.onSubmit && this.result.catId && this.result.task) {
              this.onSubmit(this.result);
            }
          }));
  }

  private getFullPathToCategoryTitle(category: Category, categories: Category[]): string {
    let parent = category.parentId;

    let parentTitle = [];
    parentTitle.push('/');
    while (parent && parent !== "root") {
      const parentCategory = categories.find(c => c._id === parent);
      if (parentCategory) {
        parentTitle.push(parentCategory.title);
        parent = parentCategory.parentId;
      } else {
        break;
      }
    }
    return `${parentTitle.reverse().join("/")}${category.title}`;
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
