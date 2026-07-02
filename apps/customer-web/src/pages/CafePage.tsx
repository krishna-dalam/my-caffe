import {
  getCafeRedemptionUnavailableMessage,
  isCafeActive,
  type CafeLandingView,
  type Customer,
  type RedeemCoffeeResponse,
  type Redemption,
} from "@my-caffe/shared";
import { useEffect, useMemo, useState } from "react";
import { coffeeApi } from "../api/coffeeApi";
import { useAsync } from "../features/useAsync";

const getCafeSlug = (): string => {
  const match = window.location.pathname.match(/^\/c\/([^/]+)$/);
  return match?.[1] ?? "blue-bottle-demo";
};

const formatDate = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));

export function CafePage() {
  const cafeSlug = useMemo(() => getCafeSlug(), []);
  const cafeState = useAsync<CafeLandingView>(() => coffeeApi.getCafeLanding(cafeSlug), [cafeSlug]);
  const customerState = useAsync<Customer | null>(() => coffeeApi.getCurrentCustomer(), []);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [latestRedemption, setLatestRedemption] = useState<RedeemCoffeeResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    const loadRedemptions = async () => {
      if (!customerState.data || !cafeState.data?.activeMembership) {
        setRedemptions([]);
        return;
      }

      setRedemptions(await coffeeApi.getRedemptions(cafeState.data.cafe.cafeId));
    };

    void loadRedemptions();
  }, [cafeState.data, customerState.data]);

  const login = async () => {
    setActionError(null);
    try {
      await coffeeApi.loginWithGoogle();
      const [, nextCafe] = await Promise.all([customerState.reload(), coffeeApi.getCafeLanding(cafeSlug)]);
      cafeState.setData(nextCafe);
      if (nextCafe.activeMembership) {
        setRedemptions(await coffeeApi.getRedemptions(nextCafe.cafe.cafeId));
      }
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to start Google login.");
    }
  };

  const redeem = async () => {
    if (!cafeState.data?.cafe) {
      return;
    }

    setIsRedeeming(true);
    setActionError(null);

    try {
      const response = await coffeeApi.redeemCoffee(cafeState.data.cafe.cafeId);
      setLatestRedemption(response);
      setRedemptions([response.redemption, ...redemptions]);
      cafeState.setData({
        ...cafeState.data,
        activeMembership: response.membership,
      });
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to redeem coffee.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const logout = async () => {
    setActionError(null);
    setLatestRedemption(null);
    setRedemptions([]);

    try {
      await coffeeApi.logout();
      await Promise.all([customerState.reload(), cafeState.reload()]);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to sign out.");
    }
  };

  const resetDemoData = async () => {
    setActionError(null);
    setLatestRedemption(null);
    setRedemptions([]);

    try {
      await coffeeApi.resetDemoData();
      await Promise.all([customerState.reload(), cafeState.reload()]);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to reset demo data.");
    }
  };

  if (cafeState.isLoading || customerState.isLoading) {
    return (
      <main className="page-shell">
        <section className="status-panel">Loading cafe pass...</section>
      </main>
    );
  }

  if (cafeState.error || !cafeState.data) {
    return (
      <main className="page-shell">
        <section className="status-panel">
          <h1>Cafe unavailable</h1>
          <p>{cafeState.error ?? "We could not load this cafe QR link."}</p>
        </section>
      </main>
    );
  }

  const { cafe, activeMembership } = cafeState.data;
  const customer = customerState.data;
  const remaining = latestRedemption?.membership.remainingCoffees ?? activeMembership?.remainingCoffees ?? 0;
  const total = latestRedemption?.membership.totalCoffees ?? activeMembership?.totalCoffees ?? 0;
  const cafeStatusMessage = isCafeActive(cafe) ? null : getCafeRedemptionUnavailableMessage(cafe.status);
  const canRedeem = Boolean(customer && activeMembership && isCafeActive(cafe) && remaining > 0 && !isRedeeming);

  return (
    <main className="page-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">My Caffe Pass</p>
          <h1>{cafe.name}</h1>
        </div>
        <div className="account-actions">
          <div className="account-pill">{customer ? customer.displayName : "Guest"}</div>
          {customer ? (
            <button className="text-button" type="button" onClick={logout}>
              Sign out
            </button>
          ) : null}
          <button className="text-button" type="button" onClick={resetDemoData}>
            Reset demo
          </button>
        </div>
      </header>

      <section className="hero-band">
        <div>
          <p className="eyebrow">QR check-in</p>
          <h2>Redeem your coffee at the counter.</h2>
          <p className="hero-copy">
            Tap redeem when staff is ready. Show the 4-digit code on this screen so the cafe can visually verify it.
          </p>
        </div>

        <div className="count-panel" aria-label="Remaining coffees">
          <span>{remaining}</span>
          <p>of {total} coffees left</p>
        </div>
      </section>

      {actionError ? <div className="error-banner">{actionError}</div> : null}

      {!isCafeActive(cafe) ? (
        <section className="status-panel">
          <h2>Redemptions unavailable</h2>
          <p>{cafeStatusMessage}</p>
        </section>
      ) : null}

      {!customer ? (
        <section className="action-panel">
          <div>
            <h2>Login required</h2>
            <p>Use Google login to open your coffee subscription for this cafe.</p>
          </div>
          <button className="primary-button" type="button" onClick={login}>
            Continue with Google
          </button>
        </section>
      ) : null}

      {customer && activeMembership ? (
        <>
          <section className="subscription-grid">
            <article className="detail-panel">
              <p className="eyebrow">Active plan</p>
              <h2>{activeMembership.planName}</h2>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{activeMembership.status}</dd>
                </div>
                <div>
                  <dt>Expires</dt>
                  <dd>{formatDate(activeMembership.expiresAt)}</dd>
                </div>
              </dl>
            </article>

            <article className="redeem-panel">
              <p className="eyebrow">Counter verification</p>
              {latestRedemption ? (
                <>
                  <div className="verification-code" aria-label="Verification code">
                    {latestRedemption.redemption.verificationCode}
                  </div>
                  <p>Show this code to staff. Your pass now has {latestRedemption.membership.remainingCoffees} coffees left.</p>
                </>
              ) : (
                <p>After redemption, a 4-digit code will appear here for staff verification.</p>
              )}
              <button className="primary-button" type="button" disabled={!canRedeem} onClick={redeem}>
                {isRedeeming
                  ? "Redeeming..."
                  : !isCafeActive(cafe)
                    ? "Redemptions unavailable"
                    : remaining > 0
                      ? "Redeem 1 coffee"
                      : "No coffees remaining"}
              </button>
            </article>
          </section>

          <section className="history-panel">
            <div>
              <p className="eyebrow">Redemption history</p>
              <h2>Recent coffees</h2>
            </div>
            {redemptions.length > 0 ? (
              <ol>
                {redemptions.map((redemption) => (
                  <li key={redemption.redemptionId}>
                    <span>{redemption.verificationCode}</span>
                    <div>
                      <strong>{formatDate(redemption.redeemedAt)}</strong>
                      <p>{redemption.remainingCoffeesAfterRedeem} coffees left after redeeming</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted-copy">No coffees redeemed yet for this session.</p>
            )}
          </section>
        </>
      ) : null}

      {customer && isCafeActive(cafe) && !activeMembership ? (
        <section className="status-panel">
          <h2>No active subscription</h2>
          <p>Ask the cafe or admin team to manually activate your subscription for this MVP.</p>
        </section>
      ) : null}
    </main>
  );
}
