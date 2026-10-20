import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "WCE Logistics: interstate trucking across every Nigerian state, on demand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const anton = await readFile(join(process.cwd(), "node_modules/@fontsource/anton/files/anton-latin-400-normal.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#0B2545",
          color: "#FFFFFF",
          fontFamily: "Anton",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="150" height="50" viewBox="0 0 300 100">
            <path d="M0 10H27L41 60L55 10H76L90 60L104 10H131L107 90H79L65.5 44L52 90H24Z" fill="#FFFFFF" />
            <path
              d="M216 20H174C157 20 146 31 146 50C146 69 157 80 174 80H216"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="20"
              strokeLinejoin="round"
            />
            <path d="M228 10H300V30H228ZM228 70H300V90H228Z" fill="#FFFFFF" />
            <path d="M221 40H296L286 60H211Z" fill="#FF6B00" />
          </svg>
          <div style={{ width: 3, height: 46, background: "#FF6B00" }} />
          <div style={{ fontSize: 34, letterSpacing: 4 }}>LOGISTICS</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 128, lineHeight: 0.9 }}>
          <div>ACROSS</div>
          <div style={{ color: "#FF6B00", paddingLeft: 80 }}>EVERY STATE</div>
          <div>ON DEMAND</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, letterSpacing: 3, color: "#C9D3E0" }}>
          <div>HEAVY EQUIPMENT / TRUCKS / BUSES / LOGISTICS</div>
          <div style={{ color: "#FF6B00" }}>MOVE MORE. BUILD MORE.</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Anton", data: anton, style: "normal", weight: 400 }] },
  );
}
