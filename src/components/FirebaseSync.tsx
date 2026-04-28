import { useEffect, useMemo } from "react";
import { ref, set, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";

export function FirebaseSync() {
  const { user } = useAuth();
  const employees = useStore((s) => s.employees);
  const templates = useStore((s) => s.templates);
  const generations = useStore((s) => s.generations);

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
    if (!database || !user) return;

    void Promise.all([
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
  }, [syncPayload, user]);

  return null;
}
