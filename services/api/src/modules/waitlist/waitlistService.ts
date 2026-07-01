import type { JoinWaitlistRequest } from "@my-caffe/shared";
import type { WaitlistRepository } from "./waitlistRepository.js";

export class WaitlistValidationError extends Error {}

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ");

const normalizeEmail = (value: string | undefined): string | undefined => {
  const email = value?.trim().toLowerCase();
  return email ? email : undefined;
};

const normalizePhone = (value: string): string => value.trim().replace(/[^\d+]/g, "");

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidPhone = (value: string): boolean => /^\+?\d{10,15}$/.test(value);

export const parseJoinWaitlistRequest = (body: unknown): JoinWaitlistRequest => {
  if (!body || typeof body !== "object") {
    throw new WaitlistValidationError("Request body is required.");
  }

  const input = body as Partial<Record<keyof JoinWaitlistRequest, unknown>>;
  const name = typeof input.name === "string" ? normalizeText(input.name) : "";
  const city = typeof input.city === "string" ? normalizeText(input.city) : "";
  const phone = typeof input.phone === "string" ? normalizePhone(input.phone) : "";
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : undefined;
  const role = input.role;
  const source = typeof input.source === "string" ? normalizeText(input.source).slice(0, 80) : undefined;

  if (name.length < 2) {
    throw new WaitlistValidationError("Name must be at least 2 characters.");
  }

  if (!isValidPhone(phone)) {
    throw new WaitlistValidationError("Phone must be a valid 10 to 15 digit number.");
  }

  if (email && !isValidEmail(email)) {
    throw new WaitlistValidationError("Email must be valid when provided.");
  }

  if (city.length < 2) {
    throw new WaitlistValidationError("City is required.");
  }

  if (role !== "customer" && role !== "cafe_owner") {
    throw new WaitlistValidationError("Role must be customer or cafe_owner.");
  }

  if (input.consentToContact !== true) {
    throw new WaitlistValidationError("Consent to contact is required.");
  }

  return {
    city,
    consentToContact: true,
    email,
    name,
    phone,
    role,
    source,
  };
};

export const createWaitlistService = (repository: WaitlistRepository) => ({
  async join(input: JoinWaitlistRequest) {
    const lead = await repository.createLead(input);
    return {
      leadId: lead.leadId,
      message: "You are on the My Caffe waitlist.",
    };
  },
});
