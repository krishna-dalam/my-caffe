import type { Cafe, CafeStatus } from "@my-caffe/shared";
import { useState } from "react";
import { adminCafeApi, cafeStatuses } from "../api/adminCafeApi";
import { useAsync } from "../features/useAsync";
import { AdminLayout } from "./AdminLayout";
import { copyToClipboard, formatDateTime, openPrintWindow, statusLabel } from "./pageUtils";

interface CafeDetailPageProps {
  cafeId: string;
}

const displayValue = (value: string | undefined): string => value || "Not provided";

export function CafeDetailPage({ cafeId }: CafeDetailPageProps) {
  const cafeState = useAsync<Cafe>(() => adminCafeApi.getCafe(cafeId), [cafeId]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const copyLink = async (label: string, value: string | undefined) => {
    if (!value) {
      return;
    }

    await copyToClipboard(value);
    setCopyMessage(`${label} copied.`);
    window.setTimeout(() => setCopyMessage(null), 1800);
  };

  const updateStatus = async (status: CafeStatus) => {
    if (!cafeState.data || cafeState.data.status === status) {
      return;
    }

    setStatusError(null);
    setIsSavingStatus(true);
    try {
      const cafe = await adminCafeApi.updateCafe(cafeState.data.cafeId, { status });
      cafeState.setData(cafe);
    } catch (caught) {
      setStatusError(caught instanceof Error ? caught.message : "Unable to update cafe status.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  return (
    <AdminLayout
      title={cafeState.data?.name ?? "Cafe detail"}
      actions={
        <a className="button secondary" href="/admin/cafes">
          Back
        </a>
      }
    >
      {cafeState.isLoading ? <section className="state-panel">Loading cafe...</section> : null}

      {cafeState.error ? (
        <section className="state-panel error">
          <h2>Unable to load cafe</h2>
          <p>{cafeState.error}</p>
        </section>
      ) : null}

      {cafeState.data ? (
        <div className="detail-grid">
          <section className="detail-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Cafe</p>
                <h2>{cafeState.data.name}</h2>
              </div>
              <span className={`status ${cafeState.data.status}`}>{statusLabel(cafeState.data.status)}</span>
            </div>
            <dl className="details-list">
              <div>
                <dt>Area</dt>
                <dd>{cafeState.data.area}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{cafeState.data.city}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{displayValue(cafeState.data.address)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(cafeState.data.createdAt)}</dd>
              </div>
            </dl>
            {cafeState.data.googleMapsUrl ? (
              <a className="text-link" href={cafeState.data.googleMapsUrl} target="_blank" rel="noreferrer">
                Open Google Maps
              </a>
            ) : null}
          </section>

          <section className="detail-panel">
            <p className="eyebrow">Status</p>
            <h2>Redemption state</h2>
            <label>
              Edit status
              <select
                value={cafeState.data.status}
                disabled={isSavingStatus}
                onChange={(event) => void updateStatus(event.target.value as CafeStatus)}
              >
                {cafeStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            {statusError ? <div className="alert error">{statusError}</div> : null}
          </section>

          <section className="detail-panel">
            <p className="eyebrow">Contact</p>
            <h2>Cafe contact</h2>
            <dl className="details-list">
              <div>
                <dt>Name</dt>
                <dd>{displayValue(cafeState.data.contactName)}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{displayValue(cafeState.data.contactPhone)}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{displayValue(cafeState.data.contactEmail)}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-panel links-panel">
            <p className="eyebrow">Links</p>
            <h2>QR and redemption URLs</h2>
            {copyMessage ? <div className="alert success">{copyMessage}</div> : null}
            <div className="link-row">
              <div>
                <span>QR display URL</span>
                <strong>{cafeState.data.qrDisplayUrl}</strong>
              </div>
              <button className="button secondary" type="button" onClick={() => void copyLink("QR display URL", cafeState.data?.qrDisplayUrl)}>
                Copy
              </button>
            </div>
            <div className="link-row">
              <div>
                <span>Customer redeem URL</span>
                <strong>{cafeState.data.customerRedeemUrl}</strong>
              </div>
              <button
                className="button secondary"
                type="button"
                onClick={() => void copyLink("Customer redeem URL", cafeState.data?.customerRedeemUrl)}
              >
                Copy
              </button>
            </div>
            <div className="form-actions">
              {cafeState.data.qrDisplayUrl ? (
                <>
                  <a className="button primary" href={cafeState.data.qrDisplayUrl} target="_blank" rel="noreferrer">
                    Open QR page
                  </a>
                  <button className="button secondary" type="button" onClick={() => openPrintWindow(cafeState.data?.qrDisplayUrl ?? "")}>
                    Print QR poster
                  </button>
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </AdminLayout>
  );
}

