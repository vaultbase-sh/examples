import { isVaultbaseError } from "@vaultbase/sdk";
import { vb, type Todo } from "./vaultbase.ts";
import "./style.css";

/**
 * A todo list on Vaultbase.
 *
 * - Sign-in: `vb.auth.users.register` / `.login`, session in localStorage.
 * - Privacy is the server's job: the `todos` rules (schema.json) only let a
 *   user read and change their own todos, and only create todos they own.
 *   The app doesn't filter anything itself.
 * - Realtime: `vb.subscribe("todos", "*")` delivers creates, updates and
 *   deletes, again only for the user's own todos, so every open tab stays in
 *   step without polling.
 */

type Filter = "all" | "active" | "done";

const app = document.querySelector<HTMLElement>("#app")!;
let todos: Todo[] = [];
let filter: Filter = "all";
let unsubscribe: (() => void) | null = null;
/** Which screen is up; keeps sign-in and session changes from loading twice. */
let view: "signin" | "loading" | "todos" = "signin";

// ── Helpers ─────────────────────────────────────────────────────────────────

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { dataset?: Record<string, string> } = {},
  ...children: Array<Node | string | null | false>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const { dataset, ...rest } = props;
  Object.assign(el, rest);
  if (dataset) Object.assign(el.dataset, dataset);
  for (const c of children) if (c) el.append(c);
  return el;
}

/** A readable message from any error the SDK throws. */
function message(e: unknown): string {
  if (isVaultbaseError(e)) {
    if (e.data.kind === "validation" && Object.keys(e.data.details).length) return Object.values(e.data.details).join(" ");
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

let toastTimer = 0;
function toast(text: string) {
  document.querySelector(".toast")?.remove();
  const t = h("div", { className: "toast", role: "status", textContent: text });
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), 4000);
}

const userId = () => vb.client.authStore.get()?.record?.["id"] as string | undefined;
const userEmail = () => vb.client.authStore.get()?.record?.["email"] as string | undefined;

// ── Data ────────────────────────────────────────────────────────────────────

/** Put a record into the list, replacing an older copy of it. */
function upsert(t: Todo) {
  const i = todos.findIndex((x) => x.id === t.id);
  if (i === -1) todos.push(t);
  else if (t.updated >= todos[i]!.updated) todos[i] = t;
  todos.sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
}

async function loadTodos() {
  const all: Todo[] = [];
  // iterate() pages through everything; the list rule keeps it to this user's.
  for await (const t of vb.collection("todos").iterate({ sort: "created", perPage: 200 })) all.push(t);
  todos = all;
}

function startRealtime() {
  unsubscribe?.();
  unsubscribe = vb.subscribe("todos", "*", (ev) => {
    if (ev.type === "delete") todos = todos.filter((t) => t.id !== (ev.id ?? ev.record?.id));
    else if (ev.record) upsert(ev.record);
    renderList();
  });
}

function stopRealtime() {
  unsubscribe?.();
  unsubscribe = null;
  vb.closeRealtime();
}

// ── Actions ─────────────────────────────────────────────────────────────────

async function addTodo(title: string) {
  const owner = userId();
  if (!owner) return;
  // `owner` must be the signed-in user: the create rule refuses anything else.
  upsert(await vb.collection("todos").create({ title, done: false, owner }));
  renderList();
}

async function setDone(t: Todo, done: boolean) {
  upsert(await vb.collection("todos").update(t.id, { done }));
  renderList();
}

async function rename(t: Todo, title: string) {
  upsert(await vb.collection("todos").update(t.id, { title }));
  renderList();
}

async function remove(t: Todo) {
  await vb.collection("todos").delete(t.id);
  todos = todos.filter((x) => x.id !== t.id);
  renderList();
}

/** Delete every finished todo in one atomic batch (up to 100 per request). */
async function clearDone() {
  const done = todos.filter((t) => t.done);
  for (let i = 0; i < done.length; i += 100) {
    const batch = vb.batch();
    for (const t of done.slice(i, i + 100)) batch.delete("todos", t.id);
    await batch.run();
  }
  const gone = new Set(done.map((t) => t.id));
  todos = todos.filter((t) => !gone.has(t.id));
  renderList();
}

/** Run an action, showing any error instead of throwing it. */
function run(action: () => Promise<void>) {
  action().catch((e) => {
    // A 404 here usually means another tab deleted the todo; reload.
    if (isVaultbaseError(e) && e.data.kind === "server" && e.data.status === 404) {
      void loadTodos().then(renderList);
    }
    toast(message(e));
  });
}

// ── Sign in ─────────────────────────────────────────────────────────────────

function renderSignIn(mode: "login" | "register" = "login", error = "") {
  view = "signin";
  stopRealtime();
  const email = h("input", { type: "email", name: "email", required: true, autocomplete: "email", placeholder: "you@example.com" });
  const password = h("input", {
    type: "password",
    name: "password",
    required: true,
    minLength: 8,
    autocomplete: mode === "login" ? "current-password" : "new-password",
    placeholder: mode === "login" ? "Password" : "At least 8 characters",
  });
  const submit = h("button", { type: "submit", className: "primary", textContent: mode === "login" ? "Sign in" : "Create account" });
  const err = h("p", { className: "error", role: "alert", textContent: error });

  const form = h("form", { className: "card auth" },
    h("h1", { textContent: "Todos" }),
    h("p", { className: "muted", textContent: "A Vaultbase example. Your todos are private to you and sync live across tabs." }),
    h("label", {}, "Email", email),
    h("label", {}, "Password", password),
    err,
    submit,
    h("p", { className: "muted switch" },
      mode === "login" ? "No account yet? " : "Have an account? ",
      h("button", {
        type: "button",
        className: "link",
        textContent: mode === "login" ? "Create one" : "Sign in",
        onclick: () => renderSignIn(mode === "login" ? "register" : "login"),
      }),
    ),
  );

  form.onsubmit = async (e) => {
    e.preventDefault();
    submit.disabled = true;
    err.textContent = "";
    try {
      const creds = { email: email.value.trim(), password: password.value };
      if (mode === "register") await vb.auth.users.register(creds);
      const res = await vb.auth.users.login(creds);
      if ("mfa_required" in res) throw new Error("This account uses two-factor sign-in, which this example doesn't cover.");
      await showTodos();
    } catch (e) {
      err.textContent = message(e);
      submit.disabled = false;
    }
  };

  app.replaceChildren(form);
  email.focus();
}

// ── Todos ───────────────────────────────────────────────────────────────────

const listEl = h("ul", { className: "todos" });
const footerEl = h("footer", { className: "row" });

async function showTodos() {
  if (view !== "signin") return;
  view = "loading";
  app.replaceChildren(h("p", { className: "muted center", textContent: "Loading…" }));
  try {
    await loadTodos();
  } catch (e) {
    // An expired or revoked session: start over.
    if (isVaultbaseError(e) && e.kind === "auth") { vb.client.authStore.set(null); return renderSignIn(); }
    renderSignIn("login", message(e));
    return;
  }
  view = "todos";
  startRealtime();

  const input = h("input", { name: "title", required: true, maxLength: 200, placeholder: "What needs doing?", autocomplete: "off" });
  const add = h("form", { className: "add row" }, input, h("button", { type: "submit", className: "primary", textContent: "Add" }));
  add.onsubmit = (e) => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    input.value = "";
    run(() => addTodo(title));
  };

  const signOut = h("button", { type: "button", className: "link", textContent: "Sign out" });
  signOut.onclick = async () => {
    stopRealtime();
    await vb.auth.shared.logout();
    todos = [];
    if (view !== "signin") renderSignIn();
  };

  app.replaceChildren(h("section", { className: "card" },
    h("header", { className: "row" }, h("h1", { textContent: "Todos" }), h("span", { className: "muted grow", textContent: userEmail() ?? "" }), signOut),
    add,
    listEl,
    footerEl,
  ));
  renderList();
  input.focus();
}

function renderList() {
  const shown = todos.filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done));
  listEl.replaceChildren(...shown.map(renderTodo));
  if (todos.length === 0) listEl.append(h("li", { className: "empty muted", textContent: "Nothing yet. Add your first todo above." }));
  else if (shown.length === 0) listEl.append(h("li", { className: "empty muted", textContent: filter === "done" ? "Nothing finished yet." : "All done." }));

  const left = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - left;
  const filters = (["all", "active", "done"] as Filter[]).map((f) => h("button", {
    type: "button",
    className: f === filter ? "chip on" : "chip",
    textContent: f === "all" ? "All" : f === "active" ? "Active" : "Done",
    ariaPressed: String(f === filter),
    onclick: () => { filter = f; renderList(); },
  }));
  footerEl.replaceChildren(
    h("span", { className: "muted", textContent: `${left} left` }),
    h("div", { className: "chips" }, ...filters),
    doneCount > 0 ? h("button", { type: "button", className: "link", textContent: `Clear done (${doneCount})`, onclick: () => run(clearDone) }) : h("span"),
  );
}

function renderTodo(t: Todo): HTMLLIElement {
  const box = h("input", { type: "checkbox", checked: !!t.done, ariaLabel: `Mark "${t.title}" ${t.done ? "not done" : "done"}` });
  box.onchange = () => run(() => setDone(t, box.checked));

  const title = h("span", { className: "title", textContent: t.title, title: "Double-click to edit" });
  const li = h("li", { className: t.done ? "done" : "" }, box, title,
    h("button", { type: "button", className: "icon", ariaLabel: `Delete "${t.title}"`, textContent: "×", onclick: () => run(() => remove(t)) }),
  );

  title.ondblclick = () => {
    const edit = h("input", { className: "edit", value: t.title, maxLength: 200, ariaLabel: "Edit todo" });
    const finish = (save: boolean) => {
      const next = edit.value.trim();
      if (save && next && next !== t.title) run(() => rename(t, next));
      else renderList();
    };
    edit.onkeydown = (e) => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); };
    edit.onblur = () => finish(true);
    title.replaceWith(edit);
    edit.focus();
    edit.select();
  };
  return li;
}

// ── Start ───────────────────────────────────────────────────────────────────

// Signing in or out in another tab changes the shared session; follow it.
vb.client.authStore.onChange?.(() => {
  const signedIn = !!vb.client.authStore.get()?.token;
  if (!signedIn && view !== "signin") { todos = []; renderSignIn(); }
  if (signedIn && view === "signin") void showTodos();
});

if (vb.client.authStore.get()?.token) void showTodos();
else renderSignIn();
