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

export const GIRDER_CONFIG = {
  baseUrl: "https://girder.example.com/api/v1",
  vizFolderIds: {
    MAXIMA: null,
    HELIX: null,
    SPHINX: null,
  },
  pollIntervalMs: 15000,
};

export const SAMPLE_POSITIONS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1"];

export const VIZ_TYPES = [
  { name: "XRD Pattern", color: "#4ECDC4" },
  { name: "Stress-Strain", color: "#FF6B6B" },
  { name: "Nanoindentation", color: "#FFE66D" },
  { name: "Pole Figure", color: "#A78BFA" },
  { name: "Residual Stress Map", color: "#F97316" },
  { name: "Grain Size Distribution", color: "#34D399" },
];
