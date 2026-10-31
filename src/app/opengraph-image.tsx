import { ImageResponse } from "next/og";

export const alt = "Foi Abaixo — falhas de água e luz em Portugal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1c1917",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* raio — luz */}
          <svg width="88" height="88" viewBox="0 0 24 24" fill="#f59e0b">
            <polygon points="13,2 3,14 11,14 9,22 21,10 13,10" />
          </svg>
          {/* gota — água, sobreposta como no logótipo */}
          <svg width="72" height="72" viewBox="0 0 24 24" fill="#0ea5e9" style={{ marginLeft: -36 }}>
            <path d="M12 2c4 5 7 9.5 7 13a7 7 0 1 1-14 0c0-3.5 3-8 7-13z" />
          </svg>
          <span style={{ color: "#fafaf9", fontSize: 88, fontWeight: 700, marginLeft: 8 }}>Foi Abaixo</span>
        </div>
        <span style={{ color: "#a8a29e", fontSize: 34, marginTop: 28 }}>
          Mapa colaborativo de falhas de água e luz em Portugal
        </span>
      </div>
    ),
    { ...size }
  );
}
