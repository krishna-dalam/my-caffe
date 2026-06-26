import { CafePage } from "./pages/CafePage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import "./styles/app.css";

export function App() {
  if (window.location.pathname === "/auth/callback") {
    return <AuthCallbackPage />;
  }

  return <CafePage />;
}
