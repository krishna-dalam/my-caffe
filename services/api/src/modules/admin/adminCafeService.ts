import {
  buildCafeQrDisplayUrl,
  buildCustomerRedeemUrl,
  generateCafeSlug,
  type Cafe,
  type CreateCafeInput,
  type UpdateCafeInput,
} from "@my-caffe/shared";
import { randomUUID } from "node:crypto";
import type { AdminCafeRepository } from "./adminCafeRepository.js";

export class AdminCafeConflictError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface AdminCafeService {
  createCafe(input: CreateCafeInput): Promise<Cafe>;
  getCafe(cafeId: string): Promise<Cafe | null>;
  listCafes(): Promise<Cafe[]>;
  updateCafe(cafeId: string, input: UpdateCafeInput): Promise<Cafe | null>;
}

const maxSlugAttempts = 8;

const slugWithSuffix = (baseSlug: string, attempt: number, cafeId: string): string =>
  attempt === 0 ? baseSlug : `${baseSlug}-${cafeId.replace(/^cafe_/u, "").replace(/-/gu, "").slice(0, 8 + attempt)}`;

const withCafeLinks = (baseUrl: string, cafe: Cafe): Cafe => ({
  ...cafe,
  customerRedeemUrl: buildCustomerRedeemUrl(baseUrl, cafe.slug),
  qrDisplayUrl: buildCafeQrDisplayUrl(baseUrl, cafe.slug),
});

export const createAdminCafeService = (repository: AdminCafeRepository, baseUrl: string): AdminCafeService => ({
  async createCafe(input) {
    const cafeId = `cafe_${randomUUID()}`;
    const now = new Date().toISOString();
    const baseSlug = generateCafeSlug(input);

    for (let attempt = 0; attempt < maxSlugAttempts; attempt += 1) {
      const slug = slugWithSuffix(baseSlug, attempt, cafeId);
      const cafe = withCafeLinks(baseUrl, {
        address: input.address,
        area: input.area,
        cafeId,
        city: input.city,
        contactEmail: input.contactEmail,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        createdAt: now,
        googleMapsUrl: input.googleMapsUrl,
        name: input.name,
        slug,
        status: input.status ?? "draft",
        updatedAt: now,
      });

      if (await repository.createCafe(cafe)) {
        return cafe;
      }
    }

    throw new AdminCafeConflictError("Unable to generate a unique cafe slug.");
  },

  getCafe(cafeId) {
    return repository.getCafe(cafeId);
  },

  listCafes() {
    return repository.listCafes();
  },

  updateCafe(cafeId, input) {
    return repository.updateCafe(cafeId, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
  },
});
