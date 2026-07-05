import type { Cafe, UpdateCafeInput } from "@my-caffe/shared";

export const demoCafe: Cafe = {
  area: "Indiranagar",
  cafeId: "cafe_demo_001",
  city: "Bengaluru",
  createdAt: "2026-01-01T00:00:00.000Z",
  name: "Blue Bottle Demo Cafe",
  slug: "blue-bottle-demo",
  status: "active",
  updatedAt: "2026-01-01T00:00:00.000Z",
  address: "Indiranagar, Bengaluru",
};

export interface MemoryCafeStore {
  createCafe(cafe: Cafe): boolean;
  findCafeBySlug(slug: string): Cafe | null;
  getCafe(cafeId: string): Cafe | null;
  listCafes(): Cafe[];
  updateCafe(cafeId: string, updates: UpdateCafeInput & { updatedAt: string }): Cafe | null;
}

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

export const createMemoryCafeStore = (initialCafes: Cafe[] = [demoCafe]): MemoryCafeStore => {
  const cafesById = new Map<string, Cafe>();
  const cafeIdsBySlug = new Map<string, string>();

  for (const cafe of initialCafes) {
    cafesById.set(cafe.cafeId, cafe);
    cafeIdsBySlug.set(cafe.slug, cafe.cafeId);
  }

  return {
    createCafe(cafe) {
      if (cafesById.has(cafe.cafeId) || cafeIdsBySlug.has(cafe.slug)) {
        return false;
      }

      cafesById.set(cafe.cafeId, cafe);
      cafeIdsBySlug.set(cafe.slug, cafe.cafeId);
      return true;
    },

    findCafeBySlug(slug) {
      const cafeId = cafeIdsBySlug.get(slug);
      return cafeId ? cafesById.get(cafeId) ?? null : null;
    },

    getCafe(cafeId) {
      return cafesById.get(cafeId) ?? null;
    },

    listCafes() {
      return [...cafesById.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },

    updateCafe(cafeId, updates) {
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

