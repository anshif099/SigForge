import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB4WwWLeULnNWLT-Q7JYW8UmNy_dLpTOyQ",
  authDomain: "sigforge-48fed.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ??
    "https://sigforge-48fed-default-rtdb.firebaseio.com",
  projectId: "sigforge-48fed",
  storageBucket: "sigforge-48fed.firebasestorage.app",
  messagingSenderId: "256279961026",
  appId: "1:256279961026:web:549d5ce614890f54df4a5b",
  measurementId: "G-21WQ5WFE92",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = typeof window === "undefined" ? null : getAuth(firebaseApp);
export const database = typeof window === "undefined" ? null : getDatabase(firebaseApp);
export const googleProvider = typeof window === "undefined" ? null : new GoogleAuthProvider();

if (typeof window !== "undefined") {
  void import("firebase/analytics").then(async ({ getAnalytics, isSupported }) => {
    if (await isSupported()) {
      getAnalytics(firebaseApp);
    }
  });
}
