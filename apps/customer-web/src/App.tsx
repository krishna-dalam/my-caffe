import { CafePage } from "./pages/CafePage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { HomePage } from "./pages/HomePage";
import { QrDisplayPage } from "./pages/QrDisplayPage";
import "./styles/app.css";

export function App() {
  if (window.location.pathname === "/auth/callback") {
    return <AuthCallbackPage />;
  }

  if (window.location.pathname.startsWith("/qr/")) {
    return <QrDisplayPage />;
  }

  if (window.location.pathname.startsWith("/c/")) {
    return <CafePage />;
  }

  return <HomePage />;
}
