import { normalizeHex } from "./brand-theme";
import type { CompanyAssets } from "./types";

type BrandPalette = NonNullable<CompanyAssets["brandPalette"]>;

type ColorBucket = {
  r: number;
  g: number;
  b: number;
  count: number;
  score: number;
  hex: string;
};

export async function extractPaletteFromImage(src: string): Promise<BrandPalette> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is not available");

  const maxSize = 96;
  const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight, 1);
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map<string, ColorBucket>();

  for (let i = 0; i < pixels.length; i += 16) {
    const alpha = pixels[i + 3];
    if (alpha < 160) continue;

    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const { s, l } = rgbToHsl(r, g, b);

    if ((l > 0.9 && s < 0.18) || l < 0.04 || s < 0.08) continue;

    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr}-${qg}-${qb}`;
    const bucket = buckets.get(key) ?? {
      r: 0,
      g: 0,
      b: 0,
      count: 0,
      score: 0,
      hex: "#0040e8",
    };
    const balanceScore = 1 - Math.min(Math.abs(l - 0.46), 0.46) * 0.7;
    const saturationScore = 0.7 + s * 2.2;

    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
    bucket.score += saturationScore * balanceScore;
    buckets.set(key, bucket);
  }

  const colors = Array.from(buckets.values())
    .map((bucket) => ({
      ...bucket,
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      hex: rgbToHex(
        Math.round(bucket.r / bucket.count),
        Math.round(bucket.g / bucket.count),
        Math.round(bucket.b / bucket.count),
      ),
      score: bucket.score * Math.sqrt(bucket.count),
    }))
    .sort((a, b) => b.score - a.score);

  const primary = colors[0];
  if (!primary) {
    return { primary: "#0040e8", secondary: "#0ea5e9" };
  }

  const primaryHue = rgbToHsl(primary.r, primary.g, primary.b).h;
  const secondary =
    colors.find((color) => {
      const colorHue = rgbToHsl(color.r, color.g, color.b).h;

      return (
        color.hex !== primary.hex &&
        colorDistance(color, primary) > 90 &&
        hueDistance(colorHue, primaryHue) > 22
      );
    }) ??
    colors.find((color) => color.hex !== primary.hex && colorDistance(color, primary) > 60) ??
    colors[1];

  return {
    primary: primary.hex,
    secondary: secondary?.hex ?? fallbackSecondary(primary.hex),
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = src;
  });
}

function rgbToHex(r: number, g: number, b: number) {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  if (max === gn) h = (bn - rn) / d + 2;
  if (max === bn) h = (rn - gn) / d + 4;

  return { h: h * 60, s, l };
}

function hueDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function colorDistance(
  a: Pick<ColorBucket, "r" | "g" | "b">,
  b: Pick<ColorBucket, "r" | "g" | "b">,
) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function fallbackSecondary(primary: string) {
  const hex = normalizeHex(primary);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const shifted = rgbToHsl(r, g, b);
  shifted.h = (shifted.h + 42) % 360;

  return hslToHex(shifted.h, Math.max(0.45, shifted.s), Math.min(0.58, Math.max(0.36, shifted.l)));
}

function hslToHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}
