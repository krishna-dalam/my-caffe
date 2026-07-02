import type { Cafe, UpdateCafeInput } from "@my-caffe/shared";

export interface AdminCafeRepository {
  createCafe(cafe: Cafe): Promise<boolean>;
  getCafe(cafeId: string): Promise<Cafe | null>;
  listCafes(): Promise<Cafe[]>;
  updateCafe(cafeId: string, updates: UpdateCafeInput & { updatedAt: string }): Promise<Cafe | null>;
}

