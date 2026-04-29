import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeHex } from "@/lib/brand-theme";
import { extractPaletteFromImage } from "@/lib/logo-colors";
import type { CompanyAssets } from "@/lib/types";
import { useStore } from "@/store/useStore";
import { Check, Palette, RotateCcw, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SignForge" }] }),
  component: SettingsPage,
});

type BrandPalette = NonNullable<CompanyAssets["brandPalette"]>;

function SettingsPage() {
  const { assets, setAssets, clearEmployees } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [detectedPalette, setDetectedPalette] = useState<BrandPalette | undefined>(
    assets.brandPalette,
  );
  const [isExtractingColors, setIsExtractingColors] = useState(false);

  const activePalette = detectedPalette ?? assets.brandPalette;
  const appliedPalette = assets.brandPalette;
  const hasUnappliedPalette =
    Boolean(activePalette) &&
    (!appliedPalette ||
      normalizeHex(activePalette.primary) !== normalizeHex(appliedPalette.primary) ||
      normalizeHex(activePalette.secondary) !== normalizeHex(appliedPalette.secondary));

  useEffect(() => {
    setDetectedPalette(assets.brandPalette);
  }, [assets.brandPalette]);

  function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const logoDataUrl = reader.result as string;
      setAssets({ logoDataUrl });
      setIsExtractingColors(true);

      try {
        const palette = await extractPaletteFromImage(logoDataUrl);
        setDetectedPalette(palette);
        toast.success("Logo uploaded. Colors detected.");
      } catch {
        toast.success("Logo uploaded");
        toast.error("Could not detect colors from this logo");
      } finally {
        setIsExtractingColors(false);
      }
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function updatePendingColor(key: keyof BrandPalette, value: string) {
    setDetectedPalette((palette) => ({
      primary: palette?.primary ?? assets.brandPalette?.primary ?? "#0040e8",
      secondary: palette?.secondary ?? assets.brandPalette?.secondary ?? "#0ea5e9",
      [key]: normalizeHex(value),
    }));
  }

  function applyPalette() {
    if (!activePalette) return;

    setAssets({
      brandPalette: {
        primary: normalizeHex(activePalette.primary),
        secondary: normalizeHex(activePalette.secondary),
      },
    });
    toast.success("Website colors applied");
  }

  function resetPalette() {
    setDetectedPalette(undefined);
    setAssets({ brandPalette: undefined });
    toast.success("Website colors reset");
  }

  return (
    <RequireAuth>
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Company assets applied to all templates.
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Company</h3>
            <div>
              <Label>Company name</Label>
              <Input
                value={assets.companyName ?? ""}
                onChange={(e) => setAssets({ companyName: e.target.value })}
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={assets.website ?? ""}
                onChange={(e) => setAssets({ website: e.target.value })}
                placeholder="https://"
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Logo</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                {assets.logoDataUrl ? (
                  <img src={assets.logoDataUrl} alt="Logo" className="max-h-full max-w-full" />
                ) : (
                  <span className="text-xs text-muted-foreground">No logo</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadLogo} />
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </Button>
                {assets.logoDataUrl && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAssets({ logoDataUrl: undefined });
                      toast.success("Logo removed");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use <code className="px-1 rounded bg-muted">{"{{logo}}"}</code> in templates as an
              image src.
            </p>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <Palette className="h-4 w-4 text-primary" /> Website colors
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a logo, then apply its colors to the website.
                </p>
              </div>
              {assets.brandPalette && (
                <Button variant="outline" size="sm" onClick={resetPalette}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              )}
            </div>

            {activePalette ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorControl
                  label="Primary"
                  value={normalizeHex(activePalette.primary)}
                  onChange={(value) => updatePendingColor("primary", value)}
                />
                <ColorControl
                  label="Secondary"
                  value={normalizeHex(activePalette.secondary)}
                  onChange={(value) => updatePendingColor("secondary", value)}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No colors detected yet.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={applyPalette} disabled={!activePalette || isExtractingColors}>
                <Check className="h-4 w-4 mr-2" />{" "}
                {isExtractingColors ? "Detecting colors" : "Apply colors"}
              </Button>
              {hasUnappliedPalette && (
                <span className="self-center text-xs text-muted-foreground">Not applied yet</span>
              )}
            </div>
          </Card>

          <Card className="p-6 space-y-4 border-destructive/30">
            <h3 className="font-semibold text-destructive">Danger zone</h3>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Delete all employees?")) {
                  clearEmployees();
                  toast.success("All employees deleted");
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Clear all employees
            </Button>
          </Card>
        </div>
      </Layout>
    </RequireAuth>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-md border shadow-sm"
          style={{ backgroundColor: value }}
        />
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="font-mono text-xs text-muted-foreground">{value}</div>
        </div>
      </div>
      <Input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-12 shrink-0 cursor-pointer p-1"
        aria-label={`${label} color`}
      />
    </div>
  );
}
