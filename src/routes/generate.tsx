import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store/useStore";
import { SignaturePreview } from "@/components/SignaturePreview";
import { renderTemplate, slugify, extractPlaceholders, extractImageSlots } from "@/lib/template-engine";
import { useMemo, useRef, useState } from "react";
import { Copy, Download, Package, Users, Phone, Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Employee } from "@/lib/types";

export const Route = createFileRoute("/generate")({
  head: () => ({ meta: [{ title: "Generate — SignForge" }] }),
  component: GeneratePage,
});

const blank: Omit<Employee, "id"> = {
  name: "Jane Doe",
  designation: "Marketing Director",
  phones: ["+1 (555) 010-2030"],
  mobile: "+1 (555) 010-2030",
  email: "jane@acme.com",
  address: "Abu Dhabi, United Arab Emirates",
  website: "https://acme.com",
  logoDataUrl: "",
  extra: { divisionLabel: "A Division of" },
};

function downloadFile(name: string, content: string, mime = "text/html") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function wrapHtml(inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Email signature</title></head><body>${inner}</body></html>`;
}

function GeneratePage() {
  const { templates, activeTemplateId, setActiveTemplate, assets, employees, recordGenerations } = useStore();
  const active = templates.find((t) => t.id === activeTemplateId) ?? templates[0];
  const [form, setForm] = useState<Omit<Employee, "id">>(blank);

  const html = useMemo(
    () => (active ? renderTemplate(active.html, form, assets) : ""),
    [active, form, assets],
  );

  const templatePlaceholders = useMemo(
    () => (active ? extractPlaceholders(active.html) : []),
    [active],
  );

  const templateImageSlots = useMemo(
    () => (active ? extractImageSlots(active.html) : []),
    [active],
  );

  const logoSlots = useMemo(() => {
    if (templateImageSlots.length > 0) {
      return templateImageSlots;
    }

    const logoPlaceholders = templatePlaceholders.filter((key) => /^logo(?:_\d+)?$/.test(key));
    if (logoPlaceholders.length > 0) {
      return logoPlaceholders.map((key, index) => ({
        key: key === "logo" ? "logo_1" : key,
        label: `Logo ${index + 1}`,
        src: "",
      }));
    }

    return [{ key: "logo_1", label: "Logo", src: "" }];
  }, [templateImageSlots, templatePlaceholders]);

  const logoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function getLogoValue(key: string) {
    return form.extra?.[key] ?? (key === "logo_1" ? form.logoDataUrl ?? "" : "");
  }

  function setLogoValue(key: string, value: string) {
    setForm((f) => ({
      ...f,
      logoDataUrl: key === "logo_1" ? value : f.logoDataUrl,
      extra: { ...(f.extra ?? {}), [key]: value },
    }));
  }

  function clearLogoValue(key: string) {
    setForm((f) => {
      const extra = { ...(f.extra ?? {}) };
      delete extra[key];

      return {
        ...f,
        logoDataUrl: key === "logo_1" ? "" : f.logoDataUrl,
        extra,
      };
    });
  }

  function handleLogoUpload(key: string, label: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoValue(key, reader.result as string);
      toast.success(`${label} added`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  function setExtra(key: string, value: string) {
    setForm((f) => ({ ...f, extra: { ...(f.extra ?? {}), [key]: value } }));
  }

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(html);
      toast.success("HTML copied to clipboard");
      recordGenerations(1);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function copyRich() {
    try {
      const blob = new Blob([html], { type: "text/html" });
      const text = new Blob([form.name], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": blob, "text/plain": text }),
      ]);
      toast.success("Signature copied (rich) — paste into Gmail/Outlook");
      recordGenerations(1);
    } catch {
      toast.error("Rich copy not supported — use Copy HTML");
    }
  }

  function downloadOne() {
    if (!active) return;
    downloadFile(`${slugify(form.name)}-signature.html`, wrapHtml(html));
    recordGenerations(1);
    toast.success("Downloaded");
  }

  async function downloadZip() {
    if (!active) return;
    if (employees.length === 0) {
      toast.error("No employees to generate");
      return;
    }
    const zip = new JSZip();
    employees.forEach((emp) => {
      const rendered = renderTemplate(active.html, emp, assets);
      zip.file(`${slugify(emp.name)}.html`, wrapHtml(rendered));
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signatures-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    recordGenerations(employees.length);
    toast.success(`Generated ${employees.length} signatures`);
  }

  if (!active) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <h2 className="text-xl font-semibold">No template available</h2>
          <p className="text-muted-foreground mt-2">Create a template to start generating.</p>
        </div>
      </Layout>
    );
  }

  return (
    <RequireAuth>
      <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Generate signatures</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live preview · Single or bulk export
            </p>
          </div>
          <div className="min-w-[220px]">
            <Label className="text-xs">Template</Label>
            <Select value={active.id} onValueChange={setActiveTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Single</TabsTrigger>
            <TabsTrigger value="bulk">
              <Users className="h-3.5 w-3.5 mr-1.5" /> Bulk ({employees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold">Details</h3>
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                </div>
                <div>
                  <Label>Division label</Label>
                  <Input
                    value={form.extra?.divisionLabel ?? ""}
                    onChange={(e) => setExtra("divisionLabel", e.target.value)}
                    placeholder="A Division of"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Phones</Label>
                  <div className="space-y-2">
                    {form.phones.map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <div className="flex-1 relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            value={p}
                            onChange={(e) => {
                              const phones = [...form.phones];
                              phones[i] = e.target.value;
                              setForm({ ...form, phones });
                            }}
                          />
                        </div>
                        {form.phones.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setForm({ ...form, phones: form.phones.filter((_, idx) => idx !== i) })
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setForm({ ...form, phones: [...form.phones, ""] })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add phone
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input
                    value={form.mobile ?? ""}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={form.website ?? ""}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logos</Label>
                  <div className="space-y-2">
                    {logoSlots.map((slot) => {
                      const uploadedLogo = getLogoValue(slot.key);
                      const templateLogo = slot.src && !slot.src.includes("{{") ? slot.src : "";
                      const companyLogo = slot.key === "logo_1" ? assets.logoDataUrl ?? "" : "";
                      const previewLogo = uploadedLogo || templateLogo || companyLogo;
                      const status = uploadedLogo
                        ? "Uploaded logo"
                        : templateLogo
                          ? "Template logo"
                          : companyLogo
                            ? "Company logo"
                            : "No logo selected";

                      return (
                        <div
                          key={slot.key}
                          className="flex items-center gap-3 rounded-md border border-input bg-background p-2"
                        >
                          <input
                            ref={(node) => {
                              logoInputRefs.current[slot.key] = node;
                            }}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleLogoUpload(slot.key, slot.label, e)}
                          />
                          <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded border bg-card">
                            {previewLogo ? (
                              <img
                                src={previewLogo}
                                alt={slot.label}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium">{slot.label}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{status}</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => logoInputRefs.current[slot.key]?.click()}
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                          </Button>
                          {uploadedLogo && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => clearLogoValue(slot.key)}
                              aria-label={`Remove ${slot.label}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {templatePlaceholders
                  .filter(
                    (k) =>
                      ![
                        "name",
                        "designation",
                        "email",
                        "phone",
                        "mobile",
                        "address",
                        "website",
                        "logo",
                        "divisionLabel",
                        "companyName",
                      ].includes(k) && !/^logo(?:_\d+)?$/.test(k),
                  )
                  .map((key) => (
                    <div key={key}>
                      <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                      <Input
                        value={form.extra?.[key] ?? ""}
                        onChange={(e) => setExtra(key, e.target.value)}
                      />
                    </div>
                  ))}
              </Card>

              <div className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-sm font-semibold mb-3">Preview</h3>
                  <SignaturePreview template={active.html} employee={form} assets={assets} />
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={copyRich}>
                    <Copy className="h-4 w-4 mr-2" /> Copy signature
                  </Button>
                  <Button variant="outline" onClick={copyHtml}>
                    Copy HTML
                  </Button>
                  <Button variant="outline" onClick={downloadOne}>
                    <Download className="h-4 w-4 mr-2" /> Download .html
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="mt-4">
            <Card className="p-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold">Generate for all employees</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Produces one .html file per employee, zipped.
                  </p>
                </div>
                <Button onClick={downloadZip} disabled={employees.length === 0}>
                  <Package className="h-4 w-4 mr-2" /> Download ZIP ({employees.length})
                </Button>
              </div>

              {employees.length > 0 && (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {employees.slice(0, 4).map((e) => (
                    <div key={e.id} className="border rounded-lg p-3 bg-muted/30">
                      <div className="text-xs font-medium text-muted-foreground mb-2">{e.name}</div>
                      <SignaturePreview template={active.html} employee={e} assets={assets} />
                    </div>
                  ))}
                  {employees.length > 4 && (
                    <div className="text-xs text-muted-foreground col-span-full text-center">
                      + {employees.length - 4} more
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </Layout>
    </RequireAuth>
  );
}
