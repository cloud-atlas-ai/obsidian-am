import { App } from "obsidian";
import AmazingMarvinPlugin from "./main";
import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { RegExpCursor } from "./regexp-cursor";


export function amTaskWatcher(app: App, plugin: AmazingMarvinPlugin) {
  return ViewPlugin.fromClass(
    class {
      constructor(public view: EditorView) {
        this.updateDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.updateDecorations(update.view);
        }
      }

      updateDecorations(view: EditorView) {
        // Process only visible ranges
        for (let part of view.visibleRanges) {
          const taskCursor = new RegExpCursor(view.state.doc,
            "^\\s*([-*+])\\s\\[(.)\\]",
            {}, part.from, part.to);


          while (!taskCursor.next().done) {
            let { from, to } = taskCursor.value;
            const line = view.state.doc.lineAt(from);
            // Check if the task is marked as completed
            if (line.text.match(/^\s*[-*+]\s\[[xX]\]\s\[⚓\]/)) {
              // Logic for handling completed tasks with deep links
              this.handleCompletedTask(line.text);
            }
          }
        }
      }

      handleCompletedTask(taskLine: string) {
        const regex = /https:\/\/app\.amazingmarvin\.com\/#t=([^)\s]+)/;
        const match = taskLine.match(regex);

        let itemId: string;
        if (match && match[1]) {
          itemId = match[1];
          plugin.markDone(itemId);
        }
      }
    },
    {
    }
  );
}
