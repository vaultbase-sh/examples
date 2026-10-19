import { SignIn } from "./components/SignIn.tsx";
import { TodoList } from "./components/TodoList.tsx";
import { useSession } from "./hooks/useSession.ts";

export function App() {
  const user = useSession();
  // Keyed by user, so switching accounts starts the list (and its realtime
  // subscription) fresh.
  return <main>{user ? <TodoList key={user.id} user={user} /> : <SignIn />}</main>;
}
