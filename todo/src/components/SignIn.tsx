import { useState, type FormEvent } from "react";
import { errorMessage, vb } from "../lib/vaultbase.ts";

/** Sign in, or create an account and sign in. */
export function SignIn() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") await vb.auth.users.register({ email, password });
      const result = await vb.auth.users.login({ email, password });
      if ("mfa_required" in result) setError("This account uses two-factor sign-in, which this example doesn't cover.");
      // On success the auth store changes and useSession() shows the todos.
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "register";
  return (
    <form className="card auth" onSubmit={submit}>
      <h1>Todos</h1>
      <p className="muted">A Vaultbase example. Your todos are private to you and sync live across tabs.</p>

      <label>
        Email
        <input type="email" required autoComplete="email" placeholder="you@example.com" autoFocus
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" required minLength={8} autoComplete={registering ? "new-password" : "current-password"}
          placeholder={registering ? "At least 8 characters" : "Password"}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>

      <p className="error" role="alert">{error}</p>
      <button type="submit" className="primary" disabled={busy}>
        {registering ? "Create account" : "Sign in"}
      </button>

      <p className="muted switch">
        {registering ? "Have an account? " : "No account yet? "}
        <button type="button" className="link" onClick={() => { setMode(registering ? "login" : "register"); setError(""); }}>
          {registering ? "Sign in" : "Create one"}
        </button>
      </p>
    </form>
  );
}
