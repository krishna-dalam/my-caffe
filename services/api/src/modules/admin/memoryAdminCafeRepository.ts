import { createMemoryCafeStore, type MemoryCafeStore } from "../customer/memoryCafeStore.js";
import type { AdminCafeRepository } from "./adminCafeRepository.js";

interface MemoryAdminCafeRepositoryOptions {
  cafeStore?: MemoryCafeStore;
}

export const createMemoryAdminCafeRepository = ({
  cafeStore = createMemoryCafeStore(),
}: MemoryAdminCafeRepositoryOptions = {}): AdminCafeRepository => {
  return {
    async createCafe(cafe) {
      return cafeStore.createCafe(cafe);
    },

    async getCafe(cafeId) {
      return cafeStore.getCafe(cafeId);
    },

    async listCafes() {
      return cafeStore.listCafes();
    },

    async updateCafe(cafeId, updates) {
      return cafeStore.updateCafe(cafeId, updates);
    },
  };
};
