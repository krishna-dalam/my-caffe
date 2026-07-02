export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "CAFE_NOT_ACTIVE"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NO_ACTIVE_MEMBERSHIP"
  | "NO_REMAINING_COFFEES"
  | "UNKNOWN_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  requestId: string;
}

export interface ApiSuccess<T> {
  data: T;
  requestId: string;
}

export type ApiResult<T> = ApiSuccess<T> | { error: ApiError };

export type CafeStatus = "draft" | "active" | "inactive";

export interface Cafe {
  address?: string;
  area: string;
  cafeId: string;
  city: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  createdAt: string;
  customerRedeemUrl?: string;
  googleMapsUrl?: string;
  name: string;
  qrDisplayUrl?: string;
  slug: string;
  status: CafeStatus;
  updatedAt: string;
}

export interface CreateCafeInput {
  address?: string;
  area: string;
  city: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  googleMapsUrl?: string;
  name: string;
  status?: CafeStatus;
}

export type UpdateCafeInput = Partial<CreateCafeInput>;

export type ValidationResult<T> = { ok: true; value: T } | { errors: string[]; ok: false };

const cafeStatuses: readonly CafeStatus[] = ["draft", "active", "inactive"];

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ");

const readOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : undefined;
};

const readRequiredString = (value: unknown): string => (typeof value === "string" ? normalizeText(value) : "");

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizePhone = (value: string): string => value.trim().replace(/[^\d+]/g, "");

const isValidPhone = (value: string): boolean => /^\+?\d{10,15}$/.test(value);

const isValidHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const isCafeStatus = (value: unknown): value is CafeStatus =>
  typeof value === "string" && cafeStatuses.includes(value as CafeStatus);

export const normalizeCafeName = (name: string): string => normalizeText(name);

export const generateCafeSlug = ({ area, city, name }: Pick<CreateCafeInput, "area" | "city" | "name">): string => {
  const source = [name, area, city].map(normalizeText).filter(Boolean).join(" ");
  const slug = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "cafe";
};

export const isCafeActive = (cafe: Pick<Cafe, "status">): boolean => cafe.status === "active";

export const buildCafeQrDisplayUrl = (baseUrl: string, slug: string): string =>
  `${baseUrl.replace(/\/+$/u, "")}/qr/${encodeURIComponent(slug)}`;

export const buildCustomerRedeemUrl = (baseUrl: string, slug: string): string =>
  `${baseUrl.replace(/\/+$/u, "")}/c/${encodeURIComponent(slug)}`;

const validateCafePayload = (input: unknown, mode: "create" | "update"): ValidationResult<CreateCafeInput | UpdateCafeInput> => {
  if (!input || typeof input !== "object") {
    return { errors: ["Cafe input must be an object."], ok: false };
  }

  const record = input as Record<string, unknown>;
  const errors: string[] = [];
  const name = readRequiredString(record.name);
  const area = readRequiredString(record.area);
  const city = readRequiredString(record.city);
  const contactEmail = readOptionalString(record.contactEmail);
  const contactPhone = readOptionalString(record.contactPhone);
  const googleMapsUrl = readOptionalString(record.googleMapsUrl);
  const status = record.status === undefined ? undefined : record.status;

  if (mode === "create" || record.name !== undefined) {
    if (name.length < 2 || name.length > 120) {
      errors.push("Cafe name must be 2 to 120 characters.");
    }
  }

  if (mode === "create" || record.area !== undefined) {
    if (area.length < 2 || area.length > 80) {
      errors.push("Area must be 2 to 80 characters.");
    }
  }

  if (mode === "create" || record.city !== undefined) {
    if (city.length < 2 || city.length > 80) {
      errors.push("City must be 2 to 80 characters.");
    }
  }

  if (contactEmail && !isValidEmail(contactEmail)) {
    errors.push("Contact email must be valid.");
  }

  if (contactPhone && !isValidPhone(normalizePhone(contactPhone))) {
    errors.push("Contact phone must be a valid 10 to 15 digit number.");
  }

  if (googleMapsUrl && !isValidHttpsUrl(googleMapsUrl)) {
    errors.push("Google Maps URL must be a valid HTTPS URL.");
  }

  if (status !== undefined && !isCafeStatus(status)) {
    errors.push("Status must be draft, active, or inactive.");
  }

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  if (mode === "create") {
    return {
      ok: true,
      value: {
        address: readOptionalString(record.address),
        area,
        city,
        contactEmail,
        contactName: readOptionalString(record.contactName),
        contactPhone: contactPhone ? normalizePhone(contactPhone) : undefined,
        googleMapsUrl,
        name,
        status: isCafeStatus(status) ? status : "draft",
      },
    };
  }

  const value: UpdateCafeInput = {};
  if (record.address !== undefined) {
    value.address = readOptionalString(record.address);
  }
  if (record.area !== undefined) {
    value.area = area;
  }
  if (record.city !== undefined) {
    value.city = city;
  }
  if (record.contactEmail !== undefined) {
    value.contactEmail = contactEmail;
  }
  if (record.contactName !== undefined) {
    value.contactName = readOptionalString(record.contactName);
  }
  if (record.contactPhone !== undefined) {
    value.contactPhone = contactPhone ? normalizePhone(contactPhone) : undefined;
  }
  if (record.googleMapsUrl !== undefined) {
    value.googleMapsUrl = googleMapsUrl;
  }
  if (record.name !== undefined) {
    value.name = name;
  }
  if (isCafeStatus(status)) {
    value.status = status;
  }

  return {
    ok: true,
    value,
  };
};

export const validateCreateCafeInput = (input: unknown): ValidationResult<CreateCafeInput> => {
  const result = validateCafePayload(input, "create");
  return result.ok ? { ok: true, value: result.value as CreateCafeInput } : result;
};

export const validateUpdateCafeInput = (input: unknown): ValidationResult<UpdateCafeInput> => {
  const result = validateCafePayload(input, "update");
  return result.ok ? { ok: true, value: result.value as UpdateCafeInput } : result;
};

export interface Customer {
  customerId: string;
  displayName: string;
  email: string;
}

export interface SubscriptionPlan {
  planId: string;
  cafeId: string;
  name: string;
  coffeeCount: number;
  validityDays: number;
}

export type MembershipStatus = "active" | "expired" | "cancelled";

export interface Membership {
  membershipId: string;
  customerId: string;
  cafeId: string;
  planId: string;
  planName: string;
  status: MembershipStatus;
  totalCoffees: number;
  remainingCoffees: number;
  expiresAt: string;
}

export interface Redemption {
  redemptionId: string;
  membershipId: string;
  cafeId: string;
  verificationCode: string;
  redeemedAt: string;
  remainingCoffeesAfterRedeem: number;
}

export interface CafeLandingView {
  cafe: Cafe;
  activeMembership: Membership | null;
}

export interface RedeemCoffeeRequest {
  cafeId: string;
}

export interface RedeemCoffeeResponse {
  redemption: Redemption;
  membership: Membership;
}

export interface RedemptionHistoryView {
  redemptions: Redemption[];
}

export type WaitlistRole = "customer" | "cafe_owner";

export interface JoinWaitlistRequest {
  city: string;
  consentToContact: boolean;
  email?: string;
  name: string;
  phone: string;
  role: WaitlistRole;
  source?: string;
}

export interface JoinWaitlistResponse {
  leadId: string;
  message: string;
}
