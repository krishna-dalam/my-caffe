import { describe, expect, it } from "vitest";
import { cafeStatuses } from "./adminCafeApi";

describe("adminCafeApi helpers", () => {
  it("exposes supported cafe statuses in form order", () => {
    expect(cafeStatuses).toEqual(["draft", "active", "inactive"]);
  });
});

