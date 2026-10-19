import { useState, type FormEvent } from "react";
import { navigate } from "../lib/router.ts";
import { errorMessage, vb } from "../lib/vaultbase.ts";

/** Sign in, or create an account (with the name readers see on your posts) and sign in. */
export function SignIn() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") await vb.auth.users.register({ email, password, name: name.trim() });
      const result = await vb.auth.users.login({ email, password });
      if ("mfa_required" in result) {
        setError("This account uses two-factor sign-in, which this example doesn't cover.");
        return;
      }
      navigate({ page: "home" });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "register";
  return (
    <form className="card auth" onSubmit={submit}>
      <h1>{registering ? "Create an account" : "Sign in"}</h1>
      <p className="muted">Anyone can read. Sign in to write posts and comment.</p>

      {registering && (
        <label>
          Name
          <input required maxLength={60} autoComplete="name" placeholder="Shown on your posts and comments"
            value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <label>
        Email
        <input type="email" required autoComplete="email" placeholder="you@example.com"
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
