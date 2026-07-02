import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { CafeCreatePage } from "./pages/CafeCreatePage";
import { CafeDetailPage } from "./pages/CafeDetailPage";
import { CafeListPage } from "./pages/CafeListPage";
import { parseAdminRoute } from "./routes";
import "./styles/app.css";

export function App() {
  const route = parseAdminRoute(window.location.pathname);

  if (route.name === "authCallback") {
    return <AuthCallbackPage />;
  }

  if (route.name === "cafeNew") {
    return <CafeCreatePage />;
  }

  if (route.name === "cafeDetail") {
    return <CafeDetailPage cafeId={route.cafeId} />;
  }

  return <CafeListPage />;
}

