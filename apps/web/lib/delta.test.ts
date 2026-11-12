import { describe, expect, it } from "vitest";
import { delta } from "./delta";

describe("delta", () => {
  it("formats increases, decreases, ties and missing baselines", () => {
    expect(delta(54, 50)).toEqual({ text: "+4", tone: "up" });
    expect(delta(48.5, 50, "%")).toEqual({ text: "−1.5%", tone: "down" });
    expect(delta(50, 50)).toEqual({ text: "no change", tone: "flat" });
    expect(delta(50, 0)).toEqual({ text: "—", tone: "none" });
  });
});
