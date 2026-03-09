// 10 brand color palettes — each with 50–950 shades
export type BrandColor =
  | "pink"
  | "rose"
  | "orange"
  | "amber"
  | "emerald"
  | "teal"
  | "blue"
  | "indigo"
  | "violet"
  | "slate";

interface Palette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export const BRAND_COLORS: Record<
  BrandColor,
  { label: string; swatch: string; palette: Palette }
> = {
  pink: {
    label: "Pink",
    swatch: "#ec4899",
    palette: {
      50: "#fdf2f8",
      100: "#fce7f3",
      200: "#fbcfe8",
      300: "#f9a8d4",
      400: "#f472b6",
      500: "#ec4899",
      600: "#db2777",
      700: "#be185d",
      800: "#9d174d",
      900: "#831843",
      950: "#500724",
    },
  },
  rose: {
    label: "Rose",
    swatch: "#f43f5e",
    palette: {
      50: "#fff1f2",
      100: "#ffe4e6",
      200: "#fecdd3",
      300: "#fda4af",
      400: "#fb7185",
      500: "#f43f5e",
      600: "#e11d48",
      700: "#be123c",
      800: "#9f1239",
      900: "#881337",
      950: "#4c0519",
    },
  },
  orange: {
    label: "Orange",
    swatch: "#f97316",
    palette: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
      950: "#431407",
    },
  },
  amber: {
    label: "Amber",
    swatch: "#f59e0b",
    palette: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
      950: "#451a03",
    },
  },
  emerald: {
    label: "Emerald",
    swatch: "#10b981",
    palette: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
      950: "#022c22",
    },
  },
  teal: {
    label: "Teal",
    swatch: "#14b8a6",
    palette: {
      50: "#f0fdfa",
      100: "#ccfbf1",
      200: "#99f6e4",
      300: "#5eead4",
      400: "#2dd4bf",
      500: "#14b8a6",
      600: "#0d9488",
      700: "#0f766e",
      800: "#115e59",
      900: "#134e4a",
      950: "#042f2e",
    },
  },
  blue: {
    label: "Blue",
    swatch: "#3b82f6",
    palette: {
      50: "#eff6ff",
      100: "#dbeafe",
      200: "#bfdbfe",
      300: "#93c5fd",
      400: "#60a5fa",
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8",
      800: "#1e40af",
      900: "#1e3a8a",
      950: "#172554",
    },
  },
  indigo: {
    label: "Indigo",
    swatch: "#6366f1",
    palette: {
      50: "#eef2ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      300: "#a5b4fc",
      400: "#818cf8",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      800: "#3730a3",
      900: "#312e81",
      950: "#1e1b4b",
    },
  },
  violet: {
    label: "Violet",
    swatch: "#8b5cf6",
    palette: {
      50: "#f5f3ff",
      100: "#ede9fe",
      200: "#ddd6fe",
      300: "#c4b5fd",
      400: "#a78bfa",
      500: "#8b5cf6",
      600: "#7c3aed",
      700: "#6d28d9",
      800: "#5b21b6",
      900: "#4c1d95",
      950: "#2e1065",
    },
  },
  slate: {
    label: "Slate",
    swatch: "#64748b",
    palette: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
      950: "#020617",
    },
  },
};

export const BRAND_COLOR_KEYS: BrandColor[] = [
  "pink",
  "rose",
  "orange",
  "amber",
  "emerald",
  "teal",
  "blue",
  "indigo",
  "violet",
  "slate",
];

/** Apply a brand color palette to the document root CSS variables */
export function applyBrandColor(color: BrandColor) {
  const { palette } = BRAND_COLORS[color];
  const root = document.documentElement;
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
  for (const shade of shades) {
    root.style.setProperty(`--brand-${shade}`, palette[shade]);
  }
}
