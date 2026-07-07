import { describe, expect, it } from "vitest";
import { parseAdminRoute } from "./routes";

describe("parseAdminRoute", () => {
  it("matches admin cafe routes", () => {
    expect(parseAdminRoute("/admin/cafes")).toEqual({ name: "cafeList" });
    expect(parseAdminRoute("/admin/cafes/new")).toEqual({ name: "cafeNew" });
    expect(parseAdminRoute("/admin/cafes/cafe_123")).toEqual({ name: "cafeDetail", cafeId: "cafe_123" });
    expect(parseAdminRoute("/admin/auth/callback")).toEqual({ name: "authCallback" });
  });
});
