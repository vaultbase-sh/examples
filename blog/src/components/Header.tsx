import { useSite } from "../hooks/useSite.ts";
import { href } from "../lib/router.ts";
import { vb, type User } from "../lib/vaultbase.ts";

export function Header({ user }: { user: User | null }) {
  const site = useSite();
  return (
    <header className="site">
      <div className="wrap row">
        <a className="brand grow" href={href({ page: "home" })}>
          <strong>{site.title}</strong>
          {site.tagline && <span className="muted">{site.tagline}</span>}
        </a>
        <nav className="row">
          {user ? (
            <>
              <a href={href({ page: "mine" })}>My posts</a>
              <a className="button primary" href={href({ page: "new" })}>Write</a>
              <button type="button" className="link" title={user.email} onClick={() => void vb.auth.shared.logout()}>Sign out</button>
            </>
          ) : (
            <a className="button" href={href({ page: "signin" })}>Sign in</a>
          )}
        </nav>
      </div>
    </header>
  );
}
