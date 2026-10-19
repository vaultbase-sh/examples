import { q } from "@vaultbase/sdk";
import { Header } from "./components/Header.tsx";
import { PostEditor } from "./components/PostEditor.tsx";
import { PostList } from "./components/PostList.tsx";
import { PostPage } from "./components/PostPage.tsx";
import { SignIn } from "./components/SignIn.tsx";
import { useSession } from "./hooks/useSession.ts";
import { useRoute, type Route } from "./lib/router.ts";
import type { User } from "./lib/vaultbase.ts";

export function App() {
  const user = useSession();
  const route = useRoute();
  return (
    <>
      <Header user={user} />
      {/* Keyed by user, so signing in or out reloads what the page shows. */}
      <main className="wrap" key={user?.id ?? "anon"}>
        <Page route={route} user={user} />
      </main>
    </>
  );
}

function Page({ route, user }: { route: Route; user: User | null }) {
  switch (route.page) {
    case "post":
      return <PostPage key={route.id} id={route.id} user={user} />;
    case "new":
      return user ? <PostEditor user={user} /> : <SignIn />;
    case "edit":
      return user ? <PostEditor key={route.id} id={route.id} user={user} /> : <SignIn />;
    case "mine":
      return user
        ? <PostList title="My posts" filter={q`author = ${user.id}`} empty="You haven't written anything yet." />
        : <SignIn />;
    case "signin":
      return <SignIn />;
    default:
      return <PostList title="Latest posts" filter="published = true" empty="No posts yet." />;
  }
}
