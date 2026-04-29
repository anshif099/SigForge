import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/store/useStore";
import { SignaturePreview } from "@/components/SignaturePreview";
import { imageToHtmlTemplate } from "@/lib/template-engine";
import { Upload, FileCode2, Image as ImageIcon, Trash2, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [{ title: "Templates — SignForge" }] }),
  component: TemplatesPage,
});

const sampleEmployee = {
  name: "Alex Morgan",
  designation: "Head of Product",
  phones: ["+1 (555) 012-3456"],
  email: "alex@acme.com",
  address: "Abu Dhabi, United Arab Emirates",
};

function TemplatesPage() {
  const {
    templates,
    activeTemplateId,
    setActiveTemplate,
    addTemplate,
    updateTemplate,
    removeTemplate,
    assets,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingHtml, setEditingHtml] = useState("");
  const [editingName, setEditingName] = useState("");

  const active = templates.find((t) => t.id === activeTemplateId) ?? templates[0];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    if (file.type.startsWith("image/")) {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const html = imageToHtmlTemplate(dataUrl);
        const id = addTemplate({ name: file.name.replace(/\.[^.]+$/, ""), html });
        setActiveTemplate(id);
        toast.success("Image converted to HTML template");
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith(".html") || file.type.includes("html")) {
      reader.onload = () => {
        const html = reader.result as string;
        const id = addTemplate({ name: file.name.replace(/\.[^.]+$/, ""), html });
        setActiveTemplate(id);
        toast.success("HTML template imported");
      };
      reader.readAsText(file);
    } else {
      toast.error("Please upload an HTML or image file");
    }
    e.target.value = "";
  }

  function startEdit() {
    if (!active) return;
    setEditingHtml(active.html);
    setEditingName(active.name);
  }

  function saveEdit() {
    if (!active) return;
    updateTemplate(active.id, { html: editingHtml, name: editingName });
    setEditingHtml("");
    toast.success("Template saved");
  }

  return (
    <RequireAuth>
      <Layout>
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Templates</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Upload HTML or an image. Use placeholders like{" "}
                <code className="px-1 rounded bg-muted">{"{{name}}"}</code>,{" "}
                <code className="px-1 rounded bg-muted">{"{{email}}"}</code>.
              </p>
            </div>
            <div className="shrink-0">
              <input
                ref={fileRef}
                type="file"
                accept=".html,image/*"
                hidden
                onChange={handleFile}
              />
              <Button className="w-full sm:w-auto" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Upload template
              </Button>
            </div>
          </div>

          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-2">
              {templates.map((t) => {
                const isImg = t.html.includes("data:image");
                const Icon = isImg ? ImageIcon : FileCode2;
                const isActive = active?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTemplate(t.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isActive
                        ? "border-primary bg-accent shadow-sm"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm font-medium truncate">{t.name}</span>
                      </div>
                      {isActive && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                );
              })}
            </div>

            {active && (
              <div className="min-w-0 space-y-6">
                <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
                  <h3 className="text-sm font-semibold mb-3">Live preview</h3>
                  <SignaturePreview
                    template={active.html}
                    employee={sampleEmployee}
                    assets={assets}
                  />
                </Card>

                <Card className="min-w-0 space-y-4 overflow-hidden p-4 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Source</h3>
                    <div className="flex gap-2">
                      {editingHtml ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditingHtml("")}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={saveEdit}>
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={startEdit}>
                            Edit
                          </Button>
                          {templates.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                removeTemplate(active.id);
                                toast.success("Template deleted");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {editingHtml ? (
                    <div className="space-y-3">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>HTML</Label>
                        <Textarea
                          value={editingHtml}
                          onChange={(e) => setEditingHtml(e.target.value)}
                          className="font-mono text-xs min-h-[280px]"
                        />
                      </div>
                    </div>
                  ) : (
                    <pre className="max-h-72 max-w-full overflow-auto rounded-md bg-muted p-4 text-xs">
                      <code>{active.html}</code>
                    </pre>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </RequireAuth>
  );
}
