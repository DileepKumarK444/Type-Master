import { afterEach, describe, expect, it, vi } from "vitest";
import { reportError } from "./report-error";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete process.env.NEXT_PUBLIC_ERROR_ENDPOINT; });

describe("reportError", () => {
  it("logs a structured payload and never throws, even for non-Error values", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    reportError(new Error("boom"), "unit");
    reportError("just a string", "unit");
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][1]).toMatchObject({ context: "unit", message: "boom" });
    expect(log.mock.calls[1][1]).toMatchObject({ message: "just a string" });
  });
  it("posts to the configured endpoint with sendBeacon, and survives a failing beacon", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NEXT_PUBLIC_ERROR_ENDPOINT = "https://errors.example/collect";
    const beacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    reportError(new Error("x"), "unit");
    expect(beacon).toHaveBeenCalledWith("https://errors.example/collect", expect.any(Blob));
    vi.stubGlobal("navigator", { sendBeacon: () => { throw new Error("blocked"); } });
    expect(() => reportError(new Error("y"), "unit")).not.toThrow();
  });
  it("does not call sendBeacon when no endpoint is configured", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const beacon = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    reportError(new Error("z"), "unit");
    expect(beacon).not.toHaveBeenCalled();
  });
});
