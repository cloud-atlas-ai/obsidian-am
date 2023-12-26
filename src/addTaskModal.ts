import { App, Modal, Setting, DropdownComponent, TextAreaComponent } from "obsidian";
import { Category } from "./interfaces";

export class AddTaskModal extends Modal {
  result: {catId: string, task: string};
  onSubmit: (result: {catId: string, task: string}) => void;
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

    contentEl.createEl("h1", { text: "New Amazing Marvin Task" });


    new Setting(contentEl)
      .setName("Category")
      .addDropdown((dropdown: DropdownComponent) => {
        // Add "Inbox" at the top
        dropdown.addOption("###root###", "Inbox");

        // Display categories hierarchically
        this.categories.forEach(category => {
          const title = this.getTitleWithParent(category);
          dropdown.addOption(category._id, title);
        });
        dropdown.onChange((value: string) => {
          this.result.catId = value;
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
      }).settingEl.addClass("task-textarea-setting");


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

  private getTitleWithParent(category: Category): string {
    let parent = category.parentId;

    let parentTitle = [];
    while (parent && parent !== "root") {
      const parentCategory = this.categories.find(c => c._id === parent);
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
