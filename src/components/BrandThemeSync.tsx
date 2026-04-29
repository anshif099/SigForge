import { useEffect } from "react";
import { applyBrandTheme } from "@/lib/brand-theme";
import { useStore } from "@/store/useStore";

export function BrandThemeSync() {
  const brandPalette = useStore((s) => s.assets.brandPalette);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    applyBrandTheme(brandPalette, theme);
  }, [brandPalette, theme]);

  return null;
}
