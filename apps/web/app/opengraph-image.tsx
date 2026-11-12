import { ImageResponse } from "next/og";

export const alt = "TypeMaster — type faster, understand why you’re slow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#fafaf8", color: "#1c1c1a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#2f5bea", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700 }}>tm</div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>TypeMaster</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 76, fontWeight: 800, lineHeight: 1.1 }}>
          <div>Type faster.</div>
          <div style={{ color: "#2f5bea" }}>Understand why you’re slow.</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 32, color: "#74746c" }}>Lessons · per-key analytics · weak-key drills · games</div>
      </div>
    ),
    size,
  );
}
