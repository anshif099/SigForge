import { useEffect, useMemo } from "react";
import { get, ref, set, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_TEMPLATE } from "@/lib/template-engine";
import { useStore, type WorkspaceSnapshot } from "@/store/useStore";
import type { CompanyAssets, Employee, GenerationRecord, Template } from "@/lib/types";

const DEFAULT_ASSETS: CompanyAssets = { companyName: "Acme Inc.", website: "https://acme.com" };

function getCurrentWorkspace(): WorkspaceSnapshot {
  const state = useStore.getState();

  return {
    employees: state.employees,
    templates: state.templates,
    activeTemplateId: state.activeTemplateId,
    assets: state.assets,
    generations: state.generations,
    workspaceUpdatedAt: state.workspaceUpdatedAt,
  };
}

function emptyWorkspace(): WorkspaceSnapshot {
  return {
    employees: [],
    templates: [],
    activeTemplateId: "default",
    assets: DEFAULT_ASSETS,
    generations: [],
    workspaceUpdatedAt: 0,
  };
}

function parseWorkspace(value: unknown): WorkspaceSnapshot | null {
  if (!value || typeof value !== "object") return null;

  const workspace = value as Partial<WorkspaceSnapshot>;

  return {
    employees: Array.isArray(workspace.employees) ? (workspace.employees as Employee[]) : [],
    templates: Array.isArray(workspace.templates) ? (workspace.templates as Template[]) : [],
    activeTemplateId:
      typeof workspace.activeTemplateId === "string" ? workspace.activeTemplateId : null,
    assets:
      workspace.assets && typeof workspace.assets === "object"
        ? (workspace.assets as CompanyAssets)
        : DEFAULT_ASSETS,
    generations: Array.isArray(workspace.generations)
      ? (workspace.generations as GenerationRecord[])
      : [],
    workspaceUpdatedAt:
      typeof workspace.workspaceUpdatedAt === "number" ? workspace.workspaceUpdatedAt : 0,
  };
}

function hasSavedContent(workspace: WorkspaceSnapshot) {
  return (
    workspace.employees.length > 0 ||
    workspace.generations.length > 0 ||
    workspace.templates.some(
      (template) =>
        template.id !== "default" ||
        template.name !== "SignForge Blue" ||
        template.html !== DEFAULT_TEMPLATE,
    ) ||
    Boolean(workspace.assets.logoDataUrl) ||
    Boolean(workspace.assets.brandPalette) ||
    workspace.assets.companyName !== DEFAULT_ASSETS.companyName ||
    workspace.assets.website !== DEFAULT_ASSETS.website
  );
}

function mergeById<T extends { id: string }>(
  remoteItems: T[],
  localItems: T[],
  preferLocal: boolean,
) {
  const merged = new Map<string, T>();
  const first = preferLocal ? remoteItems : localItems;
  const second = preferLocal ? localItems : remoteItems;

  for (const item of first) {
    if (item?.id) merged.set(item.id, item);
  }
  for (const item of second) {
    if (item?.id) merged.set(item.id, item);
  }

  return Array.from(merged.values());
}

function mergeGenerations(
  remoteItems: GenerationRecord[],
  localItems: GenerationRecord[],
  preferLocal: boolean,
) {
  const merged = new Map<string, GenerationRecord>();
  const first = preferLocal ? remoteItems : localItems;
  const second = preferLocal ? localItems : remoteItems;

  for (const item of first) {
    if (item?.date) merged.set(item.date, item);
  }
  for (const item of second) {
    if (item?.date) merged.set(item.date, item);
  }

  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeWorkspaces(remote: WorkspaceSnapshot, local: WorkspaceSnapshot): WorkspaceSnapshot {
  const remoteHasContent = hasSavedContent(remote);
  const localHasContent = hasSavedContent(local);

  if (remoteHasContent && !localHasContent) return remote;
  if (!remoteHasContent && localHasContent) return local;
  if (!remoteHasContent && !localHasContent) return remote;

  const preferLocal = local.workspaceUpdatedAt > remote.workspaceUpdatedAt;
  const templates = mergeById(remote.templates, local.templates, preferLocal);
  const activeTemplateId = preferLocal
    ? (local.activeTemplateId ?? remote.activeTemplateId)
    : (remote.activeTemplateId ?? local.activeTemplateId);

  return {
    employees: mergeById(remote.employees, local.employees, preferLocal),
    templates,
    activeTemplateId: templates.some((template) => template.id === activeTemplateId)
      ? activeTemplateId
      : (templates[0]?.id ?? null),
    assets: preferLocal
      ? { ...remote.assets, ...local.assets }
      : { ...local.assets, ...remote.assets },
    generations: mergeGenerations(remote.generations, local.generations, preferLocal),
    workspaceUpdatedAt: Math.max(remote.workspaceUpdatedAt, local.workspaceUpdatedAt),
  };
}

function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefined(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        entry === undefined ? [] : [[key, removeUndefined(entry)]],
      ),
    ) as T;
  }

  return value;
}

export function FirebaseSync() {
  const { user } = useAuth();
  const employees = useStore((s) => s.employees);
  const templates = useStore((s) => s.templates);
  const activeTemplateId = useStore((s) => s.activeTemplateId);
  const assets = useStore((s) => s.assets);
  const generations = useStore((s) => s.generations);
  const workspaceUpdatedAt = useStore((s) => s.workspaceUpdatedAt);
  const cloudSyncReadyForUserId = useStore((s) => s.cloudSyncReadyForUserId);
  const replaceWorkspace = useStore((s) => s.replaceWorkspace);
  const setCloudSyncReadyForUserId = useStore((s) => s.setCloudSyncReadyForUserId);

  const workspaceSnapshot = useMemo<WorkspaceSnapshot>(
    () => ({
      employees,
      templates,
      activeTemplateId,
      assets,
      generations,
      workspaceUpdatedAt,
    }),
    [activeTemplateId, assets, employees, generations, templates, workspaceUpdatedAt],
  );

  const syncPayload = useMemo(() => {
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const generationsByDate = Object.fromEntries(
      generations.map((record) => [record.date, record.count]),
    );

    return {
      metrics: {
        employeesCount: employees.length,
        templatesCount: templates.length,
        thisMonthCount: generations
          .filter((record) => record.date.startsWith(monthPrefix))
          .reduce((sum, record) => sum + record.count, 0),
        totalGenerations: generations.reduce((sum, record) => sum + record.count, 0),
        updatedAt: Date.now(),
      },
      generationsByDate,
    };
  }, [employees.length, generations, templates.length]);

  useEffect(() => {
    if (!user) {
      setCloudSyncReadyForUserId(null);
      return;
    }

    if (!database) {
      setCloudSyncReadyForUserId(user.uid);
      return;
    }

    let cancelled = false;
    setCloudSyncReadyForUserId(null);

    void get(ref(database, `users/${user.uid}/workspace`))
      .then((snapshot) => {
        if (cancelled) return;

        const remoteWorkspace = parseWorkspace(snapshot.val());
        const state = useStore.getState();
        const localWorkspace =
          state.lastWorkspaceUserId && state.lastWorkspaceUserId !== user.uid
            ? emptyWorkspace()
            : getCurrentWorkspace();

        replaceWorkspace(
          remoteWorkspace ? mergeWorkspaces(remoteWorkspace, localWorkspace) : localWorkspace,
          user.uid,
        );
        setCloudSyncReadyForUserId(user.uid);
      })
      .catch((error) => {
        console.warn("Firebase workspace load failed", error);
        if (!cancelled) setCloudSyncReadyForUserId(user.uid);
      });

    return () => {
      cancelled = true;
    };
  }, [replaceWorkspace, setCloudSyncReadyForUserId, user]);

  useEffect(() => {
    if (!database || !user || cloudSyncReadyForUserId !== user.uid) return;

    const syncTimer = window.setTimeout(() => {
      const cleanWorkspace = removeUndefined(workspaceSnapshot);

      void Promise.all([
        set(ref(database, `users/${user.uid}/workspace`), cleanWorkspace),
        set(ref(database, `users/${user.uid}/metrics`), syncPayload.metrics),
        set(ref(database, `users/${user.uid}/generationsByDate`), syncPayload.generationsByDate),
        update(ref(database, `users/${user.uid}/profile`), {
          uid: user.uid,
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          photoURL: user.photoURL ?? "",
          lastSyncedAt: Date.now(),
        }),
      ]).catch((error) => {
        console.warn("Firebase sync failed", error);
      });
    }, 500);

    return () => window.clearTimeout(syncTimer);
  }, [cloudSyncReadyForUserId, syncPayload, user, workspaceSnapshot]);

  return null;
}
