export const INSTRUMENTS = [
  { id: "MAXIMA", label: "MAXIMA", description: "Synchrotron XRD", color: "#4ECDC4" },
  { id: "HELIX", label: "HELIX", description: "Laser Shock / PDV", color: "#FF6B6B" },
  { id: "SPHINX", label: "SPHINX", description: "Nanoindentation", color: "#A78BFA" },
];

export const INSTRUMENT_COLORS = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.id, i.color])
);

export const INSTRUMENT_DESCRIPTIONS = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.id, i.description])
);

export const GIRDER_API_URL = "https://data.htmdec.org/api/v1";

export const GIRDER_DATAFILES_URL = `${GIRDER_API_URL}/aimdl/datafiles`;
export const GIRDER_COUNTS_URL = `${GIRDER_API_URL}/aimdl/count`;
const GIRDER_TOKEN_STORAGE_KEY = "girderToken";

export function getGirderToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GIRDER_TOKEN_STORAGE_KEY);
}

export function setGirderToken(token) {
  if (typeof window === "undefined") return;

  if (token) {
    window.localStorage.setItem(GIRDER_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(GIRDER_TOKEN_STORAGE_KEY);
  }
}

export function getGirderAuthHeaders() {
  const token = getGirderToken();
  return token ? { "Girder-Token": token } : {};
}

export function girderFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...getGirderAuthHeaders(),
      ...(options.headers || {}),
    },
  });
}

export async function validateGirderToken(token) {
  const response = await fetch(`${GIRDER_API_URL}/user/me`, {
    headers: { "Girder-Token": token },
  });

  if (!response.ok) {
    return { valid: false, user: null };
  }

  const user = await response.json();
  return { valid: user !== null && user !== false, user };
}

export async function getOAuthProviders(redirect) {
  const response = await fetch(`${GIRDER_API_URL}/oauth/provider?redirect=${encodeURIComponent(redirect)}`);

  if (!response.ok) {
    throw new Error(`Unable to load OAuth providers (${response.status})`);
  }

  return response.json();
}

export function makeGirderImageUrl(itemId) {
  const token = getGirderToken();
  const query = token ? `&token=${encodeURIComponent(token)}` : "";
  return `${GIRDER_API_URL}/item/${itemId}/download?contentDisposition=inline${query}`;
}

export const STREAM_COUNTER_URL =
  window.location.hostname === "localhost" && window.location.port === "5173"
    ? "http://localhost:8001"
    : "";

export const SAMPLE_POSITIONS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1"];

export const VIZ_TYPES = [
  { name: "XRD Pattern", color: "#4ECDC4" },
  { name: "Stress-Strain", color: "#FF6B6B" },
  { name: "Nanoindentation", color: "#FFE66D" },
  { name: "Pole Figure", color: "#A78BFA" },
  { name: "Residual Stress Map", color: "#F97316" },
  { name: "Grain Size Distribution", color: "#34D399" },
];
