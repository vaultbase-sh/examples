import { useRef, useState } from "react";
import type { Todo } from "../lib/vaultbase.ts";

/** One todo: tick it off, double-click to rename, × to delete. */
export function TodoItem({ todo, onToggle, onRename, onDelete }: {
  todo: Todo;
  onToggle: (done: boolean) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  // Enter, Escape and blur can all end one edit; only the first one counts.
  const finished = useRef(false);

  function finish(title: string, save: boolean) {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const next = title.trim();
    if (save && next && next !== todo.title) onRename(next);
  }

  return (
    <li className={todo.done ? "done" : ""}>
      <input type="checkbox" checked={!!todo.done} onChange={(e) => onToggle(e.target.checked)}
        aria-label={`Mark "${todo.title}" ${todo.done ? "not done" : "done"}`} />

      {editing ? (
        <input className="edit" defaultValue={todo.title} maxLength={200} autoFocus aria-label="Edit todo"
          onFocus={(e) => e.target.select()}
          onBlur={(e) => finish(e.target.value, true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") finish(e.currentTarget.value, true);
            if (e.key === "Escape") finish(e.currentTarget.value, false);
          }} />
      ) : (
        <span className="title" title="Double-click to edit" onDoubleClick={() => { finished.current = false; setEditing(true); }}>{todo.title}</span>
      )}

      <button type="button" className="icon" aria-label={`Delete "${todo.title}"`} onClick={onDelete}>×</button>
    </li>
  );
}
