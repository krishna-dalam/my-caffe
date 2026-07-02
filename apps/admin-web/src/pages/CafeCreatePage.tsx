import { validateCreateCafeInput, type CafeStatus, type CreateCafeInput } from "@my-caffe/shared";
import type { FormEvent } from "react";
import { useState } from "react";
import { adminCafeApi, cafeStatuses } from "../api/adminCafeApi";
import { AdminLayout } from "./AdminLayout";
import { statusLabel } from "./pageUtils";

type CafeFormState = Record<keyof Required<CreateCafeInput>, string>;

const initialFormState: CafeFormState = {
  address: "",
  area: "",
  city: "",
  contactEmail: "",
  contactName: "",
  contactPhone: "",
  googleMapsUrl: "",
  name: "",
  status: "draft",
};

const toCreateInput = (form: CafeFormState): CreateCafeInput => ({
  address: form.address,
  area: form.area,
  city: form.city,
  contactEmail: form.contactEmail,
  contactName: form.contactName,
  contactPhone: form.contactPhone,
  googleMapsUrl: form.googleMapsUrl,
  name: form.name,
  status: form.status as CafeStatus,
});

export function CafeCreatePage() {
  const [form, setForm] = useState<CafeFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof CafeFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validateCreateCafeInput(toCreateInput(form));
    if (!validation.ok) {
      setError(validation.errors.join(" "));
      return;
    }

    setIsSubmitting(true);
    try {
      const cafe = await adminCafeApi.createCafe(validation.value);
      setSuccess("Cafe created.");
      window.location.assign(`/admin/cafes/${encodeURIComponent(cafe.cafeId)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create cafe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Add Cafe"
      actions={
        <a className="button secondary" href="/admin/cafes">
          Back
        </a>
      }
    >
      <form className="form-panel" onSubmit={submit}>
        {error ? <div className="alert error">{error}</div> : null}
        {success ? <div className="alert success">{success}</div> : null}

        <div className="form-grid">
          <label>
            Cafe name
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
          </label>
          <label>
            Area
            <input value={form.area} onChange={(event) => updateField("area", event.target.value)} required />
          </label>
          <label>
            City
            <input value={form.city} onChange={(event) => updateField("city", event.target.value)} required />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
              {cafeStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Address
            <textarea value={form.address} onChange={(event) => updateField("address", event.target.value)} rows={3} />
          </label>
          <label className="span-2">
            Google Maps URL
            <input value={form.googleMapsUrl} onChange={(event) => updateField("googleMapsUrl", event.target.value)} />
          </label>
          <label>
            Contact name
            <input value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} />
          </label>
          <label>
            Contact phone
            <input value={form.contactPhone} onChange={(event) => updateField("contactPhone", event.target.value)} />
          </label>
          <label>
            Contact email
            <input type="email" value={form.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} />
          </label>
        </div>

        <div className="form-actions">
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create cafe"}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
