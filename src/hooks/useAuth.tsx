import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { ref, update } from "firebase/database";
import { auth, database, googleProvider } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function assertAuthReady() {
  if (!auth) {
    throw new Error("Firebase Auth is only available in the browser.");
  }
}

async function syncUserProfile(user: User) {
  if (!database) return;

  await update(ref(database, `users/${user.uid}/profile`), {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? "",
    providerId: user.providerData[0]?.providerId ?? "password",
    lastLoginAt: Date.now(),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (nextUser) {
        void syncUserProfile(nextUser);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      loginWithGoogle: async () => {
        assertAuthReady();
        if (!googleProvider) throw new Error("Google sign-in is unavailable.");
        const credential = await signInWithPopup(auth, googleProvider);
        await syncUserProfile(credential.user);
      },
      loginWithEmail: async (email, password) => {
        assertAuthReady();
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await syncUserProfile(credential.user);
      },
      registerWithEmail: async (email, password) => {
        assertAuthReady();
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await syncUserProfile(credential.user);
      },
      logout: async () => {
        assertAuthReady();
        await signOut(auth);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
