import { useEffect, useMemo, useState } from "react";
import { GIRDER_API_URL, getOAuthProviders } from "../config";

export default function LoginPage({ onLogin }) {
    const [providers, setProviders] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const redirect = useMemo(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("girderToken");
        url.searchParams.delete("error");
        return url.toString();
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadProviders() {
            try {
                const providersMap = await getOAuthProviders(redirect);
                if (!cancelled) {
                    setProviders(providersMap || {});
                    setError("");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Unable to load login providers.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadProviders();
        return () => {
            cancelled = true;
        };
    }, [redirect]);

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #04070d 0%, #0b1220 45%, #121a2b 100%)",
                color: "#e5eefb",
                padding: "24px",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "520px",
                    background: "rgba(8, 12, 21, 0.92)",
                    border: "1px solid #172235",
                    borderRadius: "18px",
                    boxShadow: "0 18px 40px rgba(2, 6, 23, 0.45)",
                    padding: "28px",
                }}
            >
                <p style={{ color: "#8ba2c5", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.24em", fontSize: "11px" }}>
                    AIMDL Dashboard
                </p>
                <h1 style={{ margin: "0 0 6px", fontSize: "28px" }}>Sign in to continue</h1>
                <p style={{ color: "#c8d3e8", margin: "0 0 18px", lineHeight: 1.5 }}>
                    Use your Girder account to access the dashboard data. The login page will return you here after authentication.
                </p>

                {error && (
                    <div style={{ marginBottom: "14px", background: "rgba(190, 24, 93, 0.12)", border: "1px solid rgba(190, 24, 93, 0.35)", borderRadius: "10px", padding: "10px 12px", color: "#fecdd3" }}>
                        {error}
                    </div>
                )}

                {loading ? (
                    <p style={{ color: "#9fb0cf" }}>Loading login providers…</p>
                ) : Object.keys(providers).length === 0 ? (
                    <p style={{ color: "#9fb0cf" }}>No OAuth providers are currently available.</p>
                ) : (
                    <div style={{ display: "grid", gap: "10px" }}>
                        {Object.entries(providers).map(([name, url]) => (
                            <a
                                key={name}
                                href={url}
                                target="_self"
                                rel="noreferrer"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    textDecoration: "none",
                                    borderRadius: "12px",
                                    border: "1px solid #22324a",
                                    background: "linear-gradient(180deg, #111827 0%, #0b1323 100%)",
                                    color: "#edf4ff",
                                    padding: "12px 14px",
                                    fontWeight: 600,
                                }}
                            >
                                <span>Continue with {name}</span>
                                <span style={{ color: "#7dd3fc", fontSize: "12px" }}>Open auth →</span>
                            </a>
                        ))}
                    </div>
                )}

                <p style={{ color: "#7d90b0", fontSize: "12px", marginTop: "16px" }}>
                    Using API endpoint: {GIRDER_API_URL}
                </p>

                {typeof onLogin === "function" && (
                    <button
                        type="button"
                        onClick={onLogin}
                        style={{ marginTop: "12px", color: "#dbeafe", background: "transparent", border: "1px solid #22324a", borderRadius: "8px", padding: "8px 10px", cursor: "pointer" }}
                    >
                        Retry check
                    </button>
                )}
            </div>
        </div>
    );
}
