import { useCallback, useEffect, useState } from "react";
import { vb, type Todo } from "../lib/vaultbase.ts";

/**
 * The signed-in user's todos, kept live, and the actions on them.
 *
 * There's no filtering by user here. The `todos` rules (schema.json) only
 * return the caller's own todos, and the server checks every realtime event
 * against the same rules, so this hook only ever sees the user's todos.
 */
export function useTodos(userId: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const upsert = useCallback((todo: Todo) => setTodos((list) => {
    const old = list.find((t) => t.id === todo.id);
    if (old && old.updated > todo.updated) return list; // an older copy arrived late
    return [...list.filter((t) => t.id !== todo.id), todo].sort(byCreated);
  }), []);
  const drop = useCallback((id: string) => setTodos((list) => list.filter((t) => t.id !== id)), []);

  useEffect(() => {
    let cancelled = false;

    // Subscribe first, so nothing that happens while the list loads is missed.
    const unsubscribe = vb.subscribe("todos", "*", (event) => {
      if (event.type === "delete") drop(event.id ?? event.record?.id ?? "");
      else if (event.record) upsert(event.record);
    });

    (async () => {
      try {
        const all: Todo[] = [];
        for await (const todo of vb.collection("todos").iterate({ sort: "created", perPage: 200 })) all.push(todo);
        if (!cancelled) setTodos(all);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; unsubscribe(); };
  }, [userId, upsert, drop]);

  // Each action applies the server's answer right away; the realtime event
  // for the same change arrives a moment later and changes nothing.
  const actions = {
    add: async (title: string) => upsert(await vb.collection("todos").create({ title, done: false, owner: userId })),
    setDone: async (todo: Todo, done: boolean) => upsert(await vb.collection("todos").update(todo.id, { done })),
    rename: async (todo: Todo, title: string) => upsert(await vb.collection("todos").update(todo.id, { title })),
    remove: async (todo: Todo) => {
      await vb.collection("todos").delete(todo.id);
      drop(todo.id);
    },
    /** Delete every finished todo, 100 per atomic batch. */
    clearDone: async () => {
      const done = todos.filter((t) => t.done);
      for (let i = 0; i < done.length; i += 100) {
        const batch = vb.batch();
        for (const t of done.slice(i, i + 100)) batch.delete("todos", t.id);
        await batch.run();
      }
      done.forEach((t) => drop(t.id));
    },
  };

  return { todos, loading, error, ...actions };
}

const byCreated = (a: Todo, b: Todo) => a.created - b.created || a.id.localeCompare(b.id);
