import { useEffect, useMemo, useState } from "react";
import Dashboard from "./Dashboard";
import LoginPage from "./LoginPage";
import { getGirderToken, setGirderToken, validateGirderToken } from "../config";

export default function AuthGate() {
    const [authState, setAuthState] = useState({ status: "checking", user: null });

    const currentUrl = useMemo(() => new URL(window.location.href), []);

    useEffect(() => {
        let cancelled = false;

        async function checkAuth() {
            const tokenFromUrl = currentUrl.searchParams.get("girderToken");
            const errorFromUrl = currentUrl.searchParams.get("error");

            if (tokenFromUrl) {
                setGirderToken(tokenFromUrl);
                currentUrl.searchParams.delete("girderToken");
                window.history.replaceState({}, "", currentUrl.toString());
            }

            const token = tokenFromUrl || getGirderToken();
            if (!token) {
                if (!cancelled) setAuthState({ status: "logged_out", user: null, error: errorFromUrl || null });
                return;
            }

            try {
                const result = await validateGirderToken(token);
                if (!cancelled) {
                    if (result?.valid) {
                        setAuthState({ status: "logged_in", user: result.user || null });
                    } else {
                        setGirderToken(null);
                        setAuthState({ status: "logged_out", user: null, error: errorFromUrl || null });
                    }
                }
            } catch {
                if (!cancelled) {
                    setGirderToken(null);
                    setAuthState({ status: "logged_out", user: null, error: errorFromUrl || null });
                }
            }
        }

        checkAuth();
        return () => {
            cancelled = true;
        };
    }, [currentUrl]);

    if (authState.status === "checking") {
        return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#c8d3e8" }}>Checking login…</div>;
    }

    if (authState.status === "logged_out") {
        return <LoginPage onLogin={() => window.location.reload()} />;
    }

    return <Dashboard />;
}
