import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

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

  return (
    <main className="qr-display-shell">
      <section className="qr-display-panel">
        <div>
          <p className="eyebrow">My Caffe QR</p>
          <h1>Scan to redeem coffee</h1>
          <p className="qr-copy">Place this screen near the counter. Customers scan it to open the cafe redemption page.</p>
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
