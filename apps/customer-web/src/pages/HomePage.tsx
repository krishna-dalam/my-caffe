export function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="home-copy">
          <p className="eyebrow">My Caffe</p>
          <h1>Coffee subscriptions for neighborhood cafes.</h1>
          <p>
            Customers scan a cafe QR, sign in with Google, redeem coffee, and show a 4-digit verification code at the
            counter.
          </p>
          <div className="home-actions">
            <a className="primary-link" href="/join-waitlist?utm_source=home">
              Join waitlist
            </a>
            <a className="primary-link" href="/c/blue-bottle-demo">
              Open customer pass
            </a>
            <a className="secondary-link" href="/qr/blue-bottle-demo">
              Display cafe QR
            </a>
          </div>
        </div>
        <div className="home-panel" aria-label="Demo flow">
          <span>QR</span>
          <strong>Scan. Login. Redeem.</strong>
          <p>Demo cafe: Blue Bottle Demo Cafe</p>
        </div>
      </section>
    </main>
  );
}
