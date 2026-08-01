"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No production error-telemetry pipeline exists yet (see APP_PROCESS_LOG.md);
    // this console line is the only record of a boundary-caught error today.
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div className="app-shell">
      <SiteHeader mode="public" />
      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: "48px 20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            borderRadius: "var(--radius-lg)",
            padding: "44px 36px",
            background: "var(--surface-strong)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-floating)",
            textAlign: "center",
            display: "grid",
            gap: 12,
            justifyItems: "center",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "#fee2e2",
              color: "#dc2626",
              fontSize: "1.6rem",
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            !
          </div>
          <h1 style={{ margin: 0, color: "var(--brand-deep)", fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, color: "var(--ink-soft)", lineHeight: 1.6, fontSize: "0.94rem" }}>
            This page ran into an unexpected problem. Your account and any completed payments are unaffected — please try again.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              href="/support"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 48,
                padding: "0 22px",
                borderRadius: "var(--radius-pill)",
                border: "1.5px solid var(--line-strong)",
                background: "var(--surface)",
                color: "var(--brand-deep)",
                fontWeight: 700,
              }}
            >
              Contact Support
            </Link>
            <button
              type="button"
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 48,
                padding: "0 26px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, var(--brand), var(--brand-hover))",
                color: "var(--surface-strong)",
                fontWeight: 800,
                boxShadow: "var(--shadow-card)",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
