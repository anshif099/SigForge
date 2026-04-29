import type { CompanyAssets } from "./types";

type BrandPalette = NonNullable<CompanyAssets["brandPalette"]>;

const BRAND_VARIABLES = [
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
  "--muted",
  "--border",
  "--input",
  "--ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  "--gradient-primary",
];

export function applyBrandTheme(
  palette: BrandPalette | undefined,
  mode: "light" | "dark",
  root: HTMLElement = document.documentElement,
) {
  for (const variable of BRAND_VARIABLES) {
    root.style.removeProperty(variable);
  }

  if (!palette) return;

  const primary = normalizeHex(palette.primary);
  const secondary = normalizeHex(palette.secondary);
  const surface = mode === "dark" ? "#111827" : "#ffffff";
  const quietSurface = mode === "dark" ? "#1f2937" : "#f8fafc";
  const accent = mixHex(secondary, surface, mode === "dark" ? 0.68 : 0.84);
  const muted = mixHex(secondary, quietSurface, mode === "dark" ? 0.82 : 0.9);
  const border = mixHex(secondary, surface, mode === "dark" ? 0.72 : 0.78);
  const third = mixHex(primary, secondary, 0.52);
  const fourth = mixHex(primary, mode === "dark" ? "#ffffff" : "#000000", 0.28);
  const fifth = mixHex(secondary, mode === "dark" ? "#ffffff" : "#000000", 0.38);

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", readableTextColor(primary));
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--secondary-foreground", readableTextColor(secondary));
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-foreground", readableTextColor(accent));
  root.style.setProperty("--muted", muted);
  root.style.setProperty("--border", border);
  root.style.setProperty("--input", border);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--chart-1", primary);
  root.style.setProperty("--chart-2", secondary);
  root.style.setProperty("--chart-3", third);
  root.style.setProperty("--chart-4", fourth);
  root.style.setProperty("--chart-5", fifth);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-primary-foreground", readableTextColor(primary));
  root.style.setProperty("--sidebar-accent", accent);
  root.style.setProperty("--sidebar-accent-foreground", readableTextColor(accent));
  root.style.setProperty("--sidebar-border", border);
  root.style.setProperty("--sidebar-ring", primary);
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, ${secondary}, ${primary} 48%, ${third})`,
  );
}

export function normalizeHex(hex: string): string {
  const trimmed = hex.trim();
  const short = trimmed.match(/^#?([0-9a-f]{3})$/i)?.[1];
  if (short) {
    return `#${short
      .split("")
      .map((char) => char + char)
      .join("")}`.toLowerCase();
  }

  const full = trimmed.match(/^#?([0-9a-f]{6})$/i)?.[1];
  return full ? `#${full.toLowerCase()}` : "#0040e8";
}

export function readableTextColor(hex: string): "#001028" | "#ffffff" {
  const { r, g, b } = hexToRgb(normalizeHex(hex));
  return relativeLuminance(r, g, b) > 0.58 ? "#001028" : "#ffffff";
}

export function mixHex(hex: string, target: string, targetWeight: number): string {
  const base = hexToRgb(normalizeHex(hex));
  const mix = hexToRgb(normalizeHex(target));
  const keepWeight = 1 - targetWeight;

  return rgbToHex({
    r: base.r * keepWeight + mix.r * targetWeight,
    g: base.g * keepWeight + mix.g * targetWeight,
    b: base.b * keepWeight + mix.b * targetWeight,
  });
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, "0");

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function relativeLuminance(r: number, g: number, b: number) {
  const linear = [r, g, b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
