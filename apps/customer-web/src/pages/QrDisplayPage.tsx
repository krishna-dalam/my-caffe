import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { CafeLandingView } from "@my-caffe/shared";
import { coffeeApi } from "../api/coffeeApi";
import { useAsync } from "../features/useAsync";

const getCafeSlug = (): string => {
  const match = window.location.pathname.match(/^\/qr\/([^/]+)$/);
  return match?.[1] ?? "blue-bottle-demo";
};

export const buildCafeScanUrl = (origin: string, slug: string): string => {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return `${normalizedOrigin}/c/${encodeURIComponent(slug)}`;
};

export function QrDisplayPage() {
  const cafeSlug = useMemo(() => getCafeSlug(), []);
  const scanUrl = useMemo(() => buildCafeScanUrl(window.location.origin, cafeSlug), [cafeSlug]);
  const cafeState = useAsync<CafeLandingView>(() => coffeeApi.getCafeLanding(cafeSlug), [cafeSlug]);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderQr = async () => {
      try {
        const svg = await QRCode.toString(scanUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          type: "svg",
          width: 280,
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

  return (
    <main className="qr-display-shell">
      <section className="qr-display-panel">
        <div>
          <p className="eyebrow">My Caffe QR</p>
          <h1>{cafe.name}</h1>
          <p className="qr-copy">
            Scan to redeem coffee at {cafe.area}, {cafe.city}.
          </p>
        </div>

        <div className="qr-card" aria-label={`QR code for ${scanUrl}`}>
          {qrSvg ? <div className="qr-code" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <p>{error ?? "Loading QR..."}</p>}
        </div>

        <div className="qr-url">
          <span>Customer URL</span>
          <strong>{scanUrl}</strong>
        </div>
      </section>
    </main>
  );
}
