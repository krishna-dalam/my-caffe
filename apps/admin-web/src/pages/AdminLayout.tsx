import type { ReactNode } from "react";
import { clearAuthSession } from "../auth/cognito";
import { hasAdminAccessToken, loginWithGoogle } from "../api/adminCafeApi";

interface AdminLayoutProps {
  actions?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  title: string;
}

export function AdminLayout({ actions, children, eyebrow = "Cafe operations", title }: AdminLayoutProps) {
  const isSignedIn = hasAdminAccessToken();

  const signIn = async () => {
    await loginWithGoogle();
  };

  const signOut = () => {
    clearAuthSession();
    window.location.assign("/admin/cafes");
  };

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="header-actions">
          {actions}
          {isSignedIn ? (
            <button className="button secondary" type="button" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <button className="button secondary" type="button" onClick={signIn}>
              Sign in
            </button>
          )}
        </div>
      </header>
      {children}
    </main>
  );
}

