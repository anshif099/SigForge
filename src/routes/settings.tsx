import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store/useStore";
import { Upload, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SigForge" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { assets, setAssets, clearEmployees } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAssets({ logoDataUrl: reader.result as string });
      toast.success("Logo uploaded");
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  return (
    <RequireAuth>
      <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Company assets applied to all templates.</p>
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
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
              {assets.logoDataUrl ? (
                <img src={assets.logoDataUrl} alt="Logo" className="max-h-full max-w-full" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="flex gap-2">
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
            Use <code className="px-1 rounded bg-muted">{'{{logo}}'}</code> in templates as an image src.
          </p>
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
