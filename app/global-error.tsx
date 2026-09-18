"use client";

/**
 * The last boundary there is.
 *
 * A segment `error.tsx` renders *inside* its layout, so it cannot catch a
 * failure in the root layout itself — the fonts, the theme script, the
 * providers. This one replaces the whole document when that happens, which is
 * why it has to ship its own `<html>` and `<body>`: at this point the root
 * layout is the thing that failed, so nothing it would have rendered exists.
 *
 * For the same reason there is no shared component here and no `globals.css`
 * import to rely on. If the stylesheet is what broke, a Tailwind class is not
 * going to render — so the styling is inline and the markup is plain. This
 * file should look plainer than the rest of the app; that is not an oversight.
 *
 * In production React replaces the message with a generic string, so `digest`
 * is the only thing tying this screen to a server log line. It is shown.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3.5rem 1.25rem",
          background: "#ffffff",
          color: "#171717",
          font: '400 14px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ maxWidth: "46ch", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#737373",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            Application error
          </p>

          <h1 style={{ margin: "0.5rem 0 0", fontSize: "15.5px", fontWeight: 600 }}>
            Buildtact could not start.
          </h1>
          <p style={{ margin: "0.5rem 0 0", fontSize: "13.5px", color: "#525252" }}>
            Something failed before the page could render. Reloading usually clears it.
          </p>

          {error.digest ? (
            <p
              style={{
                margin: "0.75rem 0 0",
                fontSize: 11,
                color: "#737373",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              height: 32,
              padding: "0 0.875rem",
              borderRadius: 6,
              border: "1px solid #e5e5e5",
              background: "#171717",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
