import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Employee, Template, CompanyAssets, GenerationRecord } from "@/lib/types";
import { DEFAULT_TEMPLATE } from "@/lib/template-engine";

interface AppState {
  employees: Employee[];
  templates: Template[];
  activeTemplateId: string | null;
  assets: CompanyAssets;
  generations: GenerationRecord[];
  theme: "light" | "dark";

  addEmployee: (e: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, e: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  addEmployees: (list: Omit<Employee, "id">[]) => void;
  clearEmployees: () => void;

  addTemplate: (t: Omit<Template, "id" | "createdAt">) => string;
  updateTemplate: (id: string, patch: Partial<Template>) => void;
  removeTemplate: (id: string) => void;
  setActiveTemplate: (id: string | null) => void;

  setAssets: (a: Partial<CompanyAssets>) => void;
  recordGenerations: (n: number) => void;

  toggleTheme: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      employees: [],
      templates: [
        { id: "default", name: "SigForge Blue", html: DEFAULT_TEMPLATE, createdAt: Date.now() },
      ],
      activeTemplateId: "default",
      assets: { companyName: "Acme Inc.", website: "https://acme.com" },
      generations: [],
      theme: "light",

      addEmployee: (e) =>
        set((s) => ({ employees: [...s.employees, { ...e, id: uid() }] })),
      updateEmployee: (id, patch) =>
        set((s) => ({
          employees: s.employees.map((emp) => (emp.id === id ? { ...emp, ...patch } : emp)),
        })),
      removeEmployee: (id) =>
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),
      addEmployees: (list) =>
        set((s) => ({
          employees: [...s.employees, ...list.map((e) => ({ ...e, id: uid() }))],
        })),
      clearEmployees: () => set({ employees: [] }),

      addTemplate: (t) => {
        const id = uid();
        set((s) => ({
          templates: [...s.templates, { ...t, id, createdAt: Date.now() }],
          activeTemplateId: id,
        }));
        return id;
      },
      updateTemplate: (id, patch) =>
        set((s) => ({
          templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTemplate: (id) =>
        set((s) => ({
          templates: s.templates.filter((t) => t.id !== id),
          activeTemplateId:
            s.activeTemplateId === id ? (s.templates[0]?.id ?? null) : s.activeTemplateId,
        })),
      setActiveTemplate: (id) => set({ activeTemplateId: id }),

      setAssets: (a) => set((s) => ({ assets: { ...s.assets, ...a } })),
      recordGenerations: (n) => {
        const d = today();
        const existing = get().generations.find((g) => g.date === d);
        if (existing) {
          set((s) => ({
            generations: s.generations.map((g) =>
              g.date === d ? { ...g, count: g.count + n } : g,
            ),
          }));
        } else {
          set((s) => ({ generations: [...s.generations, { date: d, count: n }] }));
        }
      },

      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", next === "dark");
        }
      },
    }),
    {
      name: "sigforge-store",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState>;
        if (!state.templates) return state;

        return {
          ...state,
          templates: state.templates.map((template) =>
            template.id === "default" &&
            (template.name === "Classic Purple" || template.html.includes("#7c3aed"))
              ? { ...template, name: "SigForge Blue", html: DEFAULT_TEMPLATE }
              : template,
          ),
        };
      },
    },
  ),
);
