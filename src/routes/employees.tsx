import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store/useStore";
import { useRef, useState } from "react";
import Papa from "papaparse";
import type { Employee } from "@/lib/types";
import { Plus, Upload, Trash2, X, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — SigForge" }] }),
  component: EmployeesPage,
});

const empty: Omit<Employee, "id"> = {
  name: "",
  designation: "",
  phones: [""],
  email: "",
  address: "",
};

function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, removeEmployee, addEmployees } = useStore();
  const [form, setForm] = useState<Omit<Employee, "id">>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Omit<Employee, "id">[] | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setForm(empty);
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(e: Employee) {
    setForm({
      name: e.name,
      designation: e.designation,
      phones: e.phones.length ? e.phones : [""],
      email: e.email,
      address: e.address,
    });
    setEditingId(e.id);
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const cleaned = { ...form, phones: form.phones.filter((p) => p.trim()) };
    if (editingId) {
      updateEmployee(editingId, cleaned);
      toast.success("Employee updated");
    } else {
      addEmployee(cleaned);
      toast.success("Employee added");
    }
    setOpen(false);
  }

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows: Omit<Employee, "id">[] = res.data
          .map((r) => {
            const phoneStr = r.phone || r.phones || r.Phone || "";
            return {
              name: (r.name || r.Name || "").trim(),
              designation: (r.designation || r.title || r.Designation || "").trim(),
              phones: phoneStr.split(/[;,|]/).map((p) => p.trim()).filter(Boolean),
              email: (r.email || r.Email || "").trim(),
              address: (r.address || r.Address || "").trim(),
            };
          })
          .filter((r) => r.name);
        if (rows.length === 0) {
          toast.error("No valid rows. Expected headers: name, designation, phone, email, address");
        } else {
          setCsvPreview(rows);
        }
      },
    });
    e.target.value = "";
  }

  function confirmCsv() {
    if (!csvPreview) return;
    addEmployees(csvPreview);
    toast.success(`${csvPreview.length} employees imported`);
    setCsvPreview(null);
  }

  return (
    <RequireAuth>
      <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Employees</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {employees.length} {employees.length === 1 ? "employee" : "employees"}
            </p>
          </div>
          <div className="flex gap-2">
            <input ref={csvRef} type="file" accept=".csv" hidden onChange={onCsv} />
            <Button variant="outline" onClick={() => csvRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Import CSV
            </Button>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Add employee
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          {employees.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No employees yet. Add one, or import a CSV with columns: name, designation, phone, email, address.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phones</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => openEdit(e)}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-muted-foreground">{e.designation}</TableCell>
                    <TableCell className="text-muted-foreground">{e.email}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{e.phones.join(", ")}</TableCell>
                    <TableCell onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => removeEmployee(e.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit employee" : "Add employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone numbers</Label>
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
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...form, phones: [...form.phones, ""] })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add phone
                </Button>
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV preview */}
      <Dialog open={!!csvPreview} onOpenChange={(o) => !o && setCsvPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview import ({csvPreview?.length ?? 0} rows)</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvPreview?.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.designation}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell className="text-xs">{r.phones.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvPreview(null)}>Cancel</Button>
            <Button onClick={confirmCsv}>Import {csvPreview?.length} employees</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Layout>
    </RequireAuth>
  );
}
