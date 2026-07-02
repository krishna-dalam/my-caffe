import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { CafeLandingView } from "@my-caffe/shared";
import { coffeeApi } from "../api/coffeeApi";
import { env } from "../config/env";
import { useAsync } from "../features/useAsync";

const getCafeSlug = (): string => {
  const match = window.location.pathname.match(/^\/qr\/([^/]+)$/);
  return match?.[1] ?? "blue-bottle-demo";
};

export const buildCafeScanUrl = (origin: string, slug: string): string => {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return `${normalizedOrigin}/c/${encodeURIComponent(slug)}`;
};

const copyToClipboard = async (value: string): Promise<void> => {
  await navigator.clipboard.writeText(value);
};

export function QrDisplayPage() {
  const cafeSlug = useMemo(() => getCafeSlug(), []);
  const scanUrl = useMemo(() => buildCafeScanUrl(env.webBaseUrl, cafeSlug), [cafeSlug]);
  const cafeState = useAsync<CafeLandingView>(() => coffeeApi.getCafeLanding(cafeSlug), [cafeSlug]);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    const renderQr = async () => {
      try {
        const svg = await QRCode.toString(scanUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          type: "svg",
          width: 460,
        });
        setQrSvg(svg);
      } catch {
        setError("Unable to render QR code.");
      }
    };

    void renderQr();
  }, [scanUrl]);

  if (cafeState.isLoading) {
    return (
      <main className="qr-display-shell">
        <section className="qr-display-panel">
          <p>Loading QR poster...</p>
        </section>
      </main>
    );
  }

  if (cafeState.error || !cafeState.data) {
    return (
      <main className="qr-display-shell">
        <section className="qr-display-panel">
          <div>
            <p className="eyebrow">My Caffe QR</p>
            <h1>Cafe unavailable</h1>
            <p className="qr-copy">{cafeState.error ?? "We could not load this cafe QR link."}</p>
          </div>
        </section>
      </main>
    );
  }

  const { cafe } = cafeState.data;
  const copyRedeemLink = async () => {
    await copyToClipboard(scanUrl);
    setCopyMessage("Redeem link copied.");
    window.setTimeout(() => setCopyMessage(null), 1800);
  };

  return (
    <main className="qr-display-shell">
      <div className="qr-display-actions" aria-label="QR poster actions">
        <button className="secondary-link" type="button" onClick={() => window.print()}>
          Print poster
        </button>
        <button className="secondary-link" type="button" onClick={() => void copyRedeemLink()}>
          Copy redeem link
        </button>
      </div>
      <section className="qr-display-panel">
        <div className="qr-poster-heading">
          <h1>{cafe.name}</h1>
          <p className="qr-copy">Scan to redeem your coffee</p>
        </div>

        <div className="qr-card" aria-label={`QR code for ${scanUrl}`}>
          {qrSvg ? <div className="qr-code" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <p>{error ?? "Loading QR..."}</p>}
        </div>

        <div className="qr-url">
          <span>Customer URL</span>
          <strong>{scanUrl}</strong>
        </div>
        {copyMessage ? <p className="qr-copy-status">{copyMessage}</p> : null}
        <p className="qr-powered-by">Powered by MyCaffe</p>
      </section>
    </main>
  );
}
