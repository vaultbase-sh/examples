import { useState, type FormEvent } from "react";
import { useTodos } from "../hooks/useTodos.ts";
import { errorMessage, vb, type User } from "../lib/vaultbase.ts";
import { TodoItem } from "./TodoItem.tsx";

type Filter = "all" | "active" | "done";

export function TodoList({ user }: { user: User }) {
  const { todos, loading, error, add, setDone, rename, remove, clearDone } = useTodos(user.id);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [actionError, setActionError] = useState("");

  /** Run an action and show its error, if any, instead of throwing. */
  const run = (action: () => Promise<unknown>) => {
    setActionError("");
    action().catch((e) => setActionError(errorMessage(e)));
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    setTitle("");
    run(() => add(text));
  }

  const shown = todos.filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done));
  const left = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - left;

  return (
    <section className="card">
      <header className="row">
        <h1>Todos</h1>
        <span className="muted grow">{user.email}</span>
        <button type="button" className="link" onClick={() => void vb.auth.shared.logout()}>Sign out</button>
      </header>

      <form className="add row" onSubmit={submit}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?"
          maxLength={200} autoComplete="off" autoFocus aria-label="New todo" />
        <button type="submit" className="primary">Add</button>
      </form>

      {(error || actionError) && <p className="error" role="alert">{actionError || errorMessage(error)}</p>}

      <ul className="todos">
        {loading && <li className="empty muted">Loading…</li>}
        {!loading && todos.length === 0 && <li className="empty muted">Nothing yet. Add your first todo above.</li>}
        {!loading && todos.length > 0 && shown.length === 0 && (
          <li className="empty muted">{filter === "done" ? "Nothing finished yet." : "All done."}</li>
        )}
        {shown.map((todo) => (
          <TodoItem key={todo.id} todo={todo}
            onToggle={(done) => run(() => setDone(todo, done))}
            onRename={(next) => run(() => rename(todo, next))}
            onDelete={() => run(() => remove(todo))} />
        ))}
      </ul>

      <footer className="row">
        <span className="muted">{left} left</span>
        <div className="chips" role="group" aria-label="Show">
          {(["all", "active", "done"] as const).map((f) => (
            <button key={f} type="button" className={f === filter ? "chip on" : "chip"} aria-pressed={f === filter}
              onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "active" ? "Active" : "Done"}
            </button>
          ))}
        </div>
        {doneCount > 0
          ? <button type="button" className="link" onClick={() => run(clearDone)}>Clear done ({doneCount})</button>
          : <span />}
      </footer>
    </section>
  );
}
