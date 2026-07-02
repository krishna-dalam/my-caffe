import { useEffect, useState } from "react";
import { completeHostedUiCallback } from "../auth/cognito";
import { env } from "../config/env";

export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeLogin = async () => {
      try {
        const returnPath = await completeHostedUiCallback({
          clientId: env.cognitoClientId,
          domain: env.cognitoDomain,
          redirectUri: env.cognitoRedirectUri,
        });
        window.location.replace(returnPath);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to complete login.");
      }
    };

    void completeLogin();
  }, []);

  return (
    <main className="admin-shell">
      <section className="state-panel">
        <h1>{error ? "Login failed" : "Completing login"}</h1>
        <p>{error ?? "Please wait while we finish Google sign in."}</p>
        {error ? (
          <a className="button secondary" href="/admin/cafes">
            Back to cafes
          </a>
        ) : null}
      </section>
    </main>
  );
}

