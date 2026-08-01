"use client";

import { useEffect } from "react";

// This is the last-resort boundary — it replaces the entire root layout
// (html/body included) if anything in it throws, so it must not depend on
// globals.css, fonts, or any other app component that could itself fail.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled root-layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#eef2ff", color: "#0f172a" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 16,
              padding: "40px 32px",
              background: "#ffffff",
              border: "1px solid #dbe5f4",
              boxShadow: "0 22px 55px rgba(15,23,42,0.12)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                margin: "0 auto 16px",
                display: "grid",
                placeItems: "center",
                background: "#fee2e2",
                color: "#dc2626",
                fontSize: "1.5rem",
                fontWeight: 900,
              }}
            >
              !
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: "1.3rem", fontWeight: 800 }}>Saiman Healthcare is unavailable</h1>
            <p style={{ margin: "0 0 20px", color: "#486079", lineHeight: 1.6, fontSize: "0.94rem" }}>
              Something went wrong loading the app. Your account and any completed payments are unaffected — please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                border: "none",
                cursor: "pointer",
                minHeight: 48,
                padding: "0 28px",
                borderRadius: 999,
                background: "#2954e0",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.95rem",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
