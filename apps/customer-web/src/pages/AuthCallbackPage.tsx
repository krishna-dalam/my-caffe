import { useEffect, useState } from "react";
import { coffeeApi } from "../api/coffeeApi";
import { consumeAuthReturnPath } from "../auth/cognito";

export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeLogin = async () => {
      try {
        await coffeeApi.completeLoginRedirect();
        window.location.replace(consumeAuthReturnPath());
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to complete Google login.");
      }
    };

    void completeLogin();
  }, []);

  return (
    <main className="page-shell">
      <section className="status-panel">
        <h1>{error ? "Login failed" : "Completing login"}</h1>
        <p>{error ?? "Please wait while we return you to your coffee pass."}</p>
      </section>
    </main>
  );
}
