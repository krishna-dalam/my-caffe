import type { JoinWaitlistRequest, WaitlistRole } from "@my-caffe/shared";
import { type FormEvent, useMemo, useState } from "react";
import { joinWaitlist } from "../api/waitlistApi";

type SubmitState = "idle" | "submitting" | "success";

const getSource = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get("utm_source") ?? params.get("source") ?? "direct";
};

export function WaitlistPage() {
  const source = useMemo(() => getSource(), []);
  const [city, setCity] = useState("");
  const [consentToContact, setConsentToContact] = useState(true);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<WaitlistRole>("customer");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitState("submitting");

    const payload: JoinWaitlistRequest = {
      city,
      consentToContact,
      email: email || undefined,
      name,
      phone,
      role,
      source,
    };

    try {
      await joinWaitlist(payload);
      setSubmitState("success");
    } catch (caught) {
      setSubmitState("idle");
      setError(caught instanceof Error ? caught.message : "Unable to join the waitlist.");
    }
  };

  return (
    <main className="waitlist-shell">
      <section className="waitlist-hero">
        <div className="waitlist-copy">
          <p className="eyebrow">Found us on Instagram?</p>
          <h1>Join the coffee pass waitlist.</h1>
          <p>
            Get early access when My Caffe launches subscriptions with partner cafes in your city. We will contact you
            only about launch access and cafe offers.
          </p>
          <div className="waitlist-points" aria-label="Waitlist benefits">
            <span>Monthly coffee packs</span>
            <span>QR redemption</span>
            <span>Partner cafe offers</span>
          </div>
        </div>

        <form className="waitlist-form" onSubmit={onSubmit}>
          {submitState === "success" ? (
            <div className="waitlist-success">
              <p className="eyebrow">You are on the list</p>
              <h2>Thanks. We will reach out when early access opens.</h2>
              <a className="secondary-link" href="/">
                Back to home
              </a>
            </div>
          ) : (
            <>
              <div>
                <p className="eyebrow">Early access</p>
                <h2>Tell us where to launch next.</h2>
              </div>

              <label>
                Full name
                <input autoComplete="name" name="name" required value={name} onChange={(event) => setName(event.target.value)} />
              </label>

              <label>
                WhatsApp number
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  name="phone"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>

              <label>
                Email optional
                <input
                  autoComplete="email"
                  inputMode="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label>
                City
                <input autoComplete="address-level2" name="city" required value={city} onChange={(event) => setCity(event.target.value)} />
              </label>

              <fieldset>
                <legend>I am joining as</legend>
                <div className="role-options">
                  <label>
                    <input checked={role === "customer"} name="role" type="radio" onChange={() => setRole("customer")} />
                    Coffee customer
                  </label>
                  <label>
                    <input checked={role === "cafe_owner"} name="role" type="radio" onChange={() => setRole("cafe_owner")} />
                    Cafe owner
                  </label>
                </div>
              </fieldset>

              <label className="consent-row">
                <input
                  checked={consentToContact}
                  required
                  type="checkbox"
                  onChange={(event) => setConsentToContact(event.target.checked)}
                />
                I agree to be contacted about My Caffe early access.
              </label>

              {error ? <div className="error-banner">{error}</div> : null}

              <button className="primary-button" disabled={submitState === "submitting"} type="submit">
                {submitState === "submitting" ? "Joining..." : "Join waitlist"}
              </button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
