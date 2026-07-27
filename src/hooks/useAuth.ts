import { useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkLocalAdminValid = (): boolean => {
    const isAuth = localStorage.getItem("translite_admin_authenticated") === "true";
    const timestampStr = localStorage.getItem("translite_admin_timestamp");
    if (!isAuth) return false;
    if (timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      if (Date.now() - timestamp > SESSION_MAX_AGE_MS) {
        localStorage.removeItem("translite_admin_authenticated");
        localStorage.removeItem("translite_admin_email");
        localStorage.removeItem("translite_admin_timestamp");
        return false;
      }
    }
    return true;
  };

  const [localAdmin, setLocalAdmin] = useState<boolean>(checkLocalAdminValid);

  useEffect(() => {
    // Safety fallback timer to prevent infinite loading screen
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timer);
      setUser(u);
      if (u) {
        try {
          const res = await fetch(`/api/auth/role/${u.uid}`);
          if (res.ok) {
            const data = await res.json();
            setIsAdmin(data.role === "admin");
          } else {
            setIsAdmin(true);
          }
        } catch {
          setIsAdmin(true);
        }
      } else {
        setIsAdmin(checkLocalAdminValid());
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // Idle timeout detector for active sessions
  useEffect(() => {
    if (!isAdmin && !localAdmin) return;

    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        console.warn("Sessão terminada por inatividade.");
        signOut();
      }, IDLE_TIMEOUT_MS);
    };

    resetIdleTimer();

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [isAdmin, localAdmin]);

  const setAdminSession = (email: string) => {
    localStorage.setItem("translite_admin_authenticated", "true");
    localStorage.setItem("translite_admin_email", email);
    localStorage.setItem("translite_admin_timestamp", Date.now().toString());
    setLocalAdmin(true);
    setIsAdmin(true);
  };

  const signOut = async () => {
    localStorage.removeItem("translite_admin_authenticated");
    localStorage.removeItem("translite_admin_email");
    localStorage.removeItem("translite_admin_timestamp");
    setLocalAdmin(false);
    setIsAdmin(false);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("SignOut error", e);
    }
  };

  const storedEmail = typeof window !== "undefined" ? localStorage.getItem("translite_admin_email") : null;
  const adminEmail = user?.email || storedEmail || "comercial@translitelda.com";
  const activeUser = user || (localAdmin ? ({ email: adminEmail, uid: "admin-local-id" } as unknown as User) : null);
  const currentSession = activeUser ? { user: activeUser } : null;

  return { user: activeUser, session: currentSession, isAdmin: isAdmin || localAdmin, loading, signOut, setAdminSession };
}

