import { describe, expect, it } from "vitest";
import { clamp, cn } from "./utils";

describe("clamp", () => {
  it("keeps values inside the range", () => {
    expect(clamp(50)).toBe(50);
    expect(clamp(-5)).toBe(0);
    expect(clamp(140)).toBe(100);
    expect(clamp(7, 1, 5)).toBe(5);
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
