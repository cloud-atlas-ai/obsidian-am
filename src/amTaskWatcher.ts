import { App } from "obsidian";
import AmazingMarvinPlugin from "./main";
import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';

const COMPLETED_AM_TASK = /^\s*[-*+]\s\[[xX]\]\s\[⚓\]\(https:\/\/app\.amazingmarvin\.com\/#t=([^)\s]+)/;

export function amTaskWatcher(_app: App, plugin: AmazingMarvinPlugin) {
  return ViewPlugin.fromClass(
    class {
      constructor(public view: EditorView) {
      }

      update(update: ViewUpdate) {
        if (!update.docChanged) {
          return;
        }
        update.changes.iterChanges((fromA, _toA, _fromB, _toB, change) => {
          //only match if the change is a single character and it's an X or x
          if (change.length === 1 && (change.sliceString(0, 1) === "X" || change.sliceString(0, 1) === "x")) {
            let line = update.state.doc.lineAt(fromA).text;

            const match = line.match(COMPLETED_AM_TASK);
            if (match && match[1]) {
              plugin.markDone(match[1]);
            }
          }
        });
      }
    },
    {
    }
  );
}
