import { useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety fallback timer to prevent infinite loading screen
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timer);
      setUser(u);
      if (u) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
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
    if (!user) return;

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
  }, [user]);

  const signOut = async () => {
    setUser(null);
    setIsAdmin(false);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("SignOut error", e);
    }
  };

  const currentSession = user ? { user } : null;

  return {
    user,
    session: currentSession,
    isAdmin: !!user && isAdmin,
    loading,
    signOut,
  };
}


