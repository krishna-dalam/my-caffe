import { CafePage } from "./pages/CafePage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { QrDisplayPage } from "./pages/QrDisplayPage";
import "./styles/app.css";

export function App() {
  if (window.location.pathname === "/auth/callback") {
    return <AuthCallbackPage />;
  }

  if (window.location.pathname.startsWith("/qr/")) {
    return <QrDisplayPage />;
  }

  return <CafePage />;
}
