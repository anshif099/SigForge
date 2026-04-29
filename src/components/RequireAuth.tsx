import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const cloudSyncReadyForUserId = useStore((state) => state.cloudSyncReadyForUserId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
        Checking account...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (cloudSyncReadyForUserId !== user.uid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
        Loading saved workspace...
      </div>
    );
  }

  return <>{children}</>;
}
