import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Employee, Template, CompanyAssets, GenerationRecord } from "@/lib/types";
import { DEFAULT_TEMPLATE } from "@/lib/template-engine";

export interface WorkspaceSnapshot {
  employees: Employee[];
  templates: Template[];
  activeTemplateId: string | null;
  assets: CompanyAssets;
  generations: GenerationRecord[];
  workspaceUpdatedAt: number;
}

interface AppState {
  employees: Employee[];
  templates: Template[];
  activeTemplateId: string | null;
  assets: CompanyAssets;
  generations: GenerationRecord[];
  theme: "light" | "dark";
  workspaceUpdatedAt: number;
  lastWorkspaceUserId: string | null;
  cloudSyncReadyForUserId: string | null;

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
  replaceWorkspace: (workspace: Partial<WorkspaceSnapshot>, ownerUid?: string | null) => void;
  setCloudSyncReadyForUserId: (uid: string | null) => void;

  toggleTheme: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const defaultTemplate = (): Template => ({
  id: "default",
  name: "SignForge Blue",
  html: DEFAULT_TEMPLATE,
  createdAt: Date.now(),
});
const defaultAssets: CompanyAssets = { companyName: "Acme Inc.", website: "https://acme.com" };

function normalizeWorkspace(workspace: Partial<WorkspaceSnapshot>): WorkspaceSnapshot {
  const templates = workspace.templates?.length ? workspace.templates : [defaultTemplate()];
  const activeTemplateId =
    workspace.activeTemplateId &&
    templates.some((template) => template.id === workspace.activeTemplateId)
      ? workspace.activeTemplateId
      : (templates[0]?.id ?? null);

  return {
    employees: Array.isArray(workspace.employees) ? workspace.employees : [],
    templates,
    activeTemplateId,
    assets: workspace.assets ?? defaultAssets,
    generations: Array.isArray(workspace.generations) ? workspace.generations : [],
    workspaceUpdatedAt:
      typeof workspace.workspaceUpdatedAt === "number" ? workspace.workspaceUpdatedAt : 0,
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      employees: [],
      templates: [defaultTemplate()],
      activeTemplateId: "default",
      assets: defaultAssets,
      generations: [],
      theme: "light",
      workspaceUpdatedAt: 0,
      lastWorkspaceUserId: null,
      cloudSyncReadyForUserId: null,

      addEmployee: (e) =>
        set((s) => ({
          employees: [...s.employees, { ...e, id: uid() }],
          workspaceUpdatedAt: Date.now(),
        })),
      updateEmployee: (id, patch) =>
        set((s) => ({
          employees: s.employees.map((emp) => (emp.id === id ? { ...emp, ...patch } : emp)),
          workspaceUpdatedAt: Date.now(),
        })),
      removeEmployee: (id) =>
        set((s) => ({
          employees: s.employees.filter((e) => e.id !== id),
          workspaceUpdatedAt: Date.now(),
        })),
      addEmployees: (list) =>
        set((s) => ({
          employees: [...s.employees, ...list.map((e) => ({ ...e, id: uid() }))],
          workspaceUpdatedAt: Date.now(),
        })),
      clearEmployees: () => set({ employees: [], workspaceUpdatedAt: Date.now() }),

      addTemplate: (t) => {
        const id = uid();
        set((s) => ({
          templates: [...s.templates, { ...t, id, createdAt: Date.now() }],
          activeTemplateId: id,
          workspaceUpdatedAt: Date.now(),
        }));
        return id;
      },
      updateTemplate: (id, patch) =>
        set((s) => ({
          templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          workspaceUpdatedAt: Date.now(),
        })),
      removeTemplate: (id) =>
        set((s) => {
          const templates = s.templates.filter((t) => t.id !== id);
          return {
            templates,
            activeTemplateId:
              s.activeTemplateId === id ? (templates[0]?.id ?? null) : s.activeTemplateId,
            workspaceUpdatedAt: Date.now(),
          };
        }),
      setActiveTemplate: (id) => set({ activeTemplateId: id, workspaceUpdatedAt: Date.now() }),

      setAssets: (a) =>
        set((s) => ({ assets: { ...s.assets, ...a }, workspaceUpdatedAt: Date.now() })),
      recordGenerations: (n) => {
        const d = today();
        const existing = get().generations.find((g) => g.date === d);
        if (existing) {
          set((s) => ({
            generations: s.generations.map((g) =>
              g.date === d ? { ...g, count: g.count + n } : g,
            ),
            workspaceUpdatedAt: Date.now(),
          }));
        } else {
          set((s) => ({
            generations: [...s.generations, { date: d, count: n }],
            workspaceUpdatedAt: Date.now(),
          }));
        }
      },
      replaceWorkspace: (workspace, ownerUid) =>
        set({
          ...normalizeWorkspace(workspace),
          ...(ownerUid !== undefined ? { lastWorkspaceUserId: ownerUid } : {}),
        }),
      setCloudSyncReadyForUserId: (uid) => set({ cloudSyncReadyForUserId: uid }),

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
              ? { ...template, name: "SignForge Blue", html: DEFAULT_TEMPLATE }
              : template,
          ),
          workspaceUpdatedAt:
            typeof state.workspaceUpdatedAt === "number" ? state.workspaceUpdatedAt : 0,
          lastWorkspaceUserId:
            typeof state.lastWorkspaceUserId === "string" ? state.lastWorkspaceUserId : null,
        };
      },
      partialize: (state) => ({
        employees: state.employees,
        templates: state.templates,
        activeTemplateId: state.activeTemplateId,
        assets: state.assets,
        generations: state.generations,
        theme: state.theme,
        workspaceUpdatedAt: state.workspaceUpdatedAt,
        lastWorkspaceUserId: state.lastWorkspaceUserId,
      }),
    },
  ),
);
