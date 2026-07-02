import type { Cafe, UpdateCafeInput } from "@my-caffe/shared";
import type { AdminCafeRepository } from "./adminCafeRepository.js";

export const createMemoryAdminCafeRepository = (): AdminCafeRepository => {
  const cafesById = new Map<string, Cafe>();
  const cafeIdsBySlug = new Map<string, string>();

  return {
    async createCafe(cafe) {
      if (cafeIdsBySlug.has(cafe.slug) || cafesById.has(cafe.cafeId)) {
        return false;
      }

      cafesById.set(cafe.cafeId, cafe);
      cafeIdsBySlug.set(cafe.slug, cafe.cafeId);
      return true;
    },

    async getCafe(cafeId) {
      return cafesById.get(cafeId) ?? null;
    },

    async listCafes() {
      return [...cafesById.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },

    async updateCafe(cafeId, updates) {
      const existing = cafesById.get(cafeId);
      if (!existing) {
        return null;
      }

      const next: Cafe = {
        ...existing,
        ...compactCafeUpdates(updates),
        updatedAt: updates.updatedAt,
      };

      cafesById.set(cafeId, next);
      return next;
    },
  };
};

const compactCafeUpdates = (updates: UpdateCafeInput): UpdateCafeInput => {
  const compacted: UpdateCafeInput = {};
  const updateKeys: Array<keyof UpdateCafeInput> = [
    "address",
    "area",
    "city",
    "contactEmail",
    "contactName",
    "contactPhone",
    "googleMapsUrl",
    "name",
    "status",
  ];

  for (const key of updateKeys) {
    if (key in updates) {
      compacted[key] = updates[key] as never;
    }
  }

  return compacted;
};

